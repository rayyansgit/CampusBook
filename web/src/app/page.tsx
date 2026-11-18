'use client';
// Landing: sends people where they belong + shows if the app is wired to Supabase (handy during setup).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';

export default function Home() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/login/');
    else if (profile) router.replace(profile.role === 'admin' ? '/admin/approvals/' : '/browse/');
  }, [loading, session, profile, router]);
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">IBA CampusBook</h1>
      <p className="text-sm mt-2">Supabase connected: <b>{isConfigured ? 'yes' : 'NO - check .env.local'}</b></p>
    </main>
  );
}
