"use server";

import { headers } from "next/headers";
import Link from "next/link";
import {
  PieChart,
  Wallet,
  TrendingUp,
  Filter,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

//
// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────
//

type LeaderboardEntry = {
  label: string;
  avg: number;
  median: number;
  sample_size: number;
};

type DashboardPayload = {
  generated_at: string;
  ttl_seconds: number;

  cohort_summary: {
    sample_size: number;
    median_income: number;
    median_savings_rate: number;
    median_expense_rate: number;
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
    age_ranges: string[];
    yoe_buckets?: string[]; // optional
  };
};

type Filters = {
  city?: string;
  occupation?: string;
  age?: string;
  yoe?: string;
};

//
// ──────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────
//

function getSingle(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function normalizeFilters(raw: Record<string, string | string[] | undefined>): Filters {
  return {
    city: getSingle(raw.city),
    occupation: getSingle(raw.occupation),
    age: getSingle(raw.age),
    yoe: getSingle(raw.yoe),
  };
}

function buildDashboardQuery(filters: Filters) {
  const p = new URLSearchParams();
  p.set("view", "dashboard");
  if (filters.city) p.append("city[]", filters.city);
  if (filters.occupation) p.append("occupation[]", filters.occupation);
  if (filters.age) p.append("age[]", filters.age);
  if (filters.yoe) p.append("yoe[]", filters.yoe);
  return p;
}

const MIN_REVALIDATE = 60;
const DEFAULT_REVALIDATE = 24 * 60 * 60; // default 24 hours per your requirement

function resolveRevalidateSeconds(): number {
  const envVal =
    Number(process.env.NEXT_PUBLIC_DASHBOARD_CACHE_TTL ?? "") ||
    Number(process.env.DASHBOARD_CACHE_TTL_SECONDS ?? "") ||
    DEFAULT_REVALIDATE;

  if (!Number.isFinite(envVal) || envVal <= 0) return DEFAULT_REVALIDATE;
  return Math.max(MIN_REVALIDATE, envVal);
}

async function fetchDashboard(filters: Filters) {
  // headers() returns a RequestHeaders object (promise resolved here)
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const base = `${proto}://${host}`;

  const query = buildDashboardQuery(filters);
  const revalidate = resolveRevalidateSeconds();

  const res = await fetch(`${base}/api/stats?${query.toString()}`, {
    next: { revalidate },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dashboard request failed (${res.status}) ${text ? `: ${text}` : ""}`);
  }

  const json = await res.json();
  if (!json || !json.success || !json.data) {
    throw new Error(json?.error ?? "Invalid dashboard response");
  }

  return { data: json.data as DashboardPayload, revalidate };
}

//
// ──────────────────────────────────────────────────────────────
// FORMATTERS & UI PARTS
// ──────────────────────────────────────────────────────────────
//

function formatCurrency(v: number) {
  if (!Number.isFinite(v)) return "₹0";
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)} K`;
  return `₹${v.toFixed(0)}`;
}

function formatPercent(v: number) {
  if (!Number.isFinite(v)) return "0%";
  return `${v.toFixed(1)}%`;
}

function SummaryCard({
  label,
  value,
  helper,
  type,
}: {
  label: string;
  value: number;
  helper?: string;
  type: "currency" | "percentage";
}) {
  const fmt = type === "currency" ? formatCurrency : formatPercent;
  return (
    <div className="p-4 rounded-xl border bg-white shadow-sm">
      <p className="text-xs font-semibold uppercase text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-1">{fmt(value)}</p>
      {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
    </div>
  );
}

function SmallCohortNotice({ size }: { size: number }) {
  if (size >= 30) return null;
  return (
    <div className="p-3 rounded-lg border bg-amber-50 text-amber-800 flex items-center gap-2">
      <AlertTriangle className="w-4 h-4" />
      Small cohort ({size}). Insights may change as more data arrives.
    </div>
  );
}

function ComparisonBlock({ label, value }: { label: string; value: number }) {
  const Icon = value === 0 ? Activity : value > 0 ? ArrowUpRight : ArrowDownRight;
  const color = value === 0 ? "text-gray-600" : value > 0 ? "text-emerald-600" : "text-red-600";
  return (
    <div className="p-3 border rounded-lg flex justify-between items-center">
      <div>
        <p className="text-xs uppercase font-semibold text-gray-500">{label}</p>
        <p className={`text-sm font-semibold ${color}`}>{value === 0 ? "On par" : `${value > 0 ? "+" : ""}${value.toFixed(1)}% vs all`}</p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full ${value === 0 ? "bg-gray-100 text-gray-700" : value > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
        <Icon className="h-3.5 w-3.5 inline mr-1" />
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function LeaderboardTable({ rows, type }: { rows: LeaderboardEntry[]; type: "currency" | "percentage" }) {
  const fmt = type === "currency" ? formatCurrency : formatPercent;
  if (!rows.length) return <p className="p-4 text-sm text-gray-500">Not enough data</p>;
  return (
    <div className="border rounded-xl overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2 text-left">Cohort</th>
            <th className="px-4 py-2 text-left">Average</th>
            <th className="px-4 py-2 text-left">Median</th>
            <th className="px-4 py-2 text-left">Sample</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-4 py-2">{r.label}</td>
              <td className="px-4 py-2">{fmt(r.avg)}</td>
              <td className="px-4 py-2">{fmt(r.median)}</td>
              <td className="px-4 py-2 text-gray-500">{r.sample_size}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

//
// ──────────────────────────────────────────────────────────────
// PAGE (Server Component) — SAFE unwrap of searchParams
// ──────────────────────────────────────────────────────────────
//

export default async function DashboardPage({
  searchParams,
}: {
  // Next may pass a plain object or a Promise — handle both safely
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  // unwrap searchParams if it's a Promise (some Next internals may pass a Promise)
  let rawParams: Record<string, string | string[] | undefined> = {};
  try {
    if (!searchParams) {
      rawParams = {};
    } else if (typeof (searchParams as any).then === "function") {
      rawParams = await (searchParams as Promise<Record<string, string | string[] | undefined>>);
    } else {
      rawParams = searchParams as Record<string, string | string[] | undefined>;
    }
  } catch (e) {
    // fallback to empty
    rawParams = {};
  }

  const filters = normalizeFilters(rawParams);

  let data: DashboardPayload | null = null;
  let error: string | null = null;
  let revalidateSeconds = resolveRevalidateSeconds();

  try {
    const res = await fetchDashboard(filters);
    data = res.data;
    revalidateSeconds = res.revalidate;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load dashboard data";
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-4xl font-bold">WealthBench Dashboard</h1>
        <p className="text-gray-600">Benchmarks from anonymous submissions (cached).</p>
        {data && <p className="text-xs text-gray-400 mt-1">Updated: {new Date(data.generated_at).toLocaleString()} — cache TTL {revalidateSeconds}s</p>}
      </header>

      {error && (
        <div className="p-4 rounded-lg border bg-red-50 text-red-700">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!error && !data && (
        <div className="p-4 rounded-lg border bg-white text-gray-600">No submissions yet. Be the first to share!</div>
      )}

      {data && (
        <>
          {/* FILTERS */}
          <form method="get" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <select name="city" defaultValue={filters.city ?? ""} className="border p-2 rounded-lg">
              <option value="">All Cities</option>
              {data.facets.cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select name="occupation" defaultValue={filters.occupation ?? ""} className="border p-2 rounded-lg">
              <option value="">All Occupations</option>
              {data.facets.occupations.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>

            <select name="age" defaultValue={filters.age ?? ""} className="border p-2 rounded-lg">
              <option value="">All Ages</option>
              {data.facets.age_ranges.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <select name="yoe" defaultValue={filters.yoe ?? ""} className="border p-2 rounded-lg">
              <option value="">All Experience</option>
              {data.facets.yoe_buckets?.map?.((y) => <option key={y} value={y}>{y}</option>) ?? null}
            </select>

            <button className="col-span-full bg-blue-600 text-white px-4 py-2 rounded-lg">Apply</button>
          </form>

          {/* SUMMARY */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SummaryCard label="Median Income" value={data.cohort_summary.median_income} helper={`Sample • ${data.cohort_summary.sample_size}`} type="currency" />
              <SummaryCard label="Median Savings Rate" value={data.cohort_summary.median_savings_rate} type="percentage" />
              <SummaryCard label="Median Expense Rate" value={data.cohort_summary.median_expense_rate} type="percentage" />
            </div>

            <SmallCohortNotice size={data.cohort_summary.sample_size} />
          </section>

          {/* LEADERBOARDS */}
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /> Income by Occupation</h2>
              <LeaderboardTable rows={data.leaderboards.income_by_occupation} type="currency" />
            </div>

            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2"><PieChart className="w-5 h-5 text-blue-600" /> Income by Age</h2>
              <LeaderboardTable rows={data.leaderboards.income_by_age} type="currency" />
            </div>

            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> Savings Rate by Income</h2>
              <LeaderboardTable rows={data.leaderboards.savings_rate_by_income} type="percentage" />
            </div>

            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2"><Filter className="w-5 h-5 text-blue-600" /> Expense Rate by Income</h2>
              <LeaderboardTable rows={data.leaderboards.expense_rate_by_income} type="percentage" />
            </div>
          </section>
        </>
      )}

      <div className="flex gap-3 pt-6">
        <Link href="/" className="px-4 py-2 rounded-lg bg-gray-100">Home</Link>
      </div>
    </main>
  );
}
