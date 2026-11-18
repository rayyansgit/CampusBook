'use client';
import AppShell from '@/components/AppShell';
import Stub from '@/components/Stub';
import { useAuth } from '@/lib/auth';
// OWNER: Person B. Profile + sign out + (later) password reset.
export default function Page() {
  const { profile, signOut } = useAuth();
  return (
    <AppShell>
      <Stub title="Me" owner="B (Auth)" wireframe="p.3 nav" />
      <p className="mt-4 text-sm">{profile?.email} ({profile?.role})</p>
      <button className="mt-2 rounded border px-3 py-1" onClick={signOut}>Sign out</button>
    </AppShell>
  );
}
