import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/db/supabase.client';
import type { CreateLeadRequest, CreateLeadResponse } from '../types';

interface CreateLeadParams {
  offerId: string;
  data: CreateLeadRequest;
}

export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      data,
    }: CreateLeadParams): Promise<CreateLeadResponse> => {
      const { data: lead, error } = await (
        supabaseClient.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{
          data: CreateLeadResponse | null;
          error: { message: string } | null;
        }>
      )('create_lead', {
        p_offer_id: offerId,
        p_parent_email: data.email,
        p_parent_phone: data.phone,
        p_parent_name: data.name,
        p_children: JSON.stringify(data.children),
        p_contact_preference: data.contact_preference,
        p_additional_message: data.additional_message,
        p_consent_communication: data.consent_communication,
        p_consent_marketing: data.consent_marketing,
      });

      if (error) {
        throw new Error(error.message || 'Nie udało się wysłać zgłoszenia');
      }

      if (!lead) {
        throw new Error('Nie otrzymano odpowiedzi z serwera');
      }

      return lead;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['offers', variables.offerId],
      });
    },
    meta: {
      errorMessage: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.',
    },
  });
};
