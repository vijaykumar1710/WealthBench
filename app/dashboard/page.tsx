import { headers } from "next/headers";
import Link from "next/link";
import {
  PieChart,
  Wallet,
  TrendingUp,
  Filter,
  Users,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type LeaderboardEntry = {
  label: string;
  avg: number;
  median: number;
  sample_size: number;
  total?: number;
};

type DashboardPayload = {
  generated_at: string;
  ttl_seconds: number;
  cohort_summary?: {
    sample_size: number;
    median_income: number;
    median_savings_rate: number;
    median_expense_rate: number;
  };
  cohort_comparison?: {
    income: number;
    savings_rate: number;
    expense_rate: number;
  };
  leaderboards: {
    income_by_occupation: LeaderboardEntry[];
    income_by_age: LeaderboardEntry[];
    savings_rate_by_income: LeaderboardEntry[];
    expense_rate_by_income: LeaderboardEntry[];
  };
  averages: {
    monthly_emi: {
      average: number;
      median: number;
      sample_size: number;
    };
  };
  facets: {
    occupations: string[];
    cities: string[];
    regions: string[];
    income_brackets: string[];
    age_ranges: string[];
  };
};

type Filters = {
  occupation?: string;
  income_bracket?: string;
  region?: string;
  city?: string;
  age_range?: string;
};

const MIN_REVALIDATE = 60;
const DEFAULT_REVALIDATE = 3600;

const leaderboardSections: {
  key: keyof DashboardPayload["leaderboards"];
  title: string;
  description: string;
  icon: LucideIcon;
  valueType: "currency" | "percentage";
}[] = [
  {
    key: "income_by_occupation",
    title: "Top Income by Occupation",
    description: "See which professions currently command the highest annual income in our dataset.",
    icon: Wallet,
    valueType: "currency",
  },
  {
    key: "income_by_age",
    title: "Income by Age Bucket",
    description: "Compare median income across age brackets to understand career momentum.",
    icon: PieChart,
    valueType: "currency",
  },
  {
    key: "savings_rate_by_income",
    title: "Savings % by Income",
    description: "Average savings-rate for each income slab (annual).",
    icon: TrendingUp,
    valueType: "percentage",
  },
  {
    key: "expense_rate_by_income",
    title: "Expense % by Income",
    description: "How much of their income people spend across slabs.",
    icon: Filter,
    valueType: "percentage",
  },
];

const filterFields: { key: keyof Filters; label: string; placeholder: string }[] = [
  { key: "occupation", label: "Occupation", placeholder: "All occupations" },
  { key: "income_bracket", label: "Income Bracket", placeholder: "All brackets" },
  { key: "region", label: "Region", placeholder: "All regions" },
  { key: "city", label: "City", placeholder: "All cities" },
  { key: "age_range", label: "Age Range", placeholder: "All ages" },
];

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)} Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)} K`;
  return `₹${value.toFixed(0)}`;
}

function formatPercentage(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

function getSingleValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

function normalizeFilters(searchParams: Record<string, string | string[] | undefined>): Filters {
  return {
    occupation: getSingleValue(searchParams.occupation),
    income_bracket: getSingleValue(searchParams.income_bracket),
    region: getSingleValue(searchParams.region),
    city: getSingleValue(searchParams.city),
    age_range: getSingleValue(searchParams.age_range),
  };
}

function buildDashboardQuery(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("view", "dashboard");

  if (filters.occupation) params.append("occupation[]", filters.occupation);
  if (filters.income_bracket) params.append("income_bracket[]", filters.income_bracket);
  if (filters.region) params.append("region[]", filters.region);
  if (filters.city) params.append("city[]", filters.city);
  if (filters.age_range) params.append("age_range[]", filters.age_range);

  return params;
}

function resolveRevalidateSeconds(): number {
  const envValue = Number(process.env.NEXT_PUBLIC_DASHBOARD_CACHE_TTL ?? process.env.DASHBOARD_CACHE_TTL_SECONDS ?? DEFAULT_REVALIDATE);
  if (!Number.isFinite(envValue) || envValue <= 0) {
    return DEFAULT_REVALIDATE;
  }
  return Math.max(MIN_REVALIDATE, envValue);
}

async function fetchDashboardData(filters: Filters) {
  const headersList = await headers();
  const host = headersList.get("host");
  if (!host) {
    throw new Error("Unable to resolve host for dashboard fetch");
  }
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${protocol}://${host}`;
  const query = buildDashboardQuery(filters);
  const revalidate = resolveRevalidateSeconds();

  const response = await fetch(`${baseUrl}/api/stats?${query.toString()}`, {
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`Dashboard request failed (${response.status})`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error(payload?.error || "Unexpected dashboard response");
  }

  return { data: payload.data as DashboardPayload, revalidate };
}

function LeaderboardTable({
  entries,
  valueType,
}: {
  entries: LeaderboardEntry[];
  valueType: "currency" | "percentage";
}) {
  if (!entries?.length) {
    return <p className="text-sm text-gray-500">Not enough submissions for this view yet.</p>;
  }

  const formatValue = valueType === "percentage" ? formatPercentage : formatCurrency;

  return (
    <div className="overflow-hidden border border-gray-100 rounded-xl">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">Cohort</th>
            <th scope="col" className="px-4 py-3 text-left">Average</th>
            <th scope="col" className="px-4 py-3 text-left">Median</th>
            <th scope="col" className="px-4 py-3 text-left">Sample</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white text-sm">
          {entries.map((entry) => (
            <tr key={entry.label}>
              <td className="px-4 py-3 font-medium text-gray-900">{entry.label}</td>
              <td className="px-4 py-3 text-gray-700">{formatValue(entry.avg)}</td>
              <td className="px-4 py-3 text-gray-700">{formatValue(entry.median)}</td>
              <td className="px-4 py-3 text-gray-500">{entry.sample_size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FiltersForm({ facets, currentFilters }: { facets: DashboardPayload["facets"]; currentFilters: Filters }) {
  const hasFacets = Object.values(facets).some((values) => values?.length);

  if (!hasFacets) {
    return null;
  }

  const optionsMap: Record<keyof Filters, string[]> = {
    occupation: facets.occupations,
    income_bracket: facets.income_brackets,
    region: facets.regions,
    city: facets.cities,
    age_range: facets.age_ranges,
  };

  return (
    <form className="wb-card space-y-4" method="get">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Filters</p>
          <p className="text-xs text-gray-500">Slice the dashboard by occupation, bracket, or geography.</p>
        </div>
        <Link href="/dashboard" className="text-xs text-blue-600 hover:underline">
          Reset
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filterFields.map(({ key, label, placeholder }) => {
          const options = optionsMap[key] || [];
          const value = currentFilters[key] ?? "";
          return (
            <label key={key} className="text-xs font-medium text-gray-600 space-y-1">
              {label}
              <select
                name={key}
                defaultValue={value}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white"
              >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Apply Filters
      </button>
    </form>
  );
}

function SummaryStatCard({
  label,
  value,
  helper,
  valueType,
}: {
  label: string;
  value: number;
  helper?: string;
  valueType: "currency" | "percentage";
}) {
  const formatter = valueType === "currency" ? formatCurrency : formatPercentage;
  return (
    <div className="wb-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{formatter(value)}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function SampleSizeNotice({ sampleSize }: { sampleSize: number }) {
  if (sampleSize >= 30) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <AlertTriangle className="h-4 w-4" />
      <span>
        Small cohort ({sampleSize} submissions). Insights may shift as more people share their data.
      </span>
    </div>
  );
}

function ComparisonIndicator({ label, value }: { label: string; value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const Icon = isNeutral ? Activity : isPositive ? ArrowUpRight : ArrowDownRight;
  const colorClass = isNeutral ? "text-gray-600" : isPositive ? "text-emerald-600" : "text-red-600";
  const badgeBg = isNeutral ? "bg-gray-100 text-gray-700" : isPositive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className={`text-sm font-semibold ${colorClass}`}>
          {isNeutral ? "On par" : `${isPositive ? "+" : ""}${value.toFixed(1)}% vs All`}
        </p>
      </div>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${badgeBg}`}>
        <Icon className="h-3.5 w-3.5" />
        {isNeutral ? "0%" : `${value.toFixed(1)}%`}
      </span>
    </div>
  );
}

function CohortComparisonCard({ comparison }: { comparison: DashboardPayload["cohort_comparison"] }) {
  if (!comparison) return null;
  return (
    <div className="wb-card space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-blue-600" />
        <p className="text-sm font-semibold text-gray-800">Compared to all submissions</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <ComparisonIndicator label="Income" value={comparison.income} />
        <ComparisonIndicator label="Savings Rate" value={comparison.savings_rate} />
        <ComparisonIndicator label="Expense Rate" value={comparison.expense_rate} />
      </div>
    </div>
  );
}

function MonthlyEmiCard({ data }: { data: DashboardPayload["averages"]["monthly_emi"] }) {
  return (
    <div className="wb-card">
      <p className="text-sm font-semibold text-gray-700">Average Monthly EMI</p>
      <p className="text-3xl font-bold text-blue-700 mt-2">{formatCurrency(data.average)}</p>
      <p className="text-sm text-gray-500 mt-1">Median • {formatCurrency(data.median)}</p>
      <p className="text-xs text-gray-400 mt-2">Based on {data.sample_size} submissions</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const filters = normalizeFilters(params);

  let data: DashboardPayload | null = null;
  let error: string | null = null;
  let revalidateSeconds = resolveRevalidateSeconds();

  try {
    const response = await fetchDashboardData(filters);
    data = response.data;
    revalidateSeconds = response.revalidate;
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load dashboard";
  }

  return (
    <main className="min-h-screen bg-white p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">WealthBench Dashboard</h1>
          <p className="text-gray-600">Hourly refreshed benchmarks from anonymous submissions.</p>
          {data && (
            <p className="text-xs text-gray-400">
              Data refreshed at {new Date(data.generated_at).toLocaleString()} • cache ttl {revalidateSeconds}s
            </p>
          )}
        </header>

        {error && (
          <div className="wb-card border border-red-200 bg-red-50 text-red-700">
            <p className="font-semibold">{error}</p>
            <p className="text-sm">Please try again in a bit — data refreshes automatically once new submissions arrive.</p>
          </div>
        )}

        {data && (
          <>
            <FiltersForm facets={data.facets} currentFilters={filters} />

            {data.cohort_summary && (
              <section className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <SummaryStatCard
                    label="Median Income"
                    value={data.cohort_summary.median_income}
                    valueType="currency"
                    helper={`Sample size • ${data.cohort_summary.sample_size}`}
                  />
                  <SummaryStatCard
                    label="Median Savings Rate"
                    value={data.cohort_summary.median_savings_rate}
                    valueType="percentage"
                    helper="Percentage of income saved"
                  />
                  <SummaryStatCard
                    label="Median Expense Rate"
                    value={data.cohort_summary.median_expense_rate}
                    valueType="percentage"
                    helper="Annual spending vs income"
                  />
                </div>
                <div className="flex flex-col gap-4 md:flex-row">
                  <SampleSizeNotice sampleSize={data.cohort_summary.sample_size} />
                  {data.cohort_comparison && <CohortComparisonCard comparison={data.cohort_comparison} />}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <MonthlyEmiCard data={data.averages.monthly_emi} />
              <div className="wb-card">
                <p className="text-sm font-semibold text-gray-700">How to read this dashboard</p>
                <ul className="mt-3 list-disc space-y-1 pl-4 text-sm text-gray-600">
                  <li>All figures are anonymized and aggregated.</li>
                  <li>Pick a filter to compare yourself with similar peers.</li>
                  <li>Leaderboards show averages & medians for each cohort.</li>
                </ul>
                <p className="mt-3 text-xs text-gray-400">
                  Need deeper cuts? Apply multiple filters and reload — the data is cached hourly after each new submission.
                </p>
              </div>
            </section>

            <section className="space-y-8">
              {leaderboardSections.map(({ key, title, description, icon: Icon, valueType }) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                      <p className="text-sm text-gray-500">{description}</p>
                    </div>
                  </div>
                  <LeaderboardTable entries={data?.leaderboards[key] ?? []} valueType={valueType} />
                </div>
              ))}
            </section>
          </>
        )}

        {!data && !error && (
          <div className="wb-card text-center text-gray-600">No submissions yet. Be the first to share!</div>
        )}
      </div>
    </main>
  );
}
