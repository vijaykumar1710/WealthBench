"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface RankingResult {
  metric: string;
  value: number;
  percentile_rank: number;
  region_rank: number | null;
  bracket_rank: number | null;
  global_rank: number;
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const submissionId = searchParams.get("submission_id");
  const [rankings, setRankings] = useState<RankingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!submissionId) {
        setError("No submission ID provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch submission data first to get values
        const submissionResponse = await fetch(`/api/submission/${submissionId}`);
        if (!submissionResponse.ok) {
          // If we don't have a submission endpoint, we'll use mock data or skip
          setError("Could not fetch submission data");
          setLoading(false);
          return;
        }

        const subData = await submissionResponse.json();
        setSubmissionData(subData);

        // Fetch rankings for key metrics
        const metricsToRank = ["income", "savings", "expenses", "net_worth"];
        const rankingPromises = metricsToRank.map(async (metric) => {
          const value = getMetricValue(subData, metric);
          if (!value) return null;

          const response = await fetch(
            `/api/stats?metric=${metric}&value=${value}&region=${subData.region || ""}&income_bracket=${subData.income_bracket || ""}`
          );
          if (response.ok) {
            const data = await response.json();
            return { ...data, metric };
          }
          return null;
        });

        const results = (await Promise.all(rankingPromises)).filter((r) => r !== null);
        setRankings(results as RankingResult[]);
      } catch (err) {
        setError("Failed to load rankings. Please try again later.");
        console.error("Error fetching rankings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [submissionId]);

  const getMetricValue = (data: any, metric: string): number | null => {
    // Check fixed fields first
    if (data.fixed && data.fixed[metric] !== null && data.fixed[metric] !== undefined) {
      return data.fixed[metric];
    }
    // Check dynamic fields
    if (data.dynamic) {
      const field = data.dynamic.find((d: any) => d.key === metric);
      return field ? field.value : null;
    }
    return null;
  };

  const formatPercentile = (rank: number): string => {
    if (rank >= 90) return `top ${(100 - rank).toFixed(1)}%`;
    if (rank >= 50) return `${rank.toFixed(1)}th percentile`;
    return `bottom ${(100 - rank).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Your Results</h1>
          <div className="text-center py-20">
            <div className="text-lg text-gray-600">Calculating your rankings...</div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Your Results</h1>
          <div className="rounded-xl border p-4 shadow-sm bg-white">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
            <Link href="/" className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-4xl font-bold">Your Results</h1>
        <p className="text-gray-600">See how you compare to your peers</p>

        {rankings.length === 0 ? (
          <div className="rounded-xl border p-4 shadow-sm bg-white">
            <p className="text-gray-600">No ranking data available yet.</p>
            <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              View Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rankings.map((ranking) => (
              <div key={ranking.metric} className="rounded-xl border p-4 shadow-sm bg-white">
                <h3 className="text-xl font-bold mb-4 capitalize">{ranking.metric}</h3>
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Your Value:</span>
                    <span className="font-semibold">{ranking.value.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Global Rank:</span>
                    <span className="font-semibold text-blue-600">
                      {formatPercentile(ranking.global_rank)}
                    </span>
                  </div>
                  {ranking.region_rank !== null && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Region Rank:</span>
                      <span className="font-medium">{formatPercentile(ranking.region_rank)}</span>
                    </div>
                  )}
                  {ranking.bracket_rank !== null && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Income Bracket Rank:</span>
                      <span className="font-medium">{formatPercentile(ranking.bracket_rank)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <Link href="/" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Submit More Data
          </Link>
          <Link href="/dashboard" className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

