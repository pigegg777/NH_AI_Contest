-- Run once in Supabase SQL Editor for existing projects.
-- Existing rows can remain NULL until you backfill them.

alter table public.login_users
  add column if not exists business_code text;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'login_users'
      and policyname = 'allow_insert'
  ) then
    create policy "allow_insert" on public.login_users
      for insert with check (true);
  end if;
end
$$;

-- After backfilling old rows, you can enforce the stricter schema used in
-- react-app/supabase_setup.sql:
-- alter table public.login_users
--   alter column business_code set not null;
