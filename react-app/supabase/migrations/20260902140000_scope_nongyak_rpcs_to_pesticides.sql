-- 농약 페이지 두 탭의 대상 범위를 좁힌다.
--
-- 재고상품 탭: '농약'이라는 카테고리 이름에 저장됐는지가 아니라, 행 자체의
--   large_category가 '농약'인지로 고른다. 사업장이 농약을 커스텀 카테고리
--   이름으로 올려둔 경우도 잡히고, '농약' 카테고리에 섞여 들어온 비농약 행은
--   빠진다.
--
-- 전체상품 탭: static_pesticide에는 농약이 아닌 행이 6,002건 섞여 있다
--   (미량요소비료 2859, 제4종복비 1511, 유기농업자재 1196, 기타비료 436).
--   product_category가 실제 농약 용도인 행만 남긴다.

-- 농약으로 볼 product_category 값. 2026-09-02 기준 static_pesticide의 distinct
-- 값 11종 중 농약 7종. '기타'는 전착제·보조제 등 농약 등록품이라 포함한다.
-- 목록을 한 곳에 두어 검색 RPC와 자동완성 RPC가 같은 기준을 쓰게 한다.
create or replace function public.nongyak_product_categories()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['살균', '살충', '제초', '균충', '생조', '충초', '기타']::text[];
$$;

comment on function public.nongyak_product_categories() is
  '전체상품탭에서 농약으로 취급할 static_pesticide.product_category 값 목록. 비료 계열(미량요소비료/제4종복비/유기농업자재/기타비료)은 제외된다.';

revoke all on function public.nongyak_product_categories() from public;
grant execute on function public.nongyak_product_categories() to authenticated;

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
      and btrim(row_data ->> 'large_category') = '농약'
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
  '재고상품탭 검색. 사업장의 office_product_datas 행 중 large_category가 ''농약''인 것을 static_pesticide와 조인해, 작물/상품명/작용기작/성분/용도/병해충을 각각 독립 파라미터로 받아 채워진 조건끼리만 AND 결합. 사용법은 응답에 포함하지 않음(카드 클릭 시 별도 단건 조회).';

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
  where s.product_category = any (public.nongyak_product_categories())
    and (p_category is null or p_category = '' or s.product_category = p_category)
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
  '전체상품탭 검색. static_pesticide 중 product_category가 농약 용도인 행만 대상으로, 작물/상품명/작용기작/성분/용도/병해충을 각각 독립 파라미터로 받아 채워진 조건끼리만 AND 결합.';

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
      and btrim(row_data ->> 'large_category') = '농약'
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
  '재고상품탭 검색창 자동완성 후보. large_category가 ''농약''인 행만 대상. p_field로 대상 필드 지정, p_query 접두 일치 distinct 값 최대 10개.';

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
    where s.product_category = any (public.nongyak_product_categories())
      and s.product_name ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'indictSymbl' then
    return query
    select distinct s.indict_symbl
    from public.static_pesticide as s
    where s.product_category = any (public.nongyak_product_categories())
      and s.indict_symbl ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'nutirent' then
    return query
    select distinct s.nutirent
    from public.static_pesticide as s
    where s.product_category = any (public.nongyak_product_categories())
      and s.nutirent ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'crop' then
    return query
    select distinct usage_row ->> 'cropName' as suggestion
    from public.static_pesticide as s,
      jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
    where s.product_category = any (public.nongyak_product_categories())
      and usage_row ->> 'cropName' ilike p_query || '%'
    order by 1
    limit 10;
  elsif p_field = 'diseaseWeed' then
    return query
    select distinct usage_row ->> 'diseaseWeedName' as suggestion
    from public.static_pesticide as s,
      jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
    where s.product_category = any (public.nongyak_product_categories())
      and usage_row ->> 'diseaseWeedName' ilike p_query || '%'
    order by 1
    limit 10;
  else
    raise exception 'Unknown suggestion field: %', p_field;
  end if;
end;
$$;

comment on function public.suggest_static_pesticide_field(text, text) is
  '전체상품탭 검색창 자동완성 후보. product_category가 농약 용도인 행만 대상. p_field로 대상 필드 지정, p_query 접두 일치 distinct 값 최대 10개.';
