alter table public.login_users
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

alter table public.login_users
  drop column if exists password;

create unique index if not exists login_users_auth_user_id_key
  on public.login_users (auth_user_id)
  where auth_user_id is not null;

revoke all on public.login_users from anon, authenticated;
grant select on public.login_users to authenticated;

drop policy if exists "allow_select" on public.login_users;
drop policy if exists "allow_insert" on public.login_users;
drop policy if exists "login_users_select_own" on public.login_users;

create policy "login_users_select_own" on public.login_users
  for select to authenticated
  using ((select auth.uid()) = auth_user_id);

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
    with reusable_login_user as (
      select id
      from public.login_users
      where employee_id = metadata_employee_id
        and auth_user_id is null
      order by id desc
      limit 1
    )
    update public.login_users as login_user
       set auth_user_id = new.id,
           nh_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'nh_name'), ''), login_user.nh_name),
           office_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'office_name'), ''), login_user.office_name),
           office_code = coalesce(nullif(trim(new.raw_user_meta_data ->> 'office_code'), ''), login_user.office_code),
           name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), login_user.name),
           employee_id = metadata_employee_id
      from reusable_login_user
     where login_user.id = reusable_login_user.id;

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

drop trigger if exists on_auth_user_created_login_users on auth.users;

create trigger on_auth_user_created_login_users
  after insert on auth.users
  for each row
  execute function public.handle_login_user_from_auth_signup();

revoke all on public.office_product_datas from anon;
grant select, insert, update on public.office_product_datas to authenticated;
grant usage, select on sequence public.office_product_datas_id_seq to authenticated;

drop policy if exists "office_product_datas_select_demo" on public.office_product_datas;
drop policy if exists "office_product_datas_insert_demo" on public.office_product_datas;
drop policy if exists "office_product_datas_update_demo" on public.office_product_datas;
drop policy if exists "office_product_datas_select_own_office" on public.office_product_datas;
drop policy if exists "office_product_datas_insert_own_office" on public.office_product_datas;
drop policy if exists "office_product_datas_update_own_office" on public.office_product_datas;

create policy "office_product_datas_select_own_office" on public.office_product_datas
  for select to authenticated
  using (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_product_datas.office_code
    )
  );

create policy "office_product_datas_insert_own_office" on public.office_product_datas
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and id = public.office_product_datas.updated_who
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
        and id = public.office_product_datas.updated_who
        and office_code = public.office_product_datas.office_code
    )
  );
