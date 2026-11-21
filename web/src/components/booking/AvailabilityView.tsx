'use client';
// Availability view (wireframe p.4): week day-chips (M T W T F) + time rows showing free / booked / hold / blocked.
// Day view = one day, one row per slot. Week view = all days side by side. Data: rpc('get_availability').
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import type { AvailabilitySlot, Resource } from '@/lib/types';
import {
  CAMPUS_TZ, STATUS_LABEL, addDays, buildWeek, dateKey, rangeFor, startOfWeek,
  type Cell, type CellStatus,
} from './availability';

const DAYS_SHOWN = 5; // Mon-Fri, as in the wireframe
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Colour is never the only signal: every cell also spells its status.
const STYLE: Record<CellStatus, string> = {
  free: 'bg-green-100 border-green-700 text-green-900',
  hold: 'bg-amber-100 border-amber-700 text-amber-900',
  booked: 'bg-red-100 border-red-700 text-red-900',
  blocked: 'bg-gray-300 border-gray-700 text-gray-900',
};
const PAST_STYLE = 'bg-gray-100 border-gray-300 text-gray-400';

const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: CAMPUS_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'short' });
const label = (c: Cell) => (c.isPast ? 'Past' : STATUS_LABEL[c.status]);
const cellStyle = (c: Cell) => (c.isPast ? PAST_STYLE : STYLE[c.status]);
const keyToDate = (k: string) => new Date(`${k}T00:00:00Z`);

type Props = { resourceId: string; resource: Pick<Resource, 'open_time' | 'close_time' | 'slot_minutes' | 'advance_days'> };

export default function AvailabilityView({ resourceId, resource }: Props) {
  const todayKey = dateKey(new Date());
  const [view, setView] = useState<'day' | 'week'>('day');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dayIdx, setDayIdx] = useState(() => {
    const i = (keyToDate(todayKey).getUTCDay() + 6) % 7; // Mon = 0
    return i < DAYS_SHOWN ? i : 0;                       // weekend -> show Monday
  });
  const [ranges, setRanges] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const monday = addDays(startOfWeek(todayKey), weekOffset * 7);
  const maxOffset = Math.ceil(resource.advance_days / 7);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const { from, to } = rangeFor(monday, 7);
      const { data, error } = await supabase.rpc('get_availability', {
        p_resource: resourceId, p_from: from.toISOString(), p_to: to.toISOString(),
      });
      if (cancelled) return;
      if (error) { setError(friendlyError(error)); setRanges([]); }
      else setRanges((data ?? []) as AvailabilitySlot[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [resourceId, monday]);

  const week = useMemo(
    () => buildWeek(monday, resource, ranges).slice(0, DAYS_SHOWN),
    [monday, resource, ranges],
  );
  const day = week[dayIdx];
  const btn = 'rounded border px-3 py-1 text-sm disabled:opacity-40';

  return (
    <section aria-label="Availability">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Availability</h2>
        {view === 'day' && (
          <div className="flex gap-1" role="tablist" aria-label="Day of week">
            {week.map((d, i) => (
              <button key={d.key} role="tab" aria-selected={i === dayIdx} aria-label={dayFmt.format(keyToDate(d.key))}
                onClick={() => setDayIdx(i)}
                className={`h-8 w-8 rounded border text-sm ${i === dayIdx ? 'border-black bg-black text-white' : 'border-gray-500'}`}>
                {LETTERS[i]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <button className={btn} onClick={() => setWeekOffset(w => w - 1)} disabled={weekOffset <= 0} aria-label="Previous week">‹</button>
          <button className={btn} onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= maxOffset} aria-label="Next week">›</button>
        </div>
        <p className="text-sm text-gray-600">
          {view === 'day' && day ? dayFmt.format(keyToDate(day.key))
            : `${dayFmt.format(keyToDate(week[0].key))} – ${dayFmt.format(keyToDate(week[DAYS_SHOWN - 1].key))}`}
        </p>
        <div className="flex" role="group" aria-label="View">
          {(['day', 'week'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={`border px-3 py-1 text-sm first:rounded-l last:rounded-r ${view === v ? 'border-black bg-black text-white' : 'border-gray-500'}`}>
              {v === 'day' ? 'Day' : 'Week'}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Legend">
        {(Object.keys(STYLE) as CellStatus[]).map(s => (
          <li key={s} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-sm border ${STYLE[s]}`} />{STATUS_LABEL[s]}
          </li>
        ))}
      </ul>

      {error && <p role="alert" className="mt-3 rounded border border-red-600 p-2 text-sm text-red-800">{error}</p>}
      {loading && <p className="mt-3 text-sm text-gray-500">Loading availability...</p>}

      {!loading && !error && view === 'day' && day && (
        day.cells.length === 0
          ? <p className="mt-3 text-sm text-gray-600">Not open this day.</p>
          : <ul className="mt-3 space-y-2">
              {day.cells.map(c => (
                <li key={c.start.toISOString()} className="flex items-center gap-3">
                  <span className="w-12 text-sm tabular-nums text-gray-700">{timeFmt.format(c.start)}</span>
                  <span className={`flex-1 rounded border px-3 py-2 text-center text-sm ${cellStyle(c)}`}>{label(c)}</span>
                </li>
              ))}
            </ul>
      )}

      {!loading && !error && view === 'week' && (
        week[0].cells.length === 0
          ? <p className="mt-3 text-sm text-gray-600">Not open this week.</p>
          : <div className="mt-3 overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-center text-[11px]">
                <thead>
                  <tr>
                    <th className="w-10" />
                    {week.map((d, i) => (
                      <th key={d.key} scope="col" className="font-medium" aria-label={dayFmt.format(keyToDate(d.key))}>
                        {LETTERS[i]} {Number(d.key.slice(8))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {week[0].cells.map((c0, row) => (
                    <tr key={c0.start.toISOString()}>
                      <th scope="row" className="pr-1 text-right font-normal tabular-nums text-gray-700">{timeFmt.format(c0.start)}</th>
                      {week.map(d => {
                        const c = d.cells[row];
                        return <td key={d.key} className={`rounded border px-0.5 py-1.5 ${cellStyle(c)}`}>{label(c)}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </section>
  );
}