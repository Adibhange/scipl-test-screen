import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { createCandidate, getSupabaseServerClient } from "@/lib/db";
import { saveResult } from "@/lib/results";
import { emptyInterviewRounds } from "@/lib/interview-rounds";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin || admin.role !== "hr") {
    return NextResponse.json({ error: "HR access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { firstName, lastName, mobile, email, role, experience, testLocation, hiringLocation, vacancyId } = body;

    if (!firstName || !lastName || !mobile || !email || !role || !experience) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();

    // 1. Resolve role & experience values to UUIDs
    const { data: roleData, error: roleError } = await supabase
      .from("master_roles")
      .select("id")
      .eq("value", role.trim())
      .single();

    const { data: expData, error: expError } = await supabase
      .from("master_experiences")
      .select("id")
      .eq("value", experience.trim())
      .single();

    if (roleError || expError || !roleData || !expData) {
      throw new Error("Could not resolve role or experience pre-registration master values");
    }

    // 2. Implement the 3-month reapplication lockout gateway
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: existingApps } = await supabase
      .from("candidates")
      .select("id, created_at")
      .eq("role", roleData.id)
      .or(`email.ilike.${email.trim()},mobile.eq.${mobile.trim()}`)
      .gt("created_at", threeMonthsAgo.toISOString());

    if (existingApps && existingApps.length > 0) {
      return NextResponse.json(
        { error: "Application restriction: This candidate has already applied for this position within the last 3 months." },
        { status: 400 }
      );
    }

    // 3. Create candidate record in database
    const candidate = await createCandidate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      experience: experience.trim(),
      testLocation: testLocation || "home",
      hiringLocation: hiringLocation || undefined,
      vacancyId: vacancyId || undefined,
    });

    // 4. Create exam session record in database (using boolean types)
    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .insert({
        candidate_id: candidate.id,
        role: roleData.id,
        experience: expData.id,
        is_exam_started: false,
        is_exam_submitted: false,
        active_session_token: `${candidate.id}-${Date.now()}`,
        seconds_used: 0,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      throw new Error(`Could not create exam session: ${sessionError?.message || "unknown error"}`);
    }

    // 5. Create placeholder result record mapped to the exam session
    const placeholderResult = {
      id: session.id, // Map directly to exam_sessions.id
      candidate: {
        id: candidate.id,
        name: `${candidate.firstName} ${candidate.lastName}`.trim(),
        mobile: candidate.mobile,
        email: candidate.email,
        role: candidate.role,
        experience: candidate.experience,
        testLocation: candidate.testLocation,
        hiringLocation: candidate.hiringLocation,
        hiringStatus: "screening" as const,
        vacancyId: candidate.vacancyId,
      },
      answers: [],
      tabSwitches: 0,
      secondsUsed: 0,
      submittedAt: new Date().toISOString(),
      interviewRounds: emptyInterviewRounds(),
    };

    await saveResult(placeholderResult);

    return NextResponse.json(
      { candidate, result: placeholderResult },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pre-register candidate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
