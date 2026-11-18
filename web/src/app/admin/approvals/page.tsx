'use client';
import Stub from '@/components/Stub';
// OWNER: Person E. Wireframe p.13. Table of bookings where status='pending_approval' (admin RLS sees all).
// Approve/Reject -> rpc('decide_booking', {p_booking,p_approve,p_note}). Reject requires a note.
export default function Page() {
  return <Stub title="Approval queue" owner="E (Bookings + approvals)" wireframe="p.13" uses="rpc decide_booking" />;
}
