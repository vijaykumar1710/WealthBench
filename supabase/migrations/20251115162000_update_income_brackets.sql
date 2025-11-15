create or replace function public.bucket_income_bracket(income numeric)
returns text
language plpgsql
immutable
as $$
begin
  if income is null then
    return null;
  elsif income < 500000 then
    return '< ₹5L';
  elsif income < 1000000 then
    return '₹5L–10L';
  elsif income < 2000000 then
    return '₹10L–20L';
  else
    return '₹20L+';
  end if;
end;
$$;

update public.submissions
set income_bracket = public.bucket_income_bracket(income_yearly);
