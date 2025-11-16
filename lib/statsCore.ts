import { redis } from "@/lib/redis";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import stableStringify from "json-stable-stringify";

export type RankingMetric =
  | "income"
  | "savings"
  | "expenses"
  | "net_worth"
  | "investment_value"
  | "stock_value_total"
  | "mutual_fund_total"
  | "real_estate_total_price"
  | "gold_value_estimate";

export const allowedMetrics: RankingMetric[] = [
  "income",
  "savings",
  "expenses",
  "net_worth",
  "investment_value",
  "stock_value_total",
  "mutual_fund_total",
  "real_estate_total_price",
  "gold_value_estimate",
];

export function getMetricValue(row: any, metric: RankingMetric): number | null {
  switch (metric) {
    case "income": return row.income_yearly ?? null;
    case "savings": return row.savings_total ?? null;
    case "expenses": return row.monthly_expenses ?? null;
    case "net_worth": return row.net_worth ?? null;
    case "stock_value_total": return row.stock_value_total ?? null;
    case "mutual_fund_total": return row.mutual_fund_total ?? null;
    case "real_estate_total_price": return row.real_estate_total_price ?? null;
    case "gold_value_estimate": return row.gold_value_estimate ?? null;
    case "investment_value":
      const total =
        (row.savings_total ?? 0) +
        (row.stock_value_total ?? 0) +
        (row.mutual_fund_total ?? 0) +
        (row.real_estate_total_price ?? 0) +
        (row.gold_value_estimate ?? 0);
      return total || null;
    default:
      return null;
  }
}

// Percentile calculator
export function calculatePercentileStanding(sorted: number[], v: number): number {
  if (!sorted.length) return 0;
  let low = 0;
  let high = sorted.length - 1;

  if (v <= sorted[0]) return 0;
  if (v >= sorted[high]) return 100;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] === v) return (mid / sorted.length) * 100;
    if (sorted[mid] < v) low = mid + 1;
    else high = mid - 1;
  }

  return (low / sorted.length) * 100;
}

const SNAPSHOT_TTL = 60 * 60; // 1h

export async function buildMetricSnapshot(metric: RankingMetric) {
  const cacheKey = `snapshot:${metric}`;
  const cached = await redis.get(cacheKey);

  if (cached) return cached as { rows: any[]; values: number[] };

  const select = `
    id, region, income_bracket,
    income_yearly, savings_total, monthly_expenses,
    net_worth, stock_value_total, mutual_fund_total,
    real_estate_total_price, gold_value_estimate
  `;

  const { data, error } = await supabaseServer
    .from("submissions")
    .select(select);

  if (error || !data) {
    logger.error("Snapshot fetch error", { metric, error });
    return { rows: [], values: [] };
  }

  const rows = data;
  const values = rows
    .map((r) => getMetricValue(r, metric))
    .filter((n): n is number => typeof n === "number");

  const snapshot = { rows, values };

  await redis.set(cacheKey, snapshot, { ex: SNAPSHOT_TTL });

  return snapshot;
}
