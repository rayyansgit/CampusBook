'use client';
// Wireframe p.14. Resource catalog: list + search/filter, create/edit, retire (never delete: FR-CAT-06),
// categories with default approval mode (FR-CAT-02, FR-APR-01), blackouts (FR-CAT-08).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { fmtDate, localTime } from '@/lib/time';
import type { ApprovalMode, Category, Resource, ResourceStatus } from '@/lib/types';
import { Alert, Button, Empty, Loading, Pill, inputBase, inputCls } from '@/components/ui';
import ResourceForm from '@/components/admin/ResourceForm';
import CategoryForm from '@/components/admin/CategoryForm';
import BlackoutForm from '@/components/admin/BlackoutForm';

interface Blackout { id: string; resource_id: string | null; category_id: string | null; starts_at: string; ends_at: string; reason: string | null }
type Panel = { kind: 'resource'; id: string | null } | { kind: 'category' } | { kind: 'blackout' } | null;

const statusLabel: Record<ResourceStatus, [string, 'green' | 'red' | 'gray']> = {
  active: ['Active', 'green'], out_of_service: ['Out of service', 'red'], retired: ['Retired', 'gray'],
};

export default function CatalogPage() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [fCat, setFCat] = useState('');
  const [fStatus, setFStatus] = useState<'' | ResourceStatus>('');

  const load = useCallback(async () => {
    const [r, c, b] = await Promise.all([
      supabase.from('resources').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('blackouts').select('*').gte('ends_at', new Date().toISOString()).order('starts_at'),
    ]);
    const err = r.error || c.error || b.error;
    if (err) setError(friendlyError(err));
    setResources((r.data ?? []) as Resource[]);
    setCategories((c.data ?? []) as Category[]);
    setBlackouts((b.data ?? []) as Blackout[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const resById = useMemo(() => Object.fromEntries((resources ?? []).map((r) => [r.id, r])), [resources]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (resources ?? []).filter((r) =>
      (!fCat || r.category_id === fCat)
      && (fStatus ? r.status === fStatus : r.status !== 'retired')
      && (!term || [r.name, r.building, r.location].some((v) => v?.toLowerCase().includes(term))));
  }, [resources, q, fCat, fStatus]);

  const saved = async (msg: string) => { setFlash(msg); setPanel(null); await load(); };

  async function setCategoryMode(c: Category, mode: ApprovalMode) {
    setError(null);
    const { error: err } = await supabase.from('categories').update({ default_approval: mode }).eq('id', c.id);
    if (err) { setError(friendlyError(err)); return; }
    setFlash(`${c.name} now ${mode === 'approval' ? 'needs admin approval' : 'auto-confirms'} by default.`);
    await load();
  }

  async function removeBlackout(b: Blackout) {
    if (!window.confirm('Remove this blackout? The time becomes bookable again.')) return;
    const { error: err } = await supabase.from('blackouts').delete().eq('id', b.id);
    if (err) { setError(friendlyError(err)); return; }
    setFlash('Blackout removed.');
    await load();
  }

  const editing = panel?.kind === 'resource' ? (panel.id ? resById[panel.id] ?? null : null) : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="flex-1 text-2xl font-semibold">Resource catalog</h1>
        <Button variant="secondary" onClick={() => { setPanel({ kind: 'category' }); setFlash(null); }}>+ Category</Button>
        <Button variant="secondary" onClick={() => { setPanel({ kind: 'blackout' }); setFlash(null); }}>+ Blackout</Button>
        <Button onClick={() => { setPanel({ kind: 'resource', id: null }); setFlash(null); }}>+ Resource</Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className={`${inputBase} w-56`} />
        <select aria-label="Category" value={fCat} onChange={(e) => setFCat(e.target.value)} className={`${inputBase} w-auto`}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Status" value={fStatus} onChange={(e) => setFStatus(e.target.value as '' | ResourceStatus)} className={`${inputBase} w-auto`}>
          <option value="">Active + out of service</option>
          <option value="active">Active</option>
          <option value="out_of_service">Out of service</option>
          <option value="retired">Retired</option>
        </select>
      </div>

      {flash && <div className="mt-3"><Alert kind="success">{flash}</Alert></div>}
      {error && <div className="mt-3"><Alert>{error}</Alert></div>}

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[1fr_24rem]">
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
            {resources === null ? <Loading /> : shown.length === 0 ? <div className="p-4"><Empty>No resources match.</Empty></div> : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>{['Name', 'Category', 'Bldg', 'Cap', 'Approval', 'Status', ''].map((h) => <th key={h} className="border-b px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const mode = r.approval_mode ?? catById[r.category_id]?.default_approval;
                    const [label, tone] = statusLabel[r.status];
                    return (
                      <tr key={r.id} className={`border-b last:border-0 ${editing?.id === r.id ? 'bg-gray-100' : ''}`}>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2">{catById[r.category_id]?.name}</td>
                        <td className="px-3 py-2">{r.building}</td>
                        <td className="px-3 py-2">{r.capacity}</td>
                        <td className="px-3 py-2">{mode === 'approval' ? 'Required' : 'Auto'}{r.approval_mode === null && <span className="text-xs text-gray-400"> (cat.)</span>}</td>
                        <td className="px-3 py-2"><Pill tone={tone}>{label}</Pill></td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => { setPanel({ kind: 'resource', id: r.id }); setFlash(null); }} className="underline">
                            {r.status === 'retired' ? 'View' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <section className="rounded-lg border border-dashed border-gray-400 bg-white p-3 text-sm">
            <h2 className="mb-2 font-medium">Upcoming blackouts</h2>
            {blackouts.length === 0 ? <p className="text-gray-500">None.</p> : (
              <ul className="divide-y">
                {blackouts.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span>
                      <b>{b.reason || 'Blocked'}</b> - {b.resource_id ? resById[b.resource_id]?.name : `all ${catById[b.category_id ?? '']?.name ?? ''}`}
                      {' - '}{fmtDate(b.starts_at)} {localTime(b.starts_at)} to {fmtDate(b.ends_at)} {localTime(b.ends_at)}
                    </span>
                    <button onClick={() => removeBlackout(b)} className="text-xs text-red-700 underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-lg border border-gray-300 bg-white p-3 text-sm">
            <h2 className="mb-2 font-medium">Categories - default approval</h2>
            <ul className="divide-y">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span>{c.name}</span>
                  <select aria-label={`${c.name} approval`} value={c.default_approval} onChange={(e) => setCategoryMode(c, e.target.value as ApprovalMode)}
                    className={`${inputBase} w-auto py-1`}>
                    <option value="auto">Auto-confirm</option>
                    <option value="approval">Approval required</option>
                  </select>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="rounded-lg border border-gray-300 bg-white p-4">
          {panel === null && <p className="text-sm text-gray-500">Select a resource to edit it, or add something new.</p>}
          {panel?.kind === 'resource' && (
            <ResourceForm resource={editing} categories={categories} onSaved={saved} onClose={() => setPanel(null)} />
          )}
          {panel?.kind === 'category' && <CategoryForm onSaved={saved} onClose={() => setPanel(null)} />}
          {panel?.kind === 'blackout' && (
            <BlackoutForm resources={resources ?? []} categories={categories} onSaved={saved} onClose={() => setPanel(null)} />
          )}
        </aside>
      </div>
    </div>
  );
}
