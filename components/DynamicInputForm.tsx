"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PieChart, User } from "lucide-react";
import { Financials, SubmissionPayload } from "@/types/submission";
import CollapsibleSection from "./CollapsibleSection";
type MessageState = { type: "success" | "error"; text: string } | null;

export default function DynamicInputForm() {
  const router = useRouter();

  // Demographics
  const [age, setAge] = useState<number>(0);
  const [city, setCity] = useState<string>("");
  const [occupation, setOccupation] = useState<string>("");
  const [yearsExperience, setYearsExperience] = useState<number>(0);

  // Financial snapshot
  const [annualIncome, setAnnualIncome] = useState<number>(0);
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [monthlySavings, setMonthlySavings] = useState<number | null>(null);
  const [monthlyEmi, setMonthlyEmi] = useState<number | null>(null);
  const [totalSavings, setTotalSavings] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [mutualFundValue, setMutualFundValue] = useState<number | null>(null);
  const [goldGrams, setGoldGrams] = useState<number | null>(null);
  const [goldValue, setGoldValue] = useState<number | null>(null);
  const [realEstateValue, setRealEstateValue] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const inputClass = "border rounded-md p-3 text-base w-full text-gray-900 bg-white";
  const labelClass = "block text-sm font-medium text-gray-600 mb-1";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (
      !age ||
      age <= 0 ||
      !city.trim() ||
      !occupation.trim() ||
      yearsExperience < 0 ||
      !annualIncome ||
      annualIncome <= 0 ||
      !monthlySalary ||
      monthlySalary <= 0 ||
      !monthlyExpenses ||
      monthlyExpenses <= 0 ||
      monthlySavings === null ||
      monthlySavings <= 0 ||
      monthlyEmi === null ||
      monthlyEmi < 0 ||
      totalSavings === null ||
      totalSavings <= 0 ||
      stockValue === null ||
      stockValue < 0 ||
      mutualFundValue === null ||
      mutualFundValue < 0 ||
      realEstateValue === null ||
      realEstateValue < 0 ||
      goldGrams === null ||
      goldGrams < 0
    ) {
      setMessage({
        type: "error",
        text: "Please fill all required financial inputs including investments and savings.",
      });
      setIsSubmitting(false);
      return;
    }

    const emiValue = monthlyEmi !== null && monthlyEmi > 0 ? monthlyEmi : null;
    const savingsValue = totalSavings !== null && totalSavings > 0 ? totalSavings : 0;

    const financials: Financials = {
      income_yearly: annualIncome,
      monthly_expenses: monthlyExpenses,
      savings_total: savingsValue,
      stock_value_total: stockValue ?? undefined,
      mutual_fund_total: mutualFundValue ?? undefined,
      real_estate_total_price: realEstateValue ?? undefined,
      gold_grams: goldGrams ?? undefined,
      gold_value_estimate: goldValue ?? undefined,
    };

    const investmentTotal =
      savingsValue +
      (stockValue ?? 0) +
      (mutualFundValue ?? 0) +
      (realEstateValue ?? 0) +
      (goldValue ?? 0);

    if (investmentTotal > 0) {
      financials.assets_total = investmentTotal;
    }

    if (emiValue) {
      financials.other_liabilities = [{ name: "Monthly EMI", amount: emiValue * 12 }];
      financials.liabilities_total = emiValue * 12;
    }

    const additionalMetrics: Record<string, any> = {
      monthly_salary: monthlySalary,
      monthly_expenses: monthlyExpenses,
      monthly_savings: monthlySavings,
      stock_value_total: stockValue,
      mutual_fund_total: mutualFundValue,
      real_estate_total_price: realEstateValue,
      gold_grams: goldGrams,
      gold_value_estimate: goldValue,
    };
    additionalMetrics.monthly_emi = monthlyEmi;
    if (notes.trim()) additionalMetrics.notes = notes.trim();

    const payload: SubmissionPayload = {
      demographics: {
        age,
        region: city.trim(),
        city: city.trim(),
        occupation: occupation.trim(),
        years_experience: yearsExperience,
      },
      financials,
      additional_metrics: additionalMetrics,
    };

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        const submissionId = data.data?.id ?? data.submission_id;
        if (submissionId) {
          const netWorthForQuery = (financials.assets_total ?? investmentTotal) - (financials.liabilities_total ?? 0);
          const queryParams = new URLSearchParams({
            submission_id: submissionId,
            income: String(annualIncome),
            savings: String(savingsValue),
            expenses: String(monthlyExpenses),
            net_worth: String(netWorthForQuery),
            investment_value: String(investmentTotal),
            stock_value_total: String(stockValue ?? 0),
            mutual_fund_total: String(mutualFundValue ?? 0),
            real_estate_total_price: String(realEstateValue ?? 0),
            gold_value_estimate: String(goldValue ?? 0),
          });
          if (city.trim()) {
            queryParams.set("region", city.trim());
          }
          router.push(`/result?${queryParams.toString()}`);
        } else {
          setMessage({ type: "success", text: "Submission received!" });
          setIsSubmitting(false);
        }
      } else {
        setMessage({ type: "error", text: data.error || "Submission failed. Please try again." });
        setIsSubmitting(false);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Network error. Please check your connection and try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-section px-4 md:px-0">
      <form onSubmit={handleSubmit} className="space-y-section">
        <p className="text-sm text-gray-500">
          We collect these inputs anonymously so you can benchmark yourself against similar peers.
        </p>

        <CollapsibleSection title="Demographics" icon={<User className="w-5 h-5" />} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="age" className={labelClass}>Age *</label>
              <input
                type="number"
                id="age"
                value={age || ""}
                onChange={(e) => setAge(parseInt(e.target.value, 10) || 0)}
                placeholder="Enter your age"
                min={18}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="city" className={labelClass}>City *</label>
              <input
                type="text"
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g., Bengaluru"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="occupation" className={labelClass}>Occupation *</label>
              <input
                type="text"
                id="occupation"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="e.g., Product Manager, Software Engineer"
                className={inputClass}
                required
              />
              <p className="text-xs text-gray-500 mt-1">We only use this to compare you against similar career cohorts.</p>
            </div>
            <div>
              <label htmlFor="years_experience" className={labelClass}>Years of Experience *</label>
              <input
                type="number"
                id="years_experience"
                value={yearsExperience || ""}
                onChange={(e) => setYearsExperience(parseInt(e.target.value, 10) || 0)}
                placeholder="Total years worked"
                min={0}
                className={inputClass}
                required
              />
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Financial Snapshot" icon={<PieChart className="w-5 h-5" />} defaultOpen={true}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="annual_income" className={labelClass}>Annual Income *</label>
              <input
                type="number"
                id="annual_income"
                value={annualIncome || ""}
                onChange={(e) => setAnnualIncome(parseFloat(e.target.value) || 0)}
                placeholder="Yearly income"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="monthly_salary" className={labelClass}>Monthly Salary *</label>
              <input
                type="number"
                id="monthly_salary"
                value={monthlySalary || ""}
                onChange={(e) => setMonthlySalary(parseFloat(e.target.value) || 0)}
                placeholder="Take-home per month"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="monthly_expenses" className={labelClass}>Monthly Expenses *</label>
              <input
                type="number"
                id="monthly_expenses"
                value={monthlyExpenses || ""}
                onChange={(e) => setMonthlyExpenses(parseFloat(e.target.value) || 0)}
                placeholder="Average monthly spend"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="monthly_savings" className={labelClass}>Monthly Savings *</label>
              <input
                type="number"
                id="monthly_savings"
                value={monthlySavings ?? ""}
                onChange={(e) => setMonthlySavings(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="What you typically save per month"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="monthly_emi" className={labelClass}>Monthly EMI</label>
              <input
                type="number"
                id="monthly_emi"
                value={monthlyEmi ?? ""}
                onChange={(e) => setMonthlyEmi(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Total EMIs per month"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="total_savings" className={labelClass}>Total Savings *</label>
              <input
                type="number"
                id="total_savings"
                value={totalSavings ?? ""}
                onChange={(e) => setTotalSavings(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Overall savings corpus"
                min={0}
                className={inputClass}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Include cash, bank balances, mutual funds, stocks, FDs, PPF/EPF, crypto, etc. Gold and real estate are tracked separately below.
              </p>
            </div>
            <div>
              <label htmlFor="stocks" className={labelClass}>Stocks (₹) *</label>
              <input
                type="number"
                id="stocks"
                value={stockValue ?? ""}
                onChange={(e) => setStockValue(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Total portfolio value"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="mutual_funds" className={labelClass}>Mutual Funds (₹) *</label>
              <input
                type="number"
                id="mutual_funds"
                value={mutualFundValue ?? ""}
                onChange={(e) => setMutualFundValue(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Total MF value"
                min={0}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="real_estate" className={labelClass}>Real Estate Value (₹) *</label>
              <input
                type="number"
                id="real_estate"
                value={realEstateValue ?? ""}
                onChange={(e) => setRealEstateValue(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Total real estate worth"
                min={0}
                className={inputClass}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Exclude this from total savings and enter the full market value here.</p>
            </div>
            <div>
              <label htmlFor="gold_grams" className={labelClass}>Gold Owned (grams) *</label>
              <input
                type="number"
                id="gold_grams"
                value={goldGrams ?? ""}
                onChange={(e) => setGoldGrams(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Total grams of gold"
                min={0}
                className={inputClass}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter only the physical gold quantity. Its rupee value is captured separately below.</p>
            </div>
            <div>
              <label htmlFor="gold_value" className={labelClass}>Gold Value (₹)</label>
              <input
                type="number"
                id="gold_value"
                value={goldValue ?? ""}
                onChange={(e) => setGoldValue(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="Estimated market value"
                min={0}
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="notes" className={labelClass}>Additional Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Goals, risk appetite, or anything else you want considered."
              className={`${inputClass} min-h-[110px]`}
            />
          </div>
        </CollapsibleSection>

        {message && (
          <div
            className={`p-4 rounded-md ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
        >
          {isSubmitting ? "Submitting..." : "Submit Anonymously"}
        </button>
      </form>
    </div>
  );
}
