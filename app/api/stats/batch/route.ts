import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";
import { Submission } from "@/types/submission";
import { supabaseServer } from "@/lib/supabaseServer";

const redis = Redis.fromEnv();
const METRIC_SNAPSHOT_TTL = 60 * 60; // 1 hour

type RankingMetric =
  | "income"
  | "savings"
  | "expenses"
  | "net_worth"
  | "investment_value"
  | "stock_value_total"
  | "mutual_fund_total"
  | "real_estate_total_price"
  | "gold_value_estimate";

function toNumberArray(values: (number | null | undefined)[]) {
  return values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
}

function getMetricValue(sub: Submission, metric: RankingMetric): number | null {
  switch (metric) {
    case "income": return sub.income_yearly ?? null;
    case "savings": return sub.savings_total ?? null;
    case "expenses": return sub.monthly_expenses ?? null;
    case "net_worth": return sub.net_worth ?? null;
    case "stock_value_total": return sub.stock_value_total ?? null;
    case "mutual_fund_total": return sub.mutual_fund_total ?? null;
    case "real_estate_total_price": return sub.real_estate_total_price ?? null;
    case "gold_value_estimate": return sub.gold_value_estimate ?? null;
    case "investment_value": {
      const s = sub.savings_total ?? 0;
      const st = sub.stock_value_total ?? 0;
      const mf = sub.mutual_fund_total ?? 0;
      const re = sub.real_estate_total_price ?? 0;
      const g = sub.gold_value_estimate ?? 0;
      const total = s + st + mf + re + g;
      return total > 0 ? total : null;
    }
    default: return null;
  }
}

function round(v: number, p = 2) { return parseFloat(v.toFixed(p)); }

function calculatePercentileStanding(sorted: number[], target: number) {
  if (!sorted.length) return 0;
  const n = sorted.length;
  if (target <= sorted[0]) return 0;
  if (target >= sorted[n - 1]) return 100;
  for (let i = 0; i < n; i += 1) {
    const v = sorted[i];
    if (target === v) return round(((i + 0.5) / n) * 100, 2);
    if (target < v && i > 0) {
      const lower = sorted[i - 1];
      const lowerPct = ((i - 0.5) / n) * 100;
      const upperPct = ((i + 0.5) / n) * 100;
      const span = v - lower || 1;
      const frac = (target - lower) / span;
      return round(Math.max(0, Math.min(100, lowerPct + frac * (upperPct - lowerPct))), 2);
    }
  }
  return 100;
}

async function loadSnapshot(metric: RankingMetric) {
  const key = `metric_snapshot:${metric}`;
  try {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
      return parsed as { values: number[]; rows: Submission[] };
    }
  } catch (err) {
    logger.warn("redis get snapshot failed", { metric, err });
  }

  const cols = "id, age, city, occupation, yoe, income_yearly, savings_total, monthly_expenses, net_worth, stock_value_total, mutual_fund_total, real_estate_total_price, gold_value_estimate, additional_metrics";
  const { data, error } = await supabaseServer.from("submissions").select(cols);
  if (error || !data) {
    logger.error("Failed to load submissions for batch snapshot", { error });
    return { values: [], rows: [] as Submission[] };
  }
  const rows = data as Submission[];
  const values = toNumberArray(rows.map((r) => getMetricValue(r, metric)));
  try {
    await redis.set(key, JSON.stringify({ values, rows }), { ex: METRIC_SNAPSHOT_TTL });
  } catch (err) {
    logger.warn("redis set snapshot failed", { err });
  }
  return { values, rows };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const rawMetrics = body.metrics as Record<string, unknown> | undefined;
    const metrics: Partial<Record<RankingMetric, number>> = {};
    if (rawMetrics) {
      for (const [k, v] of Object.entries(rawMetrics)) {
        if (typeof k !== "string") continue;
        if (![
          "income",
          "savings",
          "expenses",
          "net_worth",
          "investment_value",
          "stock_value_total",
          "mutual_fund_total",
          "real_estate_total_price",
          "gold_value_estimate",
        ].includes(k)) continue;
        const numeric = typeof v === "number" ? v : Number(v);
        if (!Number.isFinite(numeric)) continue;
        metrics[k as RankingMetric] = numeric;
      }
    }

    if (!Object.keys(metrics).length) {
      return NextResponse.json({ success: false, error: "No valid metrics provided" }, { status: 400 });
    }

    const region = typeof body.region === "string" ? body.region : "";
    const incomeBracket = typeof body.income_bracket === "string" ? body.income_bracket : "";
    const city = typeof body.city === "string" ? body.city : "";
    const occupation = typeof body.occupation === "string" ? body.occupation : "";
    const ageBucket = typeof body.age === "string" ? body.age : "";
    const yoe = typeof body.yoe === "string" ? body.yoe : "";

    const out: Record<string, { value: number; percentile: number; city_percentile?: number | null; occupation_percentile?: number | null; age_percentile?: number | null; yoe_percentile?: number | null }> = {};

    for (const metricKey of Object.keys(metrics) as RankingMetric[]) {
      const val = metrics[metricKey]!;
      const snapshot = await loadSnapshot(metricKey);
      const sorted = snapshot.values.slice().sort((a, b) => a - b);
      const percentile = calculatePercentileStanding(sorted, val);

      let cityPct: number | null = null;
      if (city) {
        const list = toNumberArray(snapshot.rows.filter((r) => (r.city || "") === city).map((r) => getMetricValue(r, metricKey))).sort((a, b) => a - b);
        if (list.length) cityPct = calculatePercentileStanding(list, val);
      }

      let occPct: number | null = null;
      if (occupation) {
        const list = toNumberArray(snapshot.rows.filter((r) => (r.occupation || "") === occupation).map((r) => getMetricValue(r, metricKey))).sort((a, b) => a - b);
        if (list.length) occPct = calculatePercentileStanding(list, val);
      }

      let agePct: number | null = null;
      if (ageBucket) {
        const list = toNumberArray(snapshot.rows.filter((r) => {
          const a = r.age ?? null;
          if (a === null) return false;
          // bucket strings expected same format as dashboard bucketAge
          const b = (a < 25 ? "Under 25" : a < 30 ? "25-29" : a < 35 ? "30-34" : a < 40 ? "35-39" : a < 45 ? "40-44" : a < 50 ? "45-49" : a < 55 ? "50-54" : "55+");
          return b === ageBucket;
        }).map((r) => getMetricValue(r, metricKey))).sort((a, b) => a - b);
        if (list.length) agePct = calculatePercentileStanding(list, val);
      }

      let yoePct: number | null = null;
      if (yoe) {
        const y = Number(yoe);
        if (!Number.isNaN(y)) {
          const list = toNumberArray(snapshot.rows.filter((r) => typeof r.yoe === "number" && r.yoe === y).map((r) => getMetricValue(r, metricKey))).sort((a, b) => a - b);
          if (list.length) yoePct = calculatePercentileStanding(list, val);
        }
      }

      out[metricKey] = {
        value: val,
        percentile,
        city_percentile: cityPct,
        occupation_percentile: occPct,
        age_percentile: agePct,
        yoe_percentile: yoePct,
      };
    }

    return NextResponse.json({ success: true, data: out });
  } catch (err) {
    logger.error("Batch stats error", { err });
    return NextResponse.json({ success: false, error: "Failed to compute batch stats" }, { status: 500 });
  }
}
