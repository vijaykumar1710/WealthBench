import { DynamicField, RequiredFixed, OptionalAggregates, OptionalBreakdown } from "@/types/submission";

// Helper function to safely convert to number
const toNumber = (value: any, defaultValue = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export function calculateDerivedMetrics(
  requiredFixed: RequiredFixed,
  optionalAggregates?: OptionalAggregates,
  optionalBreakdown?: OptionalBreakdown,
  dynamic: DynamicField[] = []
): DynamicField[] {
  const result: DynamicField[] = [];
  
  // Helper to find value from dynamic fields
  const findDynamic = (key: string) => dynamic.find((d) => d.key === key)?.value;
  
  const income = toNumber(requiredFixed.income);
  const savings = toNumber(requiredFixed.savings);
  const expenses = toNumber(requiredFixed.expenses);
  const debt = toNumber(findDynamic("debt"));

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

  // Calculate net worth components
  const assets = {
    savings: toNumber(savings),
    investments: toNumber(investmentValue),
    realEstate: toNumber(realEstateTotal),
    vehicles: toNumber(carTotal),
    // Add more asset categories as needed
  };

  const liabilities = {
    debt: toNumber(debt),
    emis: toNumber(emiTotal) * 12, // Convert monthly EMIs to annual
    // Add more liability categories as needed
  };

  // Calculate totals
  const totalAssets = Object.values(assets).reduce((sum, val) => sum + val, 0);
  const totalLiabilities = Object.values(liabilities).reduce((sum, val) => sum + val, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Add all metrics to results
  result.push({ key: "net_worth", value: Math.round(netWorth * 100) / 100 });
  
  // Add individual components
  Object.entries(assets).forEach(([key, value]) => {
    if (value > 0) {
      result.push({ 
        key: `asset_${key}`, 
        value: Math.round(value * 100) / 100 
      });
    }
  });

  Object.entries(liabilities).forEach(([key, value]) => {
    if (value > 0) {
      result.push({ 
        key: `liability_${key}`, 
        value: Math.round(value * 100) / 100 
      });
    }
  });

  // Add totals
  result.push({ 
    key: "total_assets", 
    value: Math.round(totalAssets * 100) / 100 
  });
  result.push({ 
    key: "total_liabilities", 
    value: Math.round(totalLiabilities * 100) / 100 
  });

  return result;
}
