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
    await getSupabaseServerClient().from("candidates").update({
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.experience !== undefined ? { experience: body.experience } : {}),
      ...(body.testLocation !== undefined ? { test_location: body.testLocation } : {}),
      ...(body.hiringLocation !== undefined ? { hiring_location: body.hiringLocation || null } : {}),
      ...(body.hiringStatus !== undefined ? { hiring_status: body.hiringStatus } : {}),
      ...(body.expectedSalary !== undefined ? { expected_salary: body.expectedSalary } : {}),
      ...(body.offerSalary !== undefined ? { offer_salary: body.offerSalary } : {}),
      ...(body.hrNotes !== undefined ? { hr_notes: body.hrNotes } : {}),
    }).eq("id", result.candidate.id)
  }
  return NextResponse.json(updated)
}
