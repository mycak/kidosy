import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { OfferDetailsPage } from '@/features/offers/components/OfferDetailsPage';
import { OfferDetailsLoadingSkeleton } from '@/features/offers/components/OfferDetailsLoadingSkeleton';
import { OfferDetailsErrorBoundary } from '@/features/offers/components/OfferDetailsErrorBoundary';

const offerDetailsSearchParamsSchema = z.object({}).strict();

export const Route = createFileRoute('/offers/$offerId')({
  component: OfferDetailsPage,
  pendingComponent: OfferDetailsLoadingSkeleton,
  errorComponent: OfferDetailsErrorBoundary,
  validateSearch: offerDetailsSearchParamsSchema.parse,
});
