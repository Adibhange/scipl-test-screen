import { createClient, type SupabaseClient } from "@supabase/supabase-js"

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
}

export type CandidateRecord = CandidateInput & {
  id: string
  created_at: string
}

export async function createCandidate(input: CandidateInput): Promise<CandidateRecord> {
  const { data, error } = await getSupabaseServerClient()
    .from("candidates")
    .insert(input)
    .select("id, name, mobile, email, role, experience, created_at")
    .single()

  if (error) throw new Error(`Could not save candidate: ${error.message}`)
  return data as CandidateRecord
}
