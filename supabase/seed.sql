-- Seed data (idempotent). Applied by `supabase db reset` locally, or paste into the SQL editor.
insert into allowed_domains(domain, default_role) values
  ('khi.iba.edu.pk', 'student'),
  ('iba.edu.pk',     'faculty')
on conflict (domain) do nothing;

insert into categories(name, default_approval) values
  ('Study carrel','auto'), ('Breakout room','auto'), ('Sports court','auto'),
  ('Seminar room','auto'), ('Auditorium','approval'), ('Equipment','approval')
on conflict (name) do nothing;

insert into resources (category_id, name, building, location, capacity, rules_text, approval_mode, max_minutes)
select c.id, v.name, v.building, v.location, v.capacity, v.rules, v.mode::approval_mode, v.maxm
from (values
  ('Study carrel',  'Carrel 12',     'Library',  'Floor 1', 1,   'Quiet zone. Max 3h.',          null,       180),
  ('Breakout room', 'Room B',        'Building A','Floor 2', 6,   'Whiteboard markers at desk.', null,       180),
  ('Sports court',  'Court 2',       'Sports Complex','Hall', 4,  'Non-marking shoes only.',     null,       120),
  ('Seminar room',  'Seminar 5',     'Building A','Floor 1', 40,  'Projector + AC.',             'approval', 240),
  ('Auditorium',    'Auditorium',    'Main',     'Ground', 300,   'Events need a written purpose.', null,    480),
  ('Equipment',     'Bloomberg s1',  'Library',  'Floor 2', 1,    'Max 2h per booking.',          null,       120),
  ('Equipment',     'Bloomberg s2',  'Library',  'Floor 2', 1,    'Max 2h per booking.',          null,       120)
) as v(cat, name, building, location, capacity, rules, mode, maxm)
join categories c on c.name = v.cat
where not exists (select 1 from resources r where r.name = v.name);

-- AFTER the first admin has signed up with a real @iba.edu.pk address, run (once):
--   update profiles set role = 'admin' where email = 'their.email@iba.edu.pk';
