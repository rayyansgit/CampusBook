// SRS acceptance test #3: 50 simultaneous requests for ONE slot => exactly ONE booking.
// Run ONLY against a dev/local Supabase project (it creates & deletes throwaway users):
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... npm run test:concurrency
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY'); process.exit(1);
}
const N = 50;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: res } = await admin.from('resources').select('id').eq('name', 'Carrel 12').single();
if (!res) { console.error('Seed data missing (Carrel 12)'); process.exit(1); }

// tomorrow 10:00-11:00 Pakistan time (UTC+5) => 05:00-06:00 UTC
const d = new Date(); d.setUTCDate(d.getUTCDate() + 1); d.setUTCHours(5, 0, 0, 0);
const start = d.toISOString(); const end = new Date(d.getTime() + 3600e3).toISOString();

const users = [];
for (let i = 0; i < N; i++) {
  const email = `loadtest${i}@khi.iba.edu.pk`; const password = 'LoadTest-12345';
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error && !/already/i.test(error.message)) throw error;
  users.push({ email, password, id: data?.user?.id });
}
const clients = await Promise.all(users.map(async (u) => {
  const c = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
  if (error) throw error; return c;
}));

const results = await Promise.all(clients.map((c) =>
  c.rpc('create_booking', { p_resource: res.id, p_start: start, p_end: end, p_attendees: 1, p_purpose: null })));
const ok = results.filter((r) => !r.error).length;
const taken = results.filter((r) => r.error?.message.includes('SLOT_TAKEN')).length;
console.log({ requests: N, succeeded: ok, slotTaken: taken, other: N - ok - taken });

await admin.from('bookings').delete().in('user_id', users.map((u) => u.id).filter(Boolean));
for (const u of users) if (u.id) await admin.auth.admin.deleteUser(u.id);
if (ok !== 1) { console.error('FAIL: expected exactly 1 success'); process.exit(1); }
console.log('PASS');
