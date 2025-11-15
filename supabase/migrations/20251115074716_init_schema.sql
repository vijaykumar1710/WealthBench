---------------------------------------------------
-- EXTENSION
create extension if not exists "pgcrypto";

---------------------------------------------------
-- Main submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  age_range text,
  region text,
  income_bracket text
);

---------------------------------------------------
-- Dynamic key/value table
create table if not exists public.submission_values (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references public.submissions(id) on delete cascade,
  key text not null,
  value numeric,
  created_at timestamptz default now()
);

---------------------------------------------------
-- Enable Row Level Security
alter table public.submissions enable row level security;

alter table public.submission_values enable row level security;

---------------------------------------------------
-- Allow anonymous inserts
create policy "anon_insert_submissions" on public.submissions
  for insert to anon with check (true);

create policy "anon_insert_submission_values" on public.submission_values
  for insert to anon with check (true);

---------------------------------------------------
-- Deny all selects (privacy locked)
create policy "deny_select_submission" on public.submissions
  for select using (false);

create policy "deny_select_submission_values" on public.submission_values
  for select using (false);

---------------------------------------------------
-- RPC Helper for percentiles (server-only)
create or replace function exec_sql(sql text, params json)
returns json
language plpgsql
as $$
declare result json;
begin
  execute sql into result using
    (params->>0),
    (params->>1),
    (params->>2);
  return result;
end;
$$;

---------------------------------------------------

