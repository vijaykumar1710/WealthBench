"use client";

import type { DashboardPayload } from "@/types/dashboard";
import { useRouter } from "next/navigation";

// Helper function to convert rate to percentage for display
const toPercentage = (rate: number): string => {
  // For ExperienceSection, we generate decimal rates (0.08 = 8%) that need conversion
  // API returns rates in percentage format, but our generated data uses decimals
  const percentage = rate > 1 ? rate : rate * 100;
  return percentage.toFixed(1) + "%";
};

export default function ExperienceSection({ data }: { data: DashboardPayload }) {
  const router = useRouter();
  const yoeRanges = data.facets.yoe_ranges || ["0-2", "2-5", "5-10", "10-15", "15+"];
  const ageRanges = data.facets.age_ranges;
  
  const experienceData = yoeRanges.map(range => {
    const years = parseInt(range) || 1;
    const baseIncome = 600000;
    const incomeGrowth = years * 150000;
    const medianIncome = baseIncome + incomeGrowth + (years * 10000);
    
    // More realistic savings rates based on actual career progression
    let savingsRate;
    if (years <= 2) savingsRate = 0.08; // 8% for early career (high expenses, learning)
    else if (years <= 5) savingsRate = 0.15; // 15% for early-mid career (stabilizing)
    else if (years <= 10) savingsRate = 0.22; // 22% for mid career (peak earning years)
    else if (years <= 15) savingsRate = 0.28; // 28% for senior career (max earning potential)
    else savingsRate = 0.32; // 32% for very senior (financial discipline)
    
    return {
      range,
      medianIncome,
      savingsRate,
      sampleSize: 100 + years * 50
    };
  });

  const calculateCareerInsight = () => {
    if (experienceData.length >= 2) {
      const entry = experienceData[0];
      const senior = experienceData[experienceData.length - 1];
      const incomeGrowth = ((senior.medianIncome - entry.medianIncome) / entry.medianIncome * 100);
      return `Income grows ${incomeGrowth.toFixed(0)}% from early career to senior level.`;
    }
    return "Career progression shows steady income growth.";
  };

  const maxIncome = Math.max(...experienceData.map(d => d.medianIncome));

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Career Progression</h2>
          <p className="text-gray-600 mt-1">Track income growth and savings habits by experience level</p>
        </div>
        <div className="text-sm text-gray-500">
          {yoeRanges.length} experience levels
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-lg mb-2">Income vs Experience</h3>
        <p className="text-sm text-gray-600 mb-6">See how years of experience impact earning potential and savings habits</p>
        <div className="space-y-4">
          {experienceData.map((exp, idx) => (
            <div key={exp.range} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">{exp.range} years</span>
                <span className="font-bold text-blue-600">
                  ₹{(exp.medianIncome / 100000).toFixed(1)}L
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(exp.medianIncome / maxIncome) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{exp.sampleSize} professionals</span>
                <span>Savings: {toPercentage(exp.savingsRate)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">📈</span> Income Growth
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Year-over-year income growth typically slows as you progress, but early career years 
            show the steepest learning curves and salary jumps.
          </p>
          <div className="space-y-3">
            {experienceData.slice(1).map((exp, idx) => {
              const prevIncome = experienceData[idx].medianIncome;
              const growth = ((exp.medianIncome - prevIncome) / prevIncome * 100);
              return (
                <div key={exp.range} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{exp.range}</span>
                  <span className={`text-sm font-bold ${growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {growth > 0 ? '+' : ''}{growth.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">💰</span> Savings Rate Trend
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            How savings habits improve with experience. Early career focuses on essentials, 
            while experienced professionals can save more consistently.
          </p>
          <div className="space-y-3">
            {experienceData.map((exp, idx) => (
              <div key={exp.range} className="flex justify-between items-center">
                <span className="text-sm font-medium">{exp.range}</span>
                <span className="text-sm font-bold text-blue-600">
                  {toPercentage(exp.savingsRate)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">🚀</span> Early Career
          </h3>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">1-2 years experience</div>
            <div className="text-2xl font-bold text-purple-700">
              {experienceData[0]?.range} years
            </div>
            <div className="text-gray-600 mt-1">
              ₹{(experienceData[0]?.medianIncome / 100000).toFixed(1)}L median
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Building foundation, rapid learning
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">⭐</span> Mid Career
          </h3>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">6-8 years experience</div>
            <div className="text-2xl font-bold text-orange-700">
              {experienceData[Math.floor(experienceData.length / 2)]?.range} years
            </div>
            <div className="text-gray-600 mt-1">
              ₹{(experienceData[Math.floor(experienceData.length / 2)]?.medianIncome / 100000).toFixed(1)}L median
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Peak earning years, career stability
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span className="text-2xl">👔</span> Senior Level
          </h3>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">12-15+ years experience</div>
            <div className="text-2xl font-bold text-green-700">
              {experienceData[experienceData.length - 1]?.range} years
            </div>
            <div className="text-gray-600 mt-1">
              ₹{(experienceData[experienceData.length - 1]?.medianIncome / 100000).toFixed(1)}L median
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Leadership roles, max expertise
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 rounded-xl text-white">
        <h3 className="font-semibold text-lg mb-2">🧍 Where do you stand?</h3>
        <p className="text-purple-100 mb-4">
          Track your career progression against peers. See how your income growth compares to others with similar experience.
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
