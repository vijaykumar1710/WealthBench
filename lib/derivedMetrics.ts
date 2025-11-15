import { DynamicField, RequiredFixed, OptionalAggregates, OptionalBreakdown } from "@/types/submission";

export function calculateDerivedMetrics(
  requiredFixed: RequiredFixed,
  optionalAggregates?: OptionalAggregates,
  optionalBreakdown?: OptionalBreakdown,
  dynamic: DynamicField[] = []
): DynamicField[] {
  const result: DynamicField[] = [];
  
  // Helper to find value from dynamic fields
  const findDynamic = (key: string) => dynamic.find((d) => d.key === key)?.value;
  
  const income = requiredFixed.income;
  const savings = requiredFixed.savings;
  const expenses = requiredFixed.expenses;
  const debt = findDynamic("debt"); // debt is typically dynamic

  // Calculate totals - use aggregate if provided, otherwise sum breakdown
  const stockTotal = optionalAggregates?.stock_value_total ?? 
    (optionalBreakdown?.stocks?.reduce((sum, stock) => (sum ?? 0) + (stock.value ?? 0), 0) || 0);

  const mutualFundTotal = optionalAggregates?.mutual_fund_total ?? 
    (optionalBreakdown?.mutual_funds?.reduce((sum, fund) => (sum ?? 0) + (fund.value ?? 0), 0) || 0);

  const carTotal = optionalAggregates?.car_value_total ?? 
    (optionalBreakdown?.cars?.reduce((sum, car) => (sum ?? 0) + (car.value ?? 0), 0) || 0);

  const emiTotal = optionalAggregates?.emi_total ?? 
    (optionalBreakdown?.emis?.reduce((sum, emi) => (sum ?? 0) + (emi.value ?? 0), 0) || 0);

  const realEstateTotal = optionalAggregates?.real_estate_total_price ?? 
    (optionalBreakdown?.real_estate?.reduce((sum, prop) => (sum ?? 0) + (prop.price ?? 0), 0) || 0);

  // Get other investments from aggregates or dynamic
  const goldValue = optionalAggregates?.gold_value ?? findDynamic("gold") ?? 0;
  const fixedDepositTotal = optionalAggregates?.fixed_deposit_total ?? findDynamic("fixed_deposit") ?? 0;
  const cryptoValueTotal = optionalAggregates?.crypto_value_total ?? findDynamic("crypto_value") ?? 0;

  // Savings rate
  if (income && savings && income > 0) {
    result.push({ key: "savings_rate", value: savings / income });
  }

  // Debt to income ratio
  if (income && debt && income > 0) {
    result.push({ key: "debt_to_income", value: debt / income });
  }

  // Expense ratio
  if (income && expenses && income > 0) {
    result.push({ key: "expense_ratio", value: expenses / income });
  }

  // EMI ratio (total EMIs / income)
  if (income && emiTotal > 0 && income > 0) {
    result.push({ key: "emi_ratio", value: emiTotal / income });
  }

  // Investment value (sum of stocks + mutual funds + gold + fixed_deposit + crypto)
  const investmentValue = [stockTotal, mutualFundTotal, goldValue, fixedDepositTotal, cryptoValueTotal]
    .filter((v) => typeof v === "number" && v > 0)
    .reduce((a, b) => (a ?? 0) + (b ?? 0), 0);

  if (investmentValue > 0) {
    result.push({ key: "investment_value", value: investmentValue });
  }

  // Store individual totals if they exist
  if (stockTotal > 0) {
    result.push({ key: "stock_value_total", value: stockTotal });
  }
  if (mutualFundTotal > 0) {
    result.push({ key: "mutual_fund_total", value: mutualFundTotal });
  }
  if (carTotal > 0) {
    result.push({ key: "car_value_total", value: carTotal });
  }
  if (emiTotal > 0) {
    result.push({ key: "emi_total", value: emiTotal });
  }

  // Real estate total
  if (realEstateTotal > 0) {
    result.push({ key: "real_estate_total", value: realEstateTotal });
  }

  // Net worth calculation
  // Assets: savings + investment_value + real_estate_total + cars
  // Liabilities: debt + emis_total (monthly EMIs converted to annual for comparison)
  const assets = [savings ?? 0, investmentValue, realEstateTotal, carTotal]
    .filter((v) => typeof v === "number" && v > 0)
    .reduce((a, b) => (a ?? 0) + (b ?? 0), 0);

  // For EMIs, we'll use monthly amount * 12 as annual liability estimate
  const annualEmis = emiTotal * 12;
  const liabilities = (debt ?? 0) + annualEmis;
  
  if (assets > 0 || liabilities > 0) {
    result.push({ key: "net_worth", value: assets - liabilities });
  }

  return result;
}
