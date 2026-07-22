export type DateRangePreset = 'all' | 'today' | 'yesterday' | 'last_7' | 'last_30' | 'this_month' | 'last_month' | 'custom';

export interface DateRangeBounds {
  startDate: Date | null;
  endDate: Date | null;
}

/**
 * Gets the start and end Date bounds for a given range preset.
 * All bounds are normalized using UTC dates to ensure timezone-independent filtering.
 */
export function getDateRangeBounds(
  preset: DateRangePreset,
  customStart?: string, // YYYY-MM-DD
  customEnd?: string,   // YYYY-MM-DD
  referenceDate = new Date()
): DateRangeBounds {
  // Normalize reference date to UTC midnight
  const todayUTC = new Date(Date.UTC(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ));

  const start = new Date(todayUTC);
  const end = new Date(todayUTC);
  end.setUTCHours(23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return { startDate: start, endDate: end };
    case 'yesterday': {
      const yesterdayStart = new Date(start);
      yesterdayStart.setUTCDate(start.getUTCDate() - 1);
      const yesterdayEnd = new Date(end);
      yesterdayEnd.setUTCDate(end.getUTCDate() - 1);
      return { startDate: yesterdayStart, endDate: yesterdayEnd };
    }
    case 'last_7': {
      const start7 = new Date(start);
      start7.setUTCDate(start.getUTCDate() - 6); // Includes today
      return { startDate: start7, endDate: end };
    }
    case 'last_30': {
      const start30 = new Date(start);
      start30.setUTCDate(start.getUTCDate() - 29); // Includes today
      return { startDate: start30, endDate: end };
    }
    case 'this_month': {
      const startMonth = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 1, 0, 0, 0, 0));
      return { startDate: startMonth, endDate: end };
    }
    case 'last_month': {
      const startLastMonth = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      const endLastMonth = new Date(Date.UTC(todayUTC.getUTCFullYear(), todayUTC.getUTCMonth(), 0, 23, 59, 59, 999)); // Day 0 is last day of previous month
      return { startDate: startLastMonth, endDate: endLastMonth };
    }
    case 'custom': {
      let sDate: Date | null = null;
      let eDate: Date | null = null;
      if (customStart) {
        const [y, m, d] = customStart.split('-').map(Number);
        sDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      if (customEnd) {
        const [y, m, d] = customEnd.split('-').map(Number);
        eDate = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
      return { startDate: sDate, endDate: eDate };
    }
    case 'all':
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * Checks if a given date string or Date object falls within the specified start and end bounds.
 */
export function isWithinDateRange(
  dateInput: string | Date | undefined | null,
  bounds: DateRangeBounds
): boolean {
  if (!dateInput) return false;
  const targetTime = new Date(dateInput).getTime();
  
  if (isNaN(targetTime)) return false;

  if (bounds.startDate && targetTime < bounds.startDate.getTime()) {
    return false;
  }
  if (bounds.endDate && targetTime > bounds.endDate.getTime()) {
    return false;
  }
  return true;
}

/**
 * Reusable function to filter candidate results by a date range preset and custom bounds.
 */
export function filterResultsByDate<T extends { submittedAt?: string | Date }>(
  results: T[],
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): T[] {
  if (preset === 'all') return results;
  const bounds = getDateRangeBounds(preset, customStart, customEnd);
  return results.filter(r => isWithinDateRange(r.submittedAt, bounds));
}
