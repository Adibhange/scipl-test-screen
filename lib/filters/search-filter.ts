import type { CandidateResult } from "@/types";

/**
 * Filters results by search term matching candidate name or email only.
 * Case-insensitive, space-trimmed.
 */
export function filterCandidatesBySearch<T extends { candidate: { name: string; email: string } }>(
  results: T[],
  searchTerm?: string | null
): T[] {
  if (!searchTerm) return results;
  const cleaned = searchTerm.trim().toLowerCase();
  if (!cleaned) return results;

  return results.filter((result) => {
    const name = result.candidate?.name?.toLowerCase() || "";
    const email = result.candidate?.email?.toLowerCase() || "";
    return name.includes(cleaned) || email.includes(cleaned);
  });
}
