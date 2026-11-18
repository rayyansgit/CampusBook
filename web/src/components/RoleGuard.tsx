'use client';
// UI convenience only. Real security is Row Level Security in the database (NFR-SEC-02).
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

export default function RoleGuard({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !session) router.replace('/login/'); }, [loading, session, router]);
  if (loading || !session) return <p className="p-6 text-gray-500">Loading...</p>;
  if (roles && profile && !roles.includes(profile.role)) return <p className="p-6">You do not have access to this page.</p>;
  return <>{children}</>;
}
