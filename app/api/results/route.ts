import { NextRequest, NextResponse } from "next/server"
import { getAllResults, saveResult } from "@/lib/results"
import { randomUUID } from "crypto"
import type { Answer, Candidate } from "@/types"

export async function GET() {
  try {
    return NextResponse.json(await getAllResults())
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load results"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: { candidate?: Candidate; answers?: Answer[]; tabSwitches?: number; secondsUsed?: number } =
      await req.json()

    if (!body.candidate?.id || !Array.isArray(body.answers)) {
      return NextResponse.json({ error: "A saved candidate and answers are required." }, { status: 400 })
    }

    const result = {
      id: randomUUID(),
      candidate: body.candidate,
      answers: body.answers,
      tabSwitches: body.tabSwitches ?? 0,
      secondsUsed: body.secondsUsed ?? 0,
      submittedAt: new Date().toISOString(),
    }

    await saveResult(result)
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save assessment result"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
