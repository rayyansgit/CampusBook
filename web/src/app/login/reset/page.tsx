'use client';
// FR-ACC-03: password reset by email. Uses a 6-digit code instead of a link, so it works on the
// static GitHub Pages site (no redirect URL to configure). Needs {{ .Token }} in the
// Supabase "Reset password" email template.
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRedirectIfSignedIn } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { Alert, Button, Field, PageHeader, inputCls } from '@/components/ui';
import CodeInput from '@/components/CodeInput';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  // Verifying the code signs the user in; do not redirect before the new password is saved.
  useRedirectIfSignedIn(step === 'email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail);
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    setStep('code');
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Use a password of at least 8 characters.'); return; }
    setBusy(true);
    const { error: vErr } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code, type: 'recovery' });
    if (vErr) { setBusy(false); setError(friendlyError(vErr)); return; }
    const { error: uErr } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (uErr) { setError(friendlyError(uErr)); return; }
    router.replace('/');
  }

  return (
    <main className="mx-auto max-w-md px-6 py-6">
      <PageHeader title="Reset password" back="/login/" />

      {step === 'email' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <p className="text-sm text-gray-600">Enter your IBA email. If an account exists, we will email you a 6-digit code.</p>
          <Field label="IBA email" htmlFor="email">
            <input id="email" type="email" required autoComplete="email" placeholder="name@iba.edu.pk"
              value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy} className="w-full py-2.5">{busy ? 'Sending...' : 'Send code'}</Button>
        </form>
      ) : (
        <form onSubmit={onSave} className="space-y-4">
          <p className="text-sm text-gray-600">If <b>{cleanEmail}</b> has an account, a 6-digit code is on its way. Enter it with your new password.</p>
          <CodeInput value={code} onChange={setCode} disabled={busy} />
          <Field label="New password" htmlFor="password" hint="At least 8 characters">
            <input id="password" type="password" required minLength={8} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy || code.length !== 6} className="w-full py-2.5">{busy ? 'Saving...' : 'Save new password'}</Button>
          <div className="flex justify-between text-sm">
            <button type="button" onClick={() => sendCode()} disabled={busy} className="underline">Resend code</button>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(null); }} className="underline">Change email</button>
          </div>
        </form>
      )}
    </main>
  );
}
