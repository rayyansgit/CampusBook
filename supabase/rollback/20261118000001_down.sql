-- Undo 0001. Destroys ALL data. Dev/demo projects only.
drop table if exists bookings cascade;
drop sequence if exists booking_ref_seq;
drop table if exists blackouts cascade;
drop table if exists resources cascade;
drop table if exists categories cascade;
drop table if exists profiles cascade;
drop table if exists app_settings cascade;
drop table if exists allowed_domains cascade;
drop type if exists booking_status;
drop type if exists resource_status;
drop type if exists approval_mode;
drop type if exists user_role;
