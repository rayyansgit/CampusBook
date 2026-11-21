// Booking helpers shared by Browse, Resource detail and the Booking form.
// The database (create_booking) is the authority; these only predict what it will say.
import { supabase } from './supabase';
import { addDays, fromMinutes, toISO, toMinutes, todayLocal } from './time';
import type { ApprovalMode, AvailabilitySlot, Category, Profile, Resource } from './types';

export type ResourceWithCategory = Resource & { categories: Category | null };

export const RESOURCE_SELECT = '*, categories(*)';

/** Mirrors create_booking: resource setting, else category default; society + large space always needs approval (FR-APR-06). */
export function effectiveMode(r: ResourceWithCategory, profile: Profile | null, largeCapacity: number): ApprovalMode {
  const mode = r.approval_mode ?? r.categories?.default_approval ?? 'auto';
  if (profile?.role === 'society' && r.capacity > largeCapacity) return 'approval';
  return mode;
}

export async function getLargeCapacity(): Promise<number> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'large_space_capacity').maybeSingle();
  return Number((data as { value: string } | null)?.value ?? 30);
}

export async function getAvailability(resourceId: string, fromIso: string, toIso: string): Promise<AvailabilitySlot[]> {
  const { data, error } = await supabase.rpc('get_availability', { p_resource: resourceId, p_from: fromIso, p_to: toIso });
  if (error) throw error;
  return (data ?? []) as AvailabilitySlot[];
}

/** Slot start times (minutes after midnight) for one day: open, open+slot, ... up to close. */
export function slotStarts(r: Resource): number[] {
  const open = toMinutes(r.open_time);
  const close = toMinutes(r.close_time);
  const out: number[] = [];
  for (let m = open; m + r.slot_minutes <= close; m += r.slot_minutes) out.push(m);
  return out;
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Last day a resource may be booked on, from its advance window. */
export function lastBookableDate(r: Resource): string {
  return addDays(todayLocal(), r.advance_days);
}

export interface Window { date: string; start: string; end: string }

/**
 * Free windows of `minutes` length on `date`, given that day's availability.
 * Respects opening hours, the buffer between bookings and "not in the past".
 */
export function freeWindows(r: Resource, date: string, busy: AvailabilitySlot[], minutes: number): Window[] {
  const now = Date.now();
  const buffer = r.buffer_minutes * 60000;
  const close = toMinutes(r.close_time);
  const taken = busy.map((b) => ({
    s: new Date(b.start_at).getTime() - (b.kind === 'blocked' ? 0 : buffer),
    e: new Date(b.end_at).getTime() + (b.kind === 'blocked' ? 0 : buffer),
  }));
  const out: Window[] = [];
  for (const m of slotStarts(r)) {
    if (m + minutes > close) break;
    const s = new Date(toISO(date, fromMinutes(m))).getTime();
    const e = s + minutes * 60000;
    if (s < now) continue;
    if (taken.some((t) => overlaps(s, e, t.s, t.e))) continue;
    out.push({ date, start: fromMinutes(m), end: fromMinutes(m + minutes) });
  }
  return out;
}

export function canBook(r: Resource, profile: Profile | null): boolean {
  return r.status === 'active' && !!profile && r.allowed_roles.includes(profile.role);
}
