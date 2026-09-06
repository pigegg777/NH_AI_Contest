-- 농약 정보 페이지(features/nongyak)가 쓰는 RPC 묶음.
--
-- 탭 두 개가 서로 다른 원본을 본다.
--   재고상품 탭: office_product_datas.product_data 중 category_name = '농약'인
--                entry의 rows. 사업장(office_code)별로 저장된 실제 취급 상품이다.
--   전체상품 탭: static_pesticide 전체.
--
-- office 행에는 product_usage가 저장되지 않으므로(마이그레이션 20260829092715),
-- 작물/병해충 검색과 작물별 사용법은 product_code로 static_pesticide를 되짚어 읽는다.
-- 같은 이유로 성분/용도/작용기작도 행에 비어 있으면 static_pesticide 값으로 메운다.
--
-- static_pesticide는 anon/authenticated select 정책이 열려 있지만, office_product_datas와
-- 조인해 한 번에 거르기 위해 검색도 RPC로 둔다(카테고리 옵션·건수 계산이 클라이언트에서
-- 전체 행을 받아오지 않아도 되게).

create or replace function public.search_office_pesticide_products(
  p_office_code text default null,
  p_crop text default null,
  p_product_name text default null,
  p_indict_symbl text default null,
  p_nutirent text default null,
  p_category text default null,
  p_disease_weed text default null
)
returns table (
  product_code text,
  product_name text,
  product_category text,
  indict_symbl text,
  nutirent text,
  spec text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select distinct on (candidate.product_code)
    candidate.product_code,
    candidate.product_name,
    candidate.product_category,
    candidate.indict_symbl,
    candidate.nutirent,
    candidate.spec
  from (
    select
      btrim(row_data ->> 'product_code')                        as product_code,
      row_data ->> 'product_name'                               as product_name,
      coalesce(
        nullif(btrim(row_data ->> 'product_category'), ''),
        s.product_category
      )                                                         as product_category,
      coalesce(
        nullif(btrim(row_data ->> 'indict_symbl'), ''),
        s.indict_symbl
      )                                                         as indict_symbl,
      coalesce(
        nullif(btrim(row_data ->> 'nutirent'), ''),
        s.nutirent
      )                                                         as nutirent,
      row_data ->> 'spec'                                       as spec,
      coalesce(s.product_usage, '[]'::jsonb)                    as product_usage
    from public.office_product_datas as opd
      cross join lateral jsonb_array_elements(opd.product_data) as entry
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(entry -> 'rows') = 'array' then entry -> 'rows'
          else '[]'::jsonb
        end
      ) as row_data
      left join public.static_pesticide as s
        on s.product_code = btrim(row_data ->> 'product_code')
    where (p_office_code is null or p_office_code = '' or opd.office_code = p_office_code)
      and entry ->> 'category_name' = '농약'
      and coalesce((row_data ->> 'shadow')::boolean, false) = false
      and coalesce(btrim(row_data ->> 'product_code'), '') <> ''
  ) as candidate
  where (p_category is null or p_category = '' or candidate.product_category = p_category)
    and (
      p_product_name is null or p_product_name = '' or
      candidate.product_name ilike '%' || p_product_name || '%'
    )
    and (
      p_indict_symbl is null or p_indict_symbl = '' or
      candidate.indict_symbl ilike '%' || p_indict_symbl || '%'
    )
    and (
      p_nutirent is null or p_nutirent = '' or
      candidate.nutirent ilike '%' || p_nutirent || '%'
    )
    and (
      p_crop is null or p_crop = '' or
      exists (
        select 1 from jsonb_array_elements(candidate.product_usage) as usage_row
        where usage_row ->> 'cropName' ilike '%' || p_crop || '%'
      )
    )
    and (
      p_disease_weed is null or p_disease_weed = '' or
      exists (
        select 1 from jsonb_array_elements(candidate.product_usage) as usage_row
        where usage_row ->> 'diseaseWeedName' ilike '%' || p_disease_weed || '%'
      )
    )
  order by candidate.product_code;
$$;

comment on function public.search_office_pesticide_products(text, text, text, text, text, text, text) is
  '재고상품탭 검색. 사업장의 office_product_datas 중 ''농약'' 카테고리 행을 static_pesticide와 조인해, 작물/상품명/작용기작/성분/용도/병해충을 각각 독립 파라미터로 받아 채워진 조건끼리만 AND 결합. 사용법은 응답에 포함하지 않음(카드 클릭 시 별도 단건 조회).';

create or replace function public.search_static_pesticide(
  p_crop text default null,
  p_product_name text default null,
  p_indict_symbl text default null,
  p_nutirent text default null,
  p_category text default null,
  p_disease_weed text default null
)
returns table (
  product_code text,
  product_name text,
  product_category text,
  indict_symbl text,
  nutirent text,
  spec text
)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    s.product_code,
    s.product_name,
    s.product_category,
    s.indict_symbl,
    s.nutirent,
    null::text as spec
  from public.static_pesticide as s
  where (p_category is null or p_category = '' or s.product_category = p_category)
    and (
      p_product_name is null or p_product_name = '' or
      s.product_name ilike '%' || p_product_name || '%'
    )
    and (
      p_indict_symbl is null or p_indict_symbl = '' or
      s.indict_symbl ilike '%' || p_indict_symbl || '%'
    )
    and (
      p_nutirent is null or p_nutirent = '' or
      s.nutirent ilike '%' || p_nutirent || '%'
    )
    and (
      p_crop is null or p_crop = '' or
      exists (
        select 1
        from jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
        where usage_row ->> 'cropName' ilike '%' || p_crop || '%'
      )
    )
    and (
      p_disease_weed is null or p_disease_weed = '' or
      exists (
        select 1
        from jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
        where usage_row ->> 'diseaseWeedName' ilike '%' || p_disease_weed || '%'
      )
    )
  order by s.product_code;
$$;

comment on function public.search_static_pesticide(text, text, text, text, text, text) is
  '전체상품탭 검색. static_pesticide 기준으로 작물/상품명/작용기작/성분/용도/병해충을 각각 독립 파라미터로 받아 채워진 조건끼리만 AND 결합.';

-- 카드 클릭 시 단건 사용법 조회. 두 탭 모두 static_pesticide.product_usage를 읽지만,
-- 재고 행이 나중에 자체 사용법을 갖게 될 수 있어 탭별 함수를 따로 둔다.
create or replace function public.get_static_pesticide_usage(p_product_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(s.product_usage, '[]'::jsonb)
  from public.static_pesticide as s
  where s.product_code = p_product_code
  limit 1;
$$;

comment on function public.get_static_pesticide_usage(text) is
  '전체상품탭 카드 클릭 시 단건 product_usage 조회.';

create or replace function public.get_office_pesticide_usage(p_product_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select public.get_static_pesticide_usage(p_product_code);
$$;

comment on function public.get_office_pesticide_usage(text) is
  '재고상품탭 카드 클릭 시 단건 사용법 조회. office 행에는 product_usage가 없어 static_pesticide를 되짚어 읽는다.';

-- 검색 필드 자동완성 후보.
-- p_field: 'crop' | 'productName' | 'indictSymbl' | 'nutirent' | 'diseaseWeed'
-- p_query 접두 일치(ilike p_query || '%') distinct 값을 최대 10개 반환.
create or replace function public.suggest_office_pesticide_field(
  p_office_code text,
  p_field text,
  p_query text
)
returns table (suggestion text)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_query is null or btrim(p_query) = '' then
    return;
  end if;

  if p_field not in ('crop', 'productName', 'indictSymbl', 'nutirent', 'diseaseWeed') then
    raise exception 'Unknown suggestion field: %', p_field;
  end if;

  -- 후보 필드를 한 컬럼(candidate)으로 펼친 뒤 접두 일치로 거른다. 필드마다
  -- 쿼리를 따로 쓰지 않으려고, 상품 자체 필드와 사용법 배열 필드를 각각
  -- 해당 p_field일 때만 살아남는 두 갈래로 묶었다.
  return query
  with office_rows as (
    select
      row_data ->> 'product_name'                               as product_name,
      coalesce(
        nullif(btrim(row_data ->> 'indict_symbl'), ''),
        s.indict_symbl
      )                                                         as indict_symbl,
      coalesce(
        nullif(btrim(row_data ->> 'nutirent'), ''),
        s.nutirent
      )                                                         as nutirent,
      coalesce(s.product_usage, '[]'::jsonb)                    as product_usage
    from public.office_product_datas as opd
      cross join lateral jsonb_array_elements(opd.product_data) as entry
      cross join lateral jsonb_array_elements(
        case
          when jsonb_typeof(entry -> 'rows') = 'array' then entry -> 'rows'
          else '[]'::jsonb
        end
      ) as row_data
      left join public.static_pesticide as s
        on s.product_code = btrim(row_data ->> 'product_code')
    where (p_office_code is null or p_office_code = '' or opd.office_code = p_office_code)
      and entry ->> 'category_name' = '농약'
      and coalesce((row_data ->> 'shadow')::boolean, false) = false
  ),
  candidates as (
    select
      case p_field
        when 'productName' then office_rows.product_name
        when 'indictSymbl' then office_rows.indict_symbl
        when 'nutirent' then office_rows.nutirent
      end as candidate
    from office_rows
    where p_field in ('productName', 'indictSymbl', 'nutirent')

    union all

    select
      case p_field
        when 'crop' then usage_row ->> 'cropName'
        when 'diseaseWeed' then usage_row ->> 'diseaseWeedName'
      end as candidate
    from office_rows
      cross join lateral jsonb_array_elements(office_rows.product_usage) as usage_row
    where p_field in ('crop', 'diseaseWeed')
  )
  select distinct candidates.candidate
  from candidates
  where candidates.candidate ilike p_query || '%'
  order by 1
  limit 10;
end;
$$;

comment on function public.suggest_office_pesticide_field(text, text, text) is
  '재고상품탭 검색창 자동완성 후보. p_field로 대상 필드 지정, p_query 접두 일치 distinct 값 최대 10개.';

create or replace function public.suggest_static_pesticide_field(
  p_field text,
  p_query text
)
returns table (suggestion text)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_query is null or btrim(p_query) = '' then
    return;
  end if;

  if p_field = 'productName' then
    return query
    select distinct s.product_name
    from public.static_pesticide as s
    where s.product_name ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'indictSymbl' then
    return query
    select distinct s.indict_symbl
    from public.static_pesticide as s
    where s.indict_symbl ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'nutirent' then
    return query
    select distinct s.nutirent
    from public.static_pesticide as s
    where s.nutirent ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'crop' then
    return query
    select distinct usage_row ->> 'cropName' as suggestion
    from public.static_pesticide as s,
      jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
    where usage_row ->> 'cropName' ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'diseaseWeed' then
    return query
    select distinct usage_row ->> 'diseaseWeedName' as suggestion
    from public.static_pesticide as s,
      jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
    where usage_row ->> 'diseaseWeedName' ilike p_query || '%'
    order by 1
    limit 10;
  else
    raise exception 'Unknown suggestion field: %', p_field;
  end if;
end;
$$;

comment on function public.suggest_static_pesticide_field(text, text) is
  '전체상품탭 검색창 자동완성 후보. p_field로 대상 필드 지정, p_query 접두 일치 distinct 값 최대 10개.';

revoke all on function public.search_office_pesticide_products(text, text, text, text, text, text, text) from public;
revoke all on function public.search_static_pesticide(text, text, text, text, text, text) from public;
revoke all on function public.get_office_pesticide_usage(text) from public;
revoke all on function public.get_static_pesticide_usage(text) from public;
revoke all on function public.suggest_office_pesticide_field(text, text, text) from public;
revoke all on function public.suggest_static_pesticide_field(text, text) from public;

grant execute on function public.search_office_pesticide_products(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.search_static_pesticide(text, text, text, text, text, text) to authenticated;
grant execute on function public.get_office_pesticide_usage(text) to authenticated;
grant execute on function public.get_static_pesticide_usage(text) to authenticated;
grant execute on function public.suggest_office_pesticide_field(text, text, text) to authenticated;
grant execute on function public.suggest_static_pesticide_field(text, text) to authenticated;
