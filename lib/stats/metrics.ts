export type RankingMetric =
  | "income"
  | "savings"
  | "expenses"
  | "net_worth"
  | "investment_value"
  | "stock_value_total"
  | "mutual_fund_total"
  | "real_estate_total_price"
  | "gold_value_estimate";

export const allowedMetrics: RankingMetric[] = [
  "income",
  "savings",
  "expenses",
  "net_worth",
  "investment_value",
  "stock_value_total",
  "mutual_fund_total",
  "real_estate_total_price",
  "gold_value_estimate",
];

/**
 * Return a numeric metric value (or null) for a submission row.
 * Keep this function as the single source of truth for metric extraction.
 */
export function getMetricValue(row: any, metric: RankingMetric): number | null {
  switch (metric) {
    case "income":
      return typeof row.income_yearly === "number" ? row.income_yearly : row.income_yearly ? Number(row.income_yearly) : null;
    case "savings":
      return typeof row.savings_total === "number" ? row.savings_total : row.savings_total ? Number(row.savings_total) : null;
    case "expenses":
      return typeof row.monthly_expenses === "number" ? row.monthly_expenses : row.monthly_expenses ? Number(row.monthly_expenses) : null;
    case "net_worth":
      return typeof row.net_worth === "number" ? row.net_worth : row.net_worth ? Number(row.net_worth) : null;
    case "stock_value_total":
      return typeof row.stock_value_total === "number" ? row.stock_value_total : row.stock_value_total ? Number(row.stock_value_total) : null;
    case "mutual_fund_total":
      return typeof row.mutual_fund_total === "number" ? row.mutual_fund_total : row.mutual_fund_total ? Number(row.mutual_fund_total) : null;
    case "real_estate_total_price":
      return typeof row.real_estate_total_price === "number" ? row.real_estate_total_price : row.real_estate_total_price ? Number(row.real_estate_total_price) : null;
    case "gold_value_estimate":
      return typeof row.gold_value_estimate === "number" ? row.gold_value_estimate : row.gold_value_estimate ? Number(row.gold_value_estimate) : null;
    case "investment_value": {
      const s = getMetricValue(row, "savings") ?? 0;
      const st = getMetricValue(row, "stock_value_total") ?? 0;
      const mf = getMetricValue(row, "mutual_fund_total") ?? 0;
      const re = getMetricValue(row, "real_estate_total_price") ?? 0;
      const g = getMetricValue(row, "gold_value_estimate") ?? 0;
      const total = s + st + mf + re + g;
      return total > 0 ? total : null;
    }
    default:
      return null;
  }
}
