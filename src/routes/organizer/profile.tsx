import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import {
  useOrganizerProfileQuery,
  useUpsertOrganizerProfileMutation,
} from '@/features/organizer/api/organizer.queries';
import { OrganizerToast } from '@/features/organizer/components/common/OrganizerToast';
import { Button } from '@/components/ui/button';
import { PRIMARY_CTA_CLASS } from '@/shared/constants/ui';

export const Route = createFileRoute('/organizer/profile')({
  component: OrganizerProfileRoute,
});

const EMPTY_COMPANY_NAME = '';
const EMPTY_PHONE = '';
const TOAST_AUTO_CLOSE_TIMEOUT_MS = 3000;

type OrganizerToastState = {
  message: string;
  variant: 'success' | 'error';
};

function OrganizerProfileRoute() {
  const { user } = useAuthSession();
  const organizerProfileQuery = useOrganizerProfileQuery(user?.id);
  const updateOrganizerProfileMutation = useUpsertOrganizerProfileMutation(
    user?.id,
  );

  const [companyName, setCompanyName] = useState(EMPTY_COMPANY_NAME);
  const [phone, setPhone] = useState(EMPTY_PHONE);
  const [emailPublic, setEmailPublic] = useState('');
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

  useEffect(() => {
    if (!organizerProfileQuery.data) {
      setEmailPublic(user?.email ?? '');
      return;
    }

    setCompanyName(organizerProfileQuery.data.companyName);
    setPhone(organizerProfileQuery.data.phone);
    setEmailPublic(organizerProfileQuery.data.emailPublic);
  }, [organizerProfileQuery.data, user?.email]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setToast(null);

    try {
      await updateOrganizerProfileMutation.mutateAsync({
        companyName,
        phone,
        emailPublic,
      });
      setToast({
        variant: 'success',
        message: 'Profil został zapisany.',
      });
    } catch {
      setToast({
        variant: 'error',
        message: 'Nie udało się zapisać profilu.',
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

  if (organizerProfileQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>Ładowanie profilu...</p>
    );
  }

  if (organizerProfileQuery.isError) {
    return (
      <p className='text-sm text-destructive'>
        Nie udało się pobrać profilu organizatora.
      </p>
    );
  }

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold'>Profil organizatora</h1>
        <p className='text-sm text-muted-foreground'>
          Zaktualizuj dane, które widzą rodzice.
        </p>
      </header>

      <form
        className='grid max-w-2xl grid-cols-1 gap-4'
        onSubmit={handleSubmit}
      >
        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>
            Nazwa firmy / organizatora
          </span>
          <input
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            className='h-9 rounded-md border bg-background px-3 text-sm'
            required
          />
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>Telefon</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className='h-9 rounded-md border bg-background px-3 text-sm'
            required
          />
        </label>

        <label className='flex flex-col gap-1'>
          <span className='text-sm font-medium'>Publiczny e-mail</span>
          <input
            type='email'
            value={emailPublic}
            onChange={(event) => setEmailPublic(event.target.value)}
            className='h-9 rounded-md border bg-background px-3 text-sm'
            required
          />
        </label>

        <div className='flex items-center justify-between gap-3'>
          <Button
            type='submit'
            disabled={updateOrganizerProfileMutation.isPending}
            className={PRIMARY_CTA_CLASS}
          >
            {updateOrganizerProfileMutation.isPending
              ? 'Zapisywanie...'
              : 'Zapisz profil'}
          </Button>
        </div>
      </form>

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
