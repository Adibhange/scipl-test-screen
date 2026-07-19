import { NextRequest, NextResponse } from "next/server"
import { getCurrentAdmin, canReviewRound } from "@/lib/admin-auth"
import { ensureInterviewRounds } from "@/lib/interview-rounds"
import { getResultById, updateResult } from "@/lib/results"
import type { InterviewDecision, InterviewRoundKey } from "@/types"

export async function PATCH(request: NextRequest) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body: { resultId?: string; round?: InterviewRoundKey; status?: InterviewDecision; remarks?: string } = await request.json()
  if (!body.resultId || !body.round || !body.status || !["face_to_face", "assessment", "director"].includes(body.round) || !["pending", "pass", "fail"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid round review" }, { status: 400 })
  }
  if (!canReviewRound(admin.role, body.round)) return NextResponse.json({ error: "You cannot review this round" }, { status: 403 })

  const result = await getResultById(body.resultId)
  if (!result) return NextResponse.json({ error: "Candidate result not found" }, { status: 404 })
  if (admin.role === "interviewer" && result.assignedInterviewerId !== admin.userId) return NextResponse.json({ error: "Candidate is not assigned to you" }, { status: 403 })

  const rounds = ensureInterviewRounds(result)
  const sequence: InterviewRoundKey[] = ["face_to_face", "assessment", "director"]
  const index = sequence.indexOf(body.round)

  for (let i = 0; i < index; i++) {
    if (rounds[sequence[i]].status === "fail") {
      return NextResponse.json(
        { error: "Cannot update feedback: a previous round in the sequence is marked as FAIL." },
        { status: 400 }
      )
    }
  }

  if (index > 0 && rounds[sequence[index - 1]].status !== "pass") {
    return NextResponse.json({ error: "The previous round must be passed first" }, { status: 409 })
  }

  const updated = await updateResult(body.resultId, (current) => ({
    ...current,
    interviewRounds: {
      ...ensureInterviewRounds(current),
      [body.round!]: {
        status: body.status!,
        remarks: body.remarks?.trim(),
        interviewerId: admin.userId,
        interviewerName: admin.name,
        interviewerEmail: admin.email,
        updatedAt: new Date().toISOString(),
      },
    },
  }))
  return NextResponse.json(updated)
}
