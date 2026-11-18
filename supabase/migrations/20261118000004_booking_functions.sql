-- 0004 Booking pipeline as database functions (RPCs). Owner: Person A.
-- The frontend NEVER inserts into bookings directly. Errors are raised as short CODES
-- (e.g. 'SLOT_TAKEN') that web/src/lib/errors.ts turns into plain-language messages.
-- Undo: rollback/20261118000004_down.sql

insert into app_settings(key, value) values ('large_space_capacity', '30'), ('timezone', 'Asia/Karachi')
on conflict (key) do nothing;

create or replace function public.create_booking(
  p_resource  uuid,
  p_start     timestamptz,
  p_end       timestamptz,
  p_attendees int  default 1,
  p_purpose   text default null
) returns bookings
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_prof   profiles;
  v_res    resources;
  v_cat    categories;
  v_mode   approval_mode;
  v_status booking_status;
  v_mins   numeric;
  v_tz     text := coalesce((select value from app_settings where key = 'timezone'), 'Asia/Karachi');
  v_large  int  := coalesce((select value from app_settings where key = 'large_space_capacity')::int, 30);
  v_row    bookings;
begin
  if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_prof from profiles where id = v_uid and is_active;
  if not found then raise exception 'ACCOUNT_INACTIVE'; end if;

  select * into v_res from resources where id = p_resource;
  if not found or v_res.status <> 'active' then raise exception 'RESOURCE_UNAVAILABLE'; end if;
  select * into v_cat from categories where id = v_res.category_id;

  if not (v_prof.role = any (v_res.allowed_roles)) then raise exception 'ROLE_NOT_ALLOWED'; end if;
  if p_end <= p_start                               then raise exception 'INVALID_RANGE'; end if;
  if p_start < now()                                then raise exception 'IN_PAST'; end if;
  if p_start > now() + make_interval(days => v_res.advance_days) then raise exception 'BEYOND_ADVANCE_WINDOW'; end if;

  v_mins := extract(epoch from (p_end - p_start)) / 60;
  if v_mins < v_res.min_minutes or v_mins > v_res.max_minutes then raise exception 'DURATION_LIMITS'; end if;
  if (extract(epoch from p_start)::bigint % (v_res.slot_minutes * 60)) <> 0
     or (extract(epoch from p_end)::bigint % (v_res.slot_minutes * 60)) <> 0 then
    raise exception 'SLOT_ALIGNMENT';
  end if;

  if (p_start at time zone v_tz)::date <> (p_end at time zone v_tz)::date
     or (p_start at time zone v_tz)::time < v_res.open_time
     or (p_end   at time zone v_tz)::time > v_res.close_time then
    raise exception 'OUTSIDE_HOURS';
  end if;

  if p_attendees > v_res.capacity then raise exception 'OVER_CAPACITY'; end if;

  if exists (
    select 1 from blackouts b
    where (b.resource_id = v_res.id or b.category_id = v_res.category_id)
      and tstzrange(b.starts_at, b.ends_at) && tstzrange(p_start, p_end)
  ) then raise exception 'BLACKOUT'; end if;

  -- approval decision (FR-APR-01, FR-APR-06)
  v_mode := coalesce(v_res.approval_mode, v_cat.default_approval);
  if v_prof.role = 'society' and v_res.capacity > v_large then v_mode := 'approval'; end if;
  if v_mode = 'approval' and nullif(btrim(coalesce(p_purpose, '')), '') is null then
    raise exception 'PURPOSE_REQUIRED';
  end if;
  v_status := (case when v_mode = 'approval' then 'pending_approval' else 'confirmed' end)::booking_status;

  -- buffer between bookings (friendly check; the exclusion constraint is the hard backstop)
  if v_res.buffer_minutes > 0 and exists (
    select 1 from bookings x
    where x.resource_id = v_res.id and x.status in ('pending_approval','confirmed')
      and tstzrange(x.start_at, x.end_at) &&
          tstzrange(p_start - make_interval(mins => v_res.buffer_minutes),
                    p_end   + make_interval(mins => v_res.buffer_minutes))
  ) then raise exception 'SLOT_TAKEN'; end if;

  begin
    insert into bookings (resource_id, user_id, start_at, end_at, attendees, purpose, status)
    values (v_res.id, v_uid, p_start, p_end, greatest(p_attendees, 1), p_purpose, v_status)
    returning * into v_row;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN';   -- BR-01: lost the race, nothing half-written
  end;

  return v_row;
end $$;

create or replace function public.cancel_booking(p_booking uuid) returns bookings
language plpgsql security definer set search_path = public as $$
declare v_row bookings;
begin
  select * into v_row from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_row.user_id <> auth.uid() and not is_admin() then raise exception 'FORBIDDEN'; end if;
  if v_row.status not in ('pending_approval','confirmed') then raise exception 'NOT_CANCELLABLE'; end if;
  if v_row.start_at <= now() and not is_admin() then raise exception 'ALREADY_STARTED'; end if;
  update bookings set status = 'cancelled' where id = p_booking returning * into v_row;
  return v_row;
end $$;

create or replace function public.decide_booking(p_booking uuid, p_approve boolean, p_note text default null)
returns bookings
language plpgsql security definer set search_path = public as $$
declare v_row bookings;
begin
  if not is_admin() then raise exception 'FORBIDDEN'; end if;
  select * into v_row from bookings where id = p_booking for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_row.status <> 'pending_approval' then raise exception 'NOT_PENDING'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note, '')), '') is null then raise exception 'REASON_REQUIRED'; end if;
  update bookings
     set status = (case when p_approve then 'confirmed' else 'rejected' end)::booking_status,
         decided_by = auth.uid(), decision_reason = p_note
   where id = p_booking returning * into v_row;
  return v_row;
end $$;

-- Availability grid: other people's slots WITHOUT who booked them (FR-BKG-01).
create or replace function public.get_availability(p_resource uuid, p_from timestamptz, p_to timestamptz)
returns table (start_at timestamptz, end_at timestamptz, kind text)
language sql stable security definer set search_path = public as $$
  select b.start_at, b.end_at,
         case b.status when 'pending_approval' then 'hold' else 'booked' end
    from bookings b
   where b.resource_id = p_resource and b.status in ('pending_approval','confirmed')
     and b.start_at < p_to and b.end_at > p_from
  union all
  select greatest(k.starts_at, p_from), least(k.ends_at, p_to), 'blocked'
    from blackouts k join resources r on r.id = p_resource
   where (k.resource_id = r.id or k.category_id = r.category_id)
     and k.starts_at < p_to and k.ends_at > p_from;
$$;

revoke all on function create_booking, cancel_booking, decide_booking, get_availability from public, anon;
grant execute on function create_booking, cancel_booking, decide_booking, get_availability to authenticated;
