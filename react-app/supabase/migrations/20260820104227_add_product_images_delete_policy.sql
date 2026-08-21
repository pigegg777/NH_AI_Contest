drop policy if exists "product_images_delete_own_office" on storage.objects;

create policy "product_images_delete_own_office" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1
      from public.login_users
      where login_users.auth_user_id = (select auth.uid())
        -- storage.objects.name must be qualified here: login_users also has
        -- its own "name" column (the employee's name), and an unqualified
        -- "name" resolves to that instead, silently breaking this check.
        and login_users.office_code = (storage.foldername(storage.objects.name))[1]
    )
  );
