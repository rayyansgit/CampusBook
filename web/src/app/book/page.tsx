'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import BookingForm, { type BookableResource } from '@/components/booking/BookingForm';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';

// Wireframe p.5. URL: /book/?id=<resource uuid>. One-off bookings only (recurring + quota are Sprint 3, behind flags).
function NewBooking() {
  const id = useSearchParams().get('id');
  const [resource, setResource] = useState<BookableResource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('resources').select('*, categories(default_approval)').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (error) setError(friendlyError(error));
      else setResource(data as BookableResource | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const back = id ? `/resource/?id=${id}` : '/browse/';

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href={back} aria-label="Back" className="flex h-9 w-9 items-center justify-center rounded border border-gray-500">&lt;</Link>
        <h1 className="text-xl font-semibold">New Booking</h1>
      </header>
      {!id ? <p>No resource selected. <Link href="/browse/" className="underline">Back to resources</Link></p>
        : loading ? <p className="text-gray-500">Loading...</p>
        : error ? <p role="alert" className="text-red-800">{error}</p>
        : !resource ? <p>We could not find that resource. <Link href="/browse/" className="underline">Back to resources</Link></p>
        : <BookingForm resource={resource} />}
    </div>
  );
}

export default function Page() {
  return <AppShell><Suspense fallback={<p className="text-gray-500">Loading...</p>}><NewBooking /></Suspense></AppShell>;
}