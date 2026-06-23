create table if not exists public.static_pesticide (
  product_code text primary key,
  product_name text,
  product_nutirent text,
  product_category text,
  product_usage jsonb not null default '[]'::jsonb,
  updated_at date,
  created_at timestamptz not null default now()
);

grant select on public.static_pesticide to anon, authenticated;

alter table public.static_pesticide enable row level security;

drop policy if exists "static_pesticide_select_public" on public.static_pesticide;

create policy "static_pesticide_select_public" on public.static_pesticide
  for select to anon, authenticated
  using (true);
