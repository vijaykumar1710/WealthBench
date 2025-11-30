export function detectOutliers(fin: any): string[] {
  const issues: string[] = [];

  if (fin.income_yearly > fin.savings_total * 50) {
    issues.push("Income vs Savings mismatch seems unrealistic.");
  }
  if (fin.monthly_expenses > fin.income_yearly / 3) {
    issues.push("Monthly expenses too high compared to income.");
  }
  if (fin.real_estate_total_price > fin.income_yearly * 200) {
    issues.push("Real estate value looks unrealistic.");
  }

  return issues;
}
