-- Add savings column if it doesn't exist
ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS savings numeric;

-- Update RLS policies if needed
-- The existing policy 'anon_insert_submissions' should already allow inserts to all columns
