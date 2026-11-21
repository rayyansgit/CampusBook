'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import AvailabilityView from '@/components/booking/AvailabilityView';
import { supabase } from '@/lib/supabase';
import { friendlyError } from '@/lib/errors';
import type { Resource } from '@/lib/types';

// Wireframe p.4. URL: /resource/?id=<uuid>. Layout follows the sketch: back + name, photo box,
// "Building - Room - Cap N", rules, availability, Book.
function ResourceDetail() {
  const id = useSearchParams().get('id');
  const [resource, setResource] = useState<Resource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('resources').select('*').eq('id', id).maybeSingle();
      if (cancelled) return;
      if (error) setError(friendlyError(error));
      else setResource(data as Resource | null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (!id) return <p>No resource selected. <Link href="/browse/" className="underline">Back to resources</Link></p>;
  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p role="alert" className="text-red-800">{error}</p>;
  if (!resource) return <p>We could not find that resource. <Link href="/browse/" className="underline">Back to resources</Link></p>;

  const line = [resource.building, resource.location, `Cap ${resource.capacity}`].filter(Boolean).join(' - ');

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Link href="/browse/" aria-label="Back to resources" className="flex h-9 w-9 items-center justify-center rounded border border-gray-500">&lt;</Link>
        <h1 className="text-xl font-semibold">{resource.name}</h1>
      </header>

      <div className="flex aspect-[2/1] items-center justify-center border border-gray-400 bg-gray-100 text-sm text-gray-500">Photo</div>

      <p className="text-sm">{line}</p>

      {resource.rules_text && (
        <div className="rounded border border-dashed border-gray-500 p-3 text-sm">
          <h2 className="font-semibold">Rules</h2>
          <p className="mt-1 whitespace-pre-line">{resource.rules_text}</p>
        </div>
      )}

      <AvailabilityView resourceId={resource.id} resource={resource} />

      <Link href={`/book/?id=${resource.id}`} className="block rounded border border-black py-3 text-center font-medium">Book</Link>
    </div>
  );
}

export default function Page() {
  return <AppShell><Suspense fallback={<p className="text-gray-500">Loading...</p>}><ResourceDetail /></Suspense></AppShell>;
}