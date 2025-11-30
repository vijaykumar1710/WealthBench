import type { DashboardPayload } from "@/types/dashboard";
import FiltersClient from "../client/FiltersClient";

// Helper function to convert rate to percentage for display
const toPercentage = (rate: number): string => {
  // API returns rates in percentage format (like 28.5 for 28.5%), not decimal (0.285)
  return rate.toFixed(1) + "%";
};

export default function HeroSection({ data }: { data: DashboardPayload }) {
  return (
    <section className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 rounded-2xl shadow-sm border border-gray-100">
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">⚠️</span>
          <p className="text-sm text-amber-800">
            <strong>Data Quality Notice:</strong> We use smart algorithms to filter out unrealistic or dummy data 
            (like impossible savings rates) to ensure you see accurate, trustworthy financial insights.
          </p>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row justify-between gap-8">
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">WealthBench Dashboard</h1>
          <p className="text-gray-600 mt-3 text-lg">
            Compare your finances with <span className="font-semibold text-blue-600">{data.sample_size.toLocaleString()}</span> Indians
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-500">Median Income</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                ₹{((data.cohort_summary.median_income) / 100000).toFixed(1)}L
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-500">Savings Rate</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {toPercentage(data.cohort_summary.median_savings_rate)}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-500">Expense Rate</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {toPercentage(data.cohort_summary.median_expense_rate)}
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {new Date(data.generated_at).toISOString().slice(0, 16).replace('T', ' ')} • 
            Refresh in {Math.floor(data.ttl_seconds / 60)} min
          </div>
        </div>

        <div className="w-full lg:w-96">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </h3>
            <FiltersClient facets={data.facets} />
          </div>
        </div>
      </div>
    </section>
  );
}
