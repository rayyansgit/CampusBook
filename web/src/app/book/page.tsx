'use client';
// Wireframes p.5 (form), p.6 (confirmed / pending), p.7 (slot not available).
// FR-BKG-03..06, FR-APR-02 (pending holds the slot), FR-CON-03 (nearby slots). URL: /book/?id=<uuid>[&date&start&end]
// Recurring + quota line are later sprints (flags.recurring / flags.quotas). Waitlist box: flags.waitlist.
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import {
  RESOURCE_SELECT, canBook, effectiveMode, freeWindows, getAvailability, getLargeCapacity, lastBookableDate, slotStarts,
  type ResourceWithCategory, type Window,
} from '@/lib/booking';
import { addDays, fmtDate, fmtRange, fromMinutes, toISO, toMinutes, todayLocal } from '@/lib/time';
import type { Booking } from '@/lib/types';
import { Alert, Button, Field, Loading, PageHeader, inputCls } from '@/components/ui';

type Unavailable = { reason: string; nearby: Window[]; similar: { r: ResourceWithCategory; w: Window }[] };

function defaultLength(r: ResourceWithCategory): number {
  const want = Math.min(Math.max(r.min_minutes, 60), r.max_minutes);
  return Math.ceil(want / r.slot_minutes) * r.slot_minutes;
}

function BookingFlow() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const router = useRouter();
  const { profile } = useAuth();

  const [res, setRes] = useState<ResourceWithCategory | null | undefined>(undefined);
  const [large, setLarge] = useState(30);
  const [date, setDate] = useState(params.get('date') ?? todayLocal());
  const [start, setStart] = useState(params.get('start') ?? '');
  const [end, setEnd] = useState(params.get('end') ?? '');
  const [attendees, setAttendees] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Booking | null>(null);
  const [unavailable, setUnavailable] = useState<Unavailable | null>(null);

  useEffect(() => {
    setRes(undefined); setDone(null); setUnavailable(null); setError(null);
    setDate(params.get('date') ?? todayLocal());
    setStart(params.get('start') ?? '');
    setEnd(params.get('end') ?? '');
    if (!id) { setRes(null); return; }
    Promise.all([supabase.from('resources').select(RESOURCE_SELECT).eq('id', id).maybeSingle(), getLargeCapacity()])
      .then(([r, l]) => { setRes((r.data as ResourceWithCategory | null) ?? null); setLarge(l); });
  }, [id, params]);

  const close = res ? toMinutes(res.close_time) : 0;
  const startOptions = useMemo(
    () => (res ? slotStarts(res).filter((m) => m + res.min_minutes <= close).map(fromMinutes) : []),
    [res, close],
  );
  const endOptions = useMemo(() => {
    if (!res || !start) return [];
    const s = toMinutes(start);
    const out: string[] = [];
    for (let m = s + res.min_minutes; m <= Math.min(s + res.max_minutes, close); m += res.slot_minutes) out.push(fromMinutes(m));
    return out;
  }, [res, start, close]);

  // Keep start/end valid when the resource or start changes.
  useEffect(() => {
    if (!res || startOptions.length === 0) return;
    if (!start || !startOptions.includes(start)) setStart(startOptions[0]);
  }, [res, startOptions, start]);
  useEffect(() => {
    if (!res || !start || endOptions.length === 0) return;
    if (!end || !endOptions.includes(end)) {
      const pref = fromMinutes(toMinutes(start) + defaultLength(res));
      setEnd(endOptions.includes(pref) ? pref : endOptions[0]);
    }
  }, [res, start, end, endOptions]);

  if (res === undefined) return <Loading />;
  if (res === null || res.status === 'retired') {
    return (<><PageHeader title="New booking" back="/browse/" /><Alert>This resource does not exist or has been retired.</Alert></>);
  }

  const needsApproval = effectiveMode(res, profile, large) === 'approval';
  const lastDate = lastBookableDate(res);

  async function findAlternatives(reason: string) {
    if (!res) return;
    const minutes = toMinutes(end) - toMinutes(start);
    const sameDay = (await getAvailability(res.id, toISO(date, '00:00'), toISO(addDays(date, 1), '00:00')).catch(() => []));
    const nearSame = freeWindows(res, date, sameDay, minutes)
      .sort((a, b) => Math.abs(toMinutes(a.start) - toMinutes(start)) - Math.abs(toMinutes(b.start) - toMinutes(start)))
      .slice(0, 2);
    const next = addDays(date, 1);
    let nearNext: Window[] = [];
    if (next <= lastDate) {
      const nextDay = await getAvailability(res.id, toISO(next, '00:00'), toISO(addDays(next, 1), '00:00')).catch(() => []);
      nearNext = freeWindows(res, next, nextDay, minutes)
        .sort((a, b) => Math.abs(toMinutes(a.start) - toMinutes(start)) - Math.abs(toMinutes(b.start) - toMinutes(start)))
        .slice(0, 3 - nearSame.length);
    }

    const { data: others } = await supabase.from('resources').select(RESOURCE_SELECT)
      .eq('category_id', res.category_id).eq('status', 'active').neq('id', res.id).gte('capacity', attendees).limit(6);
    const similar: Unavailable['similar'] = [];
    for (const o of (others ?? []) as ResourceWithCategory[]) {
      if (!canBook(o, profile)) continue;
      if (toMinutes(start) < toMinutes(o.open_time) || toMinutes(end) > toMinutes(o.close_time)) continue;
      const busy = await getAvailability(o.id, toISO(date, start), toISO(date, end)).catch(() => null);
      if (busy && busy.length === 0) similar.push({ r: o, w: { date, start, end } });
      if (similar.length === 3) break;
    }
    setUnavailable({ reason, nearby: [...nearSame, ...nearNext], similar });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!res) return;
    setError(null);
    if (needsApproval && !purpose.trim()) { setError(friendlyError('PURPOSE_REQUIRED')); return; }
    setBusy(true);
    const { data, error: err } = await supabase.rpc('create_booking', {
      p_resource: res.id,
      p_start: toISO(date, start),
      p_end: toISO(date, end),
      p_attendees: attendees,
      p_purpose: purpose.trim() || null,
    });
    if (err) {
      if (err.message.includes('SLOT_TAKEN')) await findAlternatives('Already booked or on hold for someone else.');
      else if (err.message.includes('BLACKOUT')) await findAlternatives('This time is blocked (maintenance, exams or an event).');
      else setError(friendlyError(err));
      setBusy(false);
      return;
    }
    setBusy(false);
    setDone(data as Booking);
  }

  function pick(w: Window) {
    setDate(w.date); setStart(w.start); setEnd(w.end); setUnavailable(null); setError(null);
  }

  if (done) {
    const pending = done.status === 'pending_approval';
    return (
      <div className="flex min-h-[80vh] flex-col items-center pt-10 text-center">
        <div className={`flex h-24 w-24 items-center justify-center rounded-full border-4 text-4xl ${pending ? 'border-amber-400 text-amber-500' : 'border-green-600 text-green-600'}`}>
          {pending ? '...' : '✓'}
        </div>
        <h1 className="mt-4 text-2xl font-semibold">{pending ? 'Request sent' : 'Confirmed'}</h1>
        <p className="mt-1 text-sm text-gray-600">Ref: <b>{done.reference}</b></p>
        <div className="mt-6 w-full rounded-lg border border-gray-200 bg-white p-4 text-left text-sm">
          <p className="font-medium">{res.name}</p>
          <p className="text-gray-500">{[res.building, res.location].filter(Boolean).join(' - ')}</p>
          <p className="mt-2">{fmtRange(done.start_at, done.end_at)}</p>
          {done.attendees > 1 && <p className="text-gray-500">{done.attendees} attendees</p>}
        </div>
        {pending && (
          <div className="mt-3 w-full"><Alert kind="info">Pending approval. An admin will review your request; the slot is held for you until then. Check My bookings for the decision.</Alert></div>
        )}
        <div className="mt-auto w-full space-y-2 pt-8">
          <Link href="/bookings/" className="block rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white">My bookings</Link>
          <Link href="/browse/" className="block rounded-md border border-gray-300 bg-white py-2.5 text-sm font-medium">Done</Link>
        </div>
      </div>
    );
  }

  if (unavailable) {
    return (
      <>
        <PageHeader title="Slot not available" action={<Button variant="ghost" onClick={() => setUnavailable(null)}>Back</Button>} />
        <div className="flex gap-3 rounded-lg border border-gray-300 bg-gray-100 p-3 text-sm">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-500 font-bold">!</span>
          <div>
            <p className="font-medium">{unavailable.reason}</p>
            <p className="text-gray-600">{res.name}, {fmtDate(date)} {start}-{end}</p>
          </div>
        </div>

        <h2 className="mt-5 text-sm font-medium">Nearby free slots</h2>
        <div className="mt-2 space-y-2">
          {unavailable.nearby.length === 0 && <p className="text-sm text-gray-500">No free slot of the same length today or tomorrow.</p>}
          {unavailable.nearby.map((w) => (
            <button key={`${w.date}${w.start}`} onClick={() => pick(w)}
              className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2.5 text-left text-sm hover:border-gray-900">
              <span>{w.date === date ? 'Same day' : fmtDate(w.date)} {w.start} - {w.end}</span><span aria-hidden>&rsaquo;</span>
            </button>
          ))}
        </div>

        <h2 className="mt-5 text-sm font-medium">Similar resources free at {start}-{end}</h2>
        <div className="mt-2 space-y-2">
          {unavailable.similar.length === 0 && <p className="text-sm text-gray-500">No similar resource is free at that time.</p>}
          {unavailable.similar.map(({ r, w }) => (
            <button key={r.id} onClick={() => router.push(`/book/?id=${r.id}&date=${w.date}&start=${w.start}&end=${w.end}`)}
              className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2.5 text-left text-sm hover:border-gray-900">
              <span>{r.name} <span className="text-gray-500">(free)</span></span><span aria-hidden>&rsaquo;</span>
            </button>
          ))}
        </div>
      </>
    );
  }

  if (!canBook(res, profile)) {
    return (<><PageHeader title="New booking" back={`/resource/?id=${res.id}`} />
      <Alert>{res.status !== 'active' ? friendlyError('RESOURCE_UNAVAILABLE') : friendlyError('ROLE_NOT_ALLOWED')}</Alert></>);
  }

  return (
    <>
      <PageHeader title="New booking" back={`/resource/?id=${res.id}`} />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="rounded-md bg-gray-100 px-3 py-2.5 text-sm">
          {res.name}{res.building ? ` - ${res.building}` : ''} <span className="text-gray-500">(cap {res.capacity})</span>
        </div>
        {needsApproval && <Alert kind="info">This booking needs admin approval. Your slot is held while you wait.</Alert>}

        <Field label="Date" htmlFor="date">
          <input id="date" type="date" required min={todayLocal()} max={lastDate} value={date}
            onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start" htmlFor="start">
            <select id="start" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls}>
              {startOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="End" htmlFor="end">
            <select id="end" value={end} onChange={(e) => setEnd(e.target.value)} className={inputCls}>
              {endOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Attendees" htmlFor="attendees" hint={`Up to ${res.capacity}`}>
          <input id="attendees" type="number" min={1} max={res.capacity} required value={attendees}
            onChange={(e) => setAttendees(Math.max(1, Number(e.target.value) || 1))} className={`${inputCls} max-w-[8rem]`} />
        </Field>
        <Field label={needsApproval ? 'Purpose (required)' : 'Purpose (optional)'} htmlFor="purpose">
          <textarea id="purpose" rows={3} required={needsApproval} value={purpose} onChange={(e) => setPurpose(e.target.value)}
            placeholder={needsApproval ? 'What is the booking for? The admin sees this.' : ''} className={inputCls} />
        </Field>

        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy || !start || !end} className="w-full py-3">
          {busy ? 'Booking...' : needsApproval ? 'Send request' : 'Confirm booking'}
        </Button>
      </form>
    </>
  );
}

export default function Page() {
  return <AppShell><Suspense fallback={<Loading />}><BookingFlow /></Suspense></AppShell>;
}
