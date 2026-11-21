'use client';
// Wireframe p.4. Resource detail + day availability grid (FR-BKG-01). URL: /resource/?id=<uuid>
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import {
  RESOURCE_SELECT, canBook, effectiveMode, getAvailability, getLargeCapacity, lastBookableDate, overlaps, slotStarts,
  type ResourceWithCategory,
} from '@/lib/booking';
import { addDays, fmtDate, fromMinutes, toISO, todayLocal } from '@/lib/time';
import type { AvailabilitySlot } from '@/lib/types';
import { Alert, Loading, PageHeader, Pill } from '@/components/ui';

type Cell = 'free' | 'booked' | 'hold' | 'blocked' | 'past';
const cellCls: Record<Cell, string> = {
  free: 'border-gray-300 bg-white hover:border-gray-900 cursor-pointer',
  booked: 'border-gray-700 bg-gray-700 text-white',
  hold: 'border-gray-400 bg-[repeating-linear-gradient(45deg,#e5e7eb_0,#e5e7eb_6px,#fff_6px,#fff_12px)] text-gray-700',
  blocked: 'border-gray-300 bg-gray-200 text-gray-600',
  past: 'border-gray-200 bg-gray-50 text-gray-400',
};

function ResourceDetail() {
  const id = useSearchParams().get('id') ?? '';
  const { profile } = useAuth();
  const [res, setRes] = useState<ResourceWithCategory | null | undefined>(undefined);
  const [large, setLarge] = useState(30);
  const [day, setDay] = useState(todayLocal());
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setRes(null); return; }
    Promise.all([supabase.from('resources').select(RESOURCE_SELECT).eq('id', id).maybeSingle(), getLargeCapacity()])
      .then(([r, l]) => { setRes((r.data as ResourceWithCategory | null) ?? null); setLarge(l); });
  }, [id]);

  const loadDay = useCallback(async () => {
    if (!res) return;
    setSlots(null);
    try {
      setSlots(await getAvailability(res.id, toISO(day, res.open_time.slice(0, 5)), toISO(day, res.close_time.slice(0, 5))));
    } catch (e) { setError(friendlyError(e)); setSlots([]); }
  }, [res, day]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const days = useMemo(() => {
    if (!res) return [];
    const last = lastBookableDate(res);
    return Array.from({ length: 7 }, (_, i) => addDays(todayLocal(), i)).filter((d) => d <= last);
  }, [res]);

  if (res === undefined) return <Loading />;
  if (res === null || res.status === 'retired') {
    return (<><PageHeader title="Not found" back="/browse/" /><Alert>This resource does not exist or has been retired.</Alert></>);
  }

  const bookable = canBook(res, profile);
  const needsApproval = effectiveMode(res, profile, large) === 'approval';
  const now = Date.now();

  const rows = slotStarts(res).map((m) => {
    const s = new Date(toISO(day, fromMinutes(m))).getTime();
    const e = s + res.slot_minutes * 60000;
    const hit = (slots ?? []).filter((b) => overlaps(s, e, new Date(b.start_at).getTime(), new Date(b.end_at).getTime()));
    let cell: Cell = 'free';
    if (hit.some((b) => b.kind === 'blocked')) cell = 'blocked';
    else if (hit.some((b) => b.kind === 'booked')) cell = 'booked';
    else if (hit.some((b) => b.kind === 'hold')) cell = 'hold';
    else if (s < now) cell = 'past';
    return { time: fromMinutes(m), cell };
  });

  return (
    <>
      <PageHeader title={res.name} back="/browse/" />
      <div className="flex h-28 items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">{res.categories?.name}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="flex-1">{[res.building, res.location].filter(Boolean).join(' - ')} - Cap {res.capacity}</span>
        {needsApproval && <Pill tone="amber">Needs approval</Pill>}
      </div>

      {res.status === 'out_of_service' && <div className="mt-3"><Alert>This resource is out of service and cannot be booked right now.</Alert></div>}
      {res.status === 'active' && !bookable && <div className="mt-3"><Alert kind="info">Your account type cannot book this resource.</Alert></div>}

      {(res.rules_text || res.description) && (
        <section className="mt-3 rounded-lg border border-dashed border-gray-400 p-3 text-sm">
          <h2 className="mb-1 font-medium">Rules</h2>
          {res.description && <p className="text-gray-700">{res.description}</p>}
          {res.rules_text && <p className="text-gray-700">{res.rules_text}</p>}
          <p className="mt-1 text-xs text-gray-500">
            Open {res.open_time.slice(0, 5)}-{res.close_time.slice(0, 5)} - {res.min_minutes}-{res.max_minutes} min per booking - book up to {res.advance_days} days ahead
          </p>
        </section>
      )}

      <div className="mt-4 flex items-center justify-between gap-2">
        <h2 className="font-medium">Availability</h2>
        <div className="flex gap-1 overflow-x-auto">
          {days.map((d) => (
            <button key={d} onClick={() => setDay(d)}
              className={`w-11 shrink-0 rounded-md border py-1 text-center text-xs ${d === day ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'}`}>
              <span className="block">{fmtDate(d).split(' ')[0]}</span>
              <span className="block font-semibold">{Number(d.slice(8))}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500">{fmtDate(day)}{bookable ? ' - tap a free slot to book it' : ''}</p>

      {error && <div className="mt-2"><Alert>{error}</Alert></div>}
      {slots === null ? <Loading /> : (
        <ol className="mt-2 space-y-1.5">
          {rows.map((r) => {
            const content = <span className="block py-1.5 text-center text-xs capitalize">{r.cell}</span>;
            return (
              <li key={r.time} className="flex items-center gap-3">
                <span className="w-11 text-xs text-gray-500">{r.time}</span>
                {r.cell === 'free' && bookable ? (
                  <Link href={`/book/?id=${res.id}&date=${day}&start=${r.time}`} className={`flex-1 rounded border ${cellCls.free}`}>{content}</Link>
                ) : (
                  <div className={`flex-1 rounded border ${cellCls[r.cell]}`}>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
        {(['free', 'booked', 'hold', 'blocked'] as Cell[]).map((c) => (
          <span key={c} className="flex items-center gap-1"><span className={`inline-block h-3 w-4 rounded-sm border ${cellCls[c]}`} />{c}</span>
        ))}
      </div>

      {bookable && (
        <Link href={`/book/?id=${res.id}&date=${day}`} className="mt-5 block rounded-md bg-gray-900 py-3 text-center text-sm font-medium text-white hover:bg-gray-800">
          Book
        </Link>
      )}
    </>
  );
}

export default function Page() {
  return <AppShell><Suspense fallback={<Loading />}><ResourceDetail /></Suspense></AppShell>;
}
