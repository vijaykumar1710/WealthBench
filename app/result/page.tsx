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
  const [breakdown, setBreakdown] = useState<any>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      if (!submissionId) {
        setError("No submission ID provided");
        setLoading(false);
        return;
      }

      try {
        const region = searchParams.get("region") || "";
        const incomeBracket = searchParams.get("income_bracket") || "";
        
        // Fetch rankings for key metrics
        const metricsToRank = [
          { metric: "income", value: searchParams.get("income") },
          { metric: "savings", value: searchParams.get("savings") },
          { metric: "expenses", value: searchParams.get("expenses") },
          { metric: "net_worth", value: searchParams.get("net_worth") },
          { metric: "investment_value", value: searchParams.get("investment_value") },
          { metric: "stock_value_total", value: searchParams.get("stock_value_total") },
          { metric: "mutual_fund_total", value: searchParams.get("mutual_fund_total") },
          { metric: "real_estate_total_price", value: searchParams.get("real_estate_total_price") },
        ].filter(m => m.value);

        if (metricsToRank.length === 0) {
          setError("No metric values provided. Rankings will be available after more data is collected.");
          setLoading(false);
          return;
        }

        const rankingPromises = metricsToRank.map(async ({ metric, value }) => {
          if (!value) return null;

          const response = await fetch(
            `/api/stats?metric=${metric}&value=${parseFloat(value)}&region=${region}&income_bracket=${incomeBracket}`
          );
          if (response.ok) {
            const data = await response.json();
            return { ...data, metric, value: parseFloat(value) };
          }
          return null;
        });

        const results = (await Promise.all(rankingPromises)).filter((r) => r !== null);
        setRankings(results as RankingResult[]);

        // Try to get breakdown data from URL params or localStorage
        // For now, we'll show a placeholder - in production, fetch from API
        const breakdownData = {
          stocks: searchParams.get("stocks") ? JSON.parse(searchParams.get("stocks")!) : null,
          mutual_funds: searchParams.get("mutual_funds") ? JSON.parse(searchParams.get("mutual_funds")!) : null,
          cars: searchParams.get("cars") ? JSON.parse(searchParams.get("cars")!) : null,
          emis: searchParams.get("emis") ? JSON.parse(searchParams.get("emis")!) : null,
          real_estate: searchParams.get("real_estate") ? JSON.parse(searchParams.get("real_estate")!) : null,
        };
        
        if (Object.values(breakdownData).some(v => v !== null)) {
          setBreakdown(breakdownData);
        }
      } catch (err) {
        setError("Failed to load rankings. Please try again later.");
        console.error("Error fetching rankings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, [submissionId, searchParams]);

  const formatPercentile = (rank: number): string => {
    if (rank >= 90) return `Top ${(100 - rank).toFixed(1)}%`;
    if (rank >= 75) return `${rank.toFixed(1)}th percentile (Top 25%)`;
    if (rank >= 50) return `${rank.toFixed(1)}th percentile`;
    return `${rank.toFixed(1)}th percentile`;
  };

  const getRankColor = (rank: number): string => {
    if (rank >= 90) return "text-green-600";
    if (rank >= 75) return "text-blue-600";
    if (rank >= 50) return "text-gray-600";
    return "text-orange-600";
  };

  const formatMetricName = (metric: string): string => {
    return metric
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-gray-600 bg-clip-text text-transparent">
            Your Financial Ranking
          </h1>
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
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-gray-600 bg-clip-text text-transparent">
            Your Financial Ranking
          </h1>
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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-gray-600 bg-clip-text text-transparent">
          Your Financial Ranking
        </h1>
        <p className="text-gray-600">See how you compare to your peers across different financial metrics</p>

        {rankings.length === 0 ? (
          <div className="rounded-xl border p-4 shadow-sm bg-white">
            <p className="text-gray-600">No ranking data available yet.</p>
            <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              View Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rankings.map((ranking) => (
                <div key={ranking.metric} className="rounded-xl border p-6 shadow-sm bg-white">
                  <h3 className="text-xl font-bold mb-4 capitalize">{formatMetricName(ranking.metric)}</h3>
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Your Value:</span>
                      <span className="font-semibold text-gray-800">
                        {ranking.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Global Rank:</span>
                        <span className={`font-semibold ${getRankColor(ranking.global_rank)}`}>
                          {formatPercentile(ranking.global_rank)}
                        </span>
                      </div>
                      {ranking.region_rank !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Regional Rank:</span>
                          <span className={`font-medium ${getRankColor(ranking.region_rank)}`}>
                            {formatPercentile(ranking.region_rank)}
                          </span>
                        </div>
                      )}
                      {ranking.bracket_rank !== null && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Income Bracket Rank:</span>
                          <span className={`font-medium ${getRankColor(ranking.bracket_rank)}`}>
                            {formatPercentile(ranking.bracket_rank)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Breakdown Summary */}
            {breakdown && (
              <div className="rounded-xl border p-6 shadow-sm bg-white">
                <h2 className="text-2xl font-semibold mb-4">Breakdown Summary</h2>
                <div className="space-y-4">
                  {breakdown.stocks && breakdown.stocks.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Stocks</h3>
                      <div className="space-y-1">
                        {breakdown.stocks.map((stock: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{stock.name}</span>
                            <span className="font-medium">{stock.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {breakdown.mutual_funds && breakdown.mutual_funds.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Mutual Funds</h3>
                      <div className="space-y-1">
                        {breakdown.mutual_funds.map((fund: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{fund.name}</span>
                            <span className="font-medium">{fund.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {breakdown.cars && breakdown.cars.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Cars</h3>
                      <div className="space-y-1">
                        {breakdown.cars.map((car: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{car.name}</span>
                            <span className="font-medium">{car.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {breakdown.emis && breakdown.emis.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">EMIs</h3>
                      <div className="space-y-1">
                        {breakdown.emis.map((emi: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{emi.name}</span>
                            <span className="font-medium">{emi.value.toLocaleString()}/month</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {breakdown.real_estate && breakdown.real_estate.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Real Estate</h3>
                      <div className="space-y-1">
                        {breakdown.real_estate.map((prop: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-600">{prop.location}</span>
                            <span className="font-medium">{prop.price.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-4 pt-6">
          <Link href="/" className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
            Submit More Data
          </Link>
          <Link href="/dashboard" className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium">
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
