import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Candidate } from "@/types"

let client: SupabaseClient | undefined

/**
 * Server-only Supabase client. Route handlers use the service-role key so
 * database writes are not dependent on browser-facing RLS policies.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
    )
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}

export type CandidateInput = {
  name: string
  mobile: string
  email: string
  role: string
  experience: string
  testLocation?: string
  hiringLocation?: string
  hiringStatus?: Candidate["hiringStatus"]
  expectedSalary?: number
  offerSalary?: number
  hrNotes?: string
}

export type CandidateRecord = CandidateInput & {
  id: string
  created_at: string
}

function mapCandidateRow(row: Record<string, unknown>): CandidateRecord {
  return {
    id: String(row.id),
    name: String(row.name),
    mobile: String(row.mobile),
    email: String(row.email),
    role: String(row.role),
    experience: String(row.experience),
    testLocation: (row.test_location as Candidate["testLocation"]) ?? "home",
    hiringLocation: (row.hiring_location as string | null) ?? undefined,
    hiringStatus: (row.hiring_status as Candidate["hiringStatus"]) ?? "screening",
    expectedSalary: row.expected_salary == null ? undefined : Number(row.expected_salary),
    offerSalary: row.offer_salary == null ? undefined : Number(row.offer_salary),
    hrNotes: (row.hr_notes as string | null) ?? undefined,
    created_at: String(row.created_at),
  }
}

export async function createCandidate(input: CandidateInput): Promise<CandidateRecord> {
  const { data, error } = await getSupabaseServerClient()
    .from("candidates")
    .insert({
      name: input.name,
      mobile: input.mobile,
      email: input.email,
      role: input.role,
      experience: input.experience,
      test_location: input.testLocation ?? "home",
      hiring_location: input.hiringLocation ?? null,
      hiring_status: input.hiringStatus ?? "screening",
      expected_salary: input.expectedSalary ?? null,
      offer_salary: input.offerSalary ?? null,
      hr_notes: input.hrNotes ?? null,
    })
    .select("id, name, mobile, email, role, experience, test_location, hiring_location, hiring_status, expected_salary, offer_salary, hr_notes, created_at")
    .single()

  if (error) throw new Error(`Could not save candidate: ${error.message}`)
  return mapCandidateRow(data as Record<string, unknown>)
}

export async function getCandidateById(id: string): Promise<CandidateRecord | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("candidates")
    .select("id, name, mobile, email, role, experience, test_location, hiring_location, hiring_status, expected_salary, offer_salary, hr_notes, created_at")
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Could not load candidate: ${error.message}`)
  if (!data) return null
  return mapCandidateRow(data as Record<string, unknown>)
}
