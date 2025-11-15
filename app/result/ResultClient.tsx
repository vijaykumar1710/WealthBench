"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import PercentileBar from "@/components/PercentileBar";
import RankBadge from "@/components/RankBadge";

interface RankingResult {
  metric: string;
  value: number;
  percentile_rank: number;
  region_rank: number | null;
  bracket_rank: number | null;
  global_rank: number;
}

export default function ResultClient() {
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
    if (rank >= 97.5) return `🎯 Top 1%`;
    if (rank >= 90) return `🏆 Top 10%`;
    if (rank >= 75) return `⭐ Top 25%`;
    if (rank >= 50) return `👍 Top 50%`;
    return `📊 Bottom 50%`;
  };

  const formatCurrency = (value: number): string => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${value}`;
  };

  const formatRank = (rank: number | null): string => {
    if (rank === null || isNaN(rank)) return 'N/A';
    
    const lastDigit = rank % 10;
    const lastTwoDigits = rank % 100;
    
    // Handle special cases for 11th, 12th, 13th
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${rank}th`;
    }
    
    // Handle other cases
    switch (lastDigit) {
      case 1: return `${rank}st`;
      case 2: return `${rank}nd`;
      case 3: return `${rank}rd`;
      default: return `${rank}th`;
    }
  };

  const getInsight = (percentile: number): string => {
    if (percentile >= 90) {
      return "Exceptional! You're in the top 10% of your peers.";
    } else if (percentile >= 75) {
      return "Great! You're in the top 25% of your peers.";
    } else if (percentile >= 50) {
      return "Good! You're doing better than average.";
    } else if (percentile >= 25) {
      return "You're doing okay, but there's room for improvement.";
    } else {
      return "Consider focusing on improving this area of your finances.";
    }
  };

  const formatMetricName = (metric: string): string => {
    const metricNames: { [key: string]: string } = {
      // Base metrics
      income: "Annual Income",
      savings: "Savings",
      expenses: "Monthly Expenses",
      
      // Net worth and components
      net_worth: "Net Worth",
      total_assets: "Total Assets",
      total_liabilities: "Total Liabilities",
      
      // Asset components
      asset_savings: "Savings",
      asset_investments: "Investments",
      asset_realEstate: "Real Estate",
      asset_vehicles: "Vehicles",
      
      // Liability components
      liability_debt: "Total Debt",
      liability_emis: "Annual EMIs",
      
      // Investment components
      investment_value: "Total Investments",
      stock_value_total: "Stock Portfolio",
      mutual_fund_total: "Mutual Funds",
      real_estate_total_price: "Real Estate Value"
    };
    
    // Handle dynamic asset/liability keys
    if (metric.startsWith('asset_') || metric.startsWith('liability_')) {
      return metricNames[metric] || 
        metric.split('_').slice(1).map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    return metricNames[metric] || metric.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-6 bg-white">
        <div className="max-w-2xl mx-auto">
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
      <main className="min-h-screen p-4 md:p-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-gray-600 bg-clip-text text-transparent">
            Your Financial Ranking
          </h1>
          <div className="wb-card">
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
    <main className="min-h-screen p-4 md:p-6 bg-white">
      <div className="max-w-2xl mx-auto space-y-section">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-gray-600 bg-clip-text text-transparent">
          Your Financial Ranking
        </h1>
        <p className="text-gray-600">See how you compare to your peers across different financial metrics</p>
        {rankings.length === 0 ? (
          <div className="wb-card">
            <p className="text-gray-600">No ranking data available yet.</p>
            <Link href="/dashboard" className="mt-4 inline-block px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
              View Dashboard
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rankings.map((ranking) => (
                <div key={ranking.metric} className="wb-card space-y-4">
                  <h3 className="text-xl font-bold capitalize">{formatMetricName(ranking.metric)}</h3>
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div className={`p-4 rounded-lg ${
                      ranking.metric === 'net_worth' ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-600">
                          {ranking.metric === 'net_worth' ? 'Total Net Worth' : 'Your Value'}:
                        </span>
                        <span className={`text-lg font-bold ${
                          ranking.metric === 'net_worth' ? 'text-blue-800' : 'text-gray-900'
                        }`}>
                          {formatCurrency(ranking.value)}
                        </span>
                      </div>
                      
                      {ranking.metric === 'net_worth' && (
                        <div className="mt-2 space-y-2">
                          {/* Show assets vs liabilities */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-green-50 p-2 rounded">
                              <div className="text-green-700 font-medium">Assets</div>
                              <div className="text-green-800 font-semibold">
                                {formatCurrency(rankings.find(r => r.metric === 'total_assets')?.value || 0)}
                              </div>
                            </div>
                            <div className="bg-red-50 p-2 rounded">
                              <div className="text-red-700 font-medium">Liabilities</div>
                              <div className="text-red-800 font-semibold">
                                {formatCurrency(rankings.find(r => r.metric === 'total_liabilities')?.value || 0)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Show net worth status */}
                          <div className={`text-xs text-center p-1 rounded ${
                            ranking.value >= 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {ranking.value >= 0 ? '✅' : '⚠️'} {
                              ranking.value >= 0 
                                ? 'Your net worth is positive' 
                                : 'Your liabilities exceed your assets'
                            }
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-xs text-blue-600 mb-1">Global Rank</div>
                          <div className="text-lg font-semibold">
                            {formatRank(ranking.global_rank)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {formatPercentile(ranking.global_rank)}
                          </div>
                        </div>
                        {ranking.region_rank !== null && (
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-xs text-green-600 mb-1">Regional Rank</div>
                            <div className="text-lg font-semibold">
                              {formatRank(ranking.region_rank)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatPercentile(ranking.region_rank)}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="pt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                        <PercentileBar value={ranking.global_rank} />
                        <p className="text-xs text-center text-gray-500 mt-1">
                          You are in the top {100 - Math.floor(ranking.global_rank)}% globally
                        </p>
                      </div>
                    </div>
                    {ranking.region_rank !== null && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Regional Rank:</span>
                          <RankBadge percentile={ranking.region_rank} />
                        </div>
                        <PercentileBar value={ranking.region_rank} />
                        
                        {/* Show net worth components if this is the net worth card */}
                        {ranking.metric === 'net_worth' && (
                          <div className="mt-4 space-y-2">
                            <h4 className="text-sm font-medium text-gray-700">Asset Breakdown</h4>
                            <div className="space-y-1">
                              {rankings
                                .filter(r => r.metric.startsWith('asset_') && r.value > 0)
                                .map(asset => (
                                  <div key={asset.metric} className="flex justify-between text-xs">
                                    <span className="text-gray-500">{formatMetricName(asset.metric)}</span>
                                    <span className="font-medium">{formatCurrency(asset.value)}</span>
                                  </div>
                                ))}
                            </div>
                            
                            <h4 className="text-sm font-medium text-gray-700 mt-3">Liability Breakdown</h4>
                            <div className="space-y-1">
                              {rankings
                                .filter(r => r.metric.startsWith('liability_') && r.value > 0)
                                .map(liability => (
                                  <div key={liability.metric} className="flex justify-between text-xs">
                                    <span className="text-gray-500">{formatMetricName(liability.metric)}</span>
                                    <span className="font-medium">{formatCurrency(liability.value)}</span>
                                  </div>
                                ))}
                                
                              {rankings.every(r => !r.metric.startsWith('liability_')) && (
                                <div className="text-xs text-gray-400 italic">No liabilities recorded</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {ranking.bracket_rank !== null && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Income Bracket Rank:</span>
                          <RankBadge percentile={ranking.bracket_rank} />
                        </div>
                        <PercentileBar value={ranking.bracket_rank} />
                      </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                      <p className="text-sm text-blue-800">{getInsight(ranking.global_rank)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {breakdown && (
              <div className="wb-card space-y-4">
                <h2 className="text-2xl font-semibold">Breakdown Summary</h2>
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
        <div className="flex flex-col md:flex-row gap-4 pt-6">
          <Link href="/" className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-center">
            Retake Assessment
          </Link>
          <Link href="/dashboard" className="w-full md:w-auto px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-center">
            View Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

