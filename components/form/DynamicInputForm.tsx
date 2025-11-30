"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import DemographicsSection from "./FormSections/DemographicsSection";
import IncomeSection from "./FormSections/IncomeSection";
import MonthlySection from "./FormSections/MonthlySection";
import AssetsSection from "./FormSections/AssetsSection";
import { SubmissionPayload, Financials } from "@/types/submission";

type MessageState = { type: "success" | "error"; text: string } | null;

const inputClass = "border rounded-md p-3 text-base w-full text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200";
const labelClass = "block text-sm font-medium text-gray-600 mb-1";

/**
 * Basic validation thresholds — tune if needed
 */
const VALIDATION = {
  MAX_INCOME_YEARLY: 100_000_000_000, // 100 billion (very permissive)
  MAX_SAVINGS: 100_000_000_000,
  MAX_LIABILITIES: 50_000_000_000,
  ALLOWED_AGE_MIN: 18,
  ALLOWED_AGE_MAX: 80,
  MAX_MONTHLY_EMI: 100_000_000,
};

function toNumberOrNull(v: string): number | null {
  const trimmed = v?.toString().trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function DynamicInputForm() {
  const router = useRouter();

  // Demographics (strings for nicer UX; parse to number on submit)
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [location, setLocation] = useState("");
  const [occupation, setOccupation] = useState("");
  const [yoe, setYoe] = useState("");

  // Income & financials
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

  // Derived auto-calculations (gold value default price if not provided)
  const GOLD_PRICE_PER_GRAM = useMemo(() => Number(process.env.NEXT_PUBLIC_GOLD_PER_GRAM ?? "6500"), []);
  const derivedGoldValue = useMemo(() => {
    const grams = toNumberOrNull(goldGrams);
    if (grams == null) return toNumberOrNull(goldValue) ?? null;
    return Math.round(grams * GOLD_PRICE_PER_GRAM);
  }, [goldGrams, goldValue, GOLD_PRICE_PER_GRAM]);

  const derivedAssetsTotal = useMemo(() => {
    const values = [
      toNumberOrNull(totalSavings) ?? 0,
      toNumberOrNull(stockValue) ?? 0,
      toNumberOrNull(mutualFundValue) ?? 0,
      toNumberOrNull(realEstateValue) ?? 0,
      derivedGoldValue ?? 0,
    ];
    const sum = values.reduce((a, b) => a + b, 0);
    return sum;
  }, [totalSavings, stockValue, mutualFundValue, realEstateValue, derivedGoldValue]);

  // quick sanity checks
  const sanityErrors = useMemo(() => {
    const errs: string[] = [];
    const ai = toNumberOrNull(annualIncome);
    const sv = toNumberOrNull(totalSavings);
    const li = toNumberOrNull(liabilitiesTotal);
    const ag = toNumberOrNull(age);

    if (ai != null && ai < 0) errs.push("Income must be a positive number.");
    if (sv != null && sv < 0) errs.push("Savings must be positive.");
    if (li != null && li < 0) errs.push("Liabilities must be positive.");
    if (ag != null && (ag < VALIDATION.ALLOWED_AGE_MIN || ag > VALIDATION.ALLOWED_AGE_MAX))
      errs.push(`Age should be between ${VALIDATION.ALLOWED_AGE_MIN} and ${VALIDATION.ALLOWED_AGE_MAX}.`);
    if (ai != null && ai > VALIDATION.MAX_INCOME_YEARLY) errs.push("Income looks unreasonably large.");
    if (sv != null && sv > VALIDATION.MAX_SAVINGS) errs.push("Savings looks unreasonably large.");
    if (li != null && li > VALIDATION.MAX_LIABILITIES) errs.push("Liabilities look unreasonably large.");
    const salary = toNumberOrNull(monthlySalary);
    if (salary != null && salary > 10 * (ai ?? Infinity)) errs.push("Monthly salary inconsistent with yearly income.");
    const emi = toNumberOrNull(monthlyEmi);
    if (emi != null && emi > VALIDATION.MAX_MONTHLY_EMI) errs.push("EMI looks unreasonably large.");

    // Savings ratio sanity
    if (ai && sv) {
      const savingsRate = (sv / ai) * 100;
      if (savingsRate > 95) errs.push("Savings > 95% of income — please verify.");
      if (savingsRate < 0) errs.push("Savings cannot be negative relative to income.");
    }
    return errs;
  }, [annualIncome, totalSavings, liabilitiesTotal, age, monthlySalary, monthlyEmi]);

  const allRequiredFilled = useMemo(() => {
    // Required fields per your types: age, city, yoe, occupation, income_yearly, monthly_expenses, savings_total, liabilities_total, realEstateValue, goldGrams
    return (
      age.trim() &&
      city.trim() &&
      occupation.trim() &&
      yoe.trim() &&
      annualIncome.trim() &&
      monthlyExpenses.trim() &&
      totalSavings.trim() &&
      liabilitiesTotal.trim() &&
      realEstateValue.trim() &&
      goldGrams.trim()
    );
  }, [age, city, occupation, yoe, annualIncome, monthlyExpenses, totalSavings, liabilitiesTotal, realEstateValue, goldGrams]);

  const buildPayload = (): SubmissionPayload => {
    const fin: Financials = {
      income_yearly: toNumberOrNull(annualIncome) ?? 0,
      monthly_expenses: toNumberOrNull(monthlyExpenses) ?? 0,
      savings_total: toNumberOrNull(totalSavings) ?? 0,
      liabilities_total: toNumberOrNull(liabilitiesTotal) ?? 0,
      stock_value_total: toNumberOrNull(stockValue) ?? undefined,
      mutual_fund_total: toNumberOrNull(mutualFundValue) ?? undefined,
      real_estate_total_price: toNumberOrNull(realEstateValue) ?? undefined,
      gold_grams: toNumberOrNull(goldGrams) ?? undefined,
      gold_value_estimate: derivedGoldValue ?? undefined,
      assets_total: derivedAssetsTotal,
    };

    const payload: SubmissionPayload = {
      demographics: {
        age: toNumberOrNull(age) ?? 0,
        city: city.trim(),
        country: "India",
        location: location.trim() || undefined,
        occupation: occupation.trim(),
        yoe: toNumberOrNull(yoe) ?? 0,
      },
      financials: fin,
      additional_metrics: {
        monthly_salary: toNumberOrNull(monthlySalary) ?? undefined,
        monthly_savings: toNumberOrNull(monthlySavings) ?? undefined,
        monthly_emi: toNumberOrNull(monthlyEmi) ?? undefined,
        notes: notes?.trim() || undefined,
      },
    };

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // quick local validations
    if (!allRequiredFilled) {
      setMessage({ type: "error", text: "Please fill all required fields (marked *)." });
      return;
    }

    if (sanityErrors.length) {
      setMessage({ type: "error", text: sanityErrors[0] });
      return;
    }

    const payload = buildPayload();

    // final server-targeted validation: e.g. reasonable savings ratio
    if (payload.financials.income_yearly <= 0) {
      setMessage({ type: "error", text: "Income must be greater than zero." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (json?.success) {
        const { submission_id, metrics } = json.data ?? {};
        // append metrics and redirect to result page (preserves existing UX)
        const params = new URLSearchParams({ submission_id: String(submission_id) });
        if (metrics && typeof metrics === "object") {
          for (const [k, v] of Object.entries(metrics)) {
            if (v !== null && v !== undefined) params.append(k, String(v));
          }
        }
        setMessage({ type: "success", text: "Submission successful — redirecting..." });
        // small delay for UX
        setTimeout(() => {
          router.push(`/result?${params.toString()}`);
        }, 450);
      } else {
        setMessage({ type: "error", text: json?.error ?? "Submission failed" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error — try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-white rounded-lg shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-lg font-semibold">Share anonymous snapshot</h2>
        <p className="text-sm text-gray-500">Your data stays private. Provide realistic values for meaningful benchmarks.</p>

        <section className="pt-2">
          <h3 className="font-medium mb-3">Demographics</h3>
          <DemographicsSection
            age={age}
            setAge={setAge}
            city={city}
            setCity={setCity}
            location={location}
            setLocation={setLocation}
            occupation={occupation}
            setOccupation={setOccupation}
            yoe={yoe}
            setYoe={setYoe}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        </section>

        <section>
          <h3 className="font-medium mb-3">Income</h3>
          <IncomeSection
            annualIncome={annualIncome}
            setAnnualIncome={setAnnualIncome}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        </section>

        <section>
          <h3 className="font-medium mb-3">Monthly</h3>
          <MonthlySection
            monthlySalary={monthlySalary}
            setMonthlySalary={setMonthlySalary}
            monthlyExpenses={monthlyExpenses}
            setMonthlyExpenses={setMonthlyExpenses}
            monthlySavings={monthlySavings}
            setMonthlySavings={setMonthlySavings}
            monthlyEmi={monthlyEmi}
            setMonthlyEmi={setMonthlyEmi}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        </section>

        <section>
          <h3 className="font-medium mb-3">Assets & Liabilities</h3>
          <AssetsSection
            totalSavings={totalSavings}
            setTotalSavings={setTotalSavings}
            liabilitiesTotal={liabilitiesTotal}
            setLiabilitiesTotal={setLiabilitiesTotal}
            stockValue={stockValue}
            setStockValue={setStockValue}
            mutualFundValue={mutualFundValue}
            setMutualFundValue={setMutualFundValue}
            realEstateValue={realEstateValue}
            setRealEstateValue={setRealEstateValue}
            goldGrams={goldGrams}
            setGoldGrams={setGoldGrams}
            goldValue={goldValue}
            setGoldValue={setGoldValue}
            notes={notes}
            setNotes={setNotes}
            derivedGoldValue={derivedGoldValue}
            derivedAssetsTotal={derivedAssetsTotal}
            inputClass={inputClass}
            labelClass={labelClass}
          />
        </section>

        {/* inline validation / hints */}
        <div>
          {sanityErrors.length > 0 && (
            <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded">
              {sanityErrors[0]}
            </div>
          )}
          {!sanityErrors.length && (
            <div className="mb-2 text-sm text-gray-600">Derived assets total: <strong>₹{derivedAssetsTotal.toLocaleString()}</strong></div>
          )}
        </div>

        {message && (
          <div className={`p-3 rounded ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {message.text}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-6 py-2 rounded bg-blue-600 text-white disabled:bg-gray-400"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Anonymously"}
          </button>

          <button
            type="button"
            className="px-4 py-2 rounded border text-sm"
            onClick={() => {
              // quick reset
              setAge(""); setCity(""); setLocation(""); setOccupation(""); setYoe("");
              setAnnualIncome(""); setMonthlySalary(""); setMonthlyExpenses(""); setMonthlySavings(""); setMonthlyEmi("");
              setTotalSavings(""); setLiabilitiesTotal(""); setStockValue(""); setMutualFundValue(""); setRealEstateValue(""); setGoldGrams(""); setGoldValue(""); setNotes("");
              setMessage(null);
            }}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
