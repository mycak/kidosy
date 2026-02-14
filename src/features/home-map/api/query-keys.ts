import type { OfferListQueryDto } from '@/types';

export const offersQueryKeys = {
  all: ['offers'] as const,
  lists: () => [...offersQueryKeys.all, 'list'] as const,
  list: (filters: OfferListQueryDto) =>
    [...offersQueryKeys.lists(), filters] as const,
  details: () => [...offersQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...offersQueryKeys.details(), id] as const,
};

export const dictionariesQueryKeys = {
  categories: ['dictionaries', 'categories'] as const,
  offerTypes: ['dictionaries', 'offer-types'] as const,
};
