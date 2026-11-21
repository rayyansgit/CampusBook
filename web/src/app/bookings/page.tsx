'use client';
// Wireframe p.8. My bookings (FR-BKG-07/08), cancel (FR-BKG-09), decision reason (FR-APR-08).
// Check-in / Change / Rate / Report are later sprints.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import { fmtRange } from '@/lib/time';
import type { Booking } from '@/lib/types';
import { Alert, Button, Empty, Loading, PageHeader, StatusBadge } from '@/components/ui';

type Row = Booking & { resources: { name: string; building: string | null } | null };
const LIVE = ['confirmed', 'pending_approval'];

function isUpcoming(b: Row, now: number): boolean {
  return new Date(b.end_at).getTime() >= now && (LIVE.includes(b.status) || b.status === 'rejected');
}

export default function BookingsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('bookings')
      .select('*, resources(name, building)')
      .order('start_at', { ascending: true });
    if (err) { setError(friendlyError(err)); setRows([]); return; }
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function cancel(b: Row) {
    if (!window.confirm(`Cancel ${b.resources?.name ?? 'this booking'}, ${fmtRange(b.start_at, b.end_at)}?`)) return;
    setError(null);
    setCancelling(b.id);
    const { error: err } = await supabase.rpc('cancel_booking', { p_booking: b.id });
    setCancelling(null);
    if (err) { setError(friendlyError(err)); return; }
    await load();
  }

  const now = Date.now();
  const upcoming = (rows ?? []).filter((b) => isUpcoming(b, now));
  const past = (rows ?? []).filter((b) => !isUpcoming(b, now)).reverse();
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <AppShell>
      <PageHeader title="My bookings" />
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-gray-300 text-sm">
        {(['upcoming', 'past'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`py-2 capitalize ${tab === t ? 'bg-gray-900 text-white' : 'bg-white'}`}>
            {t} {t === 'upcoming' && rows ? `(${upcoming.length})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {error && <Alert>{error}</Alert>}
        {rows === null ? <Loading /> : list.length === 0 ? (
          <Empty>
            {tab === 'upcoming' ? <>No upcoming bookings. <Link href="/browse/" className="underline">Find a space</Link></> : 'No past bookings yet.'}
          </Empty>
        ) : list.map((b) => {
          const canCancel = LIVE.includes(b.status) && new Date(b.start_at).getTime() > now;
          const dashed = b.status === 'rejected' || tab === 'past';
          return (
            <article key={b.id} className={`rounded-lg border bg-white p-3 ${dashed ? 'border-dashed border-gray-400' : 'border-gray-300'}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-medium">{b.resources?.name ?? 'Resource'}</h2>
                <StatusBadge status={b.status} />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {fmtRange(b.start_at, b.end_at)} - Ref {b.reference}
                {b.status === 'pending_approval' && ' - awaiting admin'}
              </p>
              {b.decision_reason && (b.status === 'rejected' || b.status === 'confirmed') && (
                <p className="mt-1 text-sm"><span className="text-gray-500">{b.status === 'rejected' ? 'Reason' : 'Admin note'}:</span> {b.decision_reason}</p>
              )}
              {canCancel && (
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => cancel(b)} disabled={cancelling === b.id} className="py-1.5">
                    {cancelling === b.id ? 'Cancelling...' : 'Cancel'}
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
