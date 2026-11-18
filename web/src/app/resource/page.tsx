'use client';
import AppShell from '@/components/AppShell';
import Stub from '@/components/Stub';
// OWNER: Person D. Wireframe p.4. URL: /resource/?id=<uuid>  (read with useSearchParams inside <Suspense>).
// Availability grid via rpc('get_availability', {p_resource, p_from, p_to}).
export default function Page() {
  return <AppShell><Stub title="Resource detail + availability" owner="D (Booking UI)" wireframe="p.4" uses="rpc get_availability" /></AppShell>;
}
