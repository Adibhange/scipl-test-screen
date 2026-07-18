import { NextRequest, NextResponse } from "next/server"
import { createCandidate } from "@/lib/db"

const requiredFields = ["name", "mobile", "email", "role", "experience"] as const

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (
      !body ||
      requiredFields.some((field) => typeof body[field] !== "string" || !body[field].trim())
    ) {
      return NextResponse.json({ error: "All candidate fields are required." }, { status: 400 })
    }

    const candidate = await createCandidate({
      name: body.name.trim(),
      mobile: body.mobile.trim(),
      email: body.email.trim().toLowerCase(),
      role: body.role.trim(),
      experience: body.experience.trim(),
    })

    return NextResponse.json(candidate, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create candidate"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
