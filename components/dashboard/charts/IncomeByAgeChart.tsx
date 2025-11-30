"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";

type Item = { name: string; median: number; avg?: number; count?: number };

export default function IncomeByAgeChart({ data }: { data: Item[] }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = data.map(d => ({ name: d.name, Median: Math.round(d.median), Average: Math.round(d.avg ?? d.median) }));
  
  if (!isClient) {
    return (
      <div className="w-full h-80 min-h-[320px] flex items-center justify-center">
        <div className="text-gray-500">Loading chart...</div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-80 min-h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(v: any) => `₹${(v/100000).toFixed(1)}L`} />
          <Legend />
          <Bar dataKey="Median" barSize={18} />
          <Bar dataKey="Average" barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
