import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db";
import { emptyInterviewRounds } from "@/lib/interview-rounds";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const role = req.nextUrl.searchParams.get("role")?.trim();
  const experience = req.nextUrl.searchParams.get("experience")?.trim();

  if (!email) {
    return NextResponse.json(
      { error: "email is a required query parameter" },
      { status: 400 },
    );
  }

  // Join master configuration tables to resolve UUID to string and select split names
  const { data: candidateRow, error: candidateError } = await getSupabaseServerClient()
    .from("candidates")
    .select(`
      id, first_name, last_name, mobile, 
      roleObj:master_roles(value),
      experienceObj:master_experiences(value),
      testLocObj:master_test_locations(value)
    `)
    .ilike("email", email)
    .maybeSingle();

  if (candidateError || !candidateRow) {
    return NextResponse.json(
      { error: "You are not pre-registered. Please contact HR." },
      { status: 403 },
    );
  }

  const roleVal = (candidateRow as any).roleObj?.value || "";
  const expVal = (candidateRow as any).experienceObj?.value || "";
  const testLocVal = (candidateRow as any).testLocObj?.value || "home";

  if (role && experience) {
    if (roleVal.toLowerCase().trim() !== role.toLowerCase().trim() || expVal.toLowerCase().trim() !== experience.toLowerCase().trim()) {
      return NextResponse.json(
        { error: `Mismatch: You are registered for the "${roleVal}" role with "${expVal}" years of experience. Please select these options.` },
        { status: 403 },
      );
    }
  }

  // Look up session by candidate id (using boolean flags)
  const supabase = getSupabaseServerClient();
  const { data: session } = await supabase
    .from("exam_sessions")
    .select("id, is_exam_submitted")
    .eq("candidate_id", candidateRow.id)
    .maybeSingle();

  if (!session) {
    return NextResponse.json(
      { error: "No active exam session found. Please contact HR." },
      { status: 403 },
    );
  }

  const { data: resultRecord } = await supabase
    .from("results")
    .select("interview_rounds")
    .eq("id", session.id)
    .maybeSingle();

  if (!resultRecord) {
    return NextResponse.json(
      { error: "No screening review found. Please contact HR." },
      { status: 403 },
    );
  }

  const rounds = resultRecord.interview_rounds || {};
  const hasFailed = Object.values(rounds).some((r: any) => r?.status === "fail");
  if (hasFailed) {
    return NextResponse.json(
      { error: "Application Process Terminated" },
      { status: 403 },
    );
  }

  const faceToFaceStatus = (rounds as any)?.face_to_face?.status;
  if (faceToFaceStatus !== "pass") {
    return NextResponse.json(
      { error: "You have not cleared the face-to-face screening round yet." },
      { status: 403 },
    );
  }

  const completed = session.is_exam_submitted === true;

  return NextResponse.json({
    completed,
    candidate: {
      id: candidateRow.id,
      name: `${candidateRow.first_name} ${candidateRow.last_name}`.trim(),
      mobile: candidateRow.mobile,
      role: roleVal,
      experience: expVal,
      testLocation: testLocVal,
    }
  });
}

const requiredFields = [
  "firstName",
  "lastName",
  "mobile",
  "email",
  "vacancyId",
  "testLocation",
] as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (
      !body ||
      requiredFields.some(
        (field) => typeof body[field] !== "string" || !body[field].trim(),
      )
    ) {
      return NextResponse.json(
        { error: "All candidate fields are required." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const vacancyId = body.vacancyId.trim();
    const testLocation = body.testLocation.trim();

    // Query candidates joining master config lookups and selecting split names
    const supabase = getSupabaseServerClient();
    const { data: existingRow, error: checkError } = await supabase
      .from("candidates")
      .select(`
        id, first_name, last_name, mobile, email, hiring_status, vacancy_id,
        roleObj:master_roles(id, value),
        experienceObj:master_experiences(value),
        testLocObj:master_test_locations(value),
        hiringLocObj:master_hiring_locations(value)
      `)
      .ilike("email", email)
      .maybeSingle();

    if (checkError || !existingRow) {
      return NextResponse.json(
        { error: "You are not pre-registered. Please contact HR." },
        { status: 403 },
      );
    }

    const roleVal = (existingRow as any).roleObj?.value || "";
    const expVal = (existingRow as any).experienceObj?.value || "";
    const testLocVal = (existingRow as any).testLocObj?.value || "home";
    const hiringLocVal = (existingRow as any).hiringLocObj?.value || undefined;

    if (existingRow.vacancy_id !== vacancyId) {
      return NextResponse.json(
        { error: "Mismatch: You are registered for a different vacancy. Please contact HR or select the correct vacancy." },
        { status: 403 },
      );
    }

    // Check 3-month reapplication lockout gateway
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: existingApps } = await supabase
      .from("candidates")
      .select("id, created_at")
      .eq("role", (existingRow as any).roleObj?.id)
      .neq("id", existingRow.id)
      .or(`email.ilike.${email.trim()},mobile.eq.${existingRow.mobile}`)
      .gt("created_at", threeMonthsAgo.toISOString());

    if (existingApps && existingApps.length > 0) {
      return NextResponse.json(
        { error: "Application restriction: You have already applied for this position within the last 3 months." },
        { status: 400 }
      );
    }

    // Lookup session for candidate (using boolean flags)
    let { data: session } = await supabase
      .from("exam_sessions")
      .select("id, is_exam_submitted")
      .eq("candidate_id", existingRow.id)
      .maybeSingle();

    if (!session) {
      return NextResponse.json(
        { error: "No active exam session found. Please contact HR." },
        { status: 403 },
      );
    }

    const { data: resultRecord } = await supabase
      .from("results")
      .select("interview_rounds")
      .eq("id", session.id)
      .maybeSingle();

    if (!resultRecord) {
      return NextResponse.json(
        { error: "No screening review found. Please contact HR." },
        { status: 403 },
      );
    }

    const rounds = resultRecord.interview_rounds || {};
    const faceToFaceStatus = (rounds as any)?.face_to_face?.status;

    if (faceToFaceStatus !== "pass") {
      return NextResponse.json(
        { error: "You have not cleared the face-to-face screening round yet." },
        { status: 403 },
      );
    }

    if (session.is_exam_submitted === true) {
      return NextResponse.json(
        {
          error:
            "You have already completed the assessment for this specific vacancy.",
        },
        { status: 403 },
      );
    }

    // Generate new session token (takeover active session)
    const newToken = `${existingRow.id}-${Date.now()}`;
    const { error: sessionError } = await supabase
      .from("exam_sessions")
      .update({
        active_session_token: newToken,
      })
      .eq("candidate_id", existingRow.id);

    if (sessionError) {
      console.error("Update session token error:", sessionError.message);
    }

    return NextResponse.json(
      {
        id: existingRow.id,
        name: `${existingRow.first_name} ${existingRow.last_name}`.trim(),
        mobile: existingRow.mobile,
        email: existingRow.email,
        role: roleVal,
        experience: expVal,
        testLocation: testLocVal,
        hiringLocation: hiringLocVal,
        hiringStatus: existingRow.hiring_status ?? "screening",
        active_session_token: newToken,
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register candidate";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
