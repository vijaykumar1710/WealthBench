"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PercentileBar from "@/components/PercentileBar";
import RankBadge from "@/components/RankBadge";

interface RankingResult {
  metric: string;
  value: number;
  percentile: number; // global percentile (0–100)
  region_percentile: number | null;
  bracket_percentile: number | null;
}

type RankingResponseEntry = {
  value: number;
  percentile: number;
  region_percentile: number | null;
  bracket_percentile: number | null;
};

type BatchRankingResponse =
  | { success: true; data: Record<string, RankingResponseEntry> }
  | { success: false; error?: string };

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

  // Memoized signature so we only re-run fetch when search params actually change
  const paramsSignature = useMemo(() => searchParams.toString(), [searchParams]);

  const [rankings, setRankings] = useState<RankingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------
  // FETCH RANKINGS (FAST REDIS BACKED)
  // ---------------------------------------
  useEffect(() => {
    let isCancelled = false;
    const controller = new AbortController();

    const fetchRankings = async () => {
      if (!submissionId) {
        setError("No submission ID provided.");
        setRankings([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const params = new URLSearchParams(paramsSignature);
      const region = params.get("region") || "";
      const incomeBracket = params.get("income_bracket") || "";

      const metrics: Record<string, number> = {};
      METRIC_KEYS.forEach((metric) => {
        const raw = params.get(metric);
        if (!raw) return;
        const numeric = Number(raw);
        if (Number.isFinite(numeric)) metrics[metric] = numeric;
      });

      if (!Object.keys(metrics).length) {
        setError("No metric values were found in the URL.");
        setRankings([]);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/newStats/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metrics,
            region,
            income_bracket: incomeBracket,
          }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Unable to reach ranking service.");

        const json: BatchRankingResponse = await res.json();
        if (!json.success) throw new Error(json.error || "Failed to compute rankings.");

        const formatted: RankingResult[] = Object.entries(json.data).map(
          ([metric, d]) => ({
            metric,
            value: d.value,
            percentile: d.percentile,
            region_percentile: d.region_percentile,
            bracket_percentile: d.bracket_percentile,
          })
        );

        if (!isCancelled) setRankings(formatted);
      } catch (err) {
        if (!isCancelled && (err as any)?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load rankings.");
          setRankings([]);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchRankings();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [submissionId, paramsSignature]);

  // ---------------------------------------
  // HELPERS
  // ---------------------------------------

  const formatPercentileText = (p: number): string => {
    if (p >= 97) return "🎯 Top 3%";
    if (p >= 90) return "🏆 Top 10%";
    if (p >= 75) return "⭐ Top 25%";
    if (p >= 50) return "👍 Above Average";
    return "📊 Below Average";
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} Cr`;
    if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${value}`;
  };

  const formatMetricName = (metric: string): string => {
    const map: Record<string, string> = {
      income: "Annual Income",
      savings: "Total Savings",
      expenses: "Monthly Expenses",
      net_worth: "Net Worth",
      investment_value: "Total Investments",
      stock_value_total: "Stock Portfolio",
      mutual_fund_total: "Mutual Funds",
      real_estate_total_price: "Real Estate Value",
      gold_value_estimate: "Gold Value",
    };
    return map[metric] || metric.replace(/_/g, " ");
  };

  // ---------------------------------------
  // UI
  // ---------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-6">Your Financial Ranking</h1>
        <div className="text-center py-20 text-gray-500">
          Calculating your ranking...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-6">Your Financial Ranking</h1>

        <div className="bg-red-100 text-red-700 border border-red-300 px-4 py-3 rounded">
          {error}
        </div>

        <Link href="/" className="mt-6 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg">
          Return Home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-white">
      <div className="max-w-2xl mx-auto space-y-10">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-gray-700 text-transparent bg-clip-text">
            Your Financial Ranking
          </h1>
          <p className="text-gray-600 mt-2">How you compare across India</p>
        </div>

        {/* RESULTS */}
        <div className="grid grid-cols-1 gap-6">
          {rankings.map((r) => (
            <div
              key={r.metric}
              className="border rounded-xl p-5 shadow-sm bg-white space-y-4"
            >
              <h3 className="text-xl font-semibold">{formatMetricName(r.metric)}</h3>

              {/* USER VALUE */}
              <div className="flex justify-between text-base">
                <span className="text-gray-600">Your Value:</span>
                <span className="font-bold text-gray-800">{formatCurrency(r.value)}</span>
              </div>

              {/* GLOBAL PERCENTILE */}
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-700">
                  You are in the <strong>{r.percentile.toFixed(0)}th percentile</strong>
                </div>
                <PercentileBar value={r.percentile} />
                <div className="text-xs text-gray-500 text-center mt-1">
                  {formatPercentileText(r.percentile)}
                </div>
              </div>

              {/* REGIONAL */}
              {r.region_percentile !== null && (
                <div className="space-y-1">
                  <div className="text-sm text-gray-700 flex justify-between">
                    <span>Regional Ranking</span>
                    <RankBadge percentile={r.region_percentile} />
                  </div>
                  <PercentileBar value={r.region_percentile} />
                </div>
              )}

              {/* INCOME BRACKET */}
              {r.bracket_percentile !== null && (
                <div className="space-y-1">
                  <div className="text-sm text-gray-700 flex justify-between">
                    <span>Income Bracket Ranking</span>
                    <RankBadge percentile={r.bracket_percentile} />
                  </div>
                  <PercentileBar value={r.bracket_percentile} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col md:flex-row gap-4">
          <Link
            href="/"
            className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white text-center hover:bg-blue-700"
          >
            Retake Assessment
          </Link>

          <Link
            href="/dashboard"
            className="w-full md:w-auto px-6 py-3 rounded-lg border border-gray-300 text-gray-700 text-center hover:bg-gray-50"
          >
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
