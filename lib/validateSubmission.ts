import { SubmissionPayload } from "@/types/submission";

export interface ValidationError {
  field?: string;
  message: string;
}

const MAX_VALUE = 10_00_00_000; // ₹10 Crore ceiling for sanity checks

const isInvalidValue = (value: unknown, allowZero = false) => {
  if (typeof value !== "number" || Number.isNaN(value)) return true;
  if (!allowZero && value <= 0) return true;
  if (value < 0) return true;
  if (value > MAX_VALUE) return true;
  return false;
};

export function validateSubmission(payload: SubmissionPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!payload.demographics) {
    errors.push({ field: "demographics", message: "Demographics are required" });
  } else {
    const { age, region, city, years_experience, occupation } = payload.demographics;
    if (!Number.isInteger(age) || age <= 0 || age > 120) {
      errors.push({ field: "demographics.age", message: "Age must be between 1 and 120" });
    }
    if (!region?.trim()) {
      errors.push({ field: "demographics.region", message: "Region is required" });
    }
    if (!city?.trim()) {
      errors.push({ field: "demographics.city", message: "City is required" });
    }
    if (typeof years_experience !== "number" || years_experience < 0 || years_experience > 80) {
      errors.push({ field: "demographics.years_experience", message: "Experience must be >= 0" });
    }
    if (!occupation?.trim()) {
      errors.push({ field: "demographics.occupation", message: "Occupation is required" });
    }
  }

  if (!payload.financials) {
    errors.push({ field: "financials", message: "Financial snapshot is required" });
    return errors;
  }

  const {
    income_yearly,
    monthly_expenses,
    savings_total,
    stock_value_total,
    mutual_fund_total,
    real_estate_total_price,
    gold_grams,
    gold_value_estimate,
  } = payload.financials;

  if (isInvalidValue(income_yearly)) {
    errors.push({ field: "financials.income_yearly", message: "Income must be between 1 and 10 Crore" });
  }

  if (isInvalidValue(monthly_expenses, true)) {
    errors.push({ field: "financials.monthly_expenses", message: "Monthly expenses must be >= 0 and reasonable" });
  }

  if (isInvalidValue(savings_total, true)) {
    errors.push({ field: "financials.savings_total", message: "Savings must be >= 0 and reasonable" });
  }

  const optionalNumericFields: { field: keyof typeof payload.financials; label: string }[] = [
    { field: "stock_value_total", label: "Stock value" },
    { field: "mutual_fund_total", label: "Mutual fund value" },
    { field: "real_estate_total_price", label: "Real estate value" },
    { field: "gold_grams", label: "Gold grams" },
    { field: "gold_value_estimate", label: "Gold value" },
  ];

  optionalNumericFields.forEach(({ field, label }) => {
    const value = payload.financials?.[field];
    if (value !== undefined && value !== null) {
      if (isInvalidValue(value, true)) {
        errors.push({ field: `financials.${field}`, message: `${label} must be >= 0 and reasonable` });
      }
    }
  });

  if (typeof gold_grams === "number" && gold_grams < 0) {
    errors.push({ field: "financials.gold_grams", message: "Gold grams cannot be negative" });
  }

  if (typeof gold_value_estimate === "number" && gold_value_estimate < 0) {
    errors.push({ field: "financials.gold_value_estimate", message: "Gold value cannot be negative" });
  }

  return errors;
}
