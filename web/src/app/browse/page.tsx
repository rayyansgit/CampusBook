'use client';
// Wireframe p.3. Browse + search + filter the catalog (FR-CAT-09). Retired resources are never shown.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { RESOURCE_SELECT, effectiveMode, getAvailability, getLargeCapacity, type ResourceWithCategory } from '@/lib/booking';
import { localTime, toMinutes } from '@/lib/time';
import type { Category } from '@/lib/types';
import { Alert, Empty, Loading, PageHeader, Pill, inputCls } from '@/components/ui';

type NowState = 'free' | 'busy' | 'blocked' | 'closed';
const CAPACITY_OPTIONS = [0, 2, 5, 10, 30, 100];

export default function BrowsePage() {
  const { profile } = useAuth();
  const [resources, setResources] = useState<ResourceWithCategory[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [large, setLarge] = useState(30);
  const [nowState, setNowState] = useState<Record<string, NowState>>({});
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [building, setBuilding] = useState('');
  const [minCap, setMinCap] = useState(0);

  useEffect(() => {
    (async () => {
      const [r, c, l] = await Promise.all([
        supabase.from('resources').select(RESOURCE_SELECT).neq('status', 'retired').order('name'),
        supabase.from('categories').select('*').order('name'),
        getLargeCapacity(),
      ]);
      if (r.error) { setError(friendlyError(r.error)); setResources([]); return; }
      const list = (r.data ?? []) as ResourceWithCategory[];
      setResources(list);
      setCategories((c.data ?? []) as Category[]);
      setLarge(l);

      // "Free now" badges: one small availability call per active resource.
      const now = new Date();
      const nowIso = now.toISOString();
      const soon = new Date(now.getTime() + 60000).toISOString();
      const mins = toMinutes(localTime(nowIso));
      const entries = await Promise.all(list.filter((x) => x.status === 'active').map(async (x): Promise<[string, NowState]> => {
        if (mins < toMinutes(x.open_time) || mins >= toMinutes(x.close_time)) return [x.id, 'closed'];
        try {
          const slots = await getAvailability(x.id, nowIso, soon);
          if (slots.some((s) => s.kind === 'blocked')) return [x.id, 'blocked'];
          return [x.id, slots.length ? 'busy' : 'free'];
        } catch { return [x.id, 'closed']; }
      }));
      setNowState(Object.fromEntries(entries));
    })();
  }, []);

  const buildings = useMemo(
    () => Array.from(new Set((resources ?? []).map((r) => r.building).filter(Boolean) as string[])).sort(),
    [resources],
  );

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (resources ?? []).filter((r) =>
      (cat === 'all' || r.category_id === cat)
      && (!building || r.building === building)
      && r.capacity >= minCap
      && (!term || [r.name, r.building, r.location, r.categories?.name].some((v) => v?.toLowerCase().includes(term))));
  }, [resources, q, cat, building, minCap]);

  return (
    <AppShell>
      <PageHeader title="Resources" />
      <input type="search" placeholder="Search by name, building or type" value={q} onChange={(e) => setQ(e.target.value)} className={inputCls} />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {[{ id: 'all', name: 'All' }, ...categories].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${cat === c.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'}`}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <select aria-label="Building" value={building} onChange={(e) => setBuilding(e.target.value)} className={inputCls}>
          <option value="">Any building</option>
          {buildings.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select aria-label="Minimum capacity" value={minCap} onChange={(e) => setMinCap(Number(e.target.value))} className={inputCls}>
          {CAPACITY_OPTIONS.map((n) => <option key={n} value={n}>{n ? `${n}+ people` : 'Any capacity'}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {error && <Alert>{error}</Alert>}
        {resources === null ? <Loading /> : shown.length === 0 ? <Empty>No resources match these filters.</Empty> : shown.map((r) => {
          const needsApproval = effectiveMode(r, profile, large) === 'approval';
          const state = nowState[r.id];
          const bookable = !profile || r.allowed_roles.includes(profile.role);
          return (
            <Link key={r.id} href={`/resource/?id=${r.id}`} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-400">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-gray-100 text-center text-[10px] leading-tight text-gray-500">
                {r.categories?.name ?? ''}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                <p className="truncate text-sm text-gray-500">{[r.building, r.location].filter(Boolean).join(' - ')} - Cap {r.capacity}</p>
                <div className="mt-2 flex flex-wrap justify-end gap-1.5">
                  {r.status === 'out_of_service' && <Pill tone="red">Out of service</Pill>}
                  {!bookable && <Pill>Not for your role</Pill>}
                  {r.status === 'active' && needsApproval && <Pill tone="amber">Approval</Pill>}
                  {r.status === 'active' && state === 'free' && <Pill tone="green">Free now</Pill>}
                  {r.status === 'active' && state === 'busy' && <Pill>Busy</Pill>}
                  {r.status === 'active' && state === 'blocked' && <Pill>Blocked</Pill>}
                  {r.status === 'active' && state === 'closed' && <Pill>Closed now</Pill>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
