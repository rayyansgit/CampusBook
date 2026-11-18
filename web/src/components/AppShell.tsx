'use client';
// Wrap every STUDENT/FACULTY/SOCIETY page in this: login guard + bottom nav + padding.
import type { ReactNode } from 'react';
import RoleGuard from './RoleGuard';
import BottomNav from './BottomNav';
export default function AppShell({ children }: { children: ReactNode }) {
  return (<RoleGuard><main className="mx-auto max-w-md p-4 pb-20">{children}</main><BottomNav /></RoleGuard>);
}
