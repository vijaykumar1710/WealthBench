export type LeaderboardEntry = {
  label: string;
  avg: number;
  median: number;
  sample_size: number;
};

export type GlobalAverages = {
  sample_size: number;
  avg_income: number;
  avg_expenses: number;
  avg_monthly_expenses: number;
  avg_savings: number;
  avg_stock: number;
  avg_mf: number;
  avg_re: number;
  avg_gold: number;
  avg_networth: number;
  avg_investment_total: number;
};

export type DashboardPayload = {
  generated_at: string;
  ttl_seconds: number;
  sample_size: number;

  cohort_summary: {
    sample_size: number;
    median_income: number;
    median_savings_rate: number;
    median_expense_rate: number;

    avg_income?: number;
    avg_expenses?: number;
    avg_monthly_expenses?: number;
    avg_savings?: number;
    avg_stock?: number;
    avg_mf?: number;
    avg_re?: number;
    avg_gold?: number;
    avg_networth?: number;
    avg_investment_total?: number;
  };

  leaderboards: {
    income_by_occupation: LeaderboardEntry[];
    income_by_age: LeaderboardEntry[];
    savings_rate_by_income: LeaderboardEntry[];
    expense_rate_by_income: LeaderboardEntry[];
  };

  averages: {
    monthly_emi: { average: number; median: number; sample_size: number };
    global?: GlobalAverages;
  };

  facets: {
    occupations: string[];
    cities: string[];
    age_ranges: string[];
    yoe_ranges?: string[];
  };

  warnings?: {
    cohort_small?: boolean;
    leaderboard_small?: boolean;
  };
};

export type Filters = {
  city?: string;
  occupation?: string;
  age?: string;
  yoe?: string;
};
