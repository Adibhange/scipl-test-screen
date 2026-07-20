import { NextRequest, NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/admin-auth"
import { getResultById, updateResult } from "@/lib/results"
import { getSupabaseServerClient } from "@/lib/db"
import type { CandidateResult } from "@/types"

export async function PATCH(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== "hr") return NextResponse.json({ error: "HR access required" }, { status: 403 })

  const body: { 
    resultId?: string
    role?: string
    experience?: string
    testLocation?: string
    hiringLocation?: string 
    hiringStatus?: string 
    expectedSalary?: number | null 
    offerSalary?: number | null 
    hrNotes?: string 
    interviewerId?: string 
    interviewerName?: string 
    interviewerEmail?: string 
  } = await request.json()
  
  if (!body.resultId) return NextResponse.json({ error: "Result id is required" }, { status: 400 })
  const result = await getResultById(body.resultId)
  if (!result) return NextResponse.json({ error: "Candidate result not found" }, { status: 404 })

  let interviewerId = body.interviewerId
  if (!interviewerId && body.interviewerEmail) {
    const { data: interviewer } = await getSupabaseServerClient()
      .from("admin_users")
      .select("user_id, name, email")
      .eq("email", body.interviewerEmail.trim().toLowerCase())
      .eq("role", "interviewer")
      .maybeSingle()
    if (!interviewer) return NextResponse.json({ error: "No interviewer account found for that email" }, { status: 400 })
    interviewerId = interviewer.user_id
    body.interviewerName = interviewer.name
    body.interviewerEmail = interviewer.email
  }

  const updated = await updateResult(body.resultId, (current) => ({
    ...current,
    candidate: { 
      ...current.candidate, 
      ...(body.role ? { role: body.role } : {}), 
      ...(body.experience ? { experience: body.experience } : {}),
      ...(body.testLocation ? { testLocation: body.testLocation as any } : {}),
      ...(body.hiringLocation !== undefined ? { hiringLocation: body.hiringLocation || undefined } : {}), 
      ...(body.hiringStatus ? { hiringStatus: body.hiringStatus as CandidateResult["candidate"]["hiringStatus"] } : {}), 
      ...(body.expectedSalary !== undefined ? { expectedSalary: body.expectedSalary ?? undefined } : {}), 
      ...(body.offerSalary !== undefined ? { offerSalary: body.offerSalary ?? undefined } : {}), 
      ...(body.hrNotes !== undefined ? { hrNotes: body.hrNotes } : {}) 
    },
    assignedInterviewerId: interviewerId,
    assignedInterviewerName: body.interviewerName,
    assignedInterviewerEmail: body.interviewerEmail,
  }))

  if (result.candidate.id && (
    body.role !== undefined || 
    body.experience !== undefined ||
    body.testLocation !== undefined ||
    body.hiringLocation !== undefined || 
    body.hiringStatus !== undefined || 
    body.expectedSalary !== undefined || 
    body.offerSalary !== undefined || 
    body.hrNotes !== undefined
  )) {
    const supabase = getSupabaseServerClient();
    const candidateUpdates: any = {};

    if (body.role !== undefined) {
      const { data: rd } = await supabase.from("master_roles").select("id").eq("value", body.role.trim()).maybeSingle();
      if (rd) candidateUpdates.role = rd.id;
    }
    if (body.experience !== undefined) {
      const { data: ed } = await supabase.from("master_experiences").select("id").eq("value", body.experience.trim()).maybeSingle();
      if (ed) candidateUpdates.experience = ed.id;
    }
    if (body.testLocation !== undefined) {
      const { data: td } = await supabase.from("master_test_locations").select("id").eq("value", body.testLocation.trim()).maybeSingle();
      if (td) candidateUpdates.test_location = td.id;
    }
    if (body.hiringLocation !== undefined) {
      if (body.hiringLocation) {
        const { data: hd } = await supabase.from("master_hiring_locations").select("id").eq("value", body.hiringLocation.trim()).maybeSingle();
        candidateUpdates.hiring_location = hd?.id || body.hiringLocation;
      } else {
        candidateUpdates.hiring_location = null;
      }
    }
    if (body.hiringStatus !== undefined) candidateUpdates.hiring_status = body.hiringStatus;
    if (body.expectedSalary !== undefined) candidateUpdates.expected_salary = body.expectedSalary;
    if (body.offerSalary !== undefined) candidateUpdates.offer_salary = body.offerSalary;
    if (body.hrNotes !== undefined) candidateUpdates.hr_notes = body.hrNotes;

    const { error: candidateError } = await supabase
      .from("candidates")
      .update(candidateUpdates)
      .eq("id", result.candidate.id);

    if (candidateError) {
      return NextResponse.json({ error: `Could not save candidate table changes: ${candidateError.message}` }, { status: 400 })
    }

    // Sync exam_sessions configuration values as well
    if (candidateUpdates.role || candidateUpdates.experience) {
      const sessionUpdates: any = {};
      if (candidateUpdates.role) sessionUpdates.role = candidateUpdates.role;
      if (candidateUpdates.experience) sessionUpdates.experience = candidateUpdates.experience;

      await supabase
        .from("exam_sessions")
        .update(sessionUpdates)
        .eq("candidate_id", result.candidate.id);
    }
  }
  return NextResponse.json(updated)
}
