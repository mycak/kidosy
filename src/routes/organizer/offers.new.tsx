import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import {
  useCreateOrganizerOfferMutation,
  useOrganizerCategoriesQuery,
  useOrganizerOfferTypesQuery,
} from '@/features/organizer/api/organizer.queries';
import { DEFAULT_ORGANIZER_OFFERS_SEARCH } from '@/features/organizer/constants/offers-search.constants';
import { OrganizerOfferForm } from '@/features/organizer/components/offers/OrganizerOfferForm';
import { OrganizerToast } from '@/features/organizer/components/common/OrganizerToast';
import type { OrganizerOfferSubmitValues } from '@/features/organizer/api/organizer.types';

const TOAST_AUTO_CLOSE_TIMEOUT_MS = 3000;

type OrganizerToastState = {
  message: string;
  variant: 'success' | 'error';
};

export const Route = createFileRoute('/organizer/offers/new')({
  component: OrganizerOffersNewRoute,
});

function OrganizerOffersNewRoute() {
  const navigate = useNavigate();
  const { user } = useAuthSession();
  const offerTypesQuery = useOrganizerOfferTypesQuery();
  const categoriesQuery = useOrganizerCategoriesQuery();
  const createOfferMutation = useCreateOrganizerOfferMutation(user?.id);
  const [toast, setToast] = useState<OrganizerToastState | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const closeToastTimeout = window.setTimeout(() => {
      setToast(null);
    }, TOAST_AUTO_CLOSE_TIMEOUT_MS);

    return () => {
      window.clearTimeout(closeToastTimeout);
    };
  }, [toast]);

  const handleSubmit = async (offerValues: OrganizerOfferSubmitValues) => {
    setToast(null);

    try {
      const createdOfferId = await createOfferMutation.mutateAsync(offerValues);

      setToast({
        variant: 'success',
        message: 'Oferta została utworzona.',
      });

      void navigate({
        to: '/organizer/offers/$id/edit',
        params: { id: createdOfferId },
        search: DEFAULT_ORGANIZER_OFFERS_SEARCH,
      });
    } catch {
      setToast({
        variant: 'error',
        message: 'Nie udało się utworzyć oferty. Spróbuj ponownie.',
      });
    }
  };

  if (!user) {
    return (
      <p className='text-sm text-muted-foreground'>
        Brak aktywnej sesji użytkownika.
      </p>
    );
  }

  if (offerTypesQuery.isLoading || categoriesQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>Ładowanie formularza...</p>
    );
  }

  if (
    offerTypesQuery.isError ||
    categoriesQuery.isError ||
    !offerTypesQuery.data ||
    !categoriesQuery.data
  ) {
    return (
      <p className='text-sm text-destructive'>
        Nie udało się przygotować formularza tworzenia oferty.
      </p>
    );
  }

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold'>Dodaj ofertę</h1>
        <p className='text-sm text-muted-foreground'>
          Utwórz nową ofertę i zapisz ją jako szkic lub wyślij do moderacji.
        </p>
      </header>

      <OrganizerOfferForm
        offerTypes={offerTypesQuery.data}
        categories={categoriesQuery.data}
        initialValues={null}
        isPending={createOfferMutation.isPending}
        submitLabel='Utwórz ofertę'
        onSubmit={handleSubmit}
      />

      {toast ? (
        <OrganizerToast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </section>
  );
}
