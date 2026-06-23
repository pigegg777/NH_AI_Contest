-- Phase 1a: customer storefront page config + public read RPC.
-- office_page_config holds the per-office wizard output (Phase 1b writes it;
-- Phase 1a ships read-only via a tracked seed row).

create table if not exists public.office_page_config (
  office_code text primary key references public.office_product_datas (office_code) on delete cascade,
  selected_categories jsonb not null default '[]'::jsonb,
  card_config jsonb not null default '{}'::jsonb,
  nav_config jsonb not null default '{}'::jsonb,
  section_order jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.office_page_config enable row level security;

grant select on public.office_page_config to anon, authenticated;

drop policy if exists "office_page_config_select_public" on public.office_page_config;

create policy "office_page_config_select_public" on public.office_page_config
  for select to anon, authenticated
  using (true);

drop trigger if exists set_office_page_config_updated_at on public.office_page_config;

create trigger set_office_page_config_updated_at
  before update on public.office_page_config
  for each row
  execute function public.set_current_timestamp_updated_at();

-- Public, anon-callable projection of one office's products. office_product_datas
-- itself stays locked down (authenticated, own-office-only per
-- 20260610090000_enable_supabase_auth_for_login_users.sql) -- this function is the
-- only new public surface, and it returns a fixed, explicit column list (no
-- internal pricing/manufacturer/note/shadow fields).
create or replace function public.get_public_store_products(p_office_code text)
returns table (
  product_name text,
  spec text,
  large_category text,
  medium_category text,
  small_category text,
  detail_category text,
  nutrient text,
  img_url text,
  product_url text,
  tax_price numeric
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    row_data ->> 'product_name' as product_name,
    row_data ->> 'spec' as spec,
    row_data ->> 'large_category' as large_category,
    row_data ->> 'medium_category' as medium_category,
    row_data ->> 'small_category' as small_category,
    row_data ->> 'detail_category' as detail_category,
    row_data ->> 'nutrient' as nutrient,
    row_data ->> 'img_url' as img_url,
    row_data ->> 'product_url' as product_url,
    (row_data ->> 'tax_price')::numeric as tax_price
  from public.office_product_datas as opd,
       jsonb_array_elements(opd.product_data) as entry,
       jsonb_array_elements(entry -> 'rows') as row_data
  where opd.office_code = p_office_code;
$$;

grant execute on function public.get_public_store_products(text) to anon, authenticated;
