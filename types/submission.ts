export type FixedFields = {
  age_range: string | null;
  region: string | null;
  income_bracket: string | null;
  income: number | null;
  savings: number | null;
  expenses: number | null;
  emi: number | null;
  gold: number | null;
  fixed_deposit: number | null;
  car_value: number | null;
  stock_value: number | null;
  crypto_value: number | null;
  real_estate_region: string | null;
  real_estate_price: number | null;
};

export type DynamicField = {
  key: string;
  value: number;
};

export type SubmissionPayload = {
  fixed: FixedFields;
  dynamic: DynamicField[];
};

