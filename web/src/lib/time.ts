// Campus time is Asia/Karachi (UTC+05:00, no daylight saving). Every date the user picks
// or sees is in campus time, whatever the device clock is set to.
export const TZ = 'Asia/Karachi';
const OFFSET = '+05:00';

/** 'YYYY-MM-DD' + 'HH:mm' in campus time -> ISO timestamp for the database. */
export function toISO(date: string, time: string): string {
  return new Date(`${date}T${time}:00${OFFSET}`).toISOString();
}

/** Today's date in campus time as 'YYYY-MM-DD'. */
export function todayLocal(): string {
  return localDate(new Date().toISOString());
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function localDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
}

export function localTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
    .format(new Date(iso));
}

export function fmtDate(isoOrDate: string): string {
  const iso = isoOrDate.length === 10 ? `${isoOrDate}T12:00:00${OFFSET}` : isoOrDate;
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(iso));
}

export function fmtRange(startIso: string, endIso: string): string {
  return `${fmtDate(startIso)}, ${localTime(startIso)} - ${localTime(endIso)}`;
}

/** '08:00' or '08:00:00' -> minutes after midnight. */
export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function fromMinutes(mins: number): string {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

/** Short elapsed time since an ISO timestamp: '12m', '5h', '2d'. */
export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h`;
  return `${Math.floor(mins / (60 * 24))}d`;
}

/** 'YYYY-MM-DDTHH:mm' from an <input type="datetime-local">, read as campus time. */
export function fromLocalInput(value: string): string {
  return new Date(`${value}:00${OFFSET}`).toISOString();
}
