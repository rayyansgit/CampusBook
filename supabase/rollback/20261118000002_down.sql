drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
-- is_admin() is used by RLS policies; drop 0003 first if you drop this.
drop function if exists public.is_admin();
