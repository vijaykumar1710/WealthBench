DO $$
BEGIN
    -- First, check if required types exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_bracket') THEN
        RAISE NOTICE 'Skipping materialized view creation: income_bracket type does not exist yet';
        RETURN;
    END IF;

    -- Check if required function exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_income_bracket') THEN
        RAISE NOTICE 'Skipping materialized view creation: get_income_bracket function does not exist yet';
        RETURN;
    END IF;

    -- Check if required columns exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'submissions' 
        AND column_name IN ('income_yearly', 'net_worth', 'region')
    ) THEN
        RAISE NOTICE 'Skipping materialized view creation: required columns do not exist in submissions table';
        RETURN;
    END IF;

    -- Drop existing view if it exists
    IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'metric_aggregates') THEN
        DROP MATERIALIZED VIEW public.metric_aggregates;
    END IF;
    
    -- Create the materialized view
    EXECUTE '
    CREATE MATERIALIZED VIEW public.metric_aggregates AS
    SELECT
        COUNT(*) as total_submissions,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY income_yearly) as median_income,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY net_worth) as median_net_worth,
        AVG(income_yearly) as avg_income,
        AVG(net_worth) as avg_net_worth,
        get_income_bracket(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY income_yearly)::numeric) as median_income_bracket,
        COUNT(DISTINCT region) as regions_represented,
        NOW() as last_updated
    FROM public.submissions
    WHERE income_yearly IS NOT NULL 
    AND net_worth IS NOT NULL';
    
    -- Create or replace the refresh function
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.refresh_metric_aggregates()
    RETURNS void AS $BODY$
    BEGIN
        REFRESH MATERIALIZED VIEW public.metric_aggregates;
    END;
    $BODY$ LANGUAGE plpgsql SECURITY DEFINER';
    
    -- Grant necessary permissions
    EXECUTE 'GRANT SELECT ON public.metric_aggregates TO anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.refresh_metric_aggregates() TO postgres, anon, authenticated';
    
    RAISE NOTICE 'Successfully created metric_aggregates materialized view';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating materialized view: %', SQLERRM;
END $$;
