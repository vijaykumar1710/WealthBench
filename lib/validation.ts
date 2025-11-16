import { z, ZodError } from 'zod';
import { Demographics, Financials } from '@/types/submission';

export const validateSubmission = (data: { demographics: Demographics; financials: Financials }) => {
  const schema = z.object({
    demographics: z.object({
      age: z.number()
        .int()
        .positive("Age must be greater than zero"),
      
      city: z.string()
        .min(1, "City is required"),
      
      country: z.string()
        .optional(),
      
      location: z.string()
        .optional(),
      
      yoe: z.number()
        .int()
        .min(0, "Years of experience cannot be negative"),
      
      occupation: z.string()
        .min(1, "Occupation is required"),
    }),

    financials: z.object({
      income_yearly: z.number()
        .min(0, "Annual income must be non-negative"),

      monthly_expenses: z.number()
        .min(0, "Monthly expenses must be non-negative"),

      savings_total: z.number()
        .min(0, "Total savings must be non-negative"),

      liabilities_total: z.number()
        .min(0, "Total liabilities must be non-negative"),

      // Optional peer-comparison inputs
      stock_value_total: z.number()
        .min(0, "Stocks value must be non-negative")
        .optional(),

      mutual_fund_total: z.number()
        .min(0, "Mutual fund value must be non-negative")
        .optional(),

      real_estate_total_price: z.number()
        .min(0, "Real estate value must be non-negative")
        .optional(),

      gold_grams: z.number()
        .min(0, "Gold grams must be non-negative")
        .optional(),

      gold_value_estimate: z.number()
        .min(0, "Gold value must be non-negative")
        .optional(),

      assets_total: z.number()
        .min(0, "Assets must be non-negative")
        .optional(),
    }),
  });

  try {
    return { success: true, data: schema.parse(data) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: error.issues.map(issue => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      };
    }
    throw error;
  }
};
