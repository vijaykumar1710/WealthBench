-- Migration: Drop deprecated and unused columns
-- Replace public.financial_data with your actual table name

ALTER TABLE submissions
    -- Deprecated columns
    DROP COLUMN IF EXISTS expenses,
    DROP COLUMN IF EXISTS gold,
    DROP COLUMN IF EXISTS stock_value,
    DROP COLUMN IF EXISTS real_estate_price,
    DROP COLUMN IF EXISTS income,
    DROP COLUMN IF EXISTS savings,

    -- Unused (not deprecated but not required)
    DROP COLUMN IF EXISTS age_range,
    DROP COLUMN IF EXISTS region,
    DROP COLUMN IF EXISTS income_bracket,
    DROP COLUMN IF EXISTS real_estate_region;
