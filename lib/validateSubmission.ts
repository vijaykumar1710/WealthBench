import { SubmissionPayload, DynamicField } from "@/types/submission";

export interface ValidationError {
  field?: string;
  message: string;
}

export function validateSubmission(payload: SubmissionPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate required fixed fields
  if (!payload.requiredFixed) {
    errors.push({
      field: "requiredFixed",
      message: "Required fields (income, savings, expenses) are missing",
    });
    return errors;
  }

  if (!payload.requiredFixed.income || payload.requiredFixed.income <= 0) {
    errors.push({
      field: "requiredFixed.income",
      message: "Income must be greater than 0",
    });
  }

  if (payload.requiredFixed.savings < 0) {
    errors.push({
      field: "requiredFixed.savings",
      message: "Savings cannot be negative",
    });
  }

  if (payload.requiredFixed.expenses < 0) {
    errors.push({
      field: "requiredFixed.expenses",
      message: "Expenses cannot be negative",
    });
  }

  // Validate optional assets
  if (payload.optionalAssets) {
    // Validate real estate entries
    payload.optionalAssets.real_estate.forEach((prop, index) => {
      if (!prop.location || prop.location.trim() === "") {
        errors.push({
          field: `optionalAssets.real_estate[${index}].location`,
          message: "Location is required for real estate",
        });
      }
      if (prop.price < 0) {
        errors.push({
          field: `optionalAssets.real_estate[${index}].price`,
          message: "Real estate price cannot be negative",
        });
      }
    });

    // Validate stocks, mutual funds, cars, EMIs
    ["stocks", "mutual_funds", "cars", "emis"].forEach((category) => {
      const items = (payload.optionalAssets as any)[category] || [];
      items.forEach((item: any, index: number) => {
        if (!item.name || item.name.trim() === "") {
          errors.push({
            field: `optionalAssets.${category}[${index}].name`,
            message: `${category} name is required`,
          });
        }
        if (item.value < 0) {
          errors.push({
            field: `optionalAssets.${category}[${index}].value`,
            message: `${category} value cannot be negative`,
          });
        }
      });
    });
  }

  // Validate dynamic fields
  if (payload.dynamic) {
    payload.dynamic.forEach((field: DynamicField, index: number) => {
    // Ensure keys are strings
    if (typeof field.key !== "string" || field.key.trim() === "") {
      errors.push({
        field: `dynamic[${index}].key`,
        message: "Key must be a non-empty string",
      });
    }

    // Ensure values are numbers
    if (typeof field.value !== "number" || isNaN(field.value)) {
      errors.push({
        field: `dynamic[${index}].value`,
        message: "Value must be a valid number",
      });
    }

    // Enforce valid ranges for specific fields
    const key = field.key.toLowerCase();
    const value = field.value;

    // No negative income, savings, or assets
    if (
      (key === "income" || key === "savings" || key === "gold" || 
       key === "crypto" || key === "stocks" || key === "property_value") &&
      value < 0
    ) {
      errors.push({
        field: `dynamic[${index}].value`,
        message: `${key} cannot be negative`,
      });
    }

    // No negative debt or EMI
    if ((key === "debt" || key === "emi") && value < 0) {
      errors.push({
        field: `dynamic[${index}].value`,
        message: `${key} cannot be negative`,
      });
    }

    // Income should be positive
    if (key === "income" && value <= 0) {
      errors.push({
        field: `dynamic[${index}].value`,
        message: "Income must be greater than 0",
      });
    }
  });

  return errors;
}

