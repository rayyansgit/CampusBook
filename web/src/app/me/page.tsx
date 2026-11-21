'use client';
// Profile (FR-ACC-04 role, FR-ACC-06 society) + sign out (FR-ACC-03).
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { Button, PageHeader, roleLabel } from '@/components/ui';

export default function MePage() {
  const { profile, signOut } = useAuth();
  if (!profile) return <AppShell>{null}</AppShell>;
  const initials = (profile.full_name || profile.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('');

  return (
    <AppShell>
      <PageHeader title="Me" />
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 font-semibold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="truncate font-medium">{profile.full_name || 'No name set'}</p>
            <p className="truncate text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-gray-500">Role</dt>
          <dd className="col-span-2">{roleLabel[profile.role]}</dd>
          {profile.society && (<>
            <dt className="text-gray-500">Society</dt>
            <dd className="col-span-2">{profile.society}</dd>
          </>)}
        </dl>
        {profile.role === 'student' || profile.role === 'faculty' ? (
          <p className="mt-3 text-xs text-gray-500">Organising for a society? Ask the Facilities Office to link your account to it.</p>
        ) : null}
      </section>

      {profile.role === 'admin' && (
        <Link href="/admin/approvals/" className="mt-4 block rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium hover:bg-gray-50">
          Open admin console &rsaquo;
        </Link>
      )}

      <Button variant="secondary" onClick={signOut} className="mt-6 w-full py-2.5">Sign out</Button>
    </AppShell>
  );
}
