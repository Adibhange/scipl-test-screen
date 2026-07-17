import fs from "fs"
import path from "path"
import type { CandidateResult } from "@/types"

const RESULTS_PATH = path.join(process.cwd(), "data", "results.json")

function ensureFile() {
  if (!fs.existsSync(RESULTS_PATH)) {
    fs.writeFileSync(RESULTS_PATH, "[]")
    return
  }
  const content = fs.readFileSync(RESULTS_PATH, "utf-8").trim()
  if (!content) {
    fs.writeFileSync(RESULTS_PATH, "[]")
  }
}

export function getAllResults(): CandidateResult[] {
  ensureFile()
  const raw = fs.readFileSync(RESULTS_PATH, "utf-8")
  try {
    return JSON.parse(raw)
  } catch {
    // corrupted file — reset it rather than crash the app
    fs.writeFileSync(RESULTS_PATH, "[]")
    return []
  }
}

export function getResultById(id: string): CandidateResult | undefined {
  return getAllResults().find((r) => r.id === id)
}

export function saveResult(result: CandidateResult) {
  const results = getAllResults()
  results.push(result)
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))
}

export function updateResult(
  id: string,
  updater: (result: CandidateResult) => CandidateResult,
): CandidateResult | undefined {
  const results = getAllResults()
  const index = results.findIndex((result) => result.id === id)

  if (index === -1) return undefined

  const updated = updater(results[index])
  results[index] = updated
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2))

  return updated
}
