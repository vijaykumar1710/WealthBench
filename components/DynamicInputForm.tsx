"use client";

import { useState } from "react";
import { SubmissionPayload } from "@/types/submission";

export default function DynamicInputForm() {
  const [dynamicFields, setDynamicFields] = useState<Array<{ key: string; value: number }>>([
    { key: "", value: 0 },
  ]);
  const [ageRange, setAgeRange] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [incomeBracket, setIncomeBracket] = useState<string>("");
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Filter out empty fields
    const validFields = dynamicFields.filter((f) => f.key.trim() !== "");

    if (validFields.length === 0) {
      setMessage({ type: "error", text: "Please add at least one metric field" });
      setIsSubmitting(false);
      return;
    }

    const payload: SubmissionPayload = {
      fixed: {
        age_range: ageRange || null,
        region: region || null,
        income_bracket: incomeBracket || null,
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
        setMessage({ type: "success", text: "Submission successful! Thank you for contributing." });
        // Reset form
        setDynamicFields([{ key: "", value: 0 }]);
        setAgeRange("");
        setRegion("");
        setIncomeBracket("");
      } else {
        setMessage({ type: "error", text: data.error || "Submission failed. Please try again." });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "Network error. Please check your connection and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Fixed Fields */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold">Demographics</h2>
        
        <div>
          <label htmlFor="age_range" className="block text-sm font-medium text-gray-700 mb-1">
            Age Range
          </label>
          <select
            id="age_range"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <label htmlFor="region" className="block text-sm font-medium text-gray-700 mb-1">
            Region
          </label>
          <input
            type="text"
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="e.g., North, South, East, West"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="income_bracket" className="block text-sm font-medium text-gray-700 mb-1">
            Income Bracket
          </label>
          <select
            id="income_bracket"
            value={incomeBracket}
            onChange={(e) => setIncomeBracket(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select income bracket</option>
            <option value="<50k">&lt;50k</option>
            <option value="50k-100k">50k-100k</option>
            <option value="100k-200k">100k-200k</option>
            <option value="200k+">200k+</option>
          </select>
        </div>
      </div>

      {/* Dynamic Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Financial Metrics</h2>
          <button
            type="button"
            onClick={addField}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Field
          </button>
        </div>

        <div className="space-y-3">
          {dynamicFields.map((field, index) => (
            <div key={index} className="flex gap-3 items-center">
              <input
                type="text"
                placeholder="Metric name (e.g., income, savings)"
                value={field.key}
                onChange={(e) => updateField(index, "key", e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Value"
                value={field.value || ""}
                onChange={(e) => updateField(index, "value", parseFloat(e.target.value) || 0)}
                step="0.01"
                className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => removeField(index)}
                disabled={dynamicFields.length === 1}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isSubmitting ? "Submitting..." : "Submit Data"}
      </button>
    </form>
  );
}

