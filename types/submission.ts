export type Demographics = {
  age: number;
  region: string;
  city?: string;
  years_experience: number;
  occupation: string;
};

export type Financials = {
  income_yearly: number;
  monthly_expenses: number;
  savings_total: number;
  assets_total?: number;
  liabilities_total?: number;
  stock_value_total?: number;
  mutual_fund_total?: number;
  real_estate_total_price?: number;
  gold_grams?: number;
  gold_value_estimate?: number;
  // Optional detailed breakdowns
  investments?: {
    stocks?: { name: string; value: number }[];
    mutual_funds?: { name: string; value: number }[];
    crypto?: { name: string; value: number }[];
    fixed_deposits?: { name: string; value: number }[];
  };
  real_estate?: {
    primary_residence?: { value: number; mortgage_remaining?: number };
    investment_properties?: { location: string; value: number; mortgage_remaining?: number }[];
  };
  vehicles?: { name: string; value: number; loan_remaining?: number }[];
  other_assets?: { name: string; value: number }[];
  other_liabilities?: { name: string; amount: number; interest_rate?: number }[];
};

export type SubmissionPayload = {
  demographics: Demographics;
  financials: Financials;
  // For any additional custom fields
  additional_metrics?: Record<string, any>;
};

export type SubmissionResponse = {
  id: string;
  created_at: string;
  net_worth: number;
  income_bracket: string;
  experience_level: string;
  age_range: string;
};

export type AggregationFilters = {
  age_range?: string[];
  income_bracket?: string[];
  experience_level?: string[];
  region?: string[];
  city?: string[];
  occupation?: string[];
};

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
      income: number; // percentage difference
      net_worth: number; // percentage difference
      savings_rate: number; // percentage difference
    };
  };
};

export type Submission = {
  id: string;
  age: number | null;
  region: string | null;
  city: string | null;
  years_experience: number | null;
  occupation: string | null;
  income_yearly: number | null;
  savings_total: number | null;
  monthly_expenses: number | null;
  assets_total: number | null;
  liabilities_total: number | null;
  net_worth: number | null;
  stock_value_total?: number | null;
  mutual_fund_total?: number | null;
  real_estate_total_price?: number | null;
  gold_grams?: number | null;
  gold_value_estimate?: number | null;
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
  } | null;
  income_bracket?: string | null;
  experience_level?: string | null;
  age_range?: string | null;
  created_at: string;
};
