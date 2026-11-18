-- Undo 0003 (opens tables up! use only to debug, then re-apply 0003).
drop policy if exists bookings_read on bookings;
drop policy if exists blackouts_admin on blackouts;  drop policy if exists blackouts_read on blackouts;
drop policy if exists resources_admin on resources;  drop policy if exists resources_read on resources;
drop policy if exists categories_admin on categories; drop policy if exists categories_read on categories;
drop policy if exists profiles_admin_upd on profiles; drop policy if exists profiles_self_read on profiles;
drop policy if exists settings_admin on app_settings; drop policy if exists settings_read on app_settings;
drop policy if exists domains_admin on allowed_domains; drop policy if exists domains_read on allowed_domains;
alter table bookings disable row level security;
alter table blackouts disable row level security;
alter table resources disable row level security;
alter table categories disable row level security;
alter table profiles disable row level security;
alter table app_settings disable row level security;
alter table allowed_domains disable row level security;
