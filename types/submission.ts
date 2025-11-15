export type FixedFields = {
  age_range: string | null;
  region: string | null;
  income_bracket: string | null;
};

export type DynamicField = {
  key: string;
  value: number;
};

export type SubmissionPayload = {
  fixed: FixedFields;
  dynamic: DynamicField[];
};

