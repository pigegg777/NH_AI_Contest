alter table public.login_users
  add column if not exists office_code text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'login_users'
      and column_name = 'business_code'
  ) then
    execute $sql$
      update public.login_users
      set office_code = business_code
      where (office_code is null or office_code = '')
        and business_code is not null
    $sql$;
  end if;
end
$$;

grant select, insert on public.login_users to anon, authenticated;
grant usage, select on sequence public.login_users_id_seq to anon, authenticated;

drop policy if exists "allow_select" on public.login_users;
drop policy if exists "allow_insert" on public.login_users;

create policy "allow_select" on public.login_users
  for select to anon, authenticated
  using (true);

create policy "allow_insert" on public.login_users
  for insert to anon, authenticated
  with check (true);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.office_product_datas (
  id bigint generated always as identity primary key,
  office_code text not null,
  office_name text not null,
  product_data_category_name text not null,
  product_data jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  source_file_name text,
  updated_who bigint not null references public.login_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists office_product_datas_office_code_category_name_key
  on public.office_product_datas (office_code, product_data_category_name);

create index if not exists office_product_datas_office_code_idx
  on public.office_product_datas (office_code);

alter table public.office_product_datas enable row level security;

grant select, insert, update on public.office_product_datas to anon, authenticated;
grant usage, select on sequence public.office_product_datas_id_seq to anon, authenticated;

drop policy if exists "office_product_datas_select_demo" on public.office_product_datas;
drop policy if exists "office_product_datas_insert_demo" on public.office_product_datas;
drop policy if exists "office_product_datas_update_demo" on public.office_product_datas;

create policy "office_product_datas_select_demo" on public.office_product_datas
  for select to anon, authenticated
  using (true);

create policy "office_product_datas_insert_demo" on public.office_product_datas
  for insert to anon, authenticated
  with check (true);

create policy "office_product_datas_update_demo" on public.office_product_datas
  for update to anon, authenticated
  using (true)
  with check (true);

drop trigger if exists set_office_product_datas_updated_at on public.office_product_datas;

create trigger set_office_product_datas_updated_at
  before update on public.office_product_datas
  for each row
  execute function public.set_current_timestamp_updated_at();
