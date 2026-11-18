'use client';
// Admin shell (wireframe p.13 sidebar). Provided by the foundation so C and E are never blocked on each other.
import Link from 'next/link';
import type { ReactNode } from 'react';
import RoleGuard from '@/components/RoleGuard';
import { useAuth } from '@/lib/auth';

const live = [{ href: '/admin/approvals/', label: 'Approvals' }, { href: '/admin/catalog/', label: 'Catalog' }];
const later = ['Rules + quotas', 'Users', 'Complaints', 'Reports']; // Sprint 2 / 3

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  return (
    <RoleGuard roles={['admin']}>
      <div className="flex min-h-screen">
        <aside className="w-48 border-r bg-white p-3 space-y-2">
          <div className="font-bold">CampusBook <span className="text-xs font-normal">admin</span></div>
          {live.map((l) => (<Link key={l.href} href={l.href} className="block rounded border p-2 text-sm">{l.label}</Link>))}
          {later.map((l) => (<div key={l} className="rounded border border-dashed p-2 text-sm text-gray-400">{l}</div>))}
          <button onClick={signOut} className="text-xs underline">Sign out</button>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </RoleGuard>
  );
}
