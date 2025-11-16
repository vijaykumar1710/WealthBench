// app/api/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { redis } from "@/lib/redis";
import stableStringify from "json-stable-stringify";

import {
  buildMetricSnapshot,
  calculatePercentileStanding,
  getMetricValue,
  RankingMetric,
  allowedMetrics,
} from "@/lib/statsCore";

const DASHBOARD_TTL = 24 * 60 * 60; // 24 hours
const MIN_COHORT_SIZE = 10;

// -----------------------------
// FILTER TYPES
// -----------------------------
type Filters = {
  age?: string[];
  city?: string[];
  occupation?: string[];
  yoe?: string[];
};

// -----------------------------
// FILTER PARSERS
// -----------------------------
function parseFilters(params: URLSearchParams): Filters {
  return {
    city: params.getAll("city[]"),
    occupation: params.getAll("occupation[]"),
    age: params.getAll("age[]"),
    yoe: params.getAll("yoe[]"),
  };
}

function applyFilters(query: any, filters: Filters) {
  if (filters.city?.length) query = query.in("city", filters.city);
  if (filters.occupation?.length) query = query.in("occupation", filters.occupation);
  if (filters.age?.length) query = query.in("age", filters.age.map(Number));
  if (filters.yoe?.length) query = query.in("yoe", filters.yoe.map(Number));
  return query;
}

function safeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const numArr = (arr: any[]) =>
  arr.filter((x): x is number => typeof x === "number" && !isNaN(x));

const median = (arr: number[]) =>
  arr.length ? arr[Math.floor(arr.length / 2)] : 0;

// -----------------------------
// MAIN ROUTE HANDLER
// -----------------------------
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;

    const metric = params.get("metric") as RankingMetric | null;
    const value = safeNumber(params.get("value"));

    // -----------------------------------------------------
    // FAST PERCENTILE MODE (single metric)
    // -----------------------------------------------------
    if (metric && value !== null) {
      if (!allowedMetrics.includes(metric)) {
        return NextResponse.json(
          { success: false, error: "Invalid metric" },
          { status: 400 }
        );
      }

      const snapshot = await buildMetricSnapshot(metric);
      const sorted = [...snapshot.values].sort((a, b) => a - b);
      const global = calculatePercentileStanding(sorted, value);

      // NOTE: we intentionally don't provide region / bracket percentiles here
      // because those fields/filters were removed from the schema.
      return NextResponse.json({
        success: true,
        percentile_rank: global,
        global_rank: global,
        region_rank: null,
        bracket_rank: null,
      });
    }

    // -----------------------------------------------------
    // DASHBOARD MODE
    // -----------------------------------------------------
    if (params.get("view") === "dashboard") {
      const filters = parseFilters(params);
      const cacheKey = `dashboard:${stableStringify(filters)}`;

      // Try Redis first (if configured)
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return NextResponse.json({ success: true, data: cached, cached: true });
        }
      } catch (err) {
        // don't fail on redis issues — log and continue to fetch fresh
        logger.warn("Redis get failed, continuing without cache", { err });
      }

      // Fetch minimal columns that exist in the DB (no income_bracket, no region)
      const select = `
        id, age, yoe, city, occupation, location,
        income_yearly,
        savings_total, monthly_expenses,
        net_worth, liabilities_total, assets_total,
        stock_value_total, mutual_fund_total,
        real_estate_total_price, gold_value_estimate,
        additional_metrics
      `;

      let query = supabaseServer.from("submissions").select(select);
      query = applyFilters(query, filters);

      const { data, error } = await query;

      if (error) {
        logger.error("Dashboard query error", { error });
        return NextResponse.json(
          { success: false, error: "Failed to load dashboard" },
          { status: 500 }
        );
      }

      const submissions = (data ?? []) as any[];
      const sample_size = submissions.length;

      if (sample_size < MIN_COHORT_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: `Need at least ${MIN_COHORT_SIZE} samples to show dashboard`,
          },
          { status: 400 }
        );
      }

      // -----------------------------------------------------
      // SUMMARY METRICS
      // -----------------------------------------------------
      const incomeValues = numArr(submissions.map((s) => s.income_yearly));
      incomeValues.sort((a, b) => a - b);

      const savingsRate = numArr(
        submissions.map((s) =>
          s.income_yearly && s.savings_total
            ? (s.savings_total / s.income_yearly) * 100
            : null
        )
      );
      savingsRate.sort((a, b) => a - b);

      const expenseRate = numArr(
        submissions.map((s) =>
          s.income_yearly && s.monthly_expenses
            ? ((s.monthly_expenses * 12) / s.income_yearly) * 100
            : null
        )
      );
      expenseRate.sort((a, b) => a - b);

      const summary = {
        sample_size,
        median_income: median(incomeValues),
        median_savings_rate: median(savingsRate),
        median_expense_rate: median(expenseRate),
      };

      // -----------------------------------------------------
      // LEADERBOARDS
      // -----------------------------------------------------
      function groupBy(
        arr: any[],
        key: (x: any) => string | null,
        val: (x: any) => number | null
      ) {
        const buckets: Record<string, number[]> = {};

        arr.forEach((x) => {
          const k = key(x);
          const v = val(x);
          if (!k || v == null) return;
          (buckets[k] ||= []).push(v);
        });

        return Object.entries(buckets).map(([label, vals]) => {
          const sorted = vals.sort((a, b) => a - b);
          return {
            label,
            avg: vals.reduce((a, b) => a + b, 0) / vals.length,
            median: median(sorted),
            sample_size: vals.length,
          };
        });
      }

      const leaderboards = {
        income_by_occupation: groupBy(
          submissions,
          (s) => s.occupation,
          (s) => s.income_yearly
        ),
        income_by_age: groupBy(
          submissions,
          (s) => {
            if (s.age == null) return null;
            if (s.age < 25) return "Under 25";
            if (s.age < 30) return "25–29";
            if (s.age < 35) return "30–34";
            if (s.age < 40) return "35–39";
            if (s.age < 45) return "40–44";
            if (s.age < 50) return "45–49";
            return "50+";
          },
          (s) => s.income_yearly
        ),
        savings_rate_by_income: groupBy(
          submissions,
          (s) => {
            if (!s.income_yearly) return null;
            const slab = Math.floor(s.income_yearly / 500000) * 5;
            return `₹${slab}L–₹${slab + 5}L`;
          },
          (s) =>
            s.income_yearly && s.savings_total
              ? (s.savings_total / s.income_yearly) * 100
              : null
        ),
        expense_rate_by_income: groupBy(
          submissions,
          (s) => {
            if (!s.income_yearly) return null;
            const slab = Math.floor(s.income_yearly / 500000) * 5;
            return `₹${slab}L–₹${slab + 5}L`;
          },
          (s) =>
            s.income_yearly && s.monthly_expenses
              ? ((s.monthly_expenses * 12) / s.income_yearly) * 100
              : null
        ),
      };

      // -----------------------------------------------------
      // EMI METRICS (from additional_metrics.monthly_emi)
      // -----------------------------------------------------
      const emiValues = numArr(
        submissions.map((s) => s.additional_metrics?.monthly_emi)
      );

      const monthlyEmi = {
        average: emiValues.length
          ? emiValues.reduce((a, b) => a + b, 0) / emiValues.length
          : 0,
        median: median([...emiValues].sort((a, b) => a - b)),
        sample_size: emiValues.length,
      };

      // -----------------------------------------------------
      // FACETS (only fields that exist)
      // -----------------------------------------------------
      const facets = {
        occupations: [...new Set(submissions.map((s) => s.occupation).filter(Boolean))],
        cities: [...new Set(submissions.map((s) => s.city).filter(Boolean))],
        age_ranges: ["Under 25", "25–29", "30–34", "35–39", "40–44", "45–49", "50+"],
      };

      // -----------------------------------------------------
      // FINAL PAYLOAD
      // -----------------------------------------------------
      const payload = {
        generated_at: new Date().toISOString(),
        ttl_seconds: DASHBOARD_TTL,
        sample_size,
        cohort_summary: summary,
        leaderboards,
        averages: { monthly_emi: monthlyEmi },
        facets,
      };

      // cache in redis (best-effort)
      try {
        await redis.set(cacheKey, payload, { ex: DASHBOARD_TTL });
      } catch (err) {
        logger.warn("Failed to write dashboard cache", { err });
      }

      return NextResponse.json({ success: true, data: payload, cached: false });
    }

    // -----------------------------------------------------
    // INVALID REQUEST
    // -----------------------------------------------------
    return NextResponse.json(
      { success: false, error: "Invalid stats request" },
      { status: 400 }
    );
  } catch (err) {
    logger.error("Stats error", { err });
    return NextResponse.json(
      { success: false, error: "Stats endpoint failed" },
      { status: 500 }
    );
  }
}
