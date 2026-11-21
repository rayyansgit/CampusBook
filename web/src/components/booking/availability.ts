// Availability logic (no UI). Turns the ranges returned by rpc('get_availability') into a grid of
// slot cells, each one of: free | blocked | hold | booked.
//
// - get_availability only returns booked / hold / blocked ranges. "free" is derived here from the
//   resource's open_time / close_time / slot_minutes.
// - Day and week boundaries use the campus timezone (the DB's app_settings 'timezone'), NOT the
//   browser's, so a student travelling sees the same grid as everyone else.
import type { AvailabilitySlot, Resource } from '@/lib/types';

export const CAMPUS_TZ = 'Asia/Karachi';

export type CellStatus = 'free' | 'blocked' | 'hold' | 'booked';

export const STATUS_LABEL: Record<CellStatus, string> = {
  free: 'Free', blocked: 'Blocked', hold: 'On hold', booked: 'Booked',
};

// If several ranges cover one cell, the most restrictive wins.
const PRIORITY: Record<CellStatus, number> = { free: 0, hold: 1, booked: 2, blocked: 3 };

export interface Cell {
  start: Date;
  end: Date;
  status: CellStatus;
  isPast: boolean; // already started - cannot be booked (DB raises IN_PAST)
}

/** Resource fields the grid needs. */
export type GridResource = Pick<Resource, 'open_time' | 'close_time' | 'slot_minutes'>;

// ---- timezone helpers ---------------------------------------------------------------------------

/** Offset (ms) of `tz` from UTC at the instant `utc`. */
function tzOffsetMs(utc: Date, tz: string): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(utc);
  const g = (t: string) => Number(p.find(x => x.type === t)!.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - utc.getTime();
}

/** The UTC instant at which the wall clock in `tz` reads y-m-d h:min. */
export function zonedToUtc(y: number, m: number, d: number, h: number, min: number, tz = CAMPUS_TZ): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const first = guess - tzOffsetMs(new Date(guess), tz);
  return new Date(guess - tzOffsetMs(new Date(first), tz)); // second pass handles DST edges
}

/** Calendar date key 'YYYY-MM-DD' of an instant, as seen in the campus timezone. */
export function dateKey(utc: Date, tz = CAMPUS_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(utc);
}

/** Add whole days to a 'YYYY-MM-DD' key (pure calendar maths, tz-independent). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun
  return addDays(key, -((dow + 6) % 7));
}

/** Start of the day `key` (00:00 campus time) as a UTC instant. */
export function dayStart(key: string, tz = CAMPUS_TZ): Date {
  const [y, m, d] = key.split('-').map(Number);
  return zonedToUtc(y, m, d, 0, 0, tz);
}

/** [from, to) UTC range covering `days` whole campus days from `key` - pass these to get_availability. */
export function rangeFor(key: string, days: number, tz = CAMPUS_TZ): { from: Date; to: Date } {
  return { from: dayStart(key, tz), to: dayStart(addDays(key, days), tz) };
}

// ---- grid building ------------------------------------------------------------------------------

const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }; // 'HH:MM[:SS]'

/** Build the cells for one campus day from the resource's hours, then paint the ranges onto them. */
export function buildDay(
  key: string,
  resource: GridResource,
  ranges: AvailabilitySlot[],
  now: Date = new Date(),
  tz = CAMPUS_TZ,
): Cell[] {
  const [y, m, d] = key.split('-').map(Number);
  const open = toMinutes(resource.open_time);
  const close = toMinutes(resource.close_time);
  const step = resource.slot_minutes;
  const parsed = ranges.map(r => ({ s: new Date(r.start_at).getTime(), e: new Date(r.end_at).getTime(), kind: r.kind }));

  const cells: Cell[] = [];
  for (let t = open; t + step <= close; t += step) {
    const start = zonedToUtc(y, m, d, Math.floor(t / 60), t % 60, tz);
    const end = zonedToUtc(y, m, d, Math.floor((t + step) / 60), (t + step) % 60, tz);
    let status: CellStatus = 'free';
    for (const r of parsed) {
      // half-open overlap, same as the DB's '[)' ranges: back-to-back bookings do not collide
      if (r.s < end.getTime() && r.e > start.getTime() && PRIORITY[r.kind] > PRIORITY[status]) status = r.kind;
    }
    cells.push({ start, end, status, isPast: start.getTime() < now.getTime() });
  }
  return cells;
}

/** Build the 7 days (Mon-Sun) of the week containing `key`. */
export function buildWeek(
  key: string, resource: GridResource, ranges: AvailabilitySlot[], now: Date = new Date(), tz = CAMPUS_TZ,
): { key: string; cells: Cell[] }[] {
  const monday = startOfWeek(key);
  return Array.from({ length: 7 }, (_, i) => {
    const k = addDays(monday, i);
    return { key: k, cells: buildDay(k, resource, ranges, now, tz) };
  });
}