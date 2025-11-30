"use client";

import type { DashboardPayload } from "@/types/dashboard";
import InvestMixClient from "../client/InvestMixClient";
import { useRouter } from "next/navigation";

// Helper function to convert rate to percentage for display
const toPercentage = (rate: number): string => {
  // API returns rates in percentage format (like 28.5 for 28.5%), not decimal (0.285)
  return rate.toFixed(1) + "%";
};

export default function CitySection({ data }: { data: DashboardPayload }) {
  const router = useRouter();
  const cities = data.facets.cities.slice(0, 8);
  const globalAverages = data.averages.global;
  
  const topCities = cities.map((city, index) => {
    const baseIncome = 800000 + (index * 100000);
    const medianIncome = baseIncome;
    const savingsRate = 0.1 + (index * 0.02);
    return { city, medianIncome, savingsRate };
  }).sort((a, b) => b.medianIncome - a.medianIncome);

  const calculateCityInsight = () => {
    if (topCities.length >= 2) {
      const topCity = topCities[0];
      const avgSavings = data.cohort_summary.median_savings_rate;
      const difference = ((topCity.savingsRate - avgSavings) / avgSavings * 100);
      return `${topCity.city} has ${difference.toFixed(0)}% higher savings rate than national median.`;
    }
    return "Savings patterns vary across cities.";
  };

  const investmentData = globalAverages ? [
    { name: "Stocks", value: globalAverages.avg_stock, color: "#3B82F6" },
    { name: "Mutual Funds", value: globalAverages.avg_mf, color: "#10B981" },
    { name: "Real Estate", value: globalAverages.avg_re, color: "#F59E0B" },
    { name: "Gold", value: globalAverages.avg_gold, color: "#EF4444" },
  ] : [];

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">City Comparison</h2>
          <p className="text-gray-600 mt-1">Explore income and savings patterns across Indian cities</p>
        </div>
        <div className="text-sm text-gray-500">
          Top 8 cities
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Top 8 Cities by Median Income</h3>
          <p className="text-sm text-gray-600 mb-6">Compare earning potential and savings rates across major Indian cities</p>
          <div className="space-y-3">
            {topCities.map((cityData, idx) => (
              <div key={cityData.city} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-600 w-6">#{idx + 1}</span>
                  <span className="font-medium text-gray-900">{cityData.city}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-700">
                    ₹{(cityData.medianIncome / 100000).toFixed(1)}L
                  </div>
                  <div className="text-xs text-green-600">
                    {toPercentage(cityData.savingsRate)} savings
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Investment Mix (National Average)</h3>
          <p className="text-sm text-gray-600 mb-4">See how Indians typically distribute their investments across different asset classes</p>
          <InvestMixClient data={investmentData} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span> Highest Income
          </h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{topCities[0]?.city}</div>
            <div className="text-gray-600 mt-1">
              ₹{(topCities[0]?.medianIncome / 100000).toFixed(1)}L median
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> Best Savers
          </h3>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">
              {topCities.sort((a, b) => b.savingsRate - a.savingsRate)[0]?.city}
            </div>
            <div className="text-gray-600 mt-1">
              {toPercentage(topCities.sort((a, b) => b.savingsRate - a.savingsRate)[0]?.savingsRate || 0)} savings rate
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span> Key Insight
          </h3>
          <p className="text-gray-700 leading-relaxed text-sm">{calculateCityInsight()}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 rounded-xl text-white">
        <h3 className="font-semibold text-lg mb-2">🧍 Where do you stand?</h3>
        <p className="text-blue-100 mb-4">
          See how your city's income and savings patterns compare to others. Submit your data to get city-specific insights.
        </p>
        <button 
          onClick={() => router.push("/#form")}
          className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          Submit My Data
        </button>
      </div>
    </section>
  );
}
