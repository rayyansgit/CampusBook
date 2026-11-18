'use client';
import AppShell from '@/components/AppShell';
import Stub from '@/components/Stub';
// OWNER: Person D. Wireframes p.5-7. URL: /book/?id=<resource uuid>.
// rpc('create_booking', {p_resource,p_start,p_end,p_attendees,p_purpose}). On error -> friendlyError(); on SLOT_TAKEN show p.7 screen.
// Recurring toggle + quota line are Sprint 3: render only if flags.recurring / flags.quotas.
export default function Page() {
  return <AppShell><Stub title="New booking / result" owner="D (Booking UI)" wireframe="p.5-7" uses="rpc create_booking" /></AppShell>;
}
