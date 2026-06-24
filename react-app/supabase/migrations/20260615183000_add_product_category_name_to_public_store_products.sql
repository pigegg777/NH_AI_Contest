-- Include the source product_category_name in the public storefront RPC so
-- public rendering can stay scoped to the saved office_page_category_configs row.

create or replace function public.get_public_store_products(p_office_code text)
returns table (
  product_category_name text,
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
    entry ->> 'category_name' as product_category_name,
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
