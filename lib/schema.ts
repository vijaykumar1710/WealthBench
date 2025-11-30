import { z } from "zod";

export const demographicsSchema = z.object({
  age: z.number().min(18).max(70),
  city: z.string().min(2).max(40),
  location: z.string().optional(),
  occupation: z.string().min(2).max(60),
  yoe: z.number().min(0).max(50),
});

export const financialsSchema = z.object({
  income_yearly: z.number().min(100000).max(10_00_00_000),
  monthly_expenses: z.number().min(1000).max(1_00_00_000),
  savings_total: z.number().min(0).max(1000_00_00_000),
  liabilities_total: z.number().min(0).max(1000_00_00_000),

  stock_value_total: z.number().min(0).max(500_00_00_000).optional(),
  mutual_fund_total: z.number().min(0).max(500_00_00_000).optional(),
  real_estate_total_price: z.number().min(0).max(1000_00_00_000),
  gold_grams: z.number().min(0).max(50000),
  gold_value_estimate: z.number().min(0).max(500_00_00_000).optional(),
});

export const additionalSchema = z.object({
  monthly_salary: z.number().min(0).max(1_00_00_000).optional(),
  monthly_expenses: z.number().optional(),
  monthly_savings: z.number().optional(),
  monthly_emi: z.number().min(0).max(1_00_00_000).optional(),
  notes: z.string().max(500).optional(),
});

export const submissionSchema = z.object({
  demographics: demographicsSchema,
  financials: financialsSchema,
  additional_metrics: additionalSchema,
});
