import { createContext, useContext } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../db/database.types.ts';

type SupabaseContextType = SupabaseClient<Database> | null;

const SupabaseContext = createContext<SupabaseContextType>(null);

export const SupabaseProvider: React.FC<{
  client: SupabaseClient<Database>;
  children: React.ReactNode;
}> = ({ client, children }) => (
  <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
);

export const useSupabase = (): SupabaseClient<Database> => {
  const client = useContext(SupabaseContext);
  if (!client) {
    throw new Error('useSupabase must be used within SupabaseProvider');
  }
  return client;
};
