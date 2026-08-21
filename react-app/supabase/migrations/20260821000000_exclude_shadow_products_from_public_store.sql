-- Shadow rows (row_data.shadow = true) are draft/placeholder entries carried
-- over from a previous excel upload merge; they should not be visible on the
-- public storefront until an office explicitly re-registers them.
create or replace function public.get_public_store_products(p_office_code text)
returns table (
  product_category_name  text,
  row_id                 text,
  product_code           text,
  product_name           text,
  spec                   text,
  large_category         text,
  medium_category        text,
  small_category         text,
  detail_category        text,
  nutrient               text,
  nutirent               text,
  img_url                text,
  product_url            text,
  tax_price               numeric,
  zero_tax_price          numeric,
  exempt_tax_price        numeric,
  price_subsidy           numeric,
  sale_price_type_name    text,
  note                    text,
  indict_symbl            text,
  product_usage           text,
  product_category        text,
  manufacturer_list       jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    entry ->> 'category_name'                        as product_category_name,
    row_data ->> 'row_id'                            as row_id,
    row_data ->> 'product_code'                      as product_code,
    row_data ->> 'product_name'                      as product_name,
    row_data ->> 'spec'                              as spec,
    row_data ->> 'large_category'                    as large_category,
    row_data ->> 'medium_category'                   as medium_category,
    row_data ->> 'small_category'                    as small_category,
    row_data ->> 'detail_category'                   as detail_category,
    row_data ->> 'nutrient'                          as nutrient,
    row_data ->> 'nutirent'                          as nutirent,
    row_data ->> 'img_url'                           as img_url,
    row_data ->> 'product_url'                       as product_url,
    (row_data ->> 'tax_price')::numeric              as tax_price,
    (row_data ->> 'zero_tax_price')::numeric         as zero_tax_price,
    (row_data ->> 'exempt_tax_price')::numeric       as exempt_tax_price,
    (row_data ->> 'price_subsidy')::numeric          as price_subsidy,
    row_data ->> 'sale_price_type_name'              as sale_price_type_name,
    row_data ->> 'note'                              as note,
    row_data ->> 'indict_symbl'                      as indict_symbl,
    row_data ->> 'product_usage'                     as product_usage,
    row_data ->> 'product_category'                  as product_category,
    row_data -> 'manufacturer_list'                  as manufacturer_list
  from public.office_product_datas as opd,
       jsonb_array_elements(opd.product_data) as entry,
       jsonb_array_elements(entry -> 'rows') as row_data
  where opd.office_code = p_office_code
    and coalesce((row_data ->> 'shadow')::boolean, false) = false;
$$;

grant execute on function public.get_public_store_products(text) to anon, authenticated;
