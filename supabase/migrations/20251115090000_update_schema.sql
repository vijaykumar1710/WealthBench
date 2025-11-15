---------------------------------------------------
-- Add yoe (Years of Experience) column if it doesn't exist
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS yoe integer;

---------------------------------------------------
-- Add location column if it doesn't exist
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS location text;

---------------------------------------------------
-- Copy data from region to location if region exists and location is null
-- This is a safe operation that won't fail if region column doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'submissions' 
             AND column_name = 'region') THEN
    UPDATE public.submissions SET location = region WHERE location IS NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore any errors
  RAISE NOTICE 'Error during migration: %', SQLERRM;
END $$;

---------------------------------------------------
-- Add income column if it doesn't exist
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS income numeric;

---------------------------------------------------
-- Update the RLS policies to allow inserts with new columns
-- The existing policy 'anon_insert_submissions' already allows all columns
-- No changes needed for RLS policies as they use WITH CHECK (true)

---------------------------------------------------
-- Update any views or functions that reference the old column names
-- (Add any view or function updates here if needed)
