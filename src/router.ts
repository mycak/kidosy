import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { QueryClient } from '@tanstack/react-query';

interface RouterContext {
  queryClient: QueryClient;
}

export const router = createRouter<RouterContext>({
  routeTree,
  context: undefined!,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
