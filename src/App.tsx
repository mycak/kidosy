import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { SupabaseProvider } from '@/context/supabase.context';
import { supabaseClient } from '@/db/supabase.client';
import { AuthSessionProvider } from '@/features/auth/context/AuthSessionProvider';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

export function App() {
  return (
    <SupabaseProvider client={supabaseClient}>
      <AuthSessionProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} context={{ queryClient }} />
          {import.meta.env.DEV && <ReactQueryDevtools />}
        </QueryClientProvider>
      </AuthSessionProvider>
    </SupabaseProvider>
  );
}

export default App;
