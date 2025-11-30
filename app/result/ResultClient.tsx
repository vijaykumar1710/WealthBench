"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PercentileBar from "@/components/PercentileBar";
import RankBadge from "@/components/RankBadge";

type RankingEntry = {
  value: number;
  percentile: number;
  region_percentile: number | null;
  bracket_percentile: number | null;
};

type StatsAPIResponse =
  | { success: true; data: Record<string, RankingEntry> }
  | { success: false; error: string };

type MetricsAPIResponse =
  | { success: true; metrics: Record<string, number> }
  | { success: false; error: string };

const METRIC_KEYS = [
  "income",
  "savings",
  "expenses",
  "net_worth",
  "investment_value",
  "stock_value_total",
  "mutual_fund_total",
  "real_estate_total_price",
  "gold_value_estimate",
] as const;

export default function ResultClient() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submission_id");

  const signature = useMemo(() => searchParams.toString(), [searchParams]);

  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [rankings, setRankings] = useState<Record<string, RankingEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------------
  // STEP 1: Load metrics from URL OR API (/results/:id)
  // ----------------------------------------------
  useEffect(() => {
    const loadMetrics = async () => {
      if (!submissionId) {
        setError("Missing submission ID.");
        setLoading(false);
        return;
      }

      // Check if URL already has metrics
      const extracted: Record<string, number> = {};
      METRIC_KEYS.forEach((key) => {
        const v = searchParams.get(key);
        if (v && !isNaN(Number(v))) extracted[key] = Number(v);
      });

      if (Object.keys(extracted).length > 0) {
        setMetrics(extracted);
        return;
      }

      // Otherwise, fetch them from API
      try {
        const res = await fetch(`/api/results/${submissionId}`, {
          cache: "no-store",
        });
        const json: MetricsAPIResponse = await res.json();
        if (!json.success) throw new Error(json.error);
        setMetrics(json.metrics);
      } catch (e: any) {
        setError(e.message || "Unable to load your results.");
      }
    };

    loadMetrics();
  }, [signature, submissionId, searchParams]);

  // ----------------------------------------------
  // STEP 2: Compute rankings using /api/stats
  // ----------------------------------------------
  useEffect(() => {
    const computeRankings = async () => {
      if (!metrics) return;

      try {
        const res = await fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metrics }),
        });

        const json: StatsAPIResponse = await res.json();
        if (!json.success) throw new Error(json.error);

        setRankings(json.data);
      } catch (e: any) {
        setError(e.message || "Error computing percentiles.");
      } finally {
        setLoading(false);
      }
    };

    computeRankings();
  }, [metrics]);

  // ----------------------------------------------
  // UI HELPERS
  // ----------------------------------------------
  const formatCurrency = (v: number): string => {
    if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
    if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(1)} K`;
    return `₹${v}`;
  };

  const metricTitle = (key: string) =>
    ({
      income: "Annual Income",
      savings: "Total Savings",
      expenses: "Monthly Expenses",
      net_worth: "Net Worth",
      investment_value: "Total Investments",
      stock_value_total: "Stock Portfolio",
      mutual_fund_total: "Mutual Funds",
      real_estate_total_price: "Real Estate Value",
      gold_value_estimate: "Gold Value",
    }[key] || key);

  // ----------------------------------------------
  // RENDER
  // ----------------------------------------------
  if (loading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center text-gray-500">
        Calculating your ranking…
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8 max-w-xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Your Financial Ranking</h1>
        <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded-lg">
          {error}
        </div>
        <Link
          href="/"
          className="mt-6 inline-block px-5 py-2 rounded-lg bg-blue-600 text-white"
        >
          Return Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-10 px-4 flex justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-3xl w-full space-y-10">
        {/* HEADER */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-gray-800 drop-shadow-sm">
            Your Financial Ranking
          </h1>
          <p className="text-gray-600">Based on data from thousands of professionals</p>
        </div>

        {/* RESULT GRID */}
        <div className="space-y-8">
          {Object.entries(rankings).map(([metric, r]) => (
            <div
              key={metric}
              className="rounded-2xl p-6 bg-white/70 backdrop-blur-xl shadow-md border border-white/40 hover:shadow-xl transition"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">{metricTitle(metric)}</h2>
                <RankBadge percentile={r.percentile} />
              </div>

              {/* VALUE */}
              <p className="text-gray-500 text-sm">Your Value</p>
              <p className="text-2xl font-bold mb-4 text-gray-800">
                {formatCurrency(r.value)}
              </p>

              {/* GLOBAL PERCENTILE */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Global Percentile: <strong>{r.percentile.toFixed(1)}%</strong>
                </p>
                <PercentileBar value={r.percentile} />
              </div>
            </div>
          ))}
        </div>

        {/* BUTTONS */}
        <div className="flex flex-col md:flex-row gap-4 justify-center pt-4">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white text-center shadow hover:bg-blue-700"
          >
            Retake Assessment
          </Link>

          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-white border text-gray-700 text-center shadow hover:bg-gray-50"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
