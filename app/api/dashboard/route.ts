export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import stableStringify from "json-stable-stringify";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import { loadAllSubmissionsSnapshot } from "@/lib/stats/snapshots";
import { CACHE_KEYS, TTL } from "@/lib/stats/cacheKeys";

const DASHBOARD_TTL = TTL.DASHBOARD;
const MIN_COHORT_SIZE = Number(process.env.MIN_COHORT_SIZE ?? 5);
const LEADERBOARD_MIN = Number(process.env.LEADERBOARD_MIN ?? 10);

type Filters = {
  age?: string[];
  city?: string[];
  occupation?: string[];
  yoe?: string[];
};

function parseFilters(params: URLSearchParams): Filters {
  return {
    city: params.getAll("city[]"),
    occupation: params.getAll("occupation[]"),
    age: params.getAll("age[]"),
    yoe: params.getAll("yoe[]"),
  };
}

function numArr(arr: any[]): number[] {
  return arr.filter((x): x is number => typeof x === "number" && Number.isFinite(x));
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 !== 0
    ? arr[mid]
    : (arr[mid - 1] + arr[mid]) / 2;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/* very small safe groupBy returning typed entries */
type LeaderboardEntry = { label: string; avg: number; median: number; sample_size: number };

function groupBy(arr: any[], keyFn: (x: any) => string | null, valFn: (x: any) => number | null): LeaderboardEntry[] {
  const buckets: Record<string, number[]> = {};
  arr.forEach((x) => {
    const k = keyFn(x);
    const v = valFn(x);
    if (!k || v == null) return;
    (buckets[k] ||= []).push(v);
  });
  return Object.entries(buckets).map(([label, vals]) => {
    const sorted = vals.slice().sort((a, b) => a - b);
    return {
      label,
      avg: avg(vals),
      median: median(sorted),
      sample_size: vals.length,
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    if (params.get("view") !== "dashboard") {
      return NextResponse.json({ success: false, error: "Invalid stats request" }, { status: 400 });
    }

    const filters = parseFilters(params);
    const cacheKey = CACHE_KEYS.dashboardKey(stableStringify(filters) || '{}');

    // try cached final payload
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        if (parsed && typeof parsed === "object") {
          return NextResponse.json({ success: true, data: parsed, cached: true });
        }
      }
    } catch (err) {
      logger.warn("redis get dashboard payload failed", { err, cacheKey });
    }

    // load submissions snapshot
    let submissions = await loadAllSubmissionsSnapshot();

    // apply in-memory filters if snapshot exists
    if (submissions.length > 0 && Object.values(filters).some((v) => v?.length)) {
      const cityFilter = (filters.city ?? []).map(String);
      const occFilter = (filters.occupation ?? []).map(String);
      const ageFilter = (filters.age ?? []).map(Number);
      const yoeFilter = (filters.yoe ?? []).map(Number);

      submissions = submissions.filter((s: any) => {
        if (cityFilter.length && !cityFilter.includes(String(s.city ?? ""))) return false;
        if (occFilter.length && !occFilter.includes(String(s.occupation ?? ""))) return false;
        if (ageFilter.length) {
          const a = Number(s.age);
          if (Number.isNaN(a) || !ageFilter.includes(a)) return false;
        }
        if (yoeFilter.length) {
          const y = Number(s.yoe);
          if (Number.isNaN(y) || !yoeFilter.includes(y)) return false;
        }
        return true;
      });
    } else if (submissions.length === 0 && Object.values(filters).some((v) => v?.length)) {
      // snapshot was empty and filters provided - last-resort DB query
      try {
        const select = `
          id, age, yoe, city, occupation,
          income_yearly, savings_total, monthly_expenses,
          net_worth, stock_value_total, mutual_fund_total,
          real_estate_total_price, gold_value_estimate,
          additional_metrics
        `;
        let query = (await import("@/lib/supabaseServer")).supabaseServer.from("submissions").select(select);
        if (filters.city?.length) query = query.in("city", filters.city);
        if (filters.occupation?.length) query = query.in("occupation", filters.occupation);
        if (filters.age?.length) query = query.in("age", filters.age.map(Number));
        if (filters.yoe?.length) query = query.in("yoe", filters.yoe.map(Number));
        const { data, error } = await query;
        if (error) {
          logger.error("Filtered DB query failed", { error });
          return NextResponse.json({ success: false, error: "Failed to load dashboard" }, { status: 500 });
        }
        submissions = (data ?? []) as any[];
      } catch (err) {
        logger.error("Filtered DB query exception", { err });
        submissions = [];
      }
    }

    const sample_size = submissions.length;

    const incomeValues = numArr(submissions.map((s: any) => s.income_yearly)).sort((a, b) => a - b);
    const savingsValues = numArr(submissions.map((s: any) => s.savings_total)).sort((a, b) => a - b);
    const monthlyExp = numArr(submissions.map((s: any) => s.monthly_expenses)).sort((a, b) => a - b);
    const yearlyExp = monthlyExp.map((v) => v * 12);
    const stock = numArr(submissions.map((s: any) => s.stock_value_total)).sort((a, b) => a - b);
    const mf = numArr(submissions.map((s: any) => s.mutual_fund_total)).sort((a, b) => a - b);
    const re = numArr(submissions.map((s: any) => s.real_estate_total_price)).sort((a, b) => a - b);
    const gold = numArr(submissions.map((s: any) => s.gold_value_estimate)).sort((a, b) => a - b);
    const networth = numArr(submissions.map((s: any) => s.net_worth)).sort((a, b) => a - b);

    const savingsRate = numArr(
      submissions.map((s: any) =>
        s.income_yearly && s.savings_total != null ? (s.savings_total / s.income_yearly) * 100 : null
      )
    ).sort((a, b) => a - b);

    const expenseRate = numArr(
      submissions.map((s: any) =>
        s.income_yearly && s.monthly_expenses != null ? ((s.monthly_expenses * 12) / s.income_yearly) * 100 : null
      )
    ).sort((a, b) => a - b);

    const summary = {
      sample_size,
      median_income: median(incomeValues),
      median_savings_rate: median(savingsRate),
      median_expense_rate: median(expenseRate),
    };

    // leaderboards
    const leaderboardsEnabled = sample_size >= LEADERBOARD_MIN;

    const leaderboards = leaderboardsEnabled
      ? {
          income_by_occupation: groupBy(submissions, (s: any) => s.occupation ?? null, (s: any) => (typeof s.income_yearly === "number" ? s.income_yearly : null)),
          income_by_age: groupBy(
            submissions,
            (s: any) => {
              const a = Number(s.age);
              if (Number.isNaN(a)) return null;
              if (a < 25) return "Under 25";
              if (a < 30) return "25–29";
              if (a < 35) return "30–34";
              if (a < 40) return "35–39";
              if (a < 45) return "40–44";
              if (a < 50) return "45–49";
              return "50+";
            },
            (s: any) => (typeof s.income_yearly === "number" ? s.income_yearly : null)
          ),
          savings_rate_by_income: groupBy(
            submissions,
            (s: any) => {
              if (!s.income_yearly) return null;
              const slab = Math.floor(s.income_yearly / 500000) * 5;
              return `₹${slab}L–₹${slab + 5}L`;
            },
            (s: any) => (s.income_yearly && s.savings_total != null ? (s.savings_total / s.income_yearly) * 100 : null)
          ),
          expense_rate_by_income: groupBy(
            submissions,
            (s: any) => {
              if (!s.income_yearly) return null;
              const slab = Math.floor(s.income_yearly / 500000) * 5;
              return `₹${slab}L–₹${slab + 5}L`;
            },
            (s: any) => (s.income_yearly && s.monthly_expenses != null ? ((s.monthly_expenses * 12) / s.income_yearly) * 100 : null)
          ),
        }
      : {
          income_by_occupation: [] as LeaderboardEntry[],
          income_by_age: [] as LeaderboardEntry[],
          savings_rate_by_income: [] as LeaderboardEntry[],
          expense_rate_by_income: [] as LeaderboardEntry[],
        };

    const emiValues = numArr(submissions.map((s: any) => s.additional_metrics?.monthly_emi));
    const monthlyEmi = {
      average: avg(emiValues),
      median: median([...emiValues].sort((a, b) => a - b)),
      sample_size: emiValues.length,
    };

    const occupations = [...new Set(submissions.map((s: any) => s.occupation).filter(Boolean))];
    const cities = [...new Set(submissions.map((s: any) => s.city).filter(Boolean))];
    const yoe_values = [...new Set(submissions.map((s: any) => s.yoe).filter(Boolean))].sort((a, b) => a - b);

    const facets = {
      occupations: occupations ?? [],
      cities: cities ?? [],
      age_ranges: ["Under 25", "25–29", "30–34", "35–39", "40–44", "45–49", "50+"],
      yoe_ranges: yoe_values.map(String),
    };

    const globalAverages = {
      sample_size,
      avg_income: avg(incomeValues) || 0,
      avg_expenses: avg(yearlyExp) || 0,
      avg_monthly_expenses: avg(monthlyExp) || 0,
      avg_savings: avg(savingsValues) || 0,
      avg_stock: avg(stock) || 0,
      avg_mf: avg(mf) || 0,
      avg_re: avg(re) || 0,
      avg_gold: avg(gold) || 0,
      avg_networth: avg(networth) || 0,
      avg_investment_total:
        avg(
          numArr(
            submissions.map((s: any) => {
              const total =
                (s.stock_value_total ?? 0) +
                (s.mutual_fund_total ?? 0) +
                (s.real_estate_total_price ?? 0) +
                (s.gold_value_estimate ?? 0);
              return total > 0 ? total : null;
            })
          )
        ) || 0,
    };

    const cohort_summary = {
      ...summary,
      ...globalAverages,
    };

    const warnings = {
      cohort_small: sample_size < MIN_COHORT_SIZE,
      leaderboard_small: !leaderboardsEnabled,
    };

    const payload = {
      generated_at: new Date().toISOString(),
      ttl_seconds: DASHBOARD_TTL,
      sample_size,
      cohort_summary,
      leaderboards,
      averages: { monthly_emi: monthlyEmi, global: globalAverages },
      facets,
      warnings,
    };

    // cache final payload
    try {
      await redis.set(cacheKey, JSON.stringify(payload), { ex: DASHBOARD_TTL });
    } catch (err) {
      logger.warn("redis set dashboard payload failed", { err, cacheKey });
    }

    return NextResponse.json({ success: true, data: payload, cached: false });
  } catch (err) {
    logger.error("Dashboard error", { err });
    return NextResponse.json({ success: false, error: "Stats endpoint failed" }, { status: 500 });
  }
}
