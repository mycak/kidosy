import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import type { QueryClient } from '@tanstack/react-query';
import { AppHeader } from '@/components/layout/AppHeader';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRoute<RouterContext>({
  component: () => (
    <div className='relative flex h-dvh max-h-dvh min-h-200 flex-col overflow-hidden bg-transparent'>
      <AppHeader />
      <main id='app-main-scroll' className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
        <Outlet />
      </main>
      {import.meta.env.DEV && <TanStackRouterDevtools />}
    </div>
  ),
});
