-- 작물과 병해충/잡초를 같은 사용법 행에서 찾는다.
--
-- 지금까지는 두 조건이 각각 별개의 EXISTS였다. 그래서 "고추" 행 하나와
-- "진딧물" 행 하나가 상품 안에 따로 있기만 하면 통과했고, 정작 고추에
-- 진딧물로 등록된 적이 없는 상품이 결과에 올라왔다.
--
--   데스플러스: 고추(단고추류 포함)/담배나방 + 단호박/진딧물류  → 걸림
--   아리피레스: 고추냉이/배추좀나방       + 사과/진딧물류      → 걸림
--
-- 사용자가 두 칸을 채웠다는 건 "그 작물에 그 병해충으로 쓸 수 있는 약"을
-- 찾는다는 뜻이므로, 두 값이 한 사용법 행에 함께 있어야 한다.
-- 2026-09-02 데이터 기준 고추+진딧물 검색이 797건에서 553건으로 줄어든다.
--
-- 두 칸이 모두 비었을 때를 따로 빼 둔 이유: EXISTS만 남기면 사용법이 하나도
-- 없는 상품이 조건 없는 검색에서도 사라진다.

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
      ((p_crop is null or p_crop = '') and (p_disease_weed is null or p_disease_weed = ''))
      or exists (
        select 1
        from jsonb_array_elements(candidate.product_usage) as usage_row
        where (
            p_crop is null or p_crop = '' or
            usage_row ->> 'cropName' ilike '%' || p_crop || '%'
          )
          and (
            p_disease_weed is null or p_disease_weed = '' or
            usage_row ->> 'diseaseWeedName' ilike '%' || p_disease_weed || '%'
          )
      )
    )
  order by candidate.product_code;
$$;

comment on function public.search_office_pesticide_products(text, text, text, text, text, text, text) is
  '재고상품탭 검색. 사업장의 office_product_datas 행 중 large_category가 ''농약''인 것을 static_pesticide와 조인. 작물과 병해충/잡초는 같은 사용법 행에서 함께 일치해야 하고, 나머지 조건은 채워진 것끼리 AND 결합. 사용법은 응답에 포함하지 않음(카드 클릭 시 별도 단건 조회).';

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
      ((p_crop is null or p_crop = '') and (p_disease_weed is null or p_disease_weed = ''))
      or exists (
        select 1
        from jsonb_array_elements(coalesce(s.product_usage, '[]'::jsonb)) as usage_row
        where (
            p_crop is null or p_crop = '' or
            usage_row ->> 'cropName' ilike '%' || p_crop || '%'
          )
          and (
            p_disease_weed is null or p_disease_weed = '' or
            usage_row ->> 'diseaseWeedName' ilike '%' || p_disease_weed || '%'
          )
      )
    )
  order by s.product_code;
$$;

comment on function public.search_static_pesticide(text, text, text, text, text, text) is
  '전체상품탭 검색. static_pesticide 중 product_category가 농약 용도인 행만 대상. 작물과 병해충/잡초는 같은 사용법 행에서 함께 일치해야 하고, 나머지 조건은 채워진 것끼리 AND 결합.';
