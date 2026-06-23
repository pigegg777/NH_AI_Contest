-- Split storefront config into office-level page config plus per-category card config rows.
-- Legacy columns stay in place for one transition window so older migrations and ad-hoc
-- scripts can still be inspected safely while the app reads the new structure.

alter table public.office_page_config
  add column if not exists page_config jsonb not null default '{}'::jsonb;

comment on column public.office_page_config.page_config is
  'Office-wide storefront UI config such as nav, search section, theme, and category chips.';

create table if not exists public.office_page_category_configs (
  office_code text not null references public.office_page_config (office_code) on delete cascade,
  product_category_name text not null,
  sort_order integer not null default 0,
  category_config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (office_code, product_category_name)
);

comment on table public.office_page_category_configs is
  'Per-office storefront category card configs keyed by logical product category name.';

create index if not exists office_page_category_configs_office_code_sort_order_idx
  on public.office_page_category_configs (office_code, sort_order);

alter table public.office_page_category_configs enable row level security;

grant select on public.office_page_category_configs to anon, authenticated;
grant insert, update, delete on public.office_page_category_configs to authenticated;

drop policy if exists "office_page_category_configs_select_public" on public.office_page_category_configs;
drop policy if exists "office_page_category_configs_insert_own_office" on public.office_page_category_configs;
drop policy if exists "office_page_category_configs_update_own_office" on public.office_page_category_configs;
drop policy if exists "office_page_category_configs_delete_own_office" on public.office_page_category_configs;

create policy "office_page_category_configs_select_public" on public.office_page_category_configs
  for select to anon, authenticated
  using (true);

create policy "office_page_category_configs_insert_own_office" on public.office_page_category_configs
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_category_configs.office_code
    )
  );

create policy "office_page_category_configs_update_own_office" on public.office_page_category_configs
  for update to authenticated
  using (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_category_configs.office_code
    )
  )
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_category_configs.office_code
    )
  );

create policy "office_page_category_configs_delete_own_office" on public.office_page_category_configs
  for delete to authenticated
  using (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_category_configs.office_code
    )
  );

drop trigger if exists set_office_page_category_configs_updated_at on public.office_page_category_configs;

create trigger set_office_page_category_configs_updated_at
  before update on public.office_page_category_configs
  for each row
  execute function public.set_current_timestamp_updated_at();

update public.office_page_config
set page_config = jsonb_build_object(
  'schemaVersion', 1,
  'theme', jsonb_build_object(
    'brandColor', coalesce(nullif(nav_config ->> 'brandColor', ''), '#1d4a2e')
  ),
  'nav', jsonb_build_object(
    'title', coalesce(nullif(nav_config ->> 'title', ''), ''),
    'subtitle', coalesce(nullif(nav_config ->> 'subtitle', ''), ''),
    'logoUrl', coalesce(nullif(nav_config ->> 'logoUrl', ''), '')
  ),
  'searchSection', jsonb_build_object(
    'enabled', true,
    'placeholder', coalesce(nullif(nav_config ->> 'searchPlaceholder', ''), '상품명을 검색하세요'),
    'variant', 'pill'
  ),
  'categoryChips', jsonb_build_object(
    'enabled', true,
    'sticky', true
  )
)
where page_config = '{}'::jsonb;

with section_seed as (
  select
    opc.office_code,
    seeded.section,
    seeded.ordinality
  from public.office_page_config as opc
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(opc.section_order) = 'array' and jsonb_array_length(opc.section_order) > 0 then opc.section_order
      else coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'category_ref', fallback.category_ref,
              'display_variant', 'card-grid'
            )
            order by fallback.ord
          )
          from jsonb_array_elements(coalesce(opc.selected_categories, '[]'::jsonb)) with ordinality as fallback(category_ref, ord)
        ),
        '[]'::jsonb
      )
    end
  ) with ordinality as seeded(section, ordinality)
)
insert into public.office_page_category_configs (
  office_code,
  product_category_name,
  sort_order,
  category_config
)
select
  section_seed.office_code,
  coalesce(
    nullif(
      concat_ws(
        '__',
        nullif(section_seed.section -> 'category_ref' ->> 'large_category', ''),
        nullif(section_seed.section -> 'category_ref' ->> 'medium_category', '')
      ),
      ''
    ),
    'category_' || section_seed.ordinality::text
  ) as product_category_name,
  section_seed.ordinality - 1 as sort_order,
  jsonb_build_object(
    'schemaVersion', 1,
    'displayName', coalesce(
      nullif(section_seed.section -> 'category_ref' ->> 'medium_category', ''),
      nullif(section_seed.section -> 'category_ref' ->> 'large_category', ''),
      'Category ' || section_seed.ordinality::text
    ),
    'categoryRef', coalesce(section_seed.section -> 'category_ref', '{}'::jsonb),
    'layoutStyle', jsonb_build_object(
      'variant', coalesce(nullif(section_seed.section ->> 'display_variant', ''), 'card-grid')
    ),
    'cardDesign', jsonb_build_object(
      'visibleFields', coalesce(opc.card_config -> 'fields', '[]'::jsonb),
      'style', coalesce(opc.card_config -> 'style', '{}'::jsonb)
    )
  ) as category_config
from section_seed
join public.office_page_config as opc
  on opc.office_code = section_seed.office_code
where
  coalesce(section_seed.section -> 'category_ref' ->> 'large_category', '') <> ''
  or coalesce(section_seed.section -> 'category_ref' ->> 'medium_category', '') <> ''
on conflict (office_code, product_category_name) do update
set
  sort_order = excluded.sort_order,
  category_config = excluded.category_config;
