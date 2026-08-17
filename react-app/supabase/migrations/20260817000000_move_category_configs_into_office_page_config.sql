-- Fold office_page_category_configs rows into office_page_config as a single ordered
-- JSON column. Array position now conveys display order, so sort_order is retired.

alter table public.office_page_config
  add column if not exists category_detail_config jsonb not null default '[]'::jsonb;

comment on column public.office_page_config.category_detail_config is
  'Per-office storefront category card configs as an ordered array of '
  '{product_category_name, updated_at, category_config}; array order is display order.';

update public.office_page_config as opc
set category_detail_config = coalesce(agg.rows, '[]'::jsonb)
from (
  select
    office_code,
    jsonb_agg(
      jsonb_build_object(
        'product_category_name', product_category_name,
        'updated_at', updated_at,
        'category_config', category_config
      )
      order by sort_order
    ) as rows
  from public.office_page_category_configs
  group by office_code
) as agg
where agg.office_code = opc.office_code;

drop table if exists public.office_page_category_configs;
