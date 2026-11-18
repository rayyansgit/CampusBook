'use client';
import AppShell from '@/components/AppShell';
import Stub from '@/components/Stub';
// OWNER: Person D. Wireframe p.3. Read `resources` (+ categories). Filters: category chips, search, capacity.
export default function Page() {
  return <AppShell><Stub title="Resources" owner="D (Booking UI)" wireframe="p.3" uses="from('resources').select('*, categories(name)')" /></AppShell>;
}
