"use client";

import { useEffect, useState } from "react";
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
      <main className="min-h-screen p-6 bg-white">
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
      <main className="min-h-screen p-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">WealthBench Dashboard</h1>
          <div className="rounded-xl border p-4 shadow-sm bg-white">
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

  return (
    <main className="min-h-screen p-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">WealthBench Dashboard</h1>
        <p className="text-gray-600 mb-8">Aggregated financial benchmarks from anonymous submissions</p>

        {metricKeys.length === 0 ? (
          <div className="rounded-xl border p-4 shadow-sm bg-white text-center">
            <p className="text-gray-600 text-lg">
              No statistics available yet. Be the first to submit data!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metricKeys.map((key) => {
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
        )}
      </div>
    </main>
  );
}

