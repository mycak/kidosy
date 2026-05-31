import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeadStatus } from '@/types';
import {
  createOrganizerOffer,
  fetchOrganizerCategories,
  fetchOrganizerDashboard,
  fetchOrganizerLeads,
  fetchOrganizerOfferFormValues,
  fetchOrganizerOffers,
  fetchOrganizerOfferTypes,
  fetchOrganizerProfile,
  updateOrganizerLeadStatus,
  updateOrganizerOffer,
  upsertOrganizerProfile,
} from './organizer.api';
import type {
  OrganizerLeadsQueryOptions,
  OrganizerOfferSubmitValues,
  OrganizerOffersQueryOptions,
  OrganizerProfileData,
} from './organizer.types';

const ORGANIZER_QUERY_BASE_KEY = ['organizer'] as const;

export const organizerQueryKeys = {
  base: ORGANIZER_QUERY_BASE_KEY,
  dashboard: (userId: string) =>
    [...organizerQueryKeys.base, 'dashboard', userId] as const,
  offers: (userId: string) =>
    [...organizerQueryKeys.base, 'offers', userId] as const,
  offerForm: (userId: string, offerId: string) =>
    [...organizerQueryKeys.base, 'offer-form', userId, offerId] as const,
  leads: (userId: string) =>
    [...organizerQueryKeys.base, 'leads', userId] as const,
  profile: (userId: string) =>
    [...organizerQueryKeys.base, 'profile', userId] as const,
  categories: [...ORGANIZER_QUERY_BASE_KEY, 'categories'] as const,
  offerTypes: [...ORGANIZER_QUERY_BASE_KEY, 'offer-types'] as const,
};

export function useOrganizerDashboardQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? organizerQueryKeys.dashboard(userId)
      : [...organizerQueryKeys.base, 'dashboard', 'anonymous'],
    queryFn: async () => fetchOrganizerDashboard(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useOrganizerOffersQuery(userId: string | undefined) {
  return useOrganizerOffersQueryWithOptions(userId, {
    status: 'all',
    sortBy: 'updated_at',
    sortOrder: 'desc',
    page: 1,
    perPage: 10,
  });
}

export function useOrganizerOffersQueryWithOptions(
  userId: string | undefined,
  queryOptions: OrganizerOffersQueryOptions,
) {
  return useQuery({
    queryKey: userId
      ? [...organizerQueryKeys.offers(userId), queryOptions]
      : [...organizerQueryKeys.base, 'offers', 'anonymous'],
    queryFn: async () => fetchOrganizerOffers(userId ?? '', queryOptions),
    enabled: Boolean(userId),
  });
}

export function useOrganizerLeadsQuery(userId: string | undefined) {
  return useOrganizerLeadsQueryWithOptions(userId, {
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
    page: 1,
    perPage: 10,
  });
}

export function useOrganizerLeadsQueryWithOptions(
  userId: string | undefined,
  queryOptions: OrganizerLeadsQueryOptions,
) {
  return useQuery({
    queryKey: userId
      ? [...organizerQueryKeys.leads(userId), queryOptions]
      : [...organizerQueryKeys.base, 'leads', 'anonymous'],
    queryFn: async () => fetchOrganizerLeads(userId ?? '', queryOptions),
    enabled: Boolean(userId),
  });
}

export function useOrganizerProfileQuery(userId: string | undefined) {
  return useQuery({
    queryKey: userId
      ? organizerQueryKeys.profile(userId)
      : [...organizerQueryKeys.base, 'profile', 'anonymous'],
    queryFn: async () => fetchOrganizerProfile(userId ?? ''),
    enabled: Boolean(userId),
  });
}

export function useOrganizerOfferFormQuery(
  userId: string | undefined,
  offerId: string,
) {
  return useQuery({
    queryKey: userId
      ? organizerQueryKeys.offerForm(userId, offerId)
      : [...organizerQueryKeys.base, 'offer-form', 'anonymous', offerId],
    queryFn: async () => fetchOrganizerOfferFormValues(userId ?? '', offerId),
    enabled: Boolean(userId),
  });
}

export function useOrganizerCategoriesQuery() {
  return useQuery({
    queryKey: organizerQueryKeys.categories,
    queryFn: fetchOrganizerCategories,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useOrganizerOfferTypesQuery() {
  return useQuery({
    queryKey: organizerQueryKeys.offerTypes,
    queryFn: fetchOrganizerOfferTypes,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

export function useUpsertOrganizerProfileMutation(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: OrganizerProfileData) =>
      upsertOrganizerProfile(userId ?? '', profileData),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.profile(userId),
        });
      }
    },
  });
}

export function useCreateOrganizerOfferMutation(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerValues: OrganizerOfferSubmitValues) =>
      createOrganizerOffer(userId ?? '', offerValues),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.offers(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.dashboard(userId),
        });
      }
    },
  });
}

export function useUpdateOrganizerOfferMutation(
  userId: string | undefined,
  offerId: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerValues: OrganizerOfferSubmitValues) =>
      updateOrganizerOffer(userId ?? '', offerId, offerValues),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.offers(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.dashboard(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.offerForm(userId, offerId),
        });
      }
    },
  });
}

export function useUpdateOrganizerLeadStatusMutation(
  userId: string | undefined,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      status,
    }: {
      leadId: string;
      status: LeadStatus;
    }) => updateOrganizerLeadStatus(leadId, status),
    onSuccess: () => {
      if (userId) {
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.leads(userId),
        });
        void queryClient.invalidateQueries({
          queryKey: organizerQueryKeys.dashboard(userId),
        });
      }
    },
  });
}
