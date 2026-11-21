'use client';
// Wireframe p.13. Approval queue (FR-APR-03), approve / reject with mandatory reason (FR-APR-04, 05).
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { APPROVALS_CHANGED } from '@/lib/events';
import { fmtRange, timeAgo } from '@/lib/time';
import type { Booking, UserRole } from '@/lib/types';
import { Alert, Button, Empty, Field, Loading, inputBase, inputCls, roleLabel } from '@/components/ui';

type Row = Booking & {
  resources: { name: string; capacity: number } | null;
  requester: { full_name: string | null; email: string; role: UserRole; society: string | null } | null;
};

export default function ApprovalsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [fResource, setFResource] = useState('');
  const [fRole, setFRole] = useState('');
  const [fRequester, setFRequester] = useState('');
  const [fWhen, setFWhen] = useState<'all' | 'week' | 'today'>('all');

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('bookings')
      .select('*, resources(name, capacity), requester:profiles!bookings_user_id_fkey(full_name, email, role, society)')
      .eq('status', 'pending_approval')
      .order('start_at', { ascending: true });
    if (err) { setError(friendlyError(err)); setRows([]); return; }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resourceNames = useMemo(() => Array.from(new Set((rows ?? []).map((r) => r.resources?.name).filter(Boolean) as string[])).sort(), [rows]);

  const shown = useMemo(() => {
    const now = Date.now();
    const horizon = fWhen === 'today' ? 24 * 3600e3 : fWhen === 'week' ? 7 * 24 * 3600e3 : Infinity;
    const term = fRequester.trim().toLowerCase();
    return (rows ?? []).filter((r) =>
      (!fResource || r.resources?.name === fResource)
      && (!fRole || r.requester?.role === fRole)
      && (!term || [r.requester?.full_name, r.requester?.email, r.requester?.society].some((v) => v?.toLowerCase().includes(term)))
      && new Date(r.start_at).getTime() - now <= horizon);
  }, [rows, fResource, fRole, fRequester, fWhen]);

  const current = shown.find((r) => r.id === selected) ?? null;

  async function decide(approve: boolean) {
    if (!current) return;
    setError(null);
    if (!approve && !note.trim()) { setError(friendlyError('REASON_REQUIRED')); return; }
    setBusy(true);
    const { error: err } = await supabase.rpc('decide_booking', { p_booking: current.id, p_approve: approve, p_note: note.trim() || null });
    setBusy(false);
    if (err) { setError(friendlyError(err)); await load(); return; }
    setFlash(`${current.reference} ${approve ? 'approved' : 'rejected'}.`);
    setSelected(null);
    setNote('');
    window.dispatchEvent(new Event(APPROVALS_CHANGED));
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Approval queue</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label="Resource" value={fResource} onChange={(e) => setFResource(e.target.value)} className={`${inputBase} w-auto`}>
          <option value="">All resources</option>
          {resourceNames.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select aria-label="Date" value={fWhen} onChange={(e) => setFWhen(e.target.value as typeof fWhen)} className={`${inputBase} w-auto`}>
          <option value="all">Any date</option>
          <option value="today">Next 24 hours</option>
          <option value="week">Next 7 days</option>
        </select>
        <input aria-label="Requester" placeholder="Requester or society" value={fRequester} onChange={(e) => setFRequester(e.target.value)} className={`${inputBase} w-48`} />
        <select aria-label="Role" value={fRole} onChange={(e) => setFRole(e.target.value)} className={`${inputBase} w-auto`}>
          <option value="">All roles</option>
          {(['student', 'faculty', 'society', 'admin'] as const).map((r) => <option key={r} value={r}>{roleLabel[r]}</option>)}
        </select>
      </div>

      {flash && <div className="mt-3"><Alert kind="success">{flash}</Alert></div>}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_22rem]">
        <div className="overflow-x-auto rounded-lg border border-gray-300 bg-white">
          {rows === null ? <Loading /> : shown.length === 0 ? <div className="p-4"><Empty>No requests waiting.</Empty></div> : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>{['Ref', 'Resource', 'When', 'Requester', 'Role', 'Waiting'].map((h) => <th key={h} className="border-b px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} onClick={() => { setSelected(r.id); setNote(''); setError(null); setFlash(null); }}
                    className={`cursor-pointer border-b last:border-0 hover:bg-gray-50 ${selected === r.id ? 'bg-gray-100' : ''}`}>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.reference}</td>
                    <td className="px-3 py-2">{r.resources?.name}</td>
                    <td className="whitespace-nowrap px-3 py-2">{fmtRange(r.start_at, r.end_at)}</td>
                    <td className="px-3 py-2">{r.requester?.society || r.requester?.full_name || r.requester?.email}</td>
                    <td className="px-3 py-2">{r.requester ? roleLabel[r.requester.role] : ''}</td>
                    <td className="px-3 py-2">{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="rounded-lg border border-gray-300 bg-white p-4 text-sm">
          {!current ? <p className="text-gray-500">Select a request to review it.</p> : (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">{current.reference} - {current.resources?.name}</h2>
              <p>{fmtRange(current.start_at, current.end_at)} - {current.attendees} attendee{current.attendees === 1 ? '' : 's'}</p>
              <p>
                {current.requester?.full_name || current.requester?.email}
                {current.requester && ` - ${roleLabel[current.requester.role]}`}
                {current.requester?.society && ` (${current.requester.society})`}
              </p>
              <p className="text-gray-500">{current.requester?.email}</p>
              <div>
                <p className="font-medium">Purpose</p>
                <p className="whitespace-pre-wrap text-gray-700">{current.purpose || '-'}</p>
              </div>
              <p className="text-xs text-gray-500">Slot held - no one else can book it while this is pending.</p>
              <Field label="Note / reason (required to reject)" htmlFor="note">
                <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
              </Field>
              {error && <Alert>{error}</Alert>}
              <div className="flex gap-2">
                <Button onClick={() => decide(true)} disabled={busy}>Approve</Button>
                <Button variant="danger" onClick={() => decide(false)} disabled={busy}>Reject</Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
