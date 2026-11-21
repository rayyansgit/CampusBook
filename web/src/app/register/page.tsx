'use client';
// Wireframe p.2. FR-ACC-01 (IBA domains only), FR-ACC-02 (verify email with a 6-digit code),
// FR-ACC-05 (role comes from the domain rule in the database, never from this form).
// The database trigger refuses non-IBA domains too; the check here only gives a faster, clearer message.
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRedirectIfSignedIn } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { Alert, Button, Field, PageHeader, inputCls } from '@/components/ui';
import CodeInput from '@/components/CodeInput';

const RESEND_SECONDS = 60;

export default function RegisterPage() {
  useRedirectIfSignedIn();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    supabase.from('allowed_domains').select('domain').then(({ data }) => {
      setDomains((data ?? []).map((d: { domain: string }) => d.domain.toLowerCase()));
    });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const cleanEmail = email.trim().toLowerCase();

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const domain = cleanEmail.split('@')[1] ?? '';
    if (domains.length > 0 && !domains.includes(domain)) {
      setError(`${friendlyError('DOMAIN_NOT_ALLOWED')} Allowed: ${domains.map((d) => '@' + d).join(', ')}`);
      return;
    }
    if (password.length < 8) { setError('Use a password of at least 8 characters.'); return; }

    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: { full_name: name.trim() } },
    });
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    // Supabase hides "already registered" behind an empty identities list.
    if (data.user && data.user.identities?.length === 0) { setError(friendlyError({ code: 'user_already_exists' })); return; }
    if (data.session) { router.replace('/'); return; } // email confirmation switched off in this project
    setStep('verify');
    setCooldown(RESEND_SECONDS);
    setInfo(`We sent a 6-digit code to ${cleanEmail}. It can take a minute to arrive; check spam too.`);
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.verifyOtp({ email: cleanEmail, token: code, type: 'signup' });
    setBusy(false);
    if (err) { setError(friendlyError(err)); return; }
    router.replace('/');
  }

  async function onResend() {
    setError(null);
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
    if (err) { setError(friendlyError(err)); return; }
    setCooldown(RESEND_SECONDS);
    setInfo(`A new code is on its way to ${cleanEmail}.`);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-6">
      <PageHeader title="Register" back="/login/" />

      <form onSubmit={onCreate} className="space-y-4">
        <Field label="Name" htmlFor="name">
          <input id="name" required autoComplete="name" disabled={step === 'verify'}
            value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="IBA email" htmlFor="email" hint={domains.length ? `Only ${domains.map((d) => '@' + d).join(' or ')} addresses` : undefined}>
          <input id="email" type="email" required autoComplete="email" placeholder="name@khi.iba.edu.pk" disabled={step === 'verify'}
            value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters">
          <input id="password" type="password" required minLength={8} autoComplete="new-password" disabled={step === 'verify'}
            value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        </Field>
        {step === 'form' && error && <Alert>{error}</Alert>}
        {step === 'form' && (
          <Button type="submit" disabled={busy} className="w-full py-2.5">{busy ? 'Creating account...' : 'Create account'}</Button>
        )}
      </form>

      {step === 'verify' && (
        <form onSubmit={onVerify} className="mt-6 space-y-4 rounded-lg border border-dashed border-gray-400 p-4">
          <h2 className="font-medium">Verify email</h2>
          {info && <p className="text-sm text-gray-600">{info}</p>}
          <CodeInput value={code} onChange={setCode} disabled={busy} />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" disabled={busy || code.length !== 6} className="w-full py-2.5">{busy ? 'Verifying...' : 'Verify'}</Button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={onResend} disabled={cooldown > 0} className="underline disabled:text-gray-400 disabled:no-underline">
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </button>
            <button type="button" onClick={() => { setStep('form'); setCode(''); setError(null); }} className="underline">
              Change email
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm">
        Already have an account? <Link href="/login/" className="underline">Sign in</Link>
      </p>
    </main>
  );
}
