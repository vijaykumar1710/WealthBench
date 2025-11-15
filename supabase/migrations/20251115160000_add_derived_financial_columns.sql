alter table public.submissions
  add column if not exists assets_total numeric,
  add column if not exists investment_total numeric,
  add column if not exists savings_rate numeric,
  add column if not exists expense_rate numeric;

update public.submissions
set
  assets_total = coalesce(real_estate_total_price, 0)
    + coalesce(stock_value_total, 0)
    + coalesce(mutual_fund_total, 0)
    + coalesce(gold_value_estimate, 0)
    + coalesce(savings_total, 0),
  investment_total = coalesce(stock_value_total, 0)
    + coalesce(mutual_fund_total, 0)
    + coalesce(gold_value_estimate, 0),
  savings_rate = case when income_yearly > 0 then savings_total / income_yearly else null end,
  expense_rate = case when income_yearly > 0 then (monthly_expenses * 12) / income_yearly else null end;
