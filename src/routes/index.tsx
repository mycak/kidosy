import { createFileRoute } from '@tanstack/react-router';
import { homeMapSearchParamsSchema } from '@/features/home-map/schemas';
import { HomeMapView } from '@/features/home-map/components/HomeMapView';

export const Route = createFileRoute('/')({
  component: HomeMapView,
  validateSearch: (search) => homeMapSearchParamsSchema.parse(search),
});
