-- Create the income_bracket type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_bracket') THEN
        CREATE TYPE income_bracket AS ENUM (
            'Under $25,000',
            '$25,000 - $50,000',
            '$50,001 - $75,000',
            '$75,001 - $100,000',
            '$100,001 - $150,000',
            '$150,001 - $200,000',
            'Over $200,000'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'experience_level') THEN
        CREATE TYPE experience_level AS ENUM (
            'Entry Level (0-2 years)',
            'Early Career (3-5 years)',
            'Mid Career (6-10 years)',
            'Experienced (11-20 years)',
            'Executive (20+ years)'
        );
    END IF;
END $$;

-- Add new columns to submissions table
ALTER TABLE public.submissions
ADD COLUMN IF NOT EXISTS age int,
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS years_experience int,
ADD COLUMN IF NOT EXISTS income_yearly numeric,
ADD COLUMN IF NOT EXISTS savings_total numeric,
ADD COLUMN IF NOT EXISTS monthly_expenses numeric,
ADD COLUMN IF NOT EXISTS assets_total numeric,
ADD COLUMN IF NOT EXISTS liabilities_total numeric,
ADD COLUMN IF NOT EXISTS net_worth numeric,
ADD COLUMN IF NOT EXISTS additional_metrics jsonb;

-- Helper functions for bucketing
CREATE OR REPLACE FUNCTION get_age_range(age integer) 
RETURNS text AS $$
BEGIN
    RETURN CASE
        WHEN age < 20 THEN 'Under 20'
        WHEN age BETWEEN 20 AND 29 THEN '20-29'
        WHEN age BETWEEN 30 AND 39 THEN '30-39'
        WHEN age BETWEEN 40 AND 49 THEN '40-49'
        WHEN age BETWEEN 50 AND 59 THEN '50-59'
        ELSE '60+'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_income_bracket(income numeric)
RETURNS income_bracket AS $$
BEGIN
    RETURN CASE
        WHEN income < 25000 THEN 'Under $25,000'::income_bracket
        WHEN income <= 50000 THEN '$25,000 - $50,000'::income_bracket
        WHEN income <= 75000 THEN '$50,001 - $75,000'::income_bracket
        WHEN income <= 100000 THEN '$75,001 - $100,000'::income_bracket
        WHEN income <= 150000 THEN '$100,001 - $150,000'::income_bracket
        WHEN income <= 200000 THEN '$150,001 - $200,000'::income_bracket
        ELSE 'Over $200,000'::income_bracket
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_yoe_bucket(years integer)
RETURNS experience_level AS $$
BEGIN
    RETURN CASE
        WHEN years <= 2 THEN 'Entry Level (0-2 years)'::experience_level
        WHEN years <= 5 THEN 'Early Career (3-5 years)'::experience_level
        WHEN years <= 10 THEN 'Mid Career (6-10 years)'::experience_level
        WHEN years <= 20 THEN 'Experienced (11-20 years)'::experience_level
        ELSE 'Executive (20+ years)'::experience_level
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to update derived fields
CREATE OR REPLACE FUNCTION update_submission_derived_fields()
RETURNS TRIGGER AS $$
BEGIN
    NEW.net_worth := COALESCE(NEW.assets_total, 0) - COALESCE(NEW.liabilities_total, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updates
DROP TRIGGER IF EXISTS submissions_derived_fields_trigger ON public.submissions;
CREATE TRIGGER submissions_derived_fields_trigger
BEFORE INSERT OR UPDATE OF assets_total, liabilities_total ON public.submissions
FOR EACH ROW
EXECUTE FUNCTION update_submission_derived_fields();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_age ON public.submissions(age);
CREATE INDEX IF NOT EXISTS idx_submissions_region ON public.submissions(region);
CREATE INDEX IF NOT EXISTS idx_submissions_income_yearly ON public.submissions(income_yearly);
CREATE INDEX IF NOT EXISTS idx_submissions_years_experience ON public.submissions(years_experience);
CREATE INDEX IF NOT EXISTS idx_submissions_net_worth ON public.submissions(net_worth);
