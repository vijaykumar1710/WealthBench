"use client";

import type { DashboardPayload } from "@/types/dashboard";
import { useRouter } from "next/navigation";

export default function AgeSection({ data }: { data: DashboardPayload }) {
  const router = useRouter();
  const incomeByAge = data.leaderboards.income_by_age;
  const topAgeGroups = [...incomeByAge]
    .sort((a, b) => b.median - a.median)
    .slice(0, 3);
  const bottomAgeGroups = [...incomeByAge]
    .sort((a, b) => a.median - a.median)
    .slice(0, 3);

  const calculateInsight = () => {
    if (incomeByAge.length >= 2) {
      const sorted = [...incomeByAge].sort((a, b) => {
        const aNum = parseInt(a.label.split('-')[0]);
        const bNum = parseInt(b.label.split('-')[0]);
        return aNum - bNum;
      });
      
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const increase = ((curr.median - prev.median) / prev.median * 100);
        if (increase > 0) {
          return `People aged ${curr.label} earn ${increase.toFixed(0)}% more than ${prev.label}.`;
        }
      }
    }
    return "Income varies significantly across age groups.";
  };

  const calculateIncomeProgression = () => {
    const sorted = [...incomeByAge].sort((a, b) => {
      const aNum = parseInt(a.label.split('-')[0]);
      const bNum = parseInt(b.label.split('-')[0]);
      return aNum - bNum;
    });
    
    return sorted.map((group, index) => {
      const prevIncome = index > 0 ? sorted[index - 1].median : group.median;
      const growth = index > 0 ? ((group.median - prevIncome) / prevIncome * 100) : 0;
      return {
        ...group,
        growth: growth > 0 ? `+${growth.toFixed(0)}%` : growth < 0 ? `${growth.toFixed(0)}%` : '0%'
      };
    });
  };

  const progressionData = calculateIncomeProgression();

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Income by Age</h2>
          <p className="text-gray-600 mt-1">See how earnings change throughout your career journey</p>
        </div>
        <div className="text-sm text-gray-500">
          {incomeByAge.length} age groups
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-lg mb-2">Income Progression by Age</h3>
        <p className="text-sm text-gray-600 mb-6">Track how earnings typically increase with age and experience</p>
        <div className="space-y-4">
          {progressionData.map((group, index) => (
            <div key={group.label} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">{group.label}</span>
                  {index > 0 && (
                    <span className={`text-sm font-semibold px-2 py-1 rounded ${
                      group.growth.startsWith('+') 
                        ? 'bg-green-100 text-green-700' 
                        : group.growth.startsWith('-')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {group.growth}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">
                    ₹{(group.median / 100000).toFixed(1)}L
                  </div>
                  <div className="text-xs text-gray-500">
                    {group.sample_size} professionals
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(group.median / Math.max(...progressionData.map(d => d.median))) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">🏆</span> Top 3 Age Groups
          </h3>
          <div className="space-y-3">
            {topAgeGroups.map((group, idx) => (
              <div key={group.label} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-green-600">#{idx + 1}</span>
                  <span className="font-medium">{group.label}</span>
                </div>
                <span className="font-bold text-green-700">
                  ₹{(group.median / 100000).toFixed(1)}L
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">📉</span> Lowest 3 Age Groups
          </h3>
          <div className="space-y-3">
            {bottomAgeGroups.map((group, idx) => (
              <div key={group.label} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-orange-600">#{idx + 1}</span>
                  <span className="font-medium">{group.label}</span>
                </div>
                <span className="font-bold text-orange-700">
                  ₹{(group.median / 100000).toFixed(1)}L
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span> Key Insight
          </h3>
          <p className="text-gray-700 leading-relaxed">{calculateInsight()}</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-xl text-white">
        <h3 className="font-semibold text-lg mb-2">🧍 Where do you stand?</h3>
        <p className="text-blue-100 mb-4">
          See how your income compares to others in your age group. Submit your data anonymously to get personalized insights.
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
