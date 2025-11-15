import { NextRequest, NextResponse } from "next/server";
import stableStringify from "json-stable-stringify";
import { supabaseServer } from "@/lib/supabaseServer";
import { logger } from "@/lib/logger";
import { AggregationFilters, MetricResult, Submission } from "@/types/submission";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_COHORT_SIZE = Number(process.env.DASHBOARD_MIN_SAMPLE ?? "10");
const DASHBOARD_CACHE_TTL_SECONDS = Math.max(60, Number(process.env.DASHBOARD_CACHE_TTL_SECONDS ?? "3600"));
const IS_DEV = process.env.NODE_ENV !== "production";

type DashboardCacheEntry = {
  expiresAt: number;
  payload: any;
};

const dashboardCache = new Map<string, DashboardCacheEntry>();

const DASHBOARD_SELECT_COLUMNS = [
  "occupation",
  "age",
  "age_range",
  "income_yearly",
  "savings_total",
  "savings_rate",
  "expense_rate",
  "monthly_expenses",
  "investment_total",
  "stock_value_total",
  "mutual_fund_total",
  "real_estate_total_price",
  "gold_value_estimate",
  "region",
  "city",
  "income_bracket",
  "additional_metrics"
].join(", ");

const AGGREGATION_SELECT_COLUMNS = [
  "id",
  "income_yearly",
  "savings_total",
  "monthly_expenses",
  "net_worth",
  "investment_total",
  "stock_value_total",
  "mutual_fund_total",
  "real_estate_total_price",
  "gold_value_estimate",
  "savings_rate",
  "expense_rate",
  "additional_metrics"
].join(", ");

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

const round = (value: number, precision = 2) => parseFloat(value.toFixed(precision));

function calculatePercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  if (percentile <= 0) return sorted[0];
  if (percentile >= 100) return sorted[sorted.length - 1];

  const n = sorted.length;
  const rank = (percentile / 100) * (n + 0.5);

  if (rank <= 0.5) return sorted[0];
  if (rank >= n) return sorted[n - 1];

  const lowerRank = Math.max(1, Math.floor(rank));
  const upperRank = Math.min(n, lowerRank + 1);
  const fraction = rank - lowerRank;

  const lowerValue = sorted[lowerRank - 1];
  const upperValue = sorted[upperRank - 1];

  return lowerValue + fraction * (upperValue - lowerValue);
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

const toNumberArray = (values: (number | null | undefined)[]) =>
  values.filter((value): value is number => typeof value === "number" && !Number.isNaN(value));

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
    average: round(avg, 2),
    median: round(median, 2),
    percentile_25: round(p25, 2),
    percentile_75: round(p75, 2),
    min: round(min, 2),
    max: round(max, 2),
    sample_size: sorted.length
  };
}

function calculatePercentageDifference(value: number, base: number): number {
  if (base === 0) return 0;
  return round(((value - base) / base) * 100, 1);
}

function calculatePercentileStanding(values: number[], target: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  if (target <= sorted[0]) return 0;
  if (target >= sorted[n - 1]) return 100;

  for (let i = 0; i < n; i += 1) {
    const value = sorted[i];

    if (target === value) {
      return round(((i + 0.5) / n) * 100, 2);
    }

    if (target < value && i > 0) {
      const lowerValue = sorted[i - 1];
      const lowerPercentile = ((i - 0.5) / n) * 100;
      const upperPercentile = ((i + 0.5) / n) * 100;
      const span = value - lowerValue;
      const fraction = span === 0 ? 0 : (target - lowerValue) / span;
      const percentile = lowerPercentile + fraction * (upperPercentile - lowerPercentile);
      return round(Math.min(100, Math.max(0, percentile)), 2);
    }
  }

  return 100;
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

async function cohortSizeSafe(count: number): Promise<boolean> {
  if (count < MIN_COHORT_SIZE) return false;

  try {
    const { data, error } = await supabaseServer.rpc("cohort_size_safe", { count });
    if (error) {
      logger.warn("cohort_size_safe rpc failed", { error });
      return count >= MIN_COHORT_SIZE;
    }
    return Boolean(data);
  } catch (error) {
    logger.warn("cohort_size_safe rpc threw", { error });
    return count >= MIN_COHORT_SIZE;
  }
}

function resolveIncomeBracket(submission: Submission): string | null {
  if (submission.income_bracket) return submission.income_bracket;
  const income = submission.income_yearly;
  if (!income || income <= 0) return null;
  if (income >= 10_000_000) return "₹1Cr+";
  const lower = Math.floor(income / 500000) * 5;
  const upper = lower + 5;
  return `₹${lower}L\u2013₹${upper}L`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const metricParam = searchParams.get("metric") as RankingMetric | null;
    const valueParam = searchParams.get("value");
    const regionalFilter = searchParams.get("region") || "";
    const incomeBracketFilter = searchParams.get("income_bracket") || "";
    const viewParam = searchParams.get("view");

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

      const allValues = toNumberArray(
        data.map((submission) => getMetricValue(submission as Submission, metricParam))
      );

      const globalRank = calculatePercentileStanding(allValues, targetValue);

      const regionalRank = regionalFilter
        ? calculatePercentileStanding(
            toNumberArray(
              data
                .filter((submission) => submission.region === regionalFilter)
                .map((submission) => getMetricValue(submission as Submission, metricParam))
            ),
            targetValue
          )
        : null;

      const bracketRank = incomeBracketFilter
        ? calculatePercentileStanding(
            toNumberArray(
              data
                .filter((submission) => submission.income_bracket === incomeBracketFilter)
                .map((submission) => getMetricValue(submission as Submission, metricParam))
            ),
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

    const page = Math.max(1, parseInt(searchParams.get("page") || String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
    );
    const offset = (page - 1) * pageSize;

    const filters: AggregationFilters = {
      age_range: searchParams.getAll("age_range[]"),
      income_bracket: searchParams.getAll("income_bracket[]"),
      experience_level: searchParams.getAll("experience_level[]"),
      region: searchParams.getAll("region[]"),
      city: searchParams.getAll("city[]"),
      occupation: searchParams.getAll("occupation[]"),
    };

    if (viewParam === "dashboard") {
      const bypassCache = IS_DEV || searchParams.get("skip_cache") === "1";
      const cacheKey = stableStringify({ view: "dashboard", filters }) as string;
      if (!bypassCache) {
        const cached = dashboardCache.get(cacheKey);
        const now = Date.now();
        if (cached && cached.expiresAt > now) {
          return NextResponse.json({ success: true, data: cached.payload, cached: true });
        }
      }

      const fullQuery = applyFiltersToQuery(
        supabaseServer.from("submissions").select(DASHBOARD_SELECT_COLUMNS),
        filters
      );

      const { data: dashboardSubmissions, error: dashboardError } = await fullQuery as {
        data: Submission[] | null;
        error: any;
      };

      if (dashboardError) throw dashboardError;

      const submissions = dashboardSubmissions ?? [];
      const hasSafeCohort = await cohortSizeSafe(submissions.length);
      if (!hasSafeCohort) {
        return NextResponse.json({
          success: false,
          error: `Need at least ${MIN_COHORT_SIZE} matching submissions to display the dashboard for this filter set`,
          min_sample: MIN_COHORT_SIZE,
          filters,
        });
      }

      const incomeValues = toNumberArray(submissions.map((submission) => submission.income_yearly));
      const savingsRateValues = toNumberArray(
        submissions.map((submission) => {
          if (typeof submission.savings_rate === "number" && !Number.isNaN(submission.savings_rate)) {
            return submission.savings_rate * 100;
          }
          const income = submission.income_yearly;
          const savings = submission.savings_total;
          if (!income || income <= 0 || !savings) return null;
          return (savings / income) * 100;
        })
      );
      const expenseRateValues = toNumberArray(
        submissions.map((submission) => {
          if (typeof submission.expense_rate === "number" && !Number.isNaN(submission.expense_rate)) {
            return submission.expense_rate * 100;
          }
          const income = submission.income_yearly;
          const monthlyExpenses = submission.monthly_expenses;
          if (!income || income <= 0 || !monthlyExpenses) return null;
          return ((monthlyExpenses * 12) / income) * 100;
        })
      );

      const summaryMetrics = {
        income: calculateMetrics(incomeValues),
        savings_rate: calculateMetrics(savingsRateValues),
        expense_rate: calculateMetrics(expenseRateValues),
      };

      let cohortComparison: {
        income: number;
        savings_rate: number;
        expense_rate: number;
      } | null = null;

      const { data: globalComparisonSample, error: globalComparisonError } = await supabaseServer
        .from("submissions")
        .select("income_yearly, savings_total, monthly_expenses, savings_rate, expense_rate");

      if (!globalComparisonError && globalComparisonSample) {
        const globalIncomeValues = toNumberArray(globalComparisonSample.map((submission) => submission.income_yearly));
        const globalSavingsRateValues = toNumberArray(
          globalComparisonSample.map((submission) => {
            if (typeof submission.savings_rate === "number" && !Number.isNaN(submission.savings_rate)) {
              return submission.savings_rate * 100;
            }
            const income = submission.income_yearly;
            const savings = submission.savings_total;
            if (!income || income <= 0 || !savings) return null;
            return (savings / income) * 100;
          })
        );
        const globalExpenseRateValues = toNumberArray(
          globalComparisonSample.map((submission) => {
            if (typeof submission.expense_rate === "number" && !Number.isNaN(submission.expense_rate)) {
              return submission.expense_rate * 100;
            }
            const income = submission.income_yearly;
            const monthlyExpenses = submission.monthly_expenses;
            if (!income || income <= 0 || !monthlyExpenses) return null;
            return ((monthlyExpenses * 12) / income) * 100;
          })
        );

        const globalMetrics = {
          income: calculateMetrics(globalIncomeValues),
          savings_rate: calculateMetrics(globalSavingsRateValues),
          expense_rate: calculateMetrics(globalExpenseRateValues),
        };

        const globalSafe =
          globalMetrics.income.count >= MIN_COHORT_SIZE &&
          globalMetrics.savings_rate.count >= MIN_COHORT_SIZE &&
          globalMetrics.expense_rate.count >= MIN_COHORT_SIZE;

        if (globalSafe) {
          cohortComparison = {
            income: calculatePercentageDifference(summaryMetrics.income.average, globalMetrics.income.average),
            savings_rate: calculatePercentageDifference(
              summaryMetrics.savings_rate.average,
              globalMetrics.savings_rate.average
            ),
            expense_rate: calculatePercentageDifference(
              summaryMetrics.expense_rate.average,
              globalMetrics.expense_rate.average
            ),
          };
        }
      }

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
        .filter((value): value is number => typeof value === "number" && value > 0);

      const monthlyEmiMetrics = calculateMetrics(emiValues);

      const dashboardPayload = {
        generated_at: new Date().toISOString(),
        filters,
        ttl_seconds: DASHBOARD_CACHE_TTL_SECONDS,
         cohort_summary: {
          sample_size: submissions.length,
          median_income: summaryMetrics.income.median,
          median_savings_rate: summaryMetrics.savings_rate.median,
          median_expense_rate: summaryMetrics.expense_rate.median,
        },
        ...(cohortComparison ? { cohort_comparison: cohortComparison } : {}),
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
          income_brackets: uniqueStrings(
            submissions.map((submission) => submission.income_bracket ?? resolveIncomeBracket(submission))
          ),
          age_ranges: uniqueStrings(
            submissions.map((submission) => bucketAgeRange(submission.age, submission.age_range || null))
          ),
        },
      };

      if (!bypassCache) {
        dashboardCache.set(cacheKey, {
          expiresAt: Date.now() + DASHBOARD_CACHE_TTL_SECONDS * 1000,
          payload: dashboardPayload,
        });
      }

      return NextResponse.json({ success: true, data: dashboardPayload, cached: false, cache_bypassed: bypassCache });
    }

    let query = supabaseServer.from("submissions").select(AGGREGATION_SELECT_COLUMNS, { count: "exact" });
    query = applyFiltersToQuery(query, filters);
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query as {
      data: Submission[] | null;
      error: any;
      count: number | null;
    };

    if (error) throw error;

    const submissions = data ?? [];
    const totalCount = count ?? 0;
    const cohortIsSafe = await cohortSizeSafe(totalCount);

    if (!cohortIsSafe) {
      return NextResponse.json({
        success: false,
        error: `Need at least ${MIN_COHORT_SIZE} submissions for this filter selection`,
        min_sample: MIN_COHORT_SIZE,
        filters,
      });
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const incomeValues = toNumberArray(submissions.map((s) => s.income_yearly));
    const savingsValues = toNumberArray(submissions.map((s) => s.savings_total));
    const expenseValues = toNumberArray(submissions.map((s) => s.monthly_expenses));
    const netWorthValues = toNumberArray(submissions.map((s) => s.net_worth));
    const stockValues = toNumberArray(submissions.map((s) => s.stock_value_total));
    const mutualValues = toNumberArray(submissions.map((s) => s.mutual_fund_total));
    const realEstateValues = toNumberArray(submissions.map((s) => s.real_estate_total_price));
    const goldValues = toNumberArray(submissions.map((s) => s.gold_value_estimate));

    const investmentValues = toNumberArray(
      submissions.map((s) => {
        if (typeof s.investment_total === "number" && !Number.isNaN(s.investment_total)) {
          return s.investment_total;
        }
        const fallback =
          (s.savings_total ?? 0) +
          (s.stock_value_total ?? 0) +
          (s.mutual_fund_total ?? 0) +
          (s.real_estate_total_price ?? 0) +
          (s.gold_value_estimate ?? 0);
        return fallback > 0 ? fallback : null;
      })
    );

    const savingsRateValues = toNumberArray(
      submissions.map((s) => s.savings_rate ?? s.additional_metrics?.savings_rate ?? null)
    );

    const expenseRateValues = toNumberArray(submissions.map((s) => s.expense_rate));

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
      savings_rate: calculateMetrics(savingsRateValues),
      expense_rate: calculateMetrics(expenseRateValues),
    };

    let cohortComparison: {
      name: string;
      metrics: {
        income: number;
        net_worth: number;
        savings_rate: number;
      };
    } | null = null;

    const hasFilters = Object.values(filters).some((list) => Array.isArray(list) && list.length > 0);

    if (hasFilters) {
      const { data: globalSubmissions, error: globalError } = await supabaseServer
        .from("submissions")
        .select("income_yearly, net_worth, savings_rate") as {
        data: Pick<Submission, "income_yearly" | "net_worth" | "savings_rate">[] | null;
        error: any;
      };

      if (!globalError && globalSubmissions) {
        const globalIncome = toNumberArray(globalSubmissions.map((s) => s.income_yearly));
        const globalNetWorth = toNumberArray(globalSubmissions.map((s) => s.net_worth));
        const globalSavingsRate = toNumberArray(globalSubmissions.map((s) => s.savings_rate));

        const globalMetrics = {
          income: calculateMetrics(globalIncome),
          net_worth: calculateMetrics(globalNetWorth),
          savings_rate: calculateMetrics(globalSavingsRate),
        };

        const globalSafe =
          globalMetrics.income.count >= MIN_COHORT_SIZE &&
          globalMetrics.net_worth.count >= MIN_COHORT_SIZE &&
          globalMetrics.savings_rate.count >= MIN_COHORT_SIZE;

        if (globalSafe) {
          cohortComparison = {
            name: "All Users",
            metrics: {
              income: calculatePercentageDifference(metrics.income.average, globalMetrics.income.average),
              net_worth: calculatePercentageDifference(metrics.net_worth.average, globalMetrics.net_worth.average),
              savings_rate: calculatePercentageDifference(
                metrics.savings_rate.average,
                globalMetrics.savings_rate.average
              ),
            },
          };
        }
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
          hasPreviousPage: page > 1,
        },
        filters,
        ...(cohortComparison ? { cohort_comparison: cohortComparison } : {}),
      },
    });
  } catch (error: unknown) {
    logger.error("Error in stats endpoint", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        success: false,
        error: "An error occurred while fetching statistics",
        ...(process.env.NODE_ENV === "development" && {
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      },
      { status: 500 }
    );
  }
}