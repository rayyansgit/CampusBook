'use client';
// Admin shell (wireframe p.13 sidebar). Admin role only (FR-ACC-08); RLS enforces it again in the database.
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RoleGuard from '@/components/RoleGuard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { APPROVALS_CHANGED } from '@/lib/events';

const later = ['Rules + quotas', 'Users', 'Complaints', 'Reports']; // Sprint 2

function PendingCount() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const load = () => supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending_approval')
      .then(({ count }) => setN(count ?? 0));
    load();
    window.addEventListener(APPROVALS_CHANGED, load);
    return () => window.removeEventListener(APPROVALS_CHANGED, load);
  }, []);
  return n ? <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{n}</span> : null;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const path = usePathname();
  const nav = [
    { href: '/admin/approvals/', label: 'Approvals', extra: <PendingCount /> },
    { href: '/admin/catalog/', label: 'Catalog', extra: null },
  ];
  return (
    <RoleGuard roles={['admin']}>
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="border-b bg-white p-3 md:w-52 md:shrink-0 md:border-b-0 md:border-r">
          <div className="mb-3">
            <div className="font-semibold">CampusBook</div>
            <div className="text-xs text-gray-500">admin - {profile?.email}</div>
          </div>
          <nav className="flex gap-2 md:flex-col">
            {nav.map((l) => (
              <Link key={l.href} href={l.href}
                className={`rounded-md border px-3 py-2 text-sm ${path?.startsWith(l.href.slice(0, -1)) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                {l.label}{l.extra}
              </Link>
            ))}
            {later.map((l) => (
              <div key={l} title="Coming in Sprint 2" className="hidden rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-400 md:block">{l}</div>
            ))}
          </nav>
          <div className="mt-4 flex gap-3 text-xs md:flex-col md:gap-1">
            <Link href="/browse/" className="underline">Student view</Link>
            <button onClick={signOut} className="text-left underline">Sign out</button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </RoleGuard>
  );
}
