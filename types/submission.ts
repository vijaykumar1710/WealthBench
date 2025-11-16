// ------------------------------------------
// DEMOGRAPHICS
// ------------------------------------------
export type Demographics = {
  age: number;
  city: string;
  country?: string;
  location?: string;
  yoe: number;                // years of experience (renamed from years_experience)
  occupation: string;
};

// ------------------------------------------
// FINANCIAL SNAPSHOT
// ------------------------------------------
export type Financials = {
  // Primary required financial inputs
  income_yearly: number;
  monthly_expenses: number;

  // User-defined totals
  savings_total: number;        // full corpus across all assets (MF, stocks, EPF, crypto included)
  liabilities_total: number;    // full outstanding debt entered by user

  // Optional breakdowns (for peer analytics only)
  stock_value_total?: number;
  mutual_fund_total?: number;

  real_estate_total_price?: number;
  gold_grams?: number;
  gold_value_estimate?: number;

  // Derived or optional categories for future expansion
  assets_total?: number;

  // Optional structured breakdowns (ignored for now but supported)
  investments?: any;
  real_estate?: any;
  vehicles?: any;
  other_assets?: any;
  other_liabilities?: any;
};

// ------------------------------------------
// PAYLOAD SENT TO API
// ------------------------------------------
export type SubmissionPayload = {
  demographics: Demographics;
  financials: Financials;
  additional_metrics?: Record<string, any>;   // metrics like EMI, notes, salary, etc.
};

// ------------------------------------------
// RESPONSE SENT FROM API AFTER INSERT
// ------------------------------------------
export type SubmissionResponse = {
  id: string;
  created_at: string;
  net_worth: number;
};

// ------------------------------------------
// FILTER TYPES FOR ANALYTICS
// ------------------------------------------
export type AggregationFilters = {
  city?: string[];
  occupation?: string[];
  // (removed region, income_bracket, age_range, experience_level)
};

// ------------------------------------------
// STATISTICAL METRICS FOR AGGREGATION
// ------------------------------------------
export type MetricResult = {
  count: number;
  average: number;
  median: number;
  percentile_25: number;
  percentile_75: number;
  min: number;
  max: number;
  sample_size: number;
};

// ------------------------------------------
// AGGREGATION RESULT FORMAT
// ------------------------------------------
export type AggregationResult = {
  metrics: {
    income: MetricResult;
    net_worth: MetricResult;
    savings_rate: MetricResult;
    [key: string]: MetricResult;
  };
  filters: AggregationFilters;
  cohort_comparison?: {
    name: string;
    metrics: {
      income: number;
      net_worth: number;
      savings_rate: number;
    };
  };
};

// ------------------------------------------
// SUBMISSION RECORD FROM DATABASE
// ------------------------------------------
export type Submission = {
  id: string;

  // Demographics
  age: number | null;
  city: string | null;
  country: string | null;
  location: string | null;
  yoe: number | null;
  occupation: string | null;
  region?: string | null;
  income_bracket?: string | null;
  age_range?: string | null;
  experience_level?: string | null;

  // Financials
  income_yearly: number | null;
  savings_total: number | null;
  monthly_expenses: number | null;
  assets_total: number | null;
  liabilities_total: number | null;
  net_worth: number | null;

  // Optional breakdowns
  stock_value_total?: number | null;
  mutual_fund_total?: number | null;
  real_estate_total_price?: number | null;
  gold_grams?: number | null;
  gold_value_estimate?: number | null;

  // Computed metrics
  savings_rate?: number | null;
  expense_rate?: number | null;

  // Additional JSON metrics
  additional_metrics: {
    savings_rate?: number;
    investments?: any;
    real_estate?: any;
    vehicles?: any;
    other_assets?: any;
    other_liabilities?: any;

    monthly_emi?: number;
    monthly_salary?: number;
    monthly_expenses?: number;
    monthly_savings?: number;

    // new field included in metrics for clarity
    liabilities_total?: number;
    notes?: string;
  } | null;

  created_at: string;
};
