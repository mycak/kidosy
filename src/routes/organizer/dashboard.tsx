import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import { useOrganizerDashboardQuery } from '@/features/organizer/api/organizer.queries';
import { DEFAULT_ORGANIZER_OFFERS_SEARCH } from '@/features/organizer/constants/offers-search.constants';
import { getOfferStatusLabel } from '@/features/organizer/constants/offer-status.constants';

export const Route = createFileRoute('/organizer/dashboard')({
  component: OrganizerDashboardRoute,
});

function OrganizerDashboardRoute() {
  const { user } = useAuthSession();

  const dashboardQuery = useOrganizerDashboardQuery(user?.id);

  if (!user) {
    return (
      <p className='text-sm text-muted-foreground'>
        Brak aktywnej sesji użytkownika.
      </p>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>Ładowanie dashboardu...</p>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <p className='text-sm text-destructive'>
        Nie udało się pobrać danych dashboardu.
      </p>
    );
  }

  const { summary, recentOffers } = dashboardQuery.data;

  return (
    <section className='flex flex-1 flex-col gap-6'>
      <header className='flex flex-col gap-1'>
        <h1 className='text-2xl font-semibold'>Dashboard organizatora</h1>
        <p className='text-sm text-muted-foreground'>
          Podsumowanie Twoich ofert i zgłoszeń.
        </p>
      </header>

      <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        <MetricCard label='Wszystkie oferty' value={summary.totalOffers} />
        <MetricCard label='Szkice' value={summary.draftCount} />
        <MetricCard label='W moderacji' value={summary.pendingReviewCount} />
        <MetricCard label='Opublikowane' value={summary.publishedCount} />
        <MetricCard label='Odrzucone' value={summary.rejectedCount} />
        <MetricCard label='Archiwalne' value={summary.archivedCount} />
        <MetricCard label='Wszystkie zgłoszenia' value={summary.totalLeads} />
      </div>

      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='text-lg font-medium'>Ostatnio aktualizowane oferty</h2>
          <Link
            to='/organizer/offers'
            search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
            className='text-xs text-primary underline-offset-2 hover:underline'
          >
            Zobacz wszystkie
          </Link>
        </div>

        {recentOffers.length === 0 ? (
          <p className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
            Nie masz jeszcze żadnych ofert.
          </p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {recentOffers.map((recentOffer) => (
              <li
                key={recentOffer.id}
                className='rounded-md border px-3 py-2 text-sm'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='font-medium'>{recentOffer.title}</span>
                  <Link
                    to='/organizer/offers/$id/edit'
                    params={{ id: recentOffer.id }}
                    search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
                    className='text-xs text-primary underline-offset-2 hover:underline'
                  >
                    Edytuj
                  </Link>
                </div>
                <p className='text-xs text-muted-foreground'>
                  Status: {getOfferStatusLabel(recentOffer.status)} •
                  Zgłoszenia: {recentOffer.leadsCount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className='rounded-md border px-3 py-2'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <p className='text-xl font-semibold'>{value}</p>
    </article>
  );
}
