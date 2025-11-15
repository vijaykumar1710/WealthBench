import { DynamicField } from "@/types/submission";

export function calculateDerivedMetrics(dynamic: DynamicField[]): DynamicField[] {
  const result: DynamicField[] = [];
  const find = (key: string) => dynamic.find((d) => d.key === key)?.value;

  const income = find("income");
  const savings = find("savings");
  const debt = find("debt");
  const emi = find("emi");

  if (income && savings) {
    result.push({ key: "savings_rate", value: savings / income });
  }

  if (income && debt) {
    result.push({ key: "debt_to_income", value: debt / income });
  }

  if (income && emi) {
    result.push({ key: "emi_ratio", value: emi / income });
  }

  // net worth calculation (sum positives - debt)
  const positiveKeys = ["savings", "gold", "crypto", "stocks", "property_value"];
  const positives = positiveKeys
    .map(find)
    .filter((v) => v)
    .reduce((a, b) => a + b, 0);

  if (positives && debt) {
    result.push({ key: "net_worth", value: positives - debt });
  }

  return result;
}

