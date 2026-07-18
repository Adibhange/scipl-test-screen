import type { CandidateResult } from "@/types"
import { getSupabaseServerClient } from "@/lib/db"

type ResultRow = { id: string; payload: CandidateResult }

export async function getAllResults(): Promise<CandidateResult[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("results")
    .select("id, payload")
    .order("created_at", { ascending: false })

  if (error) throw new Error(`Could not load results: ${error.message}`)
  return (data as ResultRow[] | null ?? []).map((row) => row.payload)
}

export async function getResultById(id: string): Promise<CandidateResult | undefined> {
  const { data, error } = await getSupabaseServerClient()
    .from("results")
    .select("id, payload")
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Could not load result: ${error.message}`)
  return (data as ResultRow | null)?.payload
}

export async function saveResult(result: CandidateResult): Promise<void> {
  const { error } = await getSupabaseServerClient().from("results").upsert(
    {
      id: result.id,
      payload: result,
      created_at: result.submittedAt,
    },
    { onConflict: "id" },
  )

  if (error) throw new Error(`Could not save assessment result: ${error.message}`)
}

export async function updateResult(
  id: string,
  updater: (result: CandidateResult) => CandidateResult,
): Promise<CandidateResult | undefined> {
  const existing = await getResultById(id)
  if (!existing) return undefined

  const updated = updater(existing)
  await saveResult(updated)
  return updated
}
