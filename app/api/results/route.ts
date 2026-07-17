import { NextRequest, NextResponse } from "next/server"
import { getAllResults, saveResult } from "@/lib/results"
import { randomUUID } from "crypto"
import type { Answer, Candidate } from "@/types"

export async function GET() {
  return NextResponse.json(getAllResults())
}

export async function POST(req: NextRequest) {
  const body: { candidate: Candidate; answers: Answer[]; tabSwitches?: number; secondsUsed?: number } =
    await req.json()

  const result = {
    id: randomUUID(),
    candidate: body.candidate,
    answers: body.answers,
    tabSwitches: body.tabSwitches ?? 0,
    secondsUsed: body.secondsUsed ?? 0,
    submittedAt: new Date().toISOString(),
  }

  saveResult(result)
  return NextResponse.json(result, { status: 201 })
}