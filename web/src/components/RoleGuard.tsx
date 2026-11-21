'use client';
// UI convenience only. Real security is Row Level Security in the database (NFR-SEC-02).
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { UserRole } from '@/lib/types';
import { Button, Loading } from './ui';

export default function RoleGuard({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { session, profile, loading, signOut } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !session) router.replace('/login/'); }, [loading, session, router]);

  if (loading || !session) return <Loading />;
  if (!profile) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6 text-sm">
        <p>We could not load your profile. Please sign in again, or contact the Facilities Office if this keeps happening.</p>
        <Button variant="secondary" onClick={signOut}>Sign out</Button>
      </div>
    );
  }
  if (roles && !roles.includes(profile.role)) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6 text-sm">
        <p>You do not have access to this page.</p>
        <Link href="/" className="underline">Go to your home page</Link>
      </div>
    );
  }
  return <>{children}</>;
}
