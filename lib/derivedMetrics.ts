import { DynamicField, RequiredFixed, OptionalAssets } from "@/types/submission";

export function calculateDerivedMetrics(
  requiredFixed: RequiredFixed,
  optionalAssets: OptionalAssets,
  dynamic: DynamicField[]
): DynamicField[] {
  const result: DynamicField[] = [];
  
  // Helper to find value from dynamic fields
  const findDynamic = (key: string) => dynamic.find((d) => d.key === key)?.value;
  
  const income = requiredFixed.income;
  const savings = requiredFixed.savings;
  const expenses = requiredFixed.expenses;
  const debt = findDynamic("debt"); // debt is typically dynamic

  // Calculate totals from optional assets
  const stocksTotal = optionalAssets.stocks.reduce((sum, stock) => sum + stock.value, 0);
  const mutualFundsTotal = optionalAssets.mutual_funds.reduce((sum, fund) => sum + fund.value, 0);
  const carsTotal = optionalAssets.cars.reduce((sum, car) => sum + car.value, 0);
  const emisTotal = optionalAssets.emis.reduce((sum, emi) => sum + emi.value, 0);
  const realEstateTotal = optionalAssets.real_estate.reduce((sum, prop) => sum + prop.price, 0);

  // Get other investments from dynamic fields
  const gold = findDynamic("gold");
  const fixedDeposit = findDynamic("fixed_deposit");
  const cryptoValue = findDynamic("crypto_value");

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
  if (income && emisTotal > 0 && income > 0) {
    result.push({ key: "emi_ratio", value: emisTotal / income });
  }

  // Investment value (sum of stocks + mutual funds + gold + fixed_deposit + crypto)
  const investmentValue = [stocksTotal, mutualFundsTotal, gold, fixedDeposit, cryptoValue]
    .filter((v) => v !== null && v !== undefined && v > 0)
    .reduce((a, b) => a + b, 0);
  
  if (investmentValue > 0) {
    result.push({ key: "investment_value", value: investmentValue });
  }

  // Real estate total
  if (realEstateTotal > 0) {
    result.push({ key: "real_estate_total", value: realEstateTotal });
  }

  // Net worth calculation
  // Assets: savings + investment_value + real_estate_total + cars
  // Liabilities: debt + emis_total (monthly EMIs converted to annual for comparison)
  const assets = [savings, investmentValue, realEstateTotal, carsTotal]
    .filter((v) => v !== null && v !== undefined && v > 0)
    .reduce((a, b) => a + b, 0);
  
  // For EMIs, we'll use monthly amount * 12 as annual liability estimate
  const annualEmis = emisTotal * 12;
  const liabilities = (debt ?? 0) + annualEmis;
  
  if (assets > 0 || liabilities > 0) {
    result.push({ key: "net_worth", value: assets - liabilities });
  }

  return result;
}
