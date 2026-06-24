grant insert, update on public.office_page_config to authenticated;

drop policy if exists "office_page_config_insert_own_office" on public.office_page_config;
drop policy if exists "office_page_config_update_own_office" on public.office_page_config;

create policy "office_page_config_insert_own_office" on public.office_page_config
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_config.office_code
    )
  );

create policy "office_page_config_update_own_office" on public.office_page_config
  for update to authenticated
  using (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_config.office_code
    )
  )
  with check (
    exists (
      select 1
      from public.login_users
      where auth_user_id = (select auth.uid())
        and office_code = public.office_page_config.office_code
    )
  );
