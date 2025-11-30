export function detectSpam(payload: any): boolean {
  const f = payload.financials;

  const allNums = [
    f.income_yearly,
    f.monthly_expenses,
    f.savings_total,
    f.liabilities_total,
    f.real_estate_total_price,
    f.gold_grams,
  ].filter(Boolean);

  // If 4+ fields have the exact same number → spam
  const duplicates = allNums.filter(
    (v, _, arr) => arr.filter((x) => x === v).length >= 4
  );

  if (duplicates.length >= 4) return true;

  // If everything is 0 → spam
  if (allNums.every((v) => v === 0)) return true;

  // Too many "extreme" values
  if (allNums.filter((v) => v > 10_00_00_000).length >= 3) return true;

  return false;
}
