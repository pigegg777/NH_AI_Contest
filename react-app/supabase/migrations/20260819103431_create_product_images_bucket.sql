insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_insert_own_office" on storage.objects;

create policy "product_images_public_read" on storage.objects
  for select
  using (bucket_id = 'product-images');

create policy "product_images_insert_own_office" on storage.objects
  for insert to authenticated
  with check (
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
