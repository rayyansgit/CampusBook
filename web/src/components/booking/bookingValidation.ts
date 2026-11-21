// One-off booking validation (no UI). Mirrors the checks in the create_booking RPC so people get a plain
// message BEFORE sending. The database stays the real authority: it re-checks everything, and also owns
// the things we cannot know here (blackouts, someone else taking the slot, buffers).
import type { Resource, UserRole } from '@/lib/types';
import { zonedToUtc } from './availability';

export interface BookingInput { date: string; start: string; end: string; attendees: string; purpose: string }
export type BookingField = 'date' | 'start' | 'end' | 'attendees' | 'purpose' | 'form';
export type FieldErrors = Partial<Record<BookingField, string>>;
export type BookableResource = Pick<Resource,
  'status' | 'allowed_roles' | 'open_time' | 'close_time' | 'min_minutes' | 'max_minutes' | 'slot_minutes' | 'advance_days' | 'capacity'>;

const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }; // 'HH:MM[:SS]'

/** Campus-time start/end instants for a date ('YYYY-MM-DD') and two 'HH:MM' strings. */
export function toRange(date: string, start: string, end: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}/.test(start) || !/^\d{2}:\d{2}/.test(end)) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return { start: zonedToUtc(y, m, d, sh, sm), end: zonedToUtc(y, m, d, eh, em) };
}

export function validateBooking(
  input: BookingInput,
  r: BookableResource,
  ctx: { role?: UserRole; needsPurpose: boolean; now?: Date },
): { errors: FieldErrors; range?: { start: Date; end: Date } } {
  const now = ctx.now ?? new Date();
  const errors: FieldErrors = {};

  if (r.status !== 'active') errors.form = 'This resource is not available for booking right now.';
  else if (ctx.role && !r.allowed_roles.includes(ctx.role)) errors.form = 'Your account type is not allowed to book this resource.';

  if (!input.date) errors.date = 'Pick a date.';
  if (!input.start) errors.start = 'Pick a start time.';
  if (!input.end) errors.end = 'Pick an end time.';

  const range = input.date && input.start && input.end ? toRange(input.date, input.start, input.end) : null;
  if (range) {
    const sMin = toMinutes(input.start), eMin = toMinutes(input.end);
    const mins = (range.end.getTime() - range.start.getTime()) / 60000;
    if (mins <= 0) errors.end = 'The end time must be after the start time.';
    else {
      if (range.start.getTime() < now.getTime()) errors.start = 'You cannot book a time in the past.';
      else if (range.start.getTime() > now.getTime() + r.advance_days * 86400000)
        errors.date = `This is too far ahead. You can book up to ${r.advance_days} days in advance.`;

      if (sMin < toMinutes(r.open_time) || eMin > toMinutes(r.close_time))
        errors.end ??= `This resource is bookable between ${hhmm(toMinutes(r.open_time))} and ${hhmm(toMinutes(r.close_time))}.`;
      else if (sMin % r.slot_minutes !== 0 || eMin % r.slot_minutes !== 0)
        errors.end ??= `Start and end times must fall on ${r.slot_minutes}-minute boundaries.`;
      else if (mins < r.min_minutes || mins > r.max_minutes)
        errors.end ??= `A booking must be between ${r.min_minutes} and ${r.max_minutes} minutes.`;
    }
  }

  const n = Number(input.attendees);
  if (!input.attendees.trim() || !Number.isInteger(n) || n < 1) errors.attendees = 'Enter the number of attendees (at least 1).';
  else if (n > r.capacity) errors.attendees = `Too many attendees. This resource holds ${r.capacity}.`;

  if (ctx.needsPurpose && !input.purpose.trim()) errors.purpose = 'This resource needs admin approval - please describe the purpose.';

  return Object.keys(errors).length ? { errors } : { errors, range: range! };
}