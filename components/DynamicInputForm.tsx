"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmissionPayload } from "@/types/submission";

export default function DynamicInputForm() {
  const router = useRouter();
  const [dynamicFields, setDynamicFields] = useState<Array<{ key: string; value: number }>>([
    { key: "", value: 0 },
  ]);
  
  // Demographics
  const [ageRange, setAgeRange] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [incomeBracket, setIncomeBracket] = useState<string>("");
  
  // Standard financial fields
  const [income, setIncome] = useState<number | null>(null);
  const [savings, setSavings] = useState<number | null>(null);
  const [expenses, setExpenses] = useState<number | null>(null);
  const [emi, setEmi] = useState<number | null>(null);
  const [gold, setGold] = useState<number | null>(null);
  const [fixedDeposit, setFixedDeposit] = useState<number | null>(null);
  const [carValue, setCarValue] = useState<number | null>(null);
  const [stockValue, setStockValue] = useState<number | null>(null);
  const [cryptoValue, setCryptoValue] = useState<number | null>(null);
  const [realEstateRegion, setRealEstateRegion] = useState<string>("");
  const [realEstatePrice, setRealEstatePrice] = useState<number | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const addField = () => {
    setDynamicFields([...dynamicFields, { key: "", value: 0 }]);
  };

  const removeField = (index: number) => {
    setDynamicFields(dynamicFields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, field: "key" | "value", value: string | number) => {
    const updated = [...dynamicFields];
    updated[index] = { ...updated[index], [field]: value };
    setDynamicFields(updated);
    
    // Remove from dynamic if it matches a standard field
    const fixedFieldKeys = [
      "income", "savings", "expenses", "emi", "gold", "fixed_deposit",
      "car_value", "stock_value", "crypto_value", "real_estate_price"
    ];
    if (field === "key" && fixedFieldKeys.includes(String(value).toLowerCase())) {
      // Field will be handled as fixed, so we can remove it from dynamic
      setTimeout(() => {
        setDynamicFields(updated.filter((f) => f.key.toLowerCase() !== String(value).toLowerCase()));
      }, 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Filter out empty dynamic fields
    const validFields = dynamicFields.filter((f) => f.key.trim() !== "");

    const payload: SubmissionPayload = {
      fixed: {
        age_range: ageRange || null,
        region: region || null,
        income_bracket: incomeBracket || null,
        income: income,
        savings: savings,
        expenses: expenses,
        emi: emi,
        gold: gold,
        fixed_deposit: fixedDeposit,
        car_value: carValue,
        stock_value: stockValue,
        crypto_value: cryptoValue,
        real_estate_region: realEstateRegion || null,
        real_estate_price: realEstatePrice,
      },
      dynamic: validFields,
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
        // Redirect to result page with all necessary params
        if (data.redirect_url) {
          router.push(data.redirect_url);
        } else {
          router.push(`/result?submission_id=${data.submission_id}`);
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

  const inputClass = "border rounded-md p-2 w-full text-gray-900 bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const sectionClass = "rounded-xl border p-4 shadow-sm bg-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Demographics */}
      <div className={sectionClass}>
        <h2 className="text-xl font-semibold mb-4">Demographics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="age_range" className={labelClass}>Age Range</label>
            <select
              id="age_range"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              className={inputClass}
            >
              <option value="">Select age range</option>
              <option value="18-24">18-24</option>
              <option value="25-34">25-34</option>
              <option value="35-44">35-44</option>
              <option value="45-54">45-54</option>
              <option value="55+">55+</option>
            </select>
          </div>

          <div>
            <label htmlFor="region" className={labelClass}>Region</label>
            <input
              type="text"
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g., North, South"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="income_bracket" className={labelClass}>Income Bracket</label>
            <select
              id="income_bracket"
              value={incomeBracket}
              onChange={(e) => setIncomeBracket(e.target.value)}
              className={inputClass}
            >
              <option value="">Select income bracket</option>
              <option value="<50k">&lt;50k</option>
              <option value="50k-100k">50k-100k</option>
              <option value="100k-200k">100k-200k</option>
              <option value="200k+">200k+</option>
            </select>
          </div>
        </div>
      </div>

      {/* Standard Financial Fields */}
      <div className={sectionClass}>
        <h2 className="text-xl font-semibold mb-4">Standard Financial Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="income" className={labelClass}>Income</label>
            <input
              type="number"
              id="income"
              value={income || ""}
              onChange={(e) => setIncome(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Annual income"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="savings" className={labelClass}>Savings</label>
            <input
              type="number"
              id="savings"
              value={savings || ""}
              onChange={(e) => setSavings(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total savings"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="expenses" className={labelClass}>Expenses</label>
            <input
              type="number"
              id="expenses"
              value={expenses || ""}
              onChange={(e) => setExpenses(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Monthly expenses"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="emi" className={labelClass}>EMI</label>
            <input
              type="number"
              id="emi"
              value={emi || ""}
              onChange={(e) => setEmi(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Monthly EMI"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="gold" className={labelClass}>Gold Value</label>
            <input
              type="number"
              id="gold"
              value={gold || ""}
              onChange={(e) => setGold(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Gold investment value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fixed_deposit" className={labelClass}>Fixed Deposit</label>
            <input
              type="number"
              id="fixed_deposit"
              value={fixedDeposit || ""}
              onChange={(e) => setFixedDeposit(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="FD value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="car_value" className={labelClass}>Car Value</label>
            <input
              type="number"
              id="car_value"
              value={carValue || ""}
              onChange={(e) => setCarValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Car market value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="stock_value" className={labelClass}>Stock Value</label>
            <input
              type="number"
              id="stock_value"
              value={stockValue || ""}
              onChange={(e) => setStockValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Stock portfolio value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="crypto_value" className={labelClass}>Crypto Value</label>
            <input
              type="number"
              id="crypto_value"
              value={cryptoValue || ""}
              onChange={(e) => setCryptoValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Crypto portfolio value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="real_estate_region" className={labelClass}>Real Estate Region</label>
            <input
              type="text"
              id="real_estate_region"
              value={realEstateRegion}
              onChange={(e) => setRealEstateRegion(e.target.value)}
              placeholder="Property location"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="real_estate_price" className={labelClass}>Real Estate Price</label>
            <input
              type="number"
              id="real_estate_price"
              value={realEstatePrice || ""}
              onChange={(e) => setRealEstatePrice(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Property value"
              step="0.01"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Fields */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Additional Metrics</h2>
          <button
            type="button"
            onClick={addField}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Add Field
          </button>
        </div>

        <div className="space-y-3">
          {dynamicFields.map((field, index) => (
            <div key={index} className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Metric name (e.g., debt, insurance)"
                value={field.key}
                onChange={(e) => updateField(index, "key", e.target.value)}
                className={`flex-1 ${inputClass}`}
              />
              <input
                type="number"
                placeholder="Value"
                value={field.value || ""}
                onChange={(e) => updateField(index, "value", parseFloat(e.target.value) || 0)}
                step="0.01"
                className={`w-32 ${inputClass}`}
              />
              <button
                type="button"
                onClick={() => removeField(index)}
                disabled={dynamicFields.length === 1}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Message */}
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

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
      >
        {isSubmitting ? "Submitting..." : "Submit Data"}
      </button>
    </form>
  );
}
