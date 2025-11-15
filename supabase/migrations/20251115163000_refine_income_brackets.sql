create or replace function public.bucket_income_bracket(income numeric)
returns text
language plpgsql
immutable
as $$
declare
  lower_bound numeric := 500000; -- ₹5L
  upper_bound numeric;
begin
  if income is null then
    return null;
  elsif income < lower_bound then
    return '< ₹5L';
  end if;

  while lower_bound < 10000000 loop -- iterate up to ₹1Cr
    upper_bound := lower_bound + 500000; -- ₹5L step
    if income < upper_bound then
      return '₹' || (lower_bound / 100000)::int || 'L–' || '₹' || (upper_bound / 100000)::int || 'L';
    end if;
    lower_bound := upper_bound;
  end loop;

  return '₹1Cr+';
end;
$$;

update public.submissions
set income_bracket = public.bucket_income_bracket(income_yearly);
