# Supabase Vite + TanStack Initialization

This document provides a reproducible guide to create the necessary file structure for integrating Supabase with your Vite + TanStack React project.

## Prerequisites

- Your project should use Vite, TypeScript 5, React 19, and Tailwind 4.
- Install the `@supabase/supabase-js` package.
- Ensure that `/supabase/config.toml` exists
- Ensure that a file `/src/db/database.types.ts` exists and contains the correct type definitions for your database.

IMPORTANT: Check prerequisites before perfoming actions below. If they're not met, stop and ask a user for the fix.

## File Structure and Setup

### 1. Supabase Client Initialization

Create the file `/src/db/supabase.client.ts` with the following content:

```ts
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../db/database.types.ts';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
);
```

This file initializes the Supabase client using the environment variables `SUPABASE_URL` and `SUPABASE_KEY`.

### 2. Supabase Context Setup

Create the file `/src/context/supabase.context.tsx` with the following content:

```tsx
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
```

This context provides the Supabase client to all components in your React application.

### 3. TypeScript Environment Definitions

Create the file `src/env.d.ts` with the following content:

```ts
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

This file defines the types for your environment variables in Vite (note the `VITE_` prefix required by Vite).
