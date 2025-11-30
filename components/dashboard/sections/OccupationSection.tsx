"use client";

import type { DashboardPayload } from "@/types/dashboard";
import { useRouter } from "next/navigation";

// Helper function to convert rate to percentage for display
const toPercentage = (rate: number): string => {
  // API returns rates in percentage format
  // We filter out unrealistic values (>80%) before displaying
  return rate.toFixed(1) + "%";
};

// Helper function to convert rate to percentage for calculations
const toPercentageNumber = (rate: number): number => {
  return rate;
};

export default function OccupationSection({ data }: { data: DashboardPayload }) {
  const router = useRouter();
  const incomeByOccupation = data.leaderboards.income_by_occupation;
  const savingsByIncome = data.leaderboards.savings_rate_by_income;
  
  const topOccupations = incomeByOccupation
    .sort((a, b) => b.median - a.median)
    .slice(0, 10);
    
  const topSavingsRates = savingsByIncome
    .filter(group => {
      // Filter out unrealistic savings rates (>80% is likely bad data)
      // Also filter out very small sample sizes (<10 people)
      return group.median <= 80 && group.sample_size >= 10;
    })
    .sort((a, b) => b.median - a.median)
    .slice(0, 8);

  const filteredDataCount = savingsByIncome.length - topSavingsRates.length;

  const calculateInsight = () => {
    if (topOccupations.length >= 2) {
      const highest = topOccupations[0];
      const lowest = topOccupations[topOccupations.length - 1];
      const ratio = highest.median / lowest.median;
      return `${highest.label} earn ${ratio.toFixed(1)}× more than ${lowest.label}.`;
    }
    return "Income varies significantly across occupations.";
  };

  const calculateSavingsInsights = () => {
    // Use the same filtered data as the display to maintain consistency
    const validData = savingsByIncome.filter(group => 
      group.median <= 80 && group.sample_size >= 10
    );
    
    if (validData.length === 0) {
      return {
        lowestIncome: "No valid data",
        highestIncome: "No valid data", 
        lowestRate: "0%",
        highestRate: "0%",
        improvement: "0"
      };
    }
    
    const sorted = validData.sort((a, b) => a.median - b.median);
    const lowest = sorted[0];
    const highest = sorted[sorted.length - 1];
    const difference = highest.median - lowest.median;
    return {
      lowestIncome: lowest.label,
      highestIncome: highest.label,
      lowestRate: toPercentage(lowest.median),
      highestRate: toPercentage(highest.median),
      improvement: toPercentageNumber(difference).toFixed(1)
    };
  };

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Income by Occupation</h2>
          <p className="text-gray-600 mt-1">Compare salaries across different professional roles</p>
        </div>
        <div className="text-sm text-gray-500">
          {incomeByOccupation.length} roles
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-4">Top 10 Roles by Median Salary</h3>
          <div className="space-y-3">
            {topOccupations.map((occupation, idx) => (
              <div key={occupation.label} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-blue-600 w-6">#{idx + 1}</span>
                  <span className="font-medium text-gray-900">{occupation.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-700">
                    ₹{(occupation.median / 100000).toFixed(1)}L
                  </div>
                  <div className="text-xs text-gray-500">
                    {occupation.sample_size} samples
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-lg mb-2">Savings Rate by Income Level</h3>
          <p className="text-sm text-gray-600 mb-4">
            <strong>💡 Why we use median:</strong> Median represents the typical person's experience, 
            avoiding distortion from extremely high or low values. A healthy savings rate is 20%+ of income.
            {filteredDataCount > 0 && (
              <span className="text-amber-600 ml-2">
                Note: {filteredDataCount} entries with unrealistic data were filtered out.
              </span>
            )}
          </p>
          <div className="space-y-4">
            {topSavingsRates.map((group, index) => {
              const savingsPercentage = toPercentageNumber(group.median);
              const color = savingsPercentage >= 30 ? 'green' : savingsPercentage >= 20 ? 'blue' : savingsPercentage >= 15 ? 'yellow' : 'orange';
              const colorClasses = {
                green: 'bg-green-500',
                blue: 'bg-blue-500', 
                yellow: 'bg-yellow-500',
                orange: 'bg-orange-500'
              };
              
              return (
                <div key={group.label} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">{group.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-lg ${
                        savingsPercentage >= 30 ? 'text-green-600' : 
                        savingsPercentage >= 20 ? 'text-blue-600' :
                        savingsPercentage >= 15 ? 'text-yellow-600' :
                        'text-orange-600'
                      }`}>
                        {toPercentage(group.median)}
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {group.sample_size} people
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${colorClasses[color]} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(savingsPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span> Key Insight
          </h3>
          <p className="text-gray-700 leading-relaxed">{calculateInsight()}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">📊</span> Savings Patterns
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-600">Highest Rate</span>
              <span className="font-bold text-green-600">{calculateSavingsInsights().highestRate}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-600">Lowest Rate</span>
              <span className="font-bold text-orange-600">{calculateSavingsInsights().lowestRate}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-600">Improvement</span>
              <span className="font-bold text-blue-600">+{calculateSavingsInsights().improvement}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-xl text-white">
        <h3 className="font-semibold text-lg mb-2">🧍 Where do you stand?</h3>
        <p className="text-purple-100 mb-4">
          Compare your salary and savings rate with others in your role. Get personalized insights by submitting your data.
        </p>
        <button 
          onClick={() => router.push("/#form")}
          className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
        >
          Submit My Data
        </button>
      </div>
    </section>
  );
}
