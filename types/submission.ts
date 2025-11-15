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

export type OptionalAssets = {
  real_estate: { location: string; price: number }[];
  stocks: { name: string; value: number }[];
  mutual_funds: { name: string; value: number }[];
  cars: { name: string; value: number }[];
  emis: { name: string; value: number }[];
};

export type DynamicField = {
  key: string;
  value: number;
};

export type SubmissionPayload = {
  fixed: FixedFields;
  requiredFixed: RequiredFixed;
  optionalAssets: OptionalAssets;
  dynamic: DynamicField[];
};

