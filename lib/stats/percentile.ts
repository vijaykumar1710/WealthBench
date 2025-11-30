/**
 * Binary-search based percentile calculator.
 * Returns percentile in [0,100].
 *
 * sorted must be ascending.
 */
export function calculatePercentile(sorted: number[], v: number): number {
  if (!Array.isArray(sorted) || sorted.length === 0) return 0;
  const n = sorted.length;

  if (v <= sorted[0]) return 0;
  if (v >= sorted[n - 1]) return 100;

  let low = 0;
  let high = n - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] === v) {
      // position-based percentile (mid index / n) * 100
      return (mid / n) * 100;
    }
    if (sorted[mid] < v) low = mid + 1;
    else high = mid - 1;
  }

  return (low / n) * 100;
}
