'use client';
// Session + profile for the whole app. FR-ACC-03 (sign-in/out), FR-ACC-07 (deactivated users are signed out).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { friendlyError } from './errors';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** True until we know who the user is AND their profile has loaded. */
  loading: boolean;
  /** One-off message for the sign-in page, e.g. "your account is deactivated". */
  notice: string | null;
  clearNotice: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  session: null, profile: null, loading: true, notice: null,
  clearNotice: () => {}, signOut: async () => {}, refreshProfile: async () => {},
});
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFor, setProfileFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => { setSession(s); setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    const p = (data as Profile | null) ?? null;
    if (p && !p.is_active) {
      setNotice(friendlyError('ACCOUNT_INACTIVE'));
      await supabase.auth.signOut();
      return;
    }
    setProfile(p);
    setProfileFor(id);
  }, []);

  useEffect(() => {
    if (!uid) { setProfile(null); setProfileFor(null); return; }
    loadProfile(uid);
  }, [uid, loadProfile]);

  const value: AuthState = {
    session,
    profile,
    loading: !ready || (uid !== null && profileFor !== uid),
    notice,
    clearNotice: () => setNotice(null),
    signOut: async () => { await supabase.auth.signOut(); },
    refreshProfile: async () => { if (uid) await loadProfile(uid); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** For sign-in / register / reset pages: a signed-in user is sent to their home page. */
export function useRedirectIfSignedIn(enabled = true) {
  const { session, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (enabled && !loading && session) router.replace('/');
  }, [enabled, loading, session, router]);
}
