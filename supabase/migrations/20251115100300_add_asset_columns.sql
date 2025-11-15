---------------------------------------------------
-- Add aggregate asset columns for richer benchmarking
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS stock_value_total numeric,
  ADD COLUMN IF NOT EXISTS mutual_fund_total numeric,
  ADD COLUMN IF NOT EXISTS real_estate_total_price numeric,
  ADD COLUMN IF NOT EXISTS gold_grams numeric,
  ADD COLUMN IF NOT EXISTS gold_value_estimate numeric;

-- No RLS policy updates are required since the anon insert policy already allows these columns.
---------------------------------------------------
