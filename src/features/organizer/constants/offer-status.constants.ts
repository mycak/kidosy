import type { OfferStatus } from '@/types';

export const OFFER_STATUS_LABELS = {
  draft: 'Szkic',
  pending_review: 'W moderacji',
  published: 'Opublikowana',
  rejected: 'Odrzucona',
  archived: 'Archiwalna',
} as const satisfies Record<OfferStatus, string>;

export const OFFER_STATUS_FILTER_LABELS = {
  all: 'Wszystkie',
  ...OFFER_STATUS_LABELS,
} as const;

export function getOfferStatusLabel(status: OfferStatus): string {
  return OFFER_STATUS_LABELS[status];
}
