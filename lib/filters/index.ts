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
  evaluation?: string | null;
  role?: string | null;
  round?: string | null;
  hiringStatus?: string | null;
  hiringLocation?: string | null;
  searchTerm?: string | null;
  dateRange?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

import { getCurrentRound, calculateCandidateWorkflowStatus } from "@/lib/interview-workflow";

export function getCurrentRoundKey(
	result: CandidateResult,
): "face_to_face" | "assessment" | "director" {
	const round = getCurrentRound(result);
	return round === "completed" ? "director" : round;
}

export function computeCandidateStatus(r: CandidateResult): "rejected" | "hired" | "on_hold" | "in_interview" | "screening" {
	const status = calculateCandidateWorkflowStatus(r);
	if (status === "interviewing") {
		return "in_interview";
	}
	return status;
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

  // 4. Evaluation Status Filter
  filtered = filterResultsByStatus(filtered, options.evaluation);

  // 4b. Hiring Status Filter
  if (options.hiringStatus && options.hiringStatus !== "all") {
    filtered = filtered.filter((r) => {
      const computed = computeCandidateStatus(r);
      const filterVal = (options.hiringStatus === "hold" || options.hiringStatus === "on_hold") ? "on_hold" : options.hiringStatus;
      return computed === filterVal;
    });
  }

  // 5. Round Filter
  if (options.round && options.round !== "all") {
    filtered = filtered.filter((r) => getCurrentRoundKey(r) === options.round);
  }

  // 6. Hiring Location Filter
  if (options.hiringLocation && options.hiringLocation !== "all") {
    filtered = filtered.filter(
      (r) => r.candidate.hiringLocation === options.hiringLocation
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
