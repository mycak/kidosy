import { queryOptions, useQuery } from '@tanstack/react-query';
import { supabaseClient } from '@/db/supabase.client';
import type { OfferDetailsResponse } from '../types';

export const offerDetailsQueryOptions = (offerId: string) =>
  queryOptions({
    queryKey: ['offers', offerId] as const,
    queryFn: async (): Promise<OfferDetailsResponse> => {
      const { data, error } = await supabaseClient
        .from('offers')
        .select(
          `
          id,
          title,
          description,
          ages,
          address,
          start_date,
          end_date,
          available_spots,
          status,
          created_at,
          updated_at,
          location,
          offer_type:offer_types(id, name, slug),
          categories:offer_categories(
            category:categories(id, name, slug, description)
          ),
          organizer:organizer_profiles!organizer_id(
            id,
            company_name,
            phone,
            email_public
          ),
          images:offer_images(id, storage_path, display_order),
          schedules:offer_schedules(
            id,
            day_of_week,
            start_time,
            end_time,
            is_active
          )
        `,
        )
        .eq('id', offerId)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Oferta nie została znaleziona');
        }
        throw new Error('Nie udało się pobrać szczegółów oferty');
      }

      return {
        ...data,
        offer_type: Array.isArray(data.offer_type)
          ? data.offer_type[0]
          : data.offer_type,
        categories: data.categories.map(
          (c: { category: unknown }) => c.category,
        ),
        organizer:
          Array.isArray(data.organizer) && data.organizer.length > 0
            ? data.organizer[0]
            : data.organizer || null,
      } as OfferDetailsResponse;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

export const useOfferDetails = (offerId: string) => {
  return useQuery(offerDetailsQueryOptions(offerId));
};
