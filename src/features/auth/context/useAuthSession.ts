import { useContext } from 'react';
import { AuthSessionContext } from '@/features/auth/context/auth-session.shared';
import type { AuthSessionContextValue } from '@/features/auth/context/auth-session.shared';

export function useAuthSession(): AuthSessionContextValue {
  const contextValue = useContext(AuthSessionContext);

  if (!contextValue) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }

  return contextValue;
}
