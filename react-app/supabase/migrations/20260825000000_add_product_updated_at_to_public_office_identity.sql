-- The public storefront shows when the price data was last uploaded, so shoppers
-- can tell how fresh the prices are. That timestamp already lives inside
-- office_product_datas.product_data[].updated_at, written by every excel save,
-- but no public projection exposed it.
--
-- It is added here rather than to get_public_store_products because it is one
-- value per office: returning it on all several-hundred product rows would
-- repeat the same string on every row for no reason.
--
-- max() across the entries, so an office with several categories reports its
-- most recent upload. Offices with no product data yet return null, and the
-- storefront renders nothing.

-- Adding a column to a `returns table` signature changes the function's OUT
-- parameter row type, which `create or replace` refuses ("cannot change return
-- type of existing function"). The function has to be dropped first. No cascade:
-- if anything ever depends on it, that should fail loudly rather than be dropped
-- silently. The grant below is re-issued because dropping discards it.

drop function if exists public.get_public_office_identity(text);

create function public.get_public_office_identity(p_office_code text)
returns table (
  office_name text,
  nh_name text,
  product_updated_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    lu.office_name,
    lu.nh_name,
    (
      select max((entry ->> 'updated_at')::timestamptz)
      from public.office_product_datas as opd,
           jsonb_array_elements(opd.product_data) as entry
      where opd.office_code = p_office_code
        and entry ? 'updated_at'
    ) as product_updated_at
  from public.login_users as lu
  where lu.office_code = p_office_code
  limit 1;
$$;

grant execute on function public.get_public_office_identity(text) to anon, authenticated;
