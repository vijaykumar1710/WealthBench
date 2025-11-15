import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { AggregationFilters, MetricResult, Submission } from "@/types/submission";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const DASHBOARD_CACHE_TTL_SECONDS = Math.max(60, Number(process.env.DASHBOARD_CACHE_TTL_SECONDS ?? "3600"));

type DashboardCacheEntry = {
  expiresAt: number;
  payload: any;
};

const dashboardCache = new Map<string, DashboardCacheEntry>();

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

function calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = (percentile / 100) * (sorted.length - 1);
  
  if (Number.isInteger(index)) {
    return sorted[index];
  } else {
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return (sorted[lower] + sorted[upper]) / 2;
  }
}

function bucketAgeRange(age: number | null, ageRange: string | null): string {
  if (ageRange) return ageRange;
  if (age === null || age === undefined) return "Unknown";
  if (age < 25) return "Under 25";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 45) return "40-44";
  if (age < 50) return "45-49";
  if (age < 55) return "50-54";
  return "55+";
}

function average(values: number[], precision = 1): number {
  if (!values.length) return 0;
  const sum = values.reduce((total, value) => total + value, 0);
  return parseFloat((sum / values.length).toFixed(precision));
}

function uniqueStrings(values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    )
  ).sort((a, b) => a.localeCompare(b));
}

type LeaderboardEntry = {
  label: string;
  avg: number;
  median: number;
  sample_size: number;
};

function buildLeaderboard(
  submissions: Submission[],
  keyFn: (submission: Submission) => string | null,
  valueFn: (submission: Submission) => number | null,
  limit = 5
): LeaderboardEntry[] {
  const groups: Record<string, number[]> = {};

  submissions.forEach((submission) => {
    const key = keyFn(submission);
    const value = valueFn(submission);
    if (!key || value === null || Number.isNaN(value)) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(value);
  });

  return Object.entries(groups)
    .map(([label, values]) => {
      const metrics = calculateMetrics(values);
      const total = values.reduce((sum, value) => sum + value, 0);
      return {
        label,
        avg: metrics.average,
        median: metrics.median,
        sample_size: metrics.sample_size,
        total: parseFloat(total.toFixed(2)),
      };
    })
    .filter((entry) => entry.sample_size > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, limit);
}

function parseNumberParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function applyFiltersToQuery(query: any, filters: AggregationFilters) {
  if (filters.age_range?.length) query = query.in('age_range', filters.age_range);
  if (filters.income_bracket?.length) query = query.in('income_bracket', filters.income_bracket);
  if (filters.experience_level?.length) query = query.in('experience_level', filters.experience_level);
  if (filters.region?.length) query = query.in('region', filters.region);
  if (filters.city?.length) query = query.in('city', filters.city);
  if (filters.occupation?.length) query = query.in('occupation', filters.occupation);
  return query;
}

function calculateMetrics(values: number[]): MetricResult {
  if (values.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      percentile_25: 0,
      percentile_75: 0,
      min: 0,
      max: 0,
      sample_size: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length;
  const median = calculatePercentile(sorted, 50);
  const p25 = calculatePercentile(sorted, 25);
  const p75 = calculatePercentile(sorted, 75);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    count: sorted.length,
    average: parseFloat(avg.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    percentile_25: parseFloat(p25.toFixed(2)),
    percentile_75: parseFloat(p75.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    sample_size: sorted.length
  };
}

function calculatePercentageDifference(value: number, base: number): number {
  if (base === 0) return 0;
  return parseFloat((((value - base) / base) * 100).toFixed(1));
}

function calculatePercentileStanding(values: number[], target: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const position = sorted.filter((v) => v <= target).length;
  return parseFloat(((position / sorted.length) * 100).toFixed(2));
}

function getMetricValue(submission: Submission, metric: RankingMetric): number | null {
  switch (metric) {
    case "income":
      return submission.income_yearly ?? null;
    case "savings":
      return submission.savings_total ?? null;
    case "expenses":
      return submission.monthly_expenses ?? null;
    case "net_worth":
      return submission.net_worth ?? null;
    case "stock_value_total":
      return submission.stock_value_total ?? null;
    case "mutual_fund_total":
      return submission.mutual_fund_total ?? null;
    case "real_estate_total_price":
      return submission.real_estate_total_price ?? null;
    case "gold_value_estimate":
      return submission.gold_value_estimate ?? null;
    case "investment_value": {
      const savings = submission.savings_total ?? 0;
      const stocks = submission.stock_value_total ?? 0;
      const mutuals = submission.mutual_fund_total ?? 0;
      const realEstate = submission.real_estate_total_price ?? 0;
      const gold = submission.gold_value_estimate ?? 0;
      return savings + stocks + mutuals + realEstate + gold;
    }
    default:
      return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metricParam = searchParams.get('metric') as RankingMetric | null;
    const valueParam = searchParams.get('value');
    const regionalFilter = searchParams.get('region') || '';
    const incomeBracketFilter = searchParams.get('income_bracket') || '';
    const viewParam = searchParams.get('view');

    if (metricParam && valueParam !== null) {
      const targetValue = Number(valueParam);
      if (Number.isNaN(targetValue)) {
        return NextResponse.json({ error: "Invalid metric value" }, { status: 400 });
      }

      const { data, error } = await supabaseServer
        .from("submissions")
        .select(
          "income_yearly, savings_total, monthly_expenses, net_worth, stock_value_total, mutual_fund_total, real_estate_total_price, gold_value_estimate, region, income_bracket"
        );

      if (error || !data) {
        logger.error("Stats ranking query failed", { error });
        return NextResponse.json({ error: "Failed to compute rankings" }, { status: 500 });
      }

      const allValues = data
        .map((submission) => getMetricValue(submission as Submission, metricParam))
        .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

      const globalRank = calculatePercentileStanding(allValues, targetValue);

      const regionalRank = regionalFilter
        ? calculatePercentileStanding(
            data
              .filter((submission) => submission.region === regionalFilter)
              .map((submission) => getMetricValue(submission as Submission, metricParam))
              .filter((v): v is number => typeof v === "number" && !Number.isNaN(v)),
            targetValue
          )
        : null;

      const bracketRank = incomeBracketFilter
        ? calculatePercentileStanding(
            data
              .filter((submission) => submission.income_bracket === incomeBracketFilter)
              .map((submission) => getMetricValue(submission as Submission, metricParam))
              .filter((v): v is number => typeof v === "number" && !Number.isNaN(v)),
            targetValue
          )
        : null;

      return NextResponse.json({
        global_rank: globalRank,
        region_rank: regionalRank,
        bracket_rank: bracketRank,
        percentile_rank: globalRank,
      });
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    );
    const offset = (page - 1) * pageSize;

    const filters: AggregationFilters = {
      age_range: searchParams.getAll('age_range[]'),
      income_bracket: searchParams.getAll('income_bracket[]'),
      experience_level: searchParams.getAll('experience_level[]'),
      region: searchParams.getAll('region[]'),
      city: searchParams.getAll('city[]'),
      occupation: searchParams.getAll('occupation[]'),
    };

    if (viewParam === 'dashboard') {
      const cacheKey = JSON.stringify({ viewParam, filters });
      const cached = dashboardCache.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expiresAt > now) {
        return NextResponse.json({ success: true, data: cached.payload, cached: true });
      }

      const fullQuery = applyFiltersToQuery(
        supabaseServer
          .from('submissions')
          .select('*'),
        filters
      );

      const { data: dashboardSubmissions, error: dashboardError } = await fullQuery as {
        data: Submission[] | null;
        error: any;
      };

      if (dashboardError) throw dashboardError;

      const submissions = dashboardSubmissions || [];

      const incomeByOccupation = buildLeaderboard(
        submissions,
        (submission) => submission.occupation,
        (submission) => submission.income_yearly
      );

      const incomeByAge = buildLeaderboard(
        submissions,
        (submission) => bucketAgeRange(submission.age, submission.age_range || null),
        (submission) => submission.income_yearly
      );

      const savingsRateByIncome = buildLeaderboard(
        submissions,
        (submission) => {
          const income = submission.income_yearly;
          if (!income || income <= 0) return null;
          const bracket = Math.floor(income / 500000);
          return `₹${(bracket * 5).toFixed(0)}L - ₹${((bracket + 1) * 5).toFixed(0)}L`;
        },
        (submission) => {
          const income = submission.income_yearly;
          const savings = submission.savings_total;
          if (!income || !savings || income <= 0) return null;
          return (savings / income) * 100;
        }
      );

      const expensesRateByIncome = buildLeaderboard(
        submissions,
        (submission) => {
          const income = submission.income_yearly;
          if (!income || income <= 0) return null;
          const bracket = Math.floor(income / 500000);
          return `₹${(bracket * 5).toFixed(0)}L - ₹${((bracket + 1) * 5).toFixed(0)}L`;
        },
        (submission) => {
          const income = submission.income_yearly;
          const expenses = submission.monthly_expenses
            ? submission.monthly_expenses * 12
            : null;
          if (!income || !expenses || income <= 0) return null;
          return (expenses / income) * 100;
        }
      );

      const emiValues = submissions
        .map((submission) => submission.additional_metrics?.monthly_emi)
        .filter((value): value is number => typeof value === 'number' && value > 0);

      const monthlyEmiMetrics = calculateMetrics(emiValues);

      const dashboardPayload = {
        generated_at: new Date().toISOString(),
        filters,
        ttl_seconds: DASHBOARD_CACHE_TTL_SECONDS,
        leaderboards: {
          income_by_occupation: incomeByOccupation,
          income_by_age: incomeByAge,
          savings_rate_by_income: savingsRateByIncome,
          expense_rate_by_income: expensesRateByIncome,
        },
        averages: {
          monthly_emi: {
            average: monthlyEmiMetrics.average,
            median: monthlyEmiMetrics.median,
            sample_size: monthlyEmiMetrics.sample_size,
          },
        },
        facets: {
          occupations: uniqueStrings(submissions.map((submission) => submission.occupation)),
          cities: uniqueStrings(submissions.map((submission) => submission.city)),
          regions: uniqueStrings(submissions.map((submission) => submission.region)),
          income_brackets: uniqueStrings(submissions.map((submission) => submission.income_bracket)),
        },
      };

      dashboardCache.set(cacheKey, {
        expiresAt: Date.now() + DASHBOARD_CACHE_TTL_SECONDS * 1000,
        payload: dashboardPayload,
      });

      return NextResponse.json({ success: true, data: dashboardPayload, cached: false });
    }

    let query = supabaseServer
      .from("submissions")
      .select('*', { count: 'exact' });

    query = applyFiltersToQuery(query, filters);

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query as {
      data: Submission[] | null;
      error: any;
      count: number | null;
    };

    if (error) throw error;

    const submissions = data || [];
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    const incomeValues = submissions
      .map(s => s.income_yearly)
      .filter((v): v is number => v !== null && v !== undefined);

    const savingsValues = submissions
      .map(s => s.savings_total)
      .filter((v): v is number => v !== null && v !== undefined);

    const expenseValues = submissions
      .map(s => s.monthly_expenses)
      .filter((v): v is number => v !== null && v !== undefined);

    const netWorthValues = submissions
      .map(s => s.net_worth)
      .filter((v): v is number => v !== null && v !== undefined);

    const stockValues = submissions
      .map(s => s.stock_value_total)
      .filter((v): v is number => v !== null && v !== undefined);

    const mutualValues = submissions
      .map(s => s.mutual_fund_total)
      .filter((v): v is number => v !== null && v !== undefined);

    const realEstateValues = submissions
      .map(s => s.real_estate_total_price)
      .filter((v): v is number => v !== null && v !== undefined);

    const goldValues = submissions
      .map(s => s.gold_value_estimate)
      .filter((v): v is number => v !== null && v !== undefined);

    const investmentValues = submissions
      .map((s) =>
        (s.savings_total ?? 0) +
        (s.stock_value_total ?? 0) +
        (s.mutual_fund_total ?? 0) +
        (s.real_estate_total_price ?? 0) +
        (s.gold_value_estimate ?? 0)
      )
      .filter((v) => v > 0);

    const savingsRateValues = submissions
      .map(s => s.additional_metrics?.savings_rate)
      .filter((v): v is number => typeof v === 'number');

    const metrics = {
      income: calculateMetrics(incomeValues),
      expenses: calculateMetrics(expenseValues),
      savings: calculateMetrics(savingsValues),
      net_worth: calculateMetrics(netWorthValues),
      investment_value: calculateMetrics(investmentValues),
      stock_value_total: calculateMetrics(stockValues),
      mutual_fund_total: calculateMetrics(mutualValues),
      real_estate_total_price: calculateMetrics(realEstateValues),
      gold_value_estimate: calculateMetrics(goldValues),
      savings_rate: calculateMetrics(savingsRateValues)
    };

    let cohortComparison = null;
    if (Object.values(filters).some(f => f && f.length > 0)) {
      const { data: globalSubmissions } = await supabaseServer
        .from("submissions")
        .select("income_yearly, net_worth, additional_metrics");

      if (globalSubmissions) {
        const globalIncome = globalSubmissions
          .map(s => s.income_yearly)
          .filter((v): v is number => v !== null && v !== undefined);
        
        const globalNetWorth = globalSubmissions
          .map(s => s.net_worth)
          .filter((v): v is number => v !== null && v !== undefined);

        const globalSavingsRate = globalSubmissions
          .map(s => s.additional_metrics?.savings_rate)
          .filter((v): v is number => typeof v === 'number');

        const globalMetrics = {
          income: calculateMetrics(globalIncome),
          net_worth: calculateMetrics(globalNetWorth),
          savings_rate: calculateMetrics(globalSavingsRate)
        };

        cohortComparison = {
          name: "All Users",
          metrics: {
            income: calculatePercentageDifference(metrics.income.average, globalMetrics.income.average),
            net_worth: calculatePercentageDifference(metrics.net_worth.average, globalMetrics.net_worth.average),
            savings_rate: calculatePercentageDifference(metrics.savings_rate.average, globalMetrics.savings_rate.average)
          }
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        metrics,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters,
        ...(cohortComparison && { cohort_comparison: cohortComparison })
      }
    });

  } catch (error) {
    logger.error("Error in stats endpoint", { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: "An error occurred while fetching statistics",
        ...(process.env.NODE_ENV === 'development' && { 
          details: error instanceof Error ? error.message : 'Unknown error' 
        })
      },
      { status: 500 }
    );
  }
}