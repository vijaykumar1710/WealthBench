"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, User } from "lucide-react";
import CollapsibleSection from "./CollapsibleSection";

import { Financials, SubmissionPayload } from "@/types/submission";

type MessageState = { type: "success" | "error"; text: string } | null;

export default function DynamicInputForm() {
  const router = useRouter();

  // -----------------------------
  // STRING STATES (better UX)
  // -----------------------------
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [yoe, setYoe] = useState("");

  const [annualIncome, setAnnualIncome] = useState("");

  const [monthlySalary, setMonthlySalary] = useState("");
  const [monthlyExpenses, setMonthlyExpenses] = useState("");
  const [monthlySavings, setMonthlySavings] = useState("");
  const [monthlyEmi, setMonthlyEmi] = useState("");

  const [totalSavings, setTotalSavings] = useState("");
  const [liabilitiesTotal, setLiabilitiesTotal] = useState("");

  const [stockValue, setStockValue] = useState("");
  const [mutualFundValue, setMutualFundValue] = useState("");
  const [realEstateValue, setRealEstateValue] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [goldValue, setGoldValue] = useState("");

  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);

  const inputClass =
    "border rounded-md p-3 text-base w-full text-gray-900 bg-white";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1";

  // ------------------------------------------
  // HELPERS
  // ------------------------------------------
  const num = (v: string): number | null =>
    v.trim() === "" ? null : Number(v);

  const required = (v: string) => v.trim() !== "";

  // ------------------------------------------
  // SUBMIT HANDLER
  // ------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // -------------------------
    // Required field validation
    // -------------------------
    if (
      !required(age) ||
      !required(city) ||
      !required(occupation) ||
      !required(yoe) ||
      !required(annualIncome) ||
      !required(monthlySalary) ||
      !required(monthlyExpenses) ||
      !required(monthlySavings) ||
      !required(totalSavings) ||
      !required(liabilitiesTotal) ||
      !required(realEstateValue) ||
      !required(goldGrams)
    ) {
      setMessage({ type: "error", text: "Please fill all required fields." });
      setIsSubmitting(false);
      return;
    }

    // ------------------------------------------
    // BUILD FINANCIALS
    // ------------------------------------------
    const financials: Financials = {
      income_yearly: num(annualIncome)!,
      monthly_expenses: num(monthlyExpenses)!,
      savings_total: num(totalSavings)!,
      liabilities_total: num(liabilitiesTotal)!,

      stock_value_total: num(stockValue) ?? undefined,
      mutual_fund_total: num(mutualFundValue) ?? undefined,
      real_estate_total_price: num(realEstateValue) ?? undefined,
      gold_grams: num(goldGrams) ?? undefined,
      gold_value_estimate: num(goldValue) ?? undefined,
    };

    // ------------------------------------------
    // COMPUTE ASSETS TOTAL
    // ------------------------------------------
    financials.assets_total =
      (num(totalSavings) ?? 0) +
      (num(realEstateValue) ?? 0) +
      (num(goldValue) ?? 0) +
      (num(stockValue) ?? 0) +
      (num(mutualFundValue) ?? 0);

    // ------------------------------------------
    // ADDITIONAL METRICS
    // ------------------------------------------
    const additionalMetrics = {
      monthly_salary: num(monthlySalary),
      monthly_expenses: num(monthlyExpenses),
      monthly_savings: num(monthlySavings),
      monthly_emi: num(monthlyEmi) ?? 0,
      notes: notes.trim() || undefined,
    };

    // ------------------------------------------
    // FINAL PAYLOAD
    // ------------------------------------------
    const payload: SubmissionPayload = {
      demographics: {
        age: num(age)!,
        city: city.trim(),
        country: "India",
        location: location.trim() || undefined,
        occupation: occupation.trim(),
        yoe: num(yoe)!,
      },
      financials,
      additional_metrics: additionalMetrics,
    };

    // ------------------------------------------
    // SEND TO API
    // ------------------------------------------
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json.success) {
        const { submission_id, metrics } = json.data;

        if (!submission_id) {
          setMessage({ type: "error", text: "Submission was created, but no ID was returned." });
          setIsSubmitting(false);
          return;
        }

        const params = new URLSearchParams({ submission_id });

        // Add all metrics so Result page can calculate rankings
        Object.entries(metrics).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });

        router.push(`/result?${params.toString()}`);
      } else {
        setMessage({ type: "error", text: json.error });
      }

    } catch (err) {
      setMessage({ type: "error", text: "Network error. Try again." });
    }

    setIsSubmitting(false);
  };

  // ------------------------------------------
  // UI
  // ------------------------------------------
  return (
    <div className="max-w-2xl mx-auto space-y-section px-4 md:px-0">
      <form onSubmit={handleSubmit} className="space-y-section">

        {/* DEMOGRAPHICS */}
        <CollapsibleSection title="Demographics" icon={<User />} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Age *</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Location (Optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Years of Experience *</label>
              <input
                type="number"
                value={yoe}
                onChange={(e) => setYoe(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Occupation *</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* YEARLY INCOME */}
        <CollapsibleSection title="Total Yearly Income" icon={<PieChart />} defaultOpen>
          <div>
            <label className={labelClass}>Annual Income *</label>
            <input
              type="number"
              value={annualIncome}
              onChange={(e) => setAnnualIncome(e.target.value)}
              className={inputClass}
            />
          </div>
        </CollapsibleSection>

        {/* MONTHLY INCOME & EXPENSES */}
        <CollapsibleSection title="Monthly Income & Expenses" icon={<PieChart />} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Monthly In-hand *</label>
              <input
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Monthly Expenses *</label>
              <input
                type="number"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Monthly Savings *</label>
              <input
                type="number"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Monthly EMI (Optional)</label>
              <input
                type="number"
                value={monthlyEmi}
                onChange={(e) => setMonthlyEmi(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                EMI is NOT included in liabilities.
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* ASSETS & LIABILITIES */}
        <CollapsibleSection title="Assets, Investments & Liabilities" icon={<PieChart />} defaultOpen>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className={labelClass}>Total Savings *</label>
              <input
                type="number"
                value={totalSavings}
                onChange={(e) => setTotalSavings(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Total Debt / Liabilities *</label>
              <input
                type="number"
                value={liabilitiesTotal}
                onChange={(e) => setLiabilitiesTotal(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Stocks (₹)</label>
              <input
                type="number"
                value={stockValue}
                onChange={(e) => setStockValue(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Mutual Funds (₹)</label>
              <input
                type="number"
                value={mutualFundValue}
                onChange={(e) => setMutualFundValue(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Real Estate Value *</label>
              <input
                type="number"
                value={realEstateValue}
                onChange={(e) => setRealEstateValue(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Gold (grams) *</label>
              <input
                type="number"
                value={goldGrams}
                onChange={(e) => setGoldGrams(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Gold Value (₹)</label>
              <input
                type="number"
                value={goldValue}
                onChange={(e) => setGoldValue(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className={labelClass}>Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} min-h-[110px]`}
            />
          </div>
        </CollapsibleSection>

        {/* ERROR / SUCCESS */}
        {message && (
          <div
            className={`p-4 rounded-md ${message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
              }`}
          >
            {message.text}
          </div>
        )}

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "Submitting..." : "Submit Anonymously"}
        </button>
      </form>
    </div>
  );
}
