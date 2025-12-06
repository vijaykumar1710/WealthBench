import DynamicInputForm from "@/components/DynamicInputForm";
import ShareButton from "@/components/ui/ShareButton";
import { ArrowRight, ShieldCheck, Users, TrendingUp } from "lucide-react";
import { headers } from "next/headers";

// -----------------------------------------------
// Fetch Basic Stats (no-store for fresh values)
// -----------------------------------------------
async function fetchBasicStats() {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host")!;
    const proto = h.get("x-forwarded-proto") ?? "https";

    const url = `${proto}://${host}/api/dashboard?view=dashboard`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const stats = await fetchBasicStats();

  const totalEntries = stats?.sample_size ?? 0;
  const ageIncome = stats?.leaderboards?.income_by_age ?? [];

  // Build a lookup for savings/expense values per income slab → per age
  const savingsRates = stats?.leaderboards?.savings_rate_by_income ?? [];
  const expenseRates = stats?.leaderboards?.expense_rate_by_income ?? [];

  // Helper: Safely extract % from a slab like "₹10L–₹15L"
  const getRateForIncome = (income: number, list: any[]) => {
    // match slab by income
    return list.find((slab: any) => {
      const match = slab.label.match(/₹(\d+)L–₹(\d+)L/);
      if (!match) return false;
      const min = Number(match[1]) * 100000;
      const max = Number(match[2]) * 100000;
      return income >= min && income <= max;
    });
  };

  return (
    <main className="min-h-screen flex flex-col items-center p-4 md:p-6">

      {/* --------------------------------------------- */}
      {/* HERO SECTION */}
      {/* --------------------------------------------- */}
      <section className="max-w-5xl w-full text-center space-y-6 pb-12 mt-6">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
          India’s Most Trusted{" "}
          <span className="text-blue-600">Anonymous Wealth Benchmark</span>
        </h1>

        <p className="text-gray-600 text-lg md:text-xl max-w-2xl mx-auto">
          Compare your income, expenses & savings with{" "}
          <strong>{totalEntries.toLocaleString()}</strong> verified professionals.
          No login. No email. No tracking.
        </p>

        {/* CTA Buttons */}
        <div className="pt-4 flex flex-col md:flex-row justify-center gap-3">
          <a
            href="#form"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            Check Your Rank <ArrowRight className="w-4 h-4" />
          </a>

          <a
            href="/dashboard"
            className="px-6 py-3 rounded-lg border font-medium hover:bg-gray-100"
          >
            View Dashboard
          </a>

          <ShareButton
            title="WealthBench - India's Anonymous Wealth Benchmark"
            text="Compare your income, expenses & savings with thousands of verified professionals. No login. No email. No tracking."
            variant="outline"
          />
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-5 pt-3 text-sm text-gray-500">
          <p className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> 100% Anonymous
          </p>
          <p className="flex items-center gap-1">
            <Users className="w-4 h-4" /> {totalEntries.toLocaleString()} Users
          </p>
          <p className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" /> Instant Results
          </p>
        </div>
      </section>




      {/* --------------------------------------------- */}
      {/* AGE-WISE COHORT INSIGHTS */}
      {/* --------------------------------------------- */}
      <section className="w-full max-w-5xl mx-auto space-y-8">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          How Do People Your Age Manage Money?
        </h2>

        <p className="text-center text-gray-600 max-w-xl mx-auto">
          Real anonymized insights from working professionals across India.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {ageIncome.map((group: any) => {
            const incomeLabel = group.label;
            const avgIncome = group.avg;

            // Find matching slabs for savings & expense %
            const saveRate = getRateForIncome(avgIncome, savingsRates);
            const spendRate = getRateForIncome(avgIncome, expenseRates);

            return (
              <div
                key={incomeLabel}
                className="p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition flex flex-col"
              >
                <p className="text-lg font-semibold">{incomeLabel}</p>

                {/* Income */}
                <p className="text-sm text-gray-500 mt-1">Typical Income</p>
                <p className="font-bold text-blue-600">
                  ₹{(avgIncome / 100000).toFixed(1)}L / year
                </p>

                {/* Savings Rate */}
                <p className="text-sm text-gray-500 mt-4">Savings Rate</p>
                <p className="font-bold text-green-600">
                  ~{saveRate?.median?.toFixed(1) ?? "—"}%
                </p>

                {/* Expenses Rate */}
                <p className="text-sm text-gray-500 mt-4">Expense Rate</p>
                <p className="font-bold text-amber-600">
                  ~{spendRate?.median?.toFixed(1) ?? "—"}%
                </p>

                <p className="text-xs text-gray-400 mt-auto pt-4">
                  {group.sample_size} people in this age group
                </p>
              </div>
            );
          })}
        </div>
      </section>





      {/* --------------------------------------------- */}
      {/* BENEFITS SECTION */}
      {/* --------------------------------------------- */}
      <section className="max-w-4xl w-full pt-14 space-y-10">
        <h2 className="text-2xl md:text-3xl font-bold text-center">
          Why People Love WealthBench
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="p-5 border rounded-xl shadow-sm hover:shadow-md transition bg-white">
            <ShieldCheck className="w-10 h-10 text-blue-600 mx-auto" />
            <h3 className="font-semibold mt-3">Fully Anonymous</h3>
            <p className="text-sm text-gray-600 mt-1">
              No login, no email, no phone number. Your data is never stored with your identity.
            </p>
          </div>

          <div className="p-5 border rounded-xl shadow-sm hover:shadow-md transition bg-white">
            <Users className="w-10 h-10 text-blue-600 mx-auto" />
            <h3 className="font-semibold mt-3">Community Powered</h3>
            <p className="text-sm text-gray-600 mt-1">
              Insights from thousands of real professionals across India.
            </p>
          </div>

          <div className="p-5 border rounded-xl shadow-sm hover:shadow-md transition bg-white">
            <TrendingUp className="w-10 h-10 text-blue-600 mx-auto" />
            <h3 className="font-semibold mt-3">Instant Benchmarking</h3>
            <p className="text-sm text-gray-600 mt-1">
              Know where you stand across income, savings, assets & net worth.
            </p>
          </div>
        </div>
      </section>




      {/* --------------------------------------------- */}
      {/* FORM SECTION */}
      {/* --------------------------------------------- */}
      <section id="form" className="max-w-3xl w-full mt-20 mb-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
          Check Your Rank in 60 Seconds
        </h2>

        <DynamicInputForm />
      </section>

    </main>
  );
}
