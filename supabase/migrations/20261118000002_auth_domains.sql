-- 0002 IBA-domain restriction + profile creation (FR-ACC-01, 04, 05).
-- Signup with a non-allowed domain is REFUSED by the database.
-- Undo: rollback/20261118000002_down.sql  (then rely on the client-side check only)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  dom text := lower(split_part(new.email, '@', 2));
  r   user_role;
begin
  select default_role into r from allowed_domains where domain = dom;
  if r is null then
    raise exception 'DOMAIN_NOT_ALLOWED';
  end if;
  insert into profiles (id, email, full_name, role)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name', r);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by RLS + RPCs
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and is_active);
$$;
