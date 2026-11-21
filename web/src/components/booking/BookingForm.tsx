'use client';
// New one-off booking (wireframe p.5-7). Validates first (bookingValidation.ts), then calls rpc('create_booking').
// Any refusal - ours or the database's - is shown as a plain-language reason (friendlyError).
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { useAuth } from '@/lib/auth';
import type { ApprovalMode, Booking, Resource } from '@/lib/types';
import { addDays, dateKey } from './availability';
import { validateBooking, type BookingField, type FieldErrors } from '../booking/bookingValidation';

export type BookableResource = Resource & { categories: { default_approval: ApprovalMode } | null };

const input = 'w-full rounded border border-gray-500 px-3 py-2';
const bad = 'border-red-700';

export default function BookingForm({ resource }: { resource: BookableResource }) {
  const { profile } = useAuth();
  const today = dateKey(new Date());
  const [f, setF] = useState({ date: '', start: '', end: '', attendees: '1', purpose: '' });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<Booking | null>(null);

  const mode = resource.approval_mode ?? resource.categories?.default_approval ?? 'auto';
  const needsPurpose = mode === 'approval';
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(p => ({ ...p, [k]: e.target.value }));
  const step = resource.slot_minutes * 60;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const { errors: errs, range } = validateBooking(f, resource, { role: profile?.role, needsPurpose });
    setErrors(errs);
    if (!range) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('create_booking', {
      p_resource: resource.id,
      p_start: range.start.toISOString(),
      p_end: range.end.toISOString(),
      p_attendees: Number(f.attendees),
      p_purpose: f.purpose.trim() || null,
    });
    setSaving(false);
    if (error) {
      setServerError(friendlyError(error));
      if (error.message.includes('PURPOSE_REQUIRED')) setErrors({ purpose: friendlyError(error) });
      return;
    }
    setDone(data as Booking);
  }

  if (done) {
    const confirmed = done.status === 'confirmed';
    return (
      <div role="status" className="space-y-3">
        <h2 className="text-lg font-semibold">{confirmed ? 'Booking confirmed' : 'Request sent for approval'}</h2>
        <p className="text-sm">
          {confirmed ? 'Your booking is confirmed.' : 'An admin will review your request. You will see the outcome in My bookings.'}
        </p>
        <p className="rounded border border-gray-500 p-3 text-sm">
          Reference <b>{done.reference}</b><br />{resource.name} - {resource.building}<br />{f.date}, {f.start} to {f.end}
        </p>
        <Link href="/bookings/" className="block rounded border border-black py-3 text-center font-medium">My bookings</Link>
      </div>
    );
  }

  const field = (k: BookingField) => ({
    'aria-invalid': !!errors[k] || undefined,
    'aria-describedby': errors[k] ? `err-${k}` : undefined,
    className: `${input} ${errors[k] ? bad : ''}`,
  });
  const err = (k: BookingField) => errors[k] && <p id={`err-${k}`} className="mt-1 text-sm text-red-800">{errors[k]}</p>;

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <p className="rounded border border-gray-500 px-3 py-2">{resource.name} - {resource.building}</p>

      <div>
        <label htmlFor="date" className="block text-sm">Date</label>
        <input id="date" type="date" value={f.date} onChange={set('date')} min={today} max={addDays(today, resource.advance_days)} {...field('date')} />
        {err('date')}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="start" className="block text-sm">Start</label>
          <input id="start" type="time" step={step} value={f.start} onChange={set('start')} {...field('start')} />
          {err('start')}
        </div>
        <div>
          <label htmlFor="end" className="block text-sm">End</label>
          <input id="end" type="time" step={step} value={f.end} onChange={set('end')} {...field('end')} />
          {err('end')}
        </div>
      </div>

      <div>
        <label htmlFor="attendees" className="block text-sm">Attendees</label>
        <input id="attendees" type="number" inputMode="numeric" min={1} max={resource.capacity} value={f.attendees} onChange={set('attendees')} {...field('attendees')} />
        {err('attendees')}
      </div>

      <div>
        <label htmlFor="purpose" className="block text-sm">Purpose (required if approval)</label>
        <textarea id="purpose" rows={2} value={f.purpose} onChange={set('purpose')} {...field('purpose')} />
        {err('purpose')}
      </div>

      {errors.form && <p role="alert" className="rounded border border-red-700 p-2 text-sm text-red-800">{errors.form}</p>}
      {serverError && <p role="alert" className="rounded border border-red-700 p-2 text-sm text-red-800">{serverError}</p>}

      <button type="submit" disabled={saving} className="block w-full rounded border border-black py-3 font-medium disabled:opacity-50">
        {saving ? 'Booking...' : 'Confirm Booking'}
      </button>
    </form>
  );
}