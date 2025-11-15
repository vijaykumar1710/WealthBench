"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmissionPayload } from "@/types/submission";
import CategoryRow from "./CategoryRow";

export default function DynamicInputForm() {
  const router = useRouter();
  
  // Demographics
  const [ageRange, setAgeRange] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [incomeBracket, setIncomeBracket] = useState<string>("");
  
  // Required fields
  const [income, setIncome] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);
  
  // Optional assets
  const [realEstate, setRealEstate] = useState<Array<{ location: string; price: number }>>([]);
  const [stocks, setStocks] = useState<Array<{ name: string; value: number }>>([]);
  const [mutualFunds, setMutualFunds] = useState<Array<{ name: string; value: number }>>([]);
  const [cars, setCars] = useState<Array<{ name: string; value: number }>>([]);
  const [emis, setEmis] = useState<Array<{ name: string; value: number }>>([]);
  
  // Dynamic fields
  const [dynamicFields, setDynamicFields] = useState<Array<{ key: string; value: number }>>([
    { key: "", value: 0 },
  ]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Real Estate handlers
  const addRealEstate = () => {
    setRealEstate([...realEstate, { location: "", price: 0 }]);
  };
  const updateRealEstate = (index: number, field: "location" | "price", value: string | number) => {
    const updated = [...realEstate];
    updated[index] = { ...updated[index], [field]: value };
    setRealEstate(updated);
  };
  const removeRealEstate = (index: number) => {
    setRealEstate(realEstate.filter((_, i) => i !== index));
  };

  // Category handlers (stocks, mutual funds, cars, EMIs)
  const createCategoryHandlers = (
    items: Array<{ name: string; value: number }>,
    setItems: (items: Array<{ name: string; value: number }>) => void
  ) => ({
    onAdd: () => setItems([...items, { name: "", value: 0 }]),
    onUpdate: (index: number, key: "name" | "value", value: string | number) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [key]: value };
      setItems(updated);
    },
    onRemove: (index: number) => setItems(items.filter((_, i) => i !== index)),
  });

  // Dynamic fields handlers
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Filter out empty dynamic fields
    const validDynamicFields = dynamicFields.filter((f) => f.key.trim() !== "");

    const payload: SubmissionPayload = {
      fixed: {
        age_range: ageRange || null,
        region: region || null,
        income_bracket: incomeBracket || null,
      },
      requiredFixed: {
        income,
        savings,
        expenses,
      },
      optionalAssets: {
        real_estate: realEstate.filter((p) => p.location.trim() !== ""),
        stocks: stocks.filter((s) => s.name.trim() !== ""),
        mutual_funds: mutualFunds.filter((m) => m.name.trim() !== ""),
        cars: cars.filter((c) => c.name.trim() !== ""),
        emis: emis.filter((e) => e.name.trim() !== ""),
      },
      dynamic: validDynamicFields,
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
  const labelClass = "block text-sm font-medium text-gray-600 mb-1";
  const sectionClass = "rounded-xl border p-6 shadow-sm bg-white";

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

      {/* Required Financial Basics */}
      <div className={sectionClass}>
        <h2 className="text-xl font-semibold mb-4">Required Financial Basics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="income" className={labelClass}>Income *</label>
            <input
              type="number"
              id="income"
              value={income || ""}
              onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
              placeholder="Annual income"
              step="0.01"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="savings" className={labelClass}>Savings *</label>
            <input
              type="number"
              id="savings"
              value={savings || ""}
              onChange={(e) => setSavings(parseFloat(e.target.value) || 0)}
              placeholder="Total savings"
              step="0.01"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="expenses" className={labelClass}>Expenses *</label>
            <input
              type="number"
              id="expenses"
              value={expenses || ""}
              onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
              placeholder="Monthly expenses"
              step="0.01"
              required
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Real Estate */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Real Estate</h2>
          <button
            type="button"
            onClick={addRealEstate}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
          >
            + Add Property
          </button>
        </div>
        <div className="space-y-3">
          {realEstate.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No properties added yet</p>
          ) : (
            realEstate.map((property, index) => (
              <div key={index} className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className={labelClass}>Location</label>
                  <input
                    type="text"
                    placeholder="Property location"
                    value={property.location}
                    onChange={(e) => updateRealEstate(index, "location", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="w-40">
                  <label className={labelClass}>Price</label>
                  <input
                    type="number"
                    placeholder="Property value"
                    value={property.price || ""}
                    onChange={(e) => updateRealEstate(index, "price", parseFloat(e.target.value) || 0)}
                    step="0.01"
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRealEstate(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors mb-0.5"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Stocks */}
      <CategoryRow
        items={stocks}
        {...createCategoryHandlers(stocks, setStocks)}
        namePlaceholder="Stock Name"
        valuePlaceholder="Portfolio Value"
        title="Stocks"
      />

      {/* Mutual Funds */}
      <CategoryRow
        items={mutualFunds}
        {...createCategoryHandlers(mutualFunds, setMutualFunds)}
        namePlaceholder="Fund Name"
        valuePlaceholder="Amount Invested"
        title="Mutual Funds"
      />

      {/* Cars */}
      <CategoryRow
        items={cars}
        {...createCategoryHandlers(cars, setCars)}
        namePlaceholder="Car Model"
        valuePlaceholder="Market Value"
        title="Cars"
      />

      {/* EMIs */}
      <CategoryRow
        items={emis}
        {...createCategoryHandlers(emis, setEmis)}
        namePlaceholder="EMI Name"
        valuePlaceholder="Monthly Amount"
        title="EMIs"
      />

      {/* Additional Custom Metrics */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Additional Custom Metrics</h2>
          <button
            type="button"
            onClick={addField}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
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
