drop function if exists public.get_availability(uuid, timestamptz, timestamptz);
drop function if exists public.decide_booking(uuid, boolean, text);
drop function if exists public.cancel_booking(uuid);
drop function if exists public.create_booking(uuid, timestamptz, timestamptz, int, text);
delete from app_settings where key in ('large_space_capacity','timezone');
