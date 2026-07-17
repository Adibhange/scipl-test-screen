import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: NextRequest) {
  const body = await req.json()

  const candidate = await db.candidate.create({
    data: {
      name: body.name,
      mobile: body.mobile,
      email: body.email,
      role: body.role,
      experience: body.experience,
    },
  })

  return NextResponse.json(candidate, { status: 201 })
}