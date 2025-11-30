"use client";

export default function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold text-blue-600 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
