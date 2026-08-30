-- login_users: primary key moves from the surrogate id to employee_id.
--
-- office_product_datas.updated_who is a bigint foreign key onto login_users.id,
-- so it has to be repointed onto employee_id in the same transaction — the old
-- key cannot be dropped while that reference stands.

-- Refuse to run on data the new key cannot represent, rather than silently
-- dropping or merging rows.
do $$
declare
  offending_count bigint;
begin
  select count(*)
    into offending_count
    from public.login_users
   where employee_id is null
      or btrim(employee_id) = '';

  if offending_count > 0 then
    raise exception
      'login_users has % row(s) with a blank employee_id; fill them in before switching the primary key',
      offending_count;
  end if;

  select count(*)
    into offending_count
    from (
      select employee_id
        from public.login_users
       group by employee_id
      having count(*) > 1
    ) as duplicated;

  if offending_count > 0 then
    raise exception
      'login_users has % duplicated employee_id value(s); merge them before switching the primary key',
      offending_count;
  end if;

  select count(*)
    into offending_count
    from public.office_product_datas as opd
   where not exists (
     select 1
       from public.login_users as lu
      where lu.id = opd.updated_who
   );

  if offending_count > 0 then
    raise exception
      'office_product_datas has % row(s) whose updated_who has no login_users row; fix them before switching the primary key',
      offending_count;
  end if;
end
$$;

-- 1. both write policies read updated_who and login_users.id, so they have
--    to go before either column can be dropped. They are recreated in step 6
--    against the new columns.
drop policy if exists "office_product_datas_insert_own_office" on public.office_product_datas;
drop policy if exists "office_product_datas_update_own_office" on public.office_product_datas;

-- 2. carry updated_who over to the employee_id it already points at.
alter table public.office_product_datas
  add column if not exists updated_who_employee_id text;

update public.office_product_datas as opd
   set updated_who_employee_id = lu.employee_id
  from public.login_users as lu
 where lu.id = opd.updated_who
   and opd.updated_who_employee_id is null;

alter table public.office_product_datas
  drop constraint if exists office_product_datas_updated_who_fkey;

alter table public.office_product_datas
  drop column if exists updated_who;

alter table public.office_product_datas
  rename column updated_who_employee_id to updated_who;

alter table public.office_product_datas
  alter column updated_who set not null;

-- 3. swap the key itself.
alter table public.login_users
  alter column employee_id set not null;

alter table public.login_users
  drop constraint if exists login_users_pkey;

alter table public.login_users
  add constraint login_users_pkey primary key (employee_id);

alter table public.login_users
  drop column if exists id;

alter table public.office_product_datas
  add constraint office_product_datas_updated_who_fkey
  foreign key (updated_who) references public.login_users (employee_id);

-- 4. the identity sequence went away with the column.
do $$
begin
  if to_regclass('public.login_users_id_seq') is not null then
    revoke all on sequence public.login_users_id_seq from anon, authenticated;
  end if;
end
$$;

-- 5. the signup trigger keyed its reuse lookup on login_users.id. employee_id
--    is now unique on its own, so the "newest row wins" tiebreak is gone: a
--    second signup for an employee_id that is already claimed now fails on the
--    primary key instead of quietly creating a duplicate profile.
create or replace function public.handle_login_user_from_auth_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata_employee_id text := nullif(trim(new.raw_user_meta_data ->> 'employee_id'), '');
begin
  if metadata_employee_id is not null then
    update public.login_users as login_user
       set auth_user_id = new.id,
           nh_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'nh_name'), ''), login_user.nh_name),
           office_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'office_name'), ''), login_user.office_name),
           office_code = coalesce(nullif(trim(new.raw_user_meta_data ->> 'office_code'), ''), login_user.office_code),
           name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), login_user.name)
     where login_user.employee_id = metadata_employee_id
       and login_user.auth_user_id is null;

    if found then
      return new;
    end if;
  end if;

  insert into public.login_users (
    auth_user_id,
    nh_name,
    office_name,
    office_code,
    name,
    employee_id
  )
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nh_name'), ''), '미지정'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'office_name'), ''), '미지정'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'office_code'), ''), '미지정'),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), '미지정'),
    coalesce(metadata_employee_id, new.id::text)
  );

  return new;
end;
$$;

-- 6. recreate the write policies, now matching login_users.employee_id
--    against updated_who.
create policy "office_product_datas_insert_own_office" on public.office_product_datas
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and employee_id = public.office_product_datas.updated_who
        and office_code = public.office_product_datas.office_code
    )
  );

create policy "office_product_datas_update_own_office" on public.office_product_datas
  for update to authenticated
  using (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_product_datas.office_code
    )
  )
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and employee_id = public.office_product_datas.updated_who
        and office_code = public.office_product_datas.office_code
    )
  );
