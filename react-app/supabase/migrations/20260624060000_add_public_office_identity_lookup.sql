-- Public, anon-callable projection of one office's display identity (office_name,
-- nh_name). login_users itself stays locked to "own row only" (per
-- 20260610090000_enable_supabase_auth_for_login_users.sql) -- this function is the
-- only new public surface, and it returns just the two display fields the public
-- storefront page needs (no employee_id, auth_user_id, or other internal fields).

create or replace function public.get_public_office_identity(p_office_code text)
returns table (
  office_name text,
  nh_name text
)
language sql
security definer
set search_path = ''
stable
as $$
  select office_name, nh_name
  from public.login_users
  where office_code = p_office_code
  limit 1;
$$;

grant execute on function public.get_public_office_identity(text) to anon, authenticated;
