-- 0001 core schema (SRS §8). Owner: Person A. Undo: rollback/20261118000001_down.sql
create extension if not exists btree_gist;

create type user_role       as enum ('student','faculty','society','admin');
create type approval_mode   as enum ('auto','approval');
create type resource_status as enum ('active','out_of_service','retired');
create type booking_status  as enum ('pending_approval','confirmed','rejected','cancelled','completed','no_show','expired');

create table allowed_domains (
  domain       text primary key,
  default_role user_role not null
);

create table app_settings (
  key   text primary key,
  value text not null
);

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null unique,
  full_name  text,
  role       user_role not null default 'student',
  society    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table categories (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  default_approval approval_mode not null default 'auto'
);

create table resources (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid not null references categories(id),
  name           text not null,
  building       text,
  location       text,
  capacity       int  not null check (capacity > 0),
  description    text,
  rules_text     text,
  status         resource_status not null default 'active',
  approval_mode  approval_mode,                 -- NULL = inherit from category
  open_time      time not null default '08:00',
  close_time     time not null default '22:00',
  min_minutes    int  not null default 30,
  max_minutes    int  not null default 180,
  slot_minutes   int  not null default 30 check (slot_minutes > 0),
  advance_days   int  not null default 14,
  buffer_minutes int  not null default 0,
  allowed_roles  user_role[] not null default '{student,faculty,society,admin}',
  created_at     timestamptz not null default now()
);

create table blackouts (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid references resources(id),
  category_id uuid references categories(id),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text,
  check (ends_at > starts_at),
  check (resource_id is not null or category_id is not null)
);

create sequence booking_ref_seq start 1;

create table bookings (
  id              uuid primary key default gen_random_uuid(),
  reference       text not null unique default ('CB-' || lpad(nextval('booking_ref_seq')::text, 5, '0')),
  resource_id     uuid not null references resources(id),
  user_id         uuid not null references profiles(id),
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  attendees       int  not null default 1 check (attendees > 0),
  purpose         text,
  status          booking_status not null,
  decided_by      uuid references profiles(id),
  decision_reason text,
  created_at      timestamptz not null default now(),
  check (end_at > start_at)
);
create index bookings_user_idx     on bookings(user_id, start_at);
create index bookings_resource_idx on bookings(resource_id, start_at);

-- BR-01 / FR-CON-01: the database itself refuses overlapping active bookings.
-- '[)' ranges => back-to-back (end == next start) is allowed (FR-CON-02).
alter table bookings add constraint bookings_no_overlap
  exclude using gist (
    resource_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending_approval','confirmed'));
