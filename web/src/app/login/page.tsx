'use client';
// Wireframe p.1. FR-ACC-01 (IBA email only), FR-ACC-03 (password sign-in).
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth, useRedirectIfSignedIn } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { Alert, Button, Field, inputCls } from '@/components/ui';

export default function LoginPage() {
  useRedirectIfSignedIn();
  const { notice, clearNotice } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    clearNotice();
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    router.replace('/');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
      <div className="mt-8 flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-900 text-xl font-bold text-white">CB</div>
        <h1 className="mt-4 text-2xl font-semibold">CampusBook</h1>
        <p className="mt-1 text-sm text-gray-500">Book study spaces, rooms and courts at IBA</p>
      </div>

      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        {notice && <Alert>{notice}</Alert>}
        <Field label="IBA email" htmlFor="email">
          <input id="email" type="email" autoComplete="email" required placeholder="name@iba.edu.pk"
            value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={busy} className="w-full py-2.5">{busy ? 'Signing in...' : 'Sign in'}</Button>
        <p className="text-center">
          <Link href="/login/reset/" className="text-sm underline">Forgot password?</Link>
        </p>
      </form>

      <div className="mt-auto pt-10">
        <Link href="/register/" className="block w-full rounded-md border border-gray-300 bg-white py-2.5 text-center text-sm font-medium hover:bg-gray-50">
          Register
        </Link>
      </div>
    </main>
  );
}
