import type { CandidateResult } from "@/types";
import { filterCandidatesBySearch } from "./search-filter";
import { filterResultsByDate, type DateRangePreset } from "./date-filter";
import { filterResultsByStatus } from "./status-filter";
import { filterResultsByRole } from "./role-filter";

export * from "./search-filter";
export * from "./date-filter";
export * from "./status-filter";
export * from "./role-filter";

export interface FilterOptions {
  status?: string | null;
  role?: string | null;
  round?: string | null;
  testLocation?: string | null;
  searchTerm?: string | null;
  dateRange?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export function getCurrentRoundKey(
	result: CandidateResult,
): "face_to_face" | "assessment" | "director" {
	const rounds = result.interviewRounds;
	if (!rounds || rounds.face_to_face.status !== "pass") return "face_to_face";
	if (rounds.assessment.status !== "pass") return "assessment";
	return "director";
}

/**
 * Unified candidate results filter pipeline.
 * Runs Search, Date, Role, Status, and location/round filters sequentially,
 * then sorts by submission date descending.
 */
export function filterResults(
  results: CandidateResult[],
  options: FilterOptions
): CandidateResult[] {
  let filtered = results;

  // 1. Search Filter (restrict to Candidate name and email only)
  filtered = filterCandidatesBySearch(filtered, options.searchTerm);

  // 2. Date Filter
  if (options.dateRange) {
    filtered = filterResultsByDate(
      filtered,
      options.dateRange as DateRangePreset,
      options.startDate || undefined,
      options.endDate || undefined
    );
  }

  // 3. Role Filter
  filtered = filterResultsByRole(filtered, options.role);

  // 4. Status Filter
  filtered = filterResultsByStatus(filtered, options.status);

  // 5. Round Filter
  if (options.round && options.round !== "all") {
    filtered = filtered.filter((r) => getCurrentRoundKey(r) === options.round);
  }

  // 6. Test Location Filter
  if (options.testLocation && options.testLocation !== "all") {
    filtered = filtered.filter(
      (r) => (r.candidate.testLocation ?? "home") === options.testLocation
    );
  }

  // 7. Sorting: Order by submission date descending
  filtered = [...filtered].sort((a, b) => {
    const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return dateB - dateA;
  });

  return filtered;
}
