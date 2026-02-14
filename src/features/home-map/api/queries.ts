import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { OfferListQueryDto } from '@/types';
import { fetchOffers } from './offers';
import { fetchCategories, fetchOfferTypes } from './dictionaries';
import { offersQueryKeys, dictionariesQueryKeys } from './query-keys';

export function useOffersQuery(filters: OfferListQueryDto) {
  return useQuery({
    queryKey: offersQueryKeys.list(filters),
    queryFn: () => fetchOffers(filters),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: dictionariesQueryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useOfferTypesQuery() {
  return useQuery({
    queryKey: dictionariesQueryKeys.offerTypes,
    queryFn: fetchOfferTypes,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
