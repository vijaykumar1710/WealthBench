import { redis } from "@/lib/redis";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { CACHE_KEYS, TTL } from "@/lib/stats/cacheKeys";
import { getMetricValue, RankingMetric } from "@/lib/stats/metrics";

/**
 * Return a snapshot object { values: number[] } for a given metric.
 * Uses Redis first; falls back to DB and writes cache.
 */
export async function loadMetricSnapshot(metric: RankingMetric): Promise<{ values: number[] }> {
  const cacheKey = CACHE_KEYS.metricSnapshotKey(metric);

  // 1) Try Redis first
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (parsed && Array.isArray(parsed.values)) {
        return { values: parsed.values as number[] };
      }
    }
  } catch (err) {
    logger.warn("redis get metric snapshot failed", { metric, err });
  }

  // 2) Paginated fetch from Supabase
  try {
    const pageSize =
      Number(process.env.SUPABASE_PAGE_SIZE ?? "") > 0
        ? Number(process.env.SUPABASE_PAGE_SIZE)
        : 1000;

    const cols = `
      id,
      income_yearly, savings_total, monthly_expenses,
      net_worth, stock_value_total,
      mutual_fund_total, real_estate_total_price,
      gold_value_estimate
    `;

    let allRows: any[] = [];
    let start = 0;

    while (true) {
      const end = start + pageSize - 1;

      const { data, error } = await supabaseServer
        .from("submissions")
        .select(cols)
        .range(start, end);

      if (error) {
        logger.error("metric snapshot paginated load error", { metric, start, end, error });
        break;
      }

      if (!data || data.length === 0) break;

      allRows = allRows.concat(data);

      if (data.length < pageSize) break; // last page reached

      start = end + 1;
    }

    // Extract numeric values
    const values = allRows
      .map((r: any) => getMetricValue(r, metric))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
      .sort((a, b) => a - b);

    const snapshot = { values };

    // Write to Redis
    try {
      await redis.set(cacheKey, JSON.stringify(snapshot), { ex: TTL.METRIC_SNAPSHOT });
    } catch (err) {
      logger.warn("redis set metric snapshot failed", { metric, err });
    }

    return snapshot;
  } catch (err) {
    logger.error("metric snapshot fatal error", { metric, err });
    return { values: [] };
  }
}


/**
 * Load a submissions snapshot (all submissions) for dashboard cohorts and facet building.
 * Attempts Redis first (key: SUBMISSIONS_SNAPSHOT), falls back to DB.
 */
export async function loadAllSubmissionsSnapshot(): Promise<any[]> {
  const key = CACHE_KEYS.SUBMISSIONS_SNAPSHOT;

  // try redis first
  try {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    logger.warn("redis get submissions snapshot failed", { err, key });
  }

  // fallback to paginated DB fetch
  const pageSize =
    Number(process.env.SUPABASE_PAGE_SIZE ?? "") > 0 ? Number(process.env.SUPABASE_PAGE_SIZE) : 1000;

  const select = `
    id, age, yoe, city, occupation,
    income_yearly, savings_total, monthly_expenses,
    net_worth, stock_value_total, mutual_fund_total,
    real_estate_total_price, gold_value_estimate,
    additional_metrics
  `;

  let allRows: any[] = [];
  let start = 0;
  let page = 0;

  try {
    while (true) {
      const end = start + pageSize - 1;
      page += 1;
      logger.debug("Fetching submissions page", { page, start, end, pageSize });

      const { data, error } = await supabaseServer
        .from("submissions")
        .select(select)
        .range(start, end);

      if (error) {
        logger.error("Submissions paginated fetch error", { page, start, end, error });
        // return what we have (or empty) — safer than failing hard
        break;
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        // no more rows
        break;
      }

      allRows = allRows.concat(data);

      // if page is incomplete, we've reached the end
      if (data.length < pageSize) break;

      // prepare next page
      start = end + 1;
    }

    // cache the full snapshot in redis (stringified)
    try {
      await redis.set(key, JSON.stringify(allRows), { ex: TTL.SUBMISSIONS_SNAPSHOT });
    } catch (err) {
      logger.warn("redis set submissions snapshot failed", { err, key });
    }

    return allRows;
  } catch (err) {
    logger.error("loadAllSubmissionsSnapshot fatal", { err });
    return [];
  }
}
