-- 1. Add missing columns (safe, IF NOT EXISTS)
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS experience_level text,
ADD COLUMN IF NOT EXISTS investment_total numeric,
ADD COLUMN IF NOT EXISTS assets_total numeric,
ADD COLUMN IF NOT EXISTS liabilities_total numeric,
ADD COLUMN IF NOT EXISTS savings_rate numeric,
ADD COLUMN IF NOT EXISTS expense_rate numeric,
ADD COLUMN IF NOT EXISTS stock_value_total numeric,
ADD COLUMN IF NOT EXISTS mutual_fund_total numeric,
ADD COLUMN IF NOT EXISTS real_estate_total_price numeric,
ADD COLUMN IF NOT EXISTS gold_value_estimate numeric;

-- 2. Fix legacy column names → new names (preserve data)
-- income → income_yearly
UPDATE submissions SET income_yearly = income
WHERE income_yearly IS NULL AND income IS NOT NULL;

-- savings → savings_total
UPDATE submissions SET savings_total = savings
WHERE savings_total IS NULL AND savings IS NOT NULL;

-- monthly expenses → monthly_expenses
UPDATE submissions SET monthly_expenses = expenses
WHERE monthly_expenses IS NULL AND expenses IS NOT NULL;

-- real estate price conversion
UPDATE submissions SET real_estate_total_price = real_estate_price
WHERE real_estate_total_price IS NULL AND real_estate_price IS NOT NULL;

-- gold value fallback
UPDATE submissions SET gold_value_estimate = gold
WHERE gold_value_estimate IS NULL AND gold IS NOT NULL;

-- stock value fallback
UPDATE submissions SET stock_value_total = stock_value
WHERE stock_value_total IS NULL AND stock_value IS NOT NULL;

-- 3. Compute missing fields if possible
UPDATE submissions
SET investment_total =
    COALESCE(stock_value_total,0) +
    COALESCE(mutual_fund_total,0) +
    COALESCE(gold_value_estimate,0)
WHERE investment_total IS NULL;

UPDATE submissions
SET assets_total =
    COALESCE(savings_total,0) +
    COALESCE(investment_total,0) +
    COALESCE(real_estate_total_price,0)
WHERE assets_total IS NULL;

UPDATE submissions
SET net_worth =
    assets_total - COALESCE(liabilities_total,0)
WHERE net_worth IS NULL;

-- 4. Fix experience level if possible
UPDATE submissions
SET experience_level = 
  CASE
    WHEN years_experience IS NULL THEN NULL
    WHEN years_experience < 3 THEN 'Entry'
    WHEN years_experience < 7 THEN 'Mid'
    WHEN years_experience < 12 THEN 'Senior'
    ELSE 'Leadership'
  END
WHERE experience_level IS NULL;

-- 5. Backfill income bracket using your function
UPDATE submissions
SET income_bracket = bucket_income_bracket(income_yearly)
WHERE income_bracket IS NULL;

-- 6. Backfill age_range using your function
UPDATE submissions
SET age_range = bucket_age_range(age)
WHERE age_range IS NULL;

-- 7. Clean up inconsistent legacy fields (soft deprecate)
COMMENT ON COLUMN submissions.income IS 'Deprecated: use income_yearly';
COMMENT ON COLUMN submissions.savings IS 'Deprecated: use savings_total';
COMMENT ON COLUMN submissions.expenses IS 'Deprecated: use monthly_expenses';
COMMENT ON COLUMN submissions.real_estate_price IS 'Deprecated: use real_estate_total_price';
COMMENT ON COLUMN submissions.gold IS 'Deprecated: use gold_value_estimate';
COMMENT ON COLUMN submissions.stock_value IS 'Deprecated: use stock_value_total';

-- 8. Ensure JSONB exists
UPDATE submissions
SET additional_metrics = COALESCE(additional_metrics, '{}'::jsonb);
