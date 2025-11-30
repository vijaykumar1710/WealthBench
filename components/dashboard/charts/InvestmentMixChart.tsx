"use client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useEffect, useState } from "react";

const COLORS = ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA"];

export default function InvestmentMixChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
  const chartData = data.map(d => ({ 
    name: d.name, 
    value: Math.max(0, d.value), 
    percentage: ((d.value / total) * 100).toFixed(1),
    color: d.color 
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
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, payload }: any) => `${name}: ${payload.percentage}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: any, name: any, props: any) => {
            const percentage = props.payload.percentage;
            return [`${percentage}%`, name];
          }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
