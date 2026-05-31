import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import {
  useOrganizerCategoriesQuery,
  useOrganizerOfferFormQuery,
  useOrganizerOfferTypesQuery,
  useUpdateOrganizerOfferMutation,
} from '@/features/organizer/api/organizer.queries';
import { OrganizerToast } from '@/features/organizer/components/common/OrganizerToast';
import { OrganizerOfferForm } from '@/features/organizer/components/offers/OrganizerOfferForm';
import type { OrganizerOfferSubmitValues } from '@/features/organizer/api/organizer.types';

const TOAST_AUTO_CLOSE_TIMEOUT_MS = 3000;

type OrganizerToastState = {
  message: string;
  variant: 'success' | 'error';
};

export const Route = createFileRoute('/organizer/offers/$id/edit')({
  component: OrganizerOffersEditRoute,
});

function OrganizerOffersEditRoute() {
  const { id } = Route.useParams();
  const { user } = useAuthSession();
  const offerTypesQuery = useOrganizerOfferTypesQuery();
  const categoriesQuery = useOrganizerCategoriesQuery();
  const offerFormQuery = useOrganizerOfferFormQuery(user?.id, id);
  const updateOfferMutation = useUpdateOrganizerOfferMutation(user?.id, id);
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
      await updateOfferMutation.mutateAsync(offerValues);
      setToast({
        variant: 'success',
        message: 'Zmiany oferty zostały zapisane.',
      });
    } catch {
      setToast({
        variant: 'error',
        message: 'Nie udało się zapisać zmian oferty.',
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

  if (
    offerTypesQuery.isLoading ||
    categoriesQuery.isLoading ||
    offerFormQuery.isLoading
  ) {
    return (
      <p className='text-sm text-muted-foreground'>Ładowanie formularza...</p>
    );
  }

  if (
    offerTypesQuery.isError ||
    categoriesQuery.isError ||
    offerFormQuery.isError ||
    !offerTypesQuery.data ||
    !categoriesQuery.data
  ) {
    return (
      <p className='text-sm text-destructive'>
        Nie udało się przygotować formularza edycji oferty.
      </p>
    );
  }

  if (!offerFormQuery.data) {
    return (
      <p className='text-sm text-muted-foreground'>
        Oferta nie istnieje lub nie masz do niej dostępu.
      </p>
    );
  }

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold'>Edytuj ofertę</h1>
        <p className='text-sm text-muted-foreground'>
          Edycja oferty o identyfikatorze {id}.
        </p>
      </header>

      <OrganizerOfferForm
        offerTypes={offerTypesQuery.data}
        categories={categoriesQuery.data}
        initialValues={offerFormQuery.data}
        isPending={updateOfferMutation.isPending}
        submitLabel='Zapisz zmiany'
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
