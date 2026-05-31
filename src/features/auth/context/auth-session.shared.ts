import { createContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';

export type AuthSessionContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  clearSession: () => void;
};

export const AuthSessionContext = createContext<AuthSessionContextValue | null>(
  null,
);
