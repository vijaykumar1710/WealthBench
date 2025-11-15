import { z, ZodError } from 'zod';
import { Demographics, Financials } from '@/types/submission';

export const validateSubmission = (data: { demographics: Demographics; financials: Financials }) => {
  const schema = z.object({
    demographics: z.object({
      age: z.number().int().positive().max(120, "Age must be less than 120"),
      region: z.string().min(1, "Region is required"),
      city: z.string().min(1, "City is required"),
      years_experience: z.number().int().min(0, "Years of experience cannot be negative"),
      occupation: z.string().min(1, "Occupation is required"),
    }),
    financials: z.object({
      income_yearly: z.number().min(0, "Income must be non-negative"),
      monthly_expenses: z.number().min(0, "Expenses must be non-negative"),
      savings_total: z.number().min(0, "Savings must be non-negative"),
      stock_value_total: z.number().min(0, "Stocks must be non-negative"),
      mutual_fund_total: z.number().min(0, "Mutual funds must be non-negative"),
      real_estate_total_price: z.number().min(0, "Real estate must be non-negative"),
      gold_grams: z.number().min(0, "Gold grams must be non-negative"),
      gold_value_estimate: z.number().min(0, "Gold value must be non-negative").optional(),
      assets_total: z.number().min(0, "Assets must be non-negative").optional(),
      liabilities_total: z.number().min(0, "Liabilities must be non-negative").optional(),
    })
  });

  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map(issue => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      };
    }
    throw error;
  }
};