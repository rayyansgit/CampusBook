'use client';
// Create / edit a resource (FR-CAT-01, 03, 04). Retire instead of delete (FR-CAT-05, 06).
import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import type { ApprovalMode, Category, Resource, ResourceStatus, UserRole } from '@/lib/types';
import { Alert, Button, Field, inputCls, roleLabel } from '@/components/ui';

const ROLES: UserRole[] = ['student', 'faculty', 'society', 'admin'];

type Draft = {
  name: string; category_id: string; capacity: number; building: string; location: string;
  description: string; rules_text: string; open_time: string; close_time: string;
  min_minutes: number; max_minutes: number; slot_minutes: number; advance_days: number; buffer_minutes: number;
  approval_mode: ApprovalMode | null; allowed_roles: UserRole[]; status: ResourceStatus;
};

function toDraft(r: Resource | null, categories: Category[]): Draft {
  return {
    name: r?.name ?? '', category_id: r?.category_id ?? categories[0]?.id ?? '', capacity: r?.capacity ?? 1,
    building: r?.building ?? '', location: r?.location ?? '', description: r?.description ?? '', rules_text: r?.rules_text ?? '',
    open_time: (r?.open_time ?? '08:00').slice(0, 5), close_time: (r?.close_time ?? '22:00').slice(0, 5),
    min_minutes: r?.min_minutes ?? 30, max_minutes: r?.max_minutes ?? 180, slot_minutes: r?.slot_minutes ?? 30,
    advance_days: r?.advance_days ?? 14, buffer_minutes: r?.buffer_minutes ?? 0,
    approval_mode: r ? r.approval_mode : null, allowed_roles: r?.allowed_roles ?? [...ROLES], status: r?.status ?? 'active',
  };
}

function validate(d: Draft): string | null {
  if (!d.name.trim()) return 'Name is required.';
  if (!d.category_id) return 'Pick a category.';
  if (d.capacity < 1) return 'Capacity must be at least 1.';
  if (d.close_time <= d.open_time) return 'Closing time must be after opening time.';
  if (d.slot_minutes < 5) return 'Slot size must be at least 5 minutes.';
  if (d.min_minutes < d.slot_minutes || d.min_minutes % d.slot_minutes) return 'Minimum length must be a multiple of the slot size.';
  if (d.max_minutes < d.min_minutes || d.max_minutes % d.slot_minutes) return 'Maximum length must be a multiple of the slot size and not below the minimum.';
  if (d.advance_days < 0 || d.buffer_minutes < 0) return 'Advance window and buffer cannot be negative.';
  if (d.allowed_roles.length === 0) return 'Allow at least one role.';
  return null;
}

export default function ResourceForm({
  resource, categories, onSaved, onClose,
}: { resource: Resource | null; categories: Category[]; onSaved: (msg: string) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(() => toDraft(resource, categories));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setD(toDraft(resource, categories)); setError(null); }, [resource, categories]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const num = (k: keyof Draft) => (e: { target: { value: string } }) => set(k, Number(e.target.value) as never);
  const retired = resource?.status === 'retired';
  const catDefault = categories.find((c) => c.id === d.category_id)?.default_approval;

  async function save(e: FormEvent) {
    e.preventDefault();
    const problem = validate(d);
    if (problem) { setError(problem); return; }
    setError(null);
    setBusy(true);
    const row = {
      ...d, name: d.name.trim(), building: d.building.trim() || null, location: d.location.trim() || null,
      description: d.description.trim() || null, rules_text: d.rules_text.trim() || null,
    };
    const q = resource ? supabase.from('resources').update(row).eq('id', resource.id) : supabase.from('resources').insert(row);
    const { error: err } = await q;
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    onSaved(resource ? `${row.name} saved.` : `${row.name} added.`);
  }

  async function setStatus(status: ResourceStatus) {
    if (!resource) return;
    if (status === 'retired') {
      const { count } = await supabase.from('bookings').select('id', { count: 'exact', head: true })
        .eq('resource_id', resource.id).in('status', ['confirmed', 'pending_approval']).gte('end_at', new Date().toISOString());
      const extra = count ? `\n\n${count} upcoming booking(s) are NOT cancelled automatically. Contact the people affected.` : '';
      if (!window.confirm(`Retire ${resource.name}? It disappears from Browse and cannot be booked. Its history is kept.${extra}`)) return;
    }
    setBusy(true);
    const { error: err } = await supabase.from('resources').update({ status }).eq('id', resource.id);
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    onSaved(status === 'retired' ? `${resource.name} retired.` : `${resource.name} is active again.`);
  }

  return (
    <form onSubmit={save} className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{resource ? `${retired ? 'View' : 'Edit'}: ${resource.name}` : 'New resource'}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-900">&times;</button>
      </div>
      {retired && <Alert kind="info">Retired. Restore it to make it bookable again.</Alert>}

      <fieldset disabled={retired || busy} className="space-y-3">
        <Field label="Name" htmlFor="r-name"><input id="r-name" value={d.name} onChange={(e) => set('name', e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Field label="Category" htmlFor="r-cat">
            <select id="r-cat" value={d.category_id} onChange={(e) => set('category_id', e.target.value)} className={inputCls}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Cap" htmlFor="r-cap"><input id="r-cap" type="number" min={1} value={d.capacity} onChange={num('capacity')} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Building" htmlFor="r-bldg"><input id="r-bldg" value={d.building} onChange={(e) => set('building', e.target.value)} className={inputCls} /></Field>
          <Field label="Location" htmlFor="r-loc"><input id="r-loc" value={d.location} onChange={(e) => set('location', e.target.value)} className={inputCls} /></Field>
        </div>
        <Field label="Description" htmlFor="r-desc"><input id="r-desc" value={d.description} onChange={(e) => set('description', e.target.value)} className={inputCls} /></Field>
        <Field label="Rules text" htmlFor="r-rules"><textarea id="r-rules" rows={2} value={d.rules_text} onChange={(e) => set('rules_text', e.target.value)} className={inputCls} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Opens" htmlFor="r-open"><input id="r-open" type="time" step={300} value={d.open_time} onChange={(e) => set('open_time', e.target.value)} className={inputCls} /></Field>
          <Field label="Closes" htmlFor="r-close"><input id="r-close" type="time" step={300} value={d.close_time} onChange={(e) => set('close_time', e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min length (min)" htmlFor="r-min"><input id="r-min" type="number" min={5} step={5} value={d.min_minutes} onChange={num('min_minutes')} className={inputCls} /></Field>
          <Field label="Max length (min)" htmlFor="r-max"><input id="r-max" type="number" min={5} step={5} value={d.max_minutes} onChange={num('max_minutes')} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Slot (min)" htmlFor="r-slot"><input id="r-slot" type="number" min={5} step={5} value={d.slot_minutes} onChange={num('slot_minutes')} className={inputCls} /></Field>
          <Field label="Advance (days)" htmlFor="r-adv"><input id="r-adv" type="number" min={0} value={d.advance_days} onChange={num('advance_days')} className={inputCls} /></Field>
          <Field label="Buffer (min)" htmlFor="r-buf"><input id="r-buf" type="number" min={0} step={5} value={d.buffer_minutes} onChange={num('buffer_minutes')} className={inputCls} /></Field>
        </div>

        <div>
          <p className="mb-1 font-medium">Approval</p>
          <div className="inline-flex overflow-hidden rounded-md border border-gray-300">
            {([[null, `Category (${catDefault === 'approval' ? 'required' : 'auto'})`], ['auto', 'Auto'], ['approval', 'Required']] as const).map(([v, label]) => (
              <button type="button" key={label} onClick={() => set('approval_mode', v)}
                className={`border-r px-3 py-1.5 last:border-r-0 ${d.approval_mode === v ? 'bg-gray-900 text-white' : 'bg-white'}`}>{label}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1 font-medium">Who can book</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-1.5">
                <input type="checkbox" checked={d.allowed_roles.includes(r)}
                  onChange={(e) => set('allowed_roles', e.target.checked ? [...d.allowed_roles, r] : d.allowed_roles.filter((x) => x !== r))} />
                {roleLabel[r]}
              </label>
            ))}
          </div>
        </div>

        {resource && (
          <Field label="Status" htmlFor="r-status">
            <select id="r-status" value={d.status} onChange={(e) => set('status', e.target.value as ResourceStatus)} className={inputCls}>
              <option value="active">Active</option>
              <option value="out_of_service">Out of service</option>
            </select>
          </Field>
        )}
      </fieldset>

      {error && <Alert>{error}</Alert>}
      <div className="flex gap-2 pt-1">
        {!retired && <Button type="submit" disabled={busy}>{resource ? 'Save' : 'Add resource'}</Button>}
        {resource && !retired && <Button type="button" variant="danger" disabled={busy} onClick={() => setStatus('retired')}>Retire</Button>}
        {retired && <Button type="button" disabled={busy} onClick={() => setStatus('active')}>Restore</Button>}
      </div>
    </form>
  );
}
