import { createFileRoute } from '@tanstack/react-router';
import {
  homeMapSearchParamsSchema,
  type HomeMapSearchParams,
} from '@/features/home-map/schemas';
import { HomeMapView } from '@/features/home-map/components/HomeMapView';

export const Route = createFileRoute('/')({
  component: HomeMapView,
  validateSearch: homeMapSearchParamsSchema.parse,
});

declare module '@tanstack/react-router' {
  interface Register {
    '/': { Search: HomeMapSearchParams };
  }
}
