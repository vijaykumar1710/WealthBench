---------------------------------------------------
alter table public.submissions
  add column if not exists expenses numeric,
  add column if not exists emi numeric,
  add column if not exists gold numeric,
  add column if not exists fixed_deposit numeric,
  add column if not exists car_value numeric,
  add column if not exists stock_value numeric,
  add column if not exists crypto_value numeric,
  add column if not exists real_estate_region text,
  add column if not exists real_estate_price numeric;

---------------------------------------------------
-- Update the RLS policies to allow inserts with new columns (still safe)
-- Existing policies allow any column; no changes needed.
---------------------------------------------------

