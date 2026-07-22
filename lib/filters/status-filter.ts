/**
 * Filters results by evaluation status.
 * 'pending' matches results without total marks awarded.
 * 'evaluated' matches results with total marks awarded.
 */
export function filterResultsByStatus<T extends { totalMarksAwarded?: number }>(
  results: T[],
  status?: string | null
): T[] {
  if (!status || status === "all") return results;

  if (status === "pending") {
    return results.filter((result) => result.totalMarksAwarded === undefined);
  }
  if (status === "evaluated") {
    return results.filter((result) => result.totalMarksAwarded !== undefined);
  }
  return results;
}
