-- Consolidate office_product_datas to one row per office_code.
-- Moves category_name/updated_at/row_count/source_file_name into product_data entries.

with aggregated as (
  select
    office_code,
    min(id) as keep_id,
    jsonb_agg(
      jsonb_build_object(
        'category_name', product_data_category_name,
        'updated_at', updated_at,
        'row_count', row_count,
        'source_file_name', source_file_name,
        'rows', product_data
      )
      order by updated_at desc
    ) as merged_product_data
  from public.office_product_datas
  group by office_code
)
update public.office_product_datas as target
set product_data = aggregated.merged_product_data
from aggregated
where target.id = aggregated.keep_id;

-- drop the now-redundant per-category duplicates, keeping the consolidated row
delete from public.office_product_datas as target
using (
  select office_code, min(id) as keep_id
  from public.office_product_datas
  group by office_code
) as keep
where target.office_code = keep.office_code
  and target.id <> keep.keep_id;

drop index if exists public.office_product_datas_office_code_category_name_key;
alter table public.office_product_datas
  drop constraint if exists office_product_datas_office_code_category_name_key;

drop index if exists public.office_product_datas_office_code_idx;

alter table public.office_product_datas
  add constraint office_product_datas_office_code_key unique (office_code);

alter table public.office_product_datas
  drop column if exists product_data_category_name,
  drop column if exists row_count,
  drop column if exists source_file_name;
