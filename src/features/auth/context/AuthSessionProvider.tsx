import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useSupabase } from '@/context/supabase.context';
import {
  AuthSessionContext,
  type AuthSessionContextValue,
} from '@/features/auth/context/auth-session.shared';

export const AuthSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const supabase = useSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setSession(null);
    setUser(null);
    setIsLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      clearSession();
      return;
    }

    setSession(data.session ?? null);
    setUser(data.session?.user ?? null);
    setIsLoading(false);
  }, [clearSession, supabase.auth]);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      if (error) {
        clearSession();
        return;
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [clearSession, supabase.auth]);

  const value = useMemo<AuthSessionContextValue>(
    () => ({
      user,
      session,
      isLoading,
      refreshSession,
      clearSession,
    }),
    [clearSession, isLoading, refreshSession, session, user],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};
