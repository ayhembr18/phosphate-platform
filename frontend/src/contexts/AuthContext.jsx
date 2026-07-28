import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mfaStatus, setMfaStatus] = useState(null); // 'needs_enroll' | 'needs_challenge' | 'verified'
  const [loading, setLoading] = useState(true);

  const evaluateMfaStatus = useCallback(async () => {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const verifiedFactors = factorsData?.totp?.filter((f) => f.status === 'verified') || [];

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (verifiedFactors.length === 0) {
      setMfaStatus('needs_enroll');
    } else if (aal?.currentLevel !== 'aal2') {
      setMfaStatus('needs_challenge');
    } else {
      setMfaStatus('verified');
    }
  }, []);

  const loadProfile = useCallback(async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', userId)
      .single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await Promise.all([loadProfile(data.session.user.id), evaluateMfaStatus()]);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        await Promise.all([loadProfile(newSession.user.id), evaluateMfaStatus()]);
      } else {
        setProfile(null);
        setMfaStatus(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile, evaluateMfaStatus]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await evaluateMfaStatus();
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setMfaStatus(null);
  }

  const value = {
    session,
    profile,
    mfaStatus,
    loading,
    isAuthenticated: !!session && mfaStatus === 'verified',
    signIn,
    signOut,
    refreshMfaStatus: evaluateMfaStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
