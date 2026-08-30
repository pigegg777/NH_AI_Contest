-- static_fertilizers: primary key moves from the surrogate id to product_code.
--
-- The table is loaded from the outside (it has no create migration in this
-- repo), so the guard below is the only thing standing between a bad load and
-- a broken key. product_code is what every lookup already joins on — see
-- staticProductLookupService.
--
-- The constraint name assumes the default `static_fertilizers_pkey`. If the
-- table was created with a different one, adjust before applying.

do $$
declare
  offending_count bigint;
begin
  select count(*)
    into offending_count
    from public.static_fertilizers
   where product_code is null
      or btrim(product_code) = '';

  if offending_count > 0 then
    raise exception
      'static_fertilizers has % row(s) with a blank product_code; clean the load before switching the primary key',
      offending_count;
  end if;

  select count(*)
    into offending_count
    from (
      select product_code
        from public.static_fertilizers
       group by product_code
      having count(*) > 1
    ) as duplicated;

  if offending_count > 0 then
    raise exception
      'static_fertilizers has % duplicated product_code value(s); deduplicate the load before switching the primary key',
      offending_count;
  end if;
end
$$;

alter table public.static_fertilizers
  alter column product_code set not null;

alter table public.static_fertilizers
  drop constraint if exists static_fertilizers_pkey;

alter table public.static_fertilizers
  add constraint static_fertilizers_pkey primary key (product_code);

alter table public.static_fertilizers
  drop column if exists id;

do $$
begin
  if to_regclass('public.static_fertilizers_id_seq') is not null then
    revoke all on sequence public.static_fertilizers_id_seq from anon, authenticated;
  end if;
end
$$;
