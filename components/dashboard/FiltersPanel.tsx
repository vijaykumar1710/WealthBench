"use client";

import { useState } from "react";
import type { DashboardPayload } from "@/types/dashboard";
import { useRouter } from "next/navigation";

export default function FiltersPanel({ facets }: { facets: DashboardPayload["facets"] }) {
  const router = useRouter();

  const [city, setCity] = useState<string>("");
  const [occupation, setOccupation] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [yoe, setYoe] = useState<string>("");

  const apply = () => {
    const params = new URLSearchParams();
    params.set("view", "dashboard");
    if (city) params.append("city[]", city);
    if (occupation) params.append("occupation[]", occupation);
    if (age) params.append("age[]", age);
    if (yoe) params.append("yoe[]", yoe);

    // client navigate to dashboard page with filters so server page will call API with same params
    router.push(`/dashboard?${params.toString()}`);
  };

  const reset = () => {
    setCity("");
    setOccupation("");
    setAge("");
    setYoe("");
    router.push(`/dashboard?view=dashboard`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">City</label>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">All Cities</option>
            {facets.cities?.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Occupation</label>
          <select value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">All</option>
            {facets.occupations?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Age group</label>
          <select value={age} onChange={(e) => setAge(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">All ages</option>
            {facets.age_ranges?.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Years experience</label>
          <select value={yoe} onChange={(e) => setYoe(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2 mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">All</option>
            {facets.yoe_ranges?.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={apply} className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">Apply Filters</button>
        <button onClick={reset} className="flex-1 border border-gray-300 py-2 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors">Reset</button>
      </div>
    </div>
  );
}
