create or replace function public.bucket_age_range(age int)
returns text
language plpgsql
immutable
as $$
begin
  if age is null then
    return null;
  elsif age < 18 then
    return 'Under 18';
  elsif age <= 24 then
    return '18-24';
  elsif age <= 34 then
    return '25-34';
  elsif age <= 44 then
    return '35-44';
  elsif age <= 54 then
    return '45-54';
  else
    return '55+';
  end if;
end;
$$;

update public.submissions
set age_range = public.bucket_age_range(age);
