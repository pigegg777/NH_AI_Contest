-- office_product_datas: primary key moves from the surrogate id to office_code.
--
-- The table has held one row per office since the 20260612 consolidation, so
-- office_code is already unique and not null. office_page_config.office_code
-- references that unique constraint, so the reference is dropped and recreated
-- against the new primary key.

do $$
declare
  offending_count bigint;
begin
  select count(*)
    into offending_count
    from (
      select office_code
        from public.office_product_datas
       group by office_code
      having count(*) > 1
    ) as duplicated;

  if offending_count > 0 then
    raise exception
      'office_product_datas has % duplicated office_code value(s); consolidate them before switching the primary key',
      offending_count;
  end if;
end
$$;

alter table public.office_page_config
  drop constraint if exists office_page_config_office_code_fkey;

alter table public.office_product_datas
  drop constraint if exists office_product_datas_pkey;

alter table public.office_product_datas
  drop constraint if exists office_product_datas_office_code_key;

alter table public.office_product_datas
  add constraint office_product_datas_pkey primary key (office_code);

alter table public.office_product_datas
  drop column if exists id;

alter table public.office_page_config
  add constraint office_page_config_office_code_fkey
  foreign key (office_code) references public.office_product_datas (office_code)
  on delete cascade;

do $$
begin
  if to_regclass('public.office_product_datas_id_seq') is not null then
    revoke all on sequence public.office_product_datas_id_seq from anon, authenticated;
  end if;
end
$$;
