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
  
  // Optional aggregate totals
  const [goldValue, setGoldValue] = useState<number | null>(null);
  const [fixedDepositTotal, setFixedDepositTotal] = useState<number | null>(null);
  const [cryptoValueTotal, setCryptoValueTotal] = useState<number | null>(null);
  const [stockValueTotal, setStockValueTotal] = useState<number | null>(null);
  const [mutualFundTotal, setMutualFundTotal] = useState<number | null>(null);
  const [carValueTotal, setCarValueTotal] = useState<number | null>(null);
  const [emiTotal, setEmiTotal] = useState<number | null>(null);
  const [realEstateTotalPrice, setRealEstateTotalPrice] = useState<number | null>(null);
  
  // Optional detailed breakdown
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

    // Build optionalAggregates (only include non-null values)
    const optionalAggregates: Record<string, number> = {};
    if (goldValue !== null && goldValue !== undefined) optionalAggregates.gold_value = goldValue;
    if (fixedDepositTotal !== null && fixedDepositTotal !== undefined) optionalAggregates.fixed_deposit_total = fixedDepositTotal;
    if (cryptoValueTotal !== null && cryptoValueTotal !== undefined) optionalAggregates.crypto_value_total = cryptoValueTotal;
    if (stockValueTotal !== null && stockValueTotal !== undefined) optionalAggregates.stock_value_total = stockValueTotal;
    if (mutualFundTotal !== null && mutualFundTotal !== undefined) optionalAggregates.mutual_fund_total = mutualFundTotal;
    if (carValueTotal !== null && carValueTotal !== undefined) optionalAggregates.car_value_total = carValueTotal;
    if (emiTotal !== null && emiTotal !== undefined) optionalAggregates.emi_total = emiTotal;
    if (realEstateTotalPrice !== null && realEstateTotalPrice !== undefined) optionalAggregates.real_estate_total_price = realEstateTotalPrice;

    // Build optionalBreakdown (only include non-empty arrays)
    const optionalBreakdown: Record<string, any[]> = {};
    const filteredStocks = stocks.filter((s) => s.name.trim() !== "");
    const filteredMutualFunds = mutualFunds.filter((m) => m.name.trim() !== "");
    const filteredCars = cars.filter((c) => c.name.trim() !== "");
    const filteredEmis = emis.filter((e) => e.name.trim() !== "");
    const filteredRealEstate = realEstate.filter((p) => p.location.trim() !== "");

    if (filteredStocks.length > 0) optionalBreakdown.stocks = filteredStocks;
    if (filteredMutualFunds.length > 0) optionalBreakdown.mutual_funds = filteredMutualFunds;
    if (filteredCars.length > 0) optionalBreakdown.cars = filteredCars;
    if (filteredEmis.length > 0) optionalBreakdown.emis = filteredEmis;
    if (filteredRealEstate.length > 0) optionalBreakdown.real_estate = filteredRealEstate;

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
      optionalAggregates: Object.keys(optionalAggregates).length > 0 ? optionalAggregates : undefined,
      optionalBreakdown: Object.keys(optionalBreakdown).length > 0 ? optionalBreakdown : undefined,
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
  const sectionClass = "bg-white border rounded-xl shadow-sm p-6";

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

      {/* Optional Aggregate Totals */}
      <div className={sectionClass}>
        <h2 className="text-xl font-semibold mb-4">Optional Aggregate Totals</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="gold_value" className={labelClass}>Gold Value</label>
            <input
              type="number"
              id="gold_value"
              value={goldValue || ""}
              onChange={(e) => setGoldValue(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total gold value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="fixed_deposit_total" className={labelClass}>Fixed Deposit Total</label>
            <input
              type="number"
              id="fixed_deposit_total"
              value={fixedDepositTotal || ""}
              onChange={(e) => setFixedDepositTotal(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total FD value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="crypto_value_total" className={labelClass}>Crypto Value Total</label>
            <input
              type="number"
              id="crypto_value_total"
              value={cryptoValueTotal || ""}
              onChange={(e) => setCryptoValueTotal(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total crypto value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="stock_value_total" className={labelClass}>Stock Value Total</label>
            <input
              type="number"
              id="stock_value_total"
              value={stockValueTotal || ""}
              onChange={(e) => setStockValueTotal(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total stock value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="mutual_fund_total" className={labelClass}>Mutual Fund Total</label>
            <input
              type="number"
              id="mutual_fund_total"
              value={mutualFundTotal || ""}
              onChange={(e) => setMutualFundTotal(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total MF value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="car_value_total" className={labelClass}>Car Value Total</label>
            <input
              type="number"
              id="car_value_total"
              value={carValueTotal || ""}
              onChange={(e) => setCarValueTotal(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total car value"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="emi_total" className={labelClass}>EMI Total</label>
            <input
              type="number"
              id="emi_total"
              value={emiTotal || ""}
              onChange={(e) => setEmiTotal(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total monthly EMI"
              step="0.01"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="real_estate_total_price" className={labelClass}>Real Estate Total Price</label>
            <input
              type="number"
              id="real_estate_total_price"
              value={realEstateTotalPrice || ""}
              onChange={(e) => setRealEstateTotalPrice(e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="Total property value"
              step="0.01"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Optional Detailed Breakdown */}
      <div className={sectionClass}>
        <h2 className="text-xl font-semibold mb-4">Optional Detailed Breakdown</h2>
        <div className="space-y-6">
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

          {/* Real Estate */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Real Estate</h3>
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
        </div>
      </div>

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
