create or replace function public.cohort_size_safe(count int)
returns boolean
language plpgsql
immutable
as $$
begin
  return count >= 10;
end;
$$;
