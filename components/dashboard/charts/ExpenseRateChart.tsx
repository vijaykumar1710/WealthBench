"use client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";

type Item = { name: string; median: number; avg?: number; count?: number };

// Helper function to convert rate to percentage for calculations
const toPercentage = (rate: number): number => {
  // API returns rates in percentage format (like 28.5 for 28.5%), not decimal (0.285)
  return rate;
};

export default function ExpenseRateChart({ data }: { data: Item[] }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const chartData = data.map(d => ({ 
    name: d.name, 
    Median: Math.round(toPercentage(d.median)), 
    Average: Math.round(toPercentage(d.avg ?? d.median))
  }));
  
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
          <Tooltip formatter={(v: any) => `${v}%`} />
          <Legend />
          <Bar dataKey="Median" barSize={18} fill="#F59E0B" />
          <Bar dataKey="Average" barSize={12} fill="#FCD34D" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
