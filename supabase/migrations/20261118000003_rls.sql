-- 0003 Row Level Security (NFR-SEC-02: permissions enforced on the SERVER).
-- Bookings have NO insert/update policy on purpose: all writes go through RPCs (0004).
alter table allowed_domains enable row level security;
alter table app_settings    enable row level security;
alter table profiles        enable row level security;
alter table categories      enable row level security;
alter table resources       enable row level security;
alter table blackouts       enable row level security;
alter table bookings        enable row level security;

-- allowed_domains: everyone may read (the register form validates against it); admin writes
create policy domains_read  on allowed_domains for select using (true);
create policy domains_admin on allowed_domains for all using (is_admin()) with check (is_admin());

create policy settings_read  on app_settings for select to authenticated using (true);
create policy settings_admin on app_settings for all using (is_admin()) with check (is_admin());

-- profiles: see your own row; admin sees/edits all. Users can NOT change their own role.
create policy profiles_self_read on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_upd on profiles for update using (is_admin()) with check (is_admin());

create policy categories_read  on categories for select to authenticated using (true);
create policy categories_admin on categories for all using (is_admin()) with check (is_admin());

create policy resources_read  on resources for select to authenticated using (true);
create policy resources_admin on resources for all using (is_admin()) with check (is_admin());

create policy blackouts_read  on blackouts for select to authenticated using (true);
create policy blackouts_admin on blackouts for all using (is_admin()) with check (is_admin());

-- bookings: read your own (admin reads all). Everyone else's slots are visible only via get_availability().
create policy bookings_read on bookings for select using (user_id = auth.uid() or is_admin());
