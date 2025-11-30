export function formatCurrencyIndia(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "₹0";
  const abs = Math.abs(v);
  if (abs >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)} Cr`;
  if (abs >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)} L`;
  if (abs >= 1_000) return `₹${(v / 1_000).toFixed(1)} K`;
  return `₹${v.toFixed(0)}`;
}

export function formatPercent(v?: number | null): string {
  if (v == null || !Number.isFinite(v)) return "0%";
  return `${v.toFixed(1)}%`;
}
