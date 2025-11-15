import { SubmissionPayload, DynamicField } from "@/types/submission";

export interface ValidationError {
  field?: string;
  message: string;
}

export function validateSubmission(payload: SubmissionPayload): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate dynamic array is not empty
  if (!payload.dynamic || payload.dynamic.length === 0) {
    errors.push({
      field: "dynamic",
      message: "Dynamic fields array cannot be empty",
    });
    return errors; // Early return if no dynamic fields
  }

  // Validate each dynamic field
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

