/**
 * Filters results by candidate role.
 */
export function filterResultsByRole<T extends { candidate: { role: string } }>(
  results: T[],
  role?: string | null
): T[] {
  if (!role || role === "all") return results;
  return results.filter((result) => result.candidate?.role === role);
}
