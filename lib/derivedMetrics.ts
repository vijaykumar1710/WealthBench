import { DynamicField, FixedFields } from "@/types/submission";

export function calculateDerivedMetrics(
  fixed: FixedFields,
  dynamic: DynamicField[]
): DynamicField[] {
  const result: DynamicField[] = [];
  
  // Helper to find value from dynamic fields
  const findDynamic = (key: string) => dynamic.find((d) => d.key === key)?.value;
  
  // Use fixed fields first, fallback to dynamic
  const income = fixed.income ?? findDynamic("income");
  const savings = fixed.savings ?? findDynamic("savings");
  const expenses = fixed.expenses ?? findDynamic("expenses");
  const emi = fixed.emi ?? findDynamic("emi");
  const debt = findDynamic("debt"); // debt is typically dynamic
  const gold = fixed.gold ?? findDynamic("gold");
  const fixedDeposit = fixed.fixed_deposit ?? findDynamic("fixed_deposit");
  const stockValue = fixed.stock_value ?? findDynamic("stock_value");
  const cryptoValue = fixed.crypto_value ?? findDynamic("crypto_value");
  const realEstatePrice = fixed.real_estate_price ?? findDynamic("real_estate_price");

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

  // EMI ratio
  if (income && emi && income > 0) {
    result.push({ key: "emi_ratio", value: emi / income });
  }

  // Investment value (sum of all investments)
  const investmentValue = [gold, fixedDeposit, stockValue, cryptoValue]
    .filter((v) => v !== null && v !== undefined)
    .reduce((a, b) => a + b, 0);
  
  if (investmentValue > 0) {
    result.push({ key: "investment_value", value: investmentValue });
  }

  // Net worth calculation
  const assets = [savings, gold, fixedDeposit, stockValue, cryptoValue, realEstatePrice]
    .filter((v) => v !== null && v !== undefined)
    .reduce((a, b) => a + b, 0);
  
  const liabilities = debt ?? 0;
  
  if (assets > 0 || liabilities > 0) {
    result.push({ key: "net_worth", value: assets - liabilities });
  }

  return result;
}

