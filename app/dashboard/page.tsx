"use client";

import { useEffect, useState } from "react";
import { PieChart, Wallet, TrendingUp } from "lucide-react";
import MetricCard from "@/components/MetricCard";

interface MetricStats {
  sample_size: number;
  avg: number;
  p25: number;
  median: number;
  p75: number;
}

interface StatsResponse {
  metrics: Record<string, MetricStats>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/stats");
        const data: StatsResponse = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        setError("Failed to load statistics. Please try again later.");
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">WealthBench Dashboard</h1>
          <div className="flex items-center justify-center py-20">
            <div className="text-lg text-gray-600">Loading statistics...</div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-4 md:p-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">WealthBench Dashboard</h1>
          <div className="wb-card">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const metrics = stats?.metrics || {};
  const metricKeys = Object.keys(metrics);

  // Categorize metrics
  const requiredMetrics = ["income", "savings", "expenses"];
  const aggregateMetrics = [
    "stock_value_total",
    "mutual_fund_total",
    "real_estate_total_price",
    "real_estate_total",
    "gold_value",
    "fixed_deposit_total",
    "crypto_value_total",
    "car_value_total",
    "emi_total",
  ];
  const derivedMetrics = [
    "savings_rate",
    "expense_ratio",
    "investment_value",
    "emi_ratio",
    "net_worth",
  ];

  const getMetricsInCategory = (category: string[]) => {
    return category.filter((key) => metrics[key]);
  };

  const required = getMetricsInCategory(requiredMetrics);
  const aggregates = getMetricsInCategory(aggregateMetrics);
  const derived = getMetricsInCategory(derivedMetrics);
  const other = metricKeys.filter(
    (key) => !requiredMetrics.includes(key) && !aggregateMetrics.includes(key) && !derivedMetrics.includes(key)
  );

  return (
    <main className="min-h-screen p-4 md:p-6 bg-white">
      <div className="max-w-7xl mx-auto space-y-section">
        <div>
          <h1 className="text-4xl font-bold mb-2">WealthBench Dashboard</h1>
          <p className="text-gray-600">Aggregated financial benchmarks from anonymous submissions</p>
        </div>

        {metricKeys.length === 0 ? (
          <div className="wb-card text-center">
            <p className="text-gray-600 text-lg">
              No statistics available yet. Be the first to submit data!
            </p>
          </div>
        ) : (
          <>
            {/* Required Metrics */}
            {required.length > 0 && (
              <div>
                <h2 className="wb-section-title">
                  <PieChart className="w-5 h-5" />
                  Required Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {required.map((key) => {
                    const metric = metrics[key];
                    return (
                      <MetricCard
                        key={key}
                        title={key}
                        sample_size={metric.sample_size}
                        avg={metric.avg}
                        p25={metric.p25}
                        median={metric.median}
                        p75={metric.p75}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aggregate Optional Assets */}
            {aggregates.length > 0 && (
              <div>
                <h2 className="wb-section-title">
                  <Wallet className="w-5 h-5" />
                  Aggregate Optional Assets
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {aggregates.map((key) => {
                      const metric = metrics[key];
                      return (
                        <MetricCard
                          key={key}
                          title={key}
                          sample_size={metric.sample_size}
                          avg={metric.avg}
                          p25={metric.p25}
                          median={metric.median}
                          p75={metric.p75}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Derived Metrics */}
            {derived.length > 0 && (
              <div>
                <h2 className="wb-section-title">
                  <TrendingUp className="w-5 h-5" />
                  Derived Metrics
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {derived.map((key) => {
                      const metric = metrics[key];
                      return (
                        <MetricCard
                          key={key}
                          title={key}
                          sample_size={metric.sample_size}
                          avg={metric.avg}
                          p25={metric.p25}
                          median={metric.median}
                          p75={metric.p75}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Other Metrics */}
            {other.length > 0 && (
              <div>
                <h2 className="wb-section-title">Other Metrics</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {other.map((key) => {
                      const metric = metrics[key];
                      return (
                        <MetricCard
                          key={key}
                          title={key}
                          sample_size={metric.sample_size}
                          avg={metric.avg}
                          p25={metric.p25}
                          median={metric.median}
                          p75={metric.p75}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
