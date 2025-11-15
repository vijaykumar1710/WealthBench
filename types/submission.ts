export type FixedFields = {
  age_range: string | null;
  region: string | null;
  income_bracket: string | null;
};

export type RequiredFixed = {
  income: number;
  savings: number;
  expenses: number;
};

export type OptionalAggregates = {
  gold_value?: number;
  fixed_deposit_total?: number;
  crypto_value_total?: number;
  stock_value_total?: number;
  mutual_fund_total?: number;
  car_value_total?: number;
  emi_total?: number;
  real_estate_total_price?: number;
};

export type OptionalBreakdown = {
  stocks?: { name: string; value: number }[];
  mutual_funds?: { name: string; value: number }[];
  cars?: { name: string; value: number }[];
  emis?: { name: string; value: number }[];
  real_estate?: { location: string; price: number }[];
};

export type DynamicField = {
  key: string;
  value: number;
};

export type SubmissionPayload = {
  fixed: FixedFields;
  requiredFixed: RequiredFixed;
  optionalAggregates?: OptionalAggregates;
  optionalBreakdown?: OptionalBreakdown;
  dynamic: DynamicField[];
};

