'use client';
import AppShell from '@/components/AppShell';
import Stub from '@/components/Stub';
// OWNER: Person E. Wireframe p.8. from('bookings') (RLS returns only my rows). Cancel -> rpc('cancel_booking').
// Check-in/Change/Rate/Report buttons are NOT in Sprint 1.
export default function Page() {
  return <AppShell><Stub title="My bookings" owner="E (Bookings + approvals)" wireframe="p.8" uses="from('bookings'), rpc cancel_booking" /></AppShell>;
}
