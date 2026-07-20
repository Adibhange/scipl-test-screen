import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { candidateId, violationType = "tab_switch" } = await request.json();

    if (!candidateId) {
      return NextResponse.json({ error: "candidateId is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // Find exam session for this candidate
    const { data: session, error: sessionError } = await supabase
      .from("exam_sessions")
      .select("id")
      .eq("candidate_id", candidateId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ error: "No active exam session found" }, { status: 404 });
    }

    // Insert proctoring log
    const { error: logError } = await supabase
      .from("proctoring_logs")
      .insert({
        exam_session_id: session.id,
        violation_type: violationType,
      });

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
