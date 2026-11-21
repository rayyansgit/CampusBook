'use client';
// Block a resource or a whole category for a period (FR-CAT-08). Existing bookings are NOT cancelled.
import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { fromLocalInput } from '@/lib/time';
import type { Category, Resource } from '@/lib/types';
import { Alert, Button, Field, inputCls } from '@/components/ui';

export default function BlackoutForm({
  resources, categories, onSaved, onClose,
}: { resources: Resource[]; categories: Category[]; onSaved: (msg: string) => void; onClose: () => void }) {
  const [scope, setScope] = useState<'category' | 'resource'>('resource');
  const [target, setTarget] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = scope === 'resource'
    ? resources.filter((r) => r.status !== 'retired').map((r) => ({ id: r.id, name: r.name }))
    : categories.map((c) => ({ id: c.id, name: c.name }));

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!target) { setError(`Pick a ${scope}.`); return; }
    if (!from || !to) { setError('Set both start and end.'); return; }
    const startsAt = fromLocalInput(from);
    const endsAt = fromLocalInput(to);
    if (endsAt <= startsAt) { setError(friendlyError('INVALID_RANGE')); return; }
    setBusy(true);
    const row = {
      resource_id: scope === 'resource' ? target : null,
      category_id: scope === 'category' ? target : null,
      starts_at: startsAt, ends_at: endsAt, reason: reason.trim() || null,
    };
    const { error: err } = await supabase.from('blackouts').insert(row);
    if (err) { setBusy(false); setError(friendlyError(err)); return; }

    const ids = scope === 'resource' ? [target] : resources.filter((r) => r.category_id === target).map((r) => r.id);
    const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
      .in('resource_id', ids).in('status', ['confirmed', 'pending_approval']).lt('start_at', endsAt).gt('end_at', startsAt);
    setBusy(false);
    onSaved(count ? `Blackout added. ${count} existing booking(s) overlap it and were NOT cancelled.` : 'Blackout added.');
  }

  return (
    <form onSubmit={save} className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">New blackout</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-900">&times;</button>
      </div>
      <div className="inline-flex overflow-hidden rounded-md border border-gray-300">
        {(['resource', 'category'] as const).map((s) => (
          <button type="button" key={s} onClick={() => { setScope(s); setTarget(''); }}
            className={`border-r px-3 py-1.5 capitalize last:border-r-0 ${scope === s ? 'bg-gray-900 text-white' : 'bg-white'}`}>One {s}</button>
        ))}
      </div>
      <Field label={scope === 'resource' ? 'Resource' : 'Category'} htmlFor="b-target">
        <select id="b-target" value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls}>
          <option value="">Choose...</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="From" htmlFor="b-from"><input id="b-from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></Field>
        <Field label="To" htmlFor="b-to"><input id="b-to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} /></Field>
      </div>
      <Field label="Reason" htmlFor="b-reason"><input id="b-reason" placeholder="Exams, maintenance, event..." value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} /></Field>
      <p className="text-xs text-gray-500">Times are campus time (PKT). Bookings already in this period are not cancelled; contact the people affected.</p>
      {error && <Alert>{error}</Alert>}
      <Button type="submit" disabled={busy}>Add blackout</Button>
    </form>
  );
}
