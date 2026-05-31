import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Filter,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import { useOrganizerOffersQueryWithOptions } from '@/features/organizer/api/organizer.queries';
import {
  OFFER_STATUS_FILTER_LABELS,
  getOfferStatusLabel,
} from '@/features/organizer/constants/offer-status.constants';
import { PRIMARY_CTA_CLASS } from '@/shared/constants/ui';
import type {
  OrganizerOffersSortBy,
  SortOrder,
} from '@/features/organizer/api/organizer.types';
import type { OfferStatus } from '@/types';

const offersSearchParamsSchema = z.object({
  status: z
    .enum([
      'all',
      'draft',
      'pending_review',
      'published',
      'rejected',
      'archived',
    ])
    .default('all'),
  sortBy: z
    .enum(['updated_at', 'created_at', 'start_date', 'title', 'leads_count'])
    .default('updated_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
});

export const Route = createFileRoute('/organizer/offers')({
  component: OrganizerOffersListRoute,
  validateSearch: offersSearchParamsSchema.parse,
});

const OFFER_STATUS_FILTERS: readonly (OfferStatus | 'all')[] = [
  'all',
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived',
] as const;

const OFFER_SORT_OPTIONS = [
  { value: 'updated_at', label: 'Ostatnio aktualizowane' },
  { value: 'created_at', label: 'Najnowsze utworzone' },
  { value: 'start_date', label: 'Najbliższa data startu' },
  { value: 'title', label: 'Tytuł (alfabetycznie)' },
  { value: 'leads_count', label: 'Liczba zgłoszeń' },
] as const satisfies ReadonlyArray<{
  value: OrganizerOffersSortBy;
  label: string;
}>;

const ITEMS_PER_PAGE = 10;
const ORGANIZER_OFFERS_LIST_PATH = '/organizer/offers';
const ORGANIZER_OFFERS_LIST_PATH_WITH_TRAILING_SLASH = '/organizer/offers/';

function OrganizerOffersListRoute() {
  const { user } = useAuthSession();
  const currentPathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const navigate = Route.useNavigate();
  const search = Route.useSearch();

  const selectedStatus = search.status as OfferStatus | 'all';
  const sortBy = search.sortBy as OrganizerOffersSortBy;
  const sortOrder = search.sortOrder as SortOrder;
  const page = search.page;

  const offersQuery = useOrganizerOffersQueryWithOptions(user?.id, {
    status: selectedStatus,
    sortBy,
    sortOrder,
    page,
    perPage: ITEMS_PER_PAGE,
  });

  const offers = useMemo(
    () => offersQuery.data?.data ?? [],
    [offersQuery.data],
  );
  const pagination = offersQuery.data?.pagination;
  const currentOffersSearch = {
    status: selectedStatus,
    sortBy,
    sortOrder,
    page,
  } as const;

  const canGoToPreviousPage = page > 1;
  const canGoToNextPage = pagination ? page < pagination.totalPages : false;
  const isOffersListPath =
    currentPathname === ORGANIZER_OFFERS_LIST_PATH ||
    currentPathname === ORGANIZER_OFFERS_LIST_PATH_WITH_TRAILING_SLASH;

  const updateSearch = (
    updater: (currentSearch: typeof search) => typeof search,
  ) => {
    void navigate({
      search: (previousSearch) => updater(previousSearch as typeof search),
      replace: true,
    });
  };

  if (!user) {
    return (
      <p className='text-sm text-muted-foreground'>
        Brak aktywnej sesji użytkownika.
      </p>
    );
  }

  if (offersQuery.isLoading) {
    return <p className='text-sm text-muted-foreground'>Ładowanie ofert...</p>;
  }

  if (offersQuery.isError) {
    return (
      <p className='text-sm text-destructive'>
        Nie udało się pobrać listy ofert.
      </p>
    );
  }

  if (!isOffersListPath) {
    return <Outlet />;
  }

  return (
    <section className='flex flex-1 flex-col gap-4'>
      <header className='ui-entrance ui-panel flex flex-wrap items-center justify-between gap-3 rounded-[28px] p-5'>
        <div>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge
              variant='secondary'
              className='gap-1.5 rounded-full px-3 py-1'
            >
              <Sparkles className='size-3' />
              oferta hub
            </Badge>
            <Badge variant='outline' className='gap-1.5 rounded-full px-3 py-1'>
              <CheckCircle2 className='size-3' />
              szybkie zarządzanie
            </Badge>
          </div>
          <h1 className='mt-3 text-3xl font-semibold tracking-tight'>
            Moje oferty
          </h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Zarządzaj wszystkimi ofertami i monitoruj liczbę zgłoszeń.
          </p>
        </div>
        <Button asChild className={PRIMARY_CTA_CLASS}>
          <Link to='/organizer/offers/new' search={currentOffersSearch}>
            <PlusCircle className='size-4' />
            Dodaj ofertę
          </Link>
        </Button>
      </header>

      <div className='ui-panel flex flex-wrap gap-3 rounded-[24px] p-4'>
        <label className='flex w-full max-w-xs flex-col gap-1'>
          <span className='inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            <Filter className='size-3.5' />
            Filtr statusu
          </span>
          <select
            value={selectedStatus}
            onChange={(event) => {
              updateSearch((currentSearch) => ({
                ...currentSearch,
                status: event.target.value as OfferStatus | 'all',
                page: 1,
              }));
            }}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            {OFFER_STATUS_FILTERS.map((offerStatusFilter) => (
              <option key={offerStatusFilter} value={offerStatusFilter}>
                {OFFER_STATUS_FILTER_LABELS[offerStatusFilter]}
              </option>
            ))}
          </select>
        </label>

        <label className='flex w-full max-w-xs flex-col gap-1'>
          <span className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Sortowanie
          </span>
          <select
            value={sortBy}
            onChange={(event) => {
              updateSearch((currentSearch) => ({
                ...currentSearch,
                sortBy: event.target.value as OrganizerOffersSortBy,
                page: 1,
              }));
            }}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            {OFFER_SORT_OPTIONS.map((sortOption) => (
              <option key={sortOption.value} value={sortOption.value}>
                {sortOption.label}
              </option>
            ))}
          </select>
        </label>

        <label className='flex w-full max-w-40 flex-col gap-1'>
          <span className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
            Kierunek
          </span>
          <select
            value={sortOrder}
            onChange={(event) => {
              updateSearch((currentSearch) => ({
                ...currentSearch,
                sortOrder: event.target.value as SortOrder,
                page: 1,
              }));
            }}
            className='h-9 rounded-md border bg-background px-3 text-sm'
          >
            <option value='desc'>malejąco</option>
            <option value='asc'>rosnąco</option>
          </select>
        </label>
      </div>

      {offers.length === 0 ? (
        <div className='ui-panel rounded-[24px] border-dashed p-5 text-sm text-muted-foreground'>
          <p className='font-medium text-foreground'>
            Brak ofert dla wybranego filtra.
          </p>
          <p className='mt-2 max-w-2xl leading-6'>
            Spróbuj zmienić status lub dodaj nową ofertę, jeśli chcesz zacząć od
            świeżego wpisu.
          </p>
        </div>
      ) : (
        <div className='overflow-x-auto rounded-[24px] border border-white/70 bg-white/70 shadow-sm backdrop-blur-xl'>
          <table className='min-w-full divide-y text-sm'>
            <thead>
              <tr className='bg-muted/50 text-left'>
                <th className='px-3 py-2 font-medium'>Tytuł</th>
                <th className='px-3 py-2 font-medium'>Typ</th>
                <th className='px-3 py-2 font-medium'>Status</th>
                <th className='px-3 py-2 font-medium'>Miejsca</th>
                <th className='px-3 py-2 font-medium'>Zgłoszenia</th>
                <th className='px-3 py-2 font-medium'>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offerItem) => (
                <tr
                  key={offerItem.id}
                  className='border-t transition-colors hover:bg-white/70'
                >
                  <td className='px-3 py-2'>
                    <p className='font-medium'>{offerItem.title}</p>
                    <p className='text-xs text-muted-foreground'>
                      {offerItem.startDate} → {offerItem.endDate}
                    </p>
                  </td>
                  <td className='px-3 py-2'>{offerItem.offerTypeName}</td>
                  <td className='px-3 py-2'>
                    <Badge
                      variant='outline'
                      className='rounded-full px-2 py-0.5'
                    >
                      {getOfferStatusLabel(offerItem.status)}
                    </Badge>
                  </td>
                  <td className='px-3 py-2'>{offerItem.availableSpots}</td>
                  <td className='px-3 py-2'>{offerItem.leadsCount}</td>
                  <td className='px-3 py-2'>
                    <Link
                      to='/organizer/offers/$id/edit'
                      params={{ id: offerItem.id }}
                      search={currentOffersSearch}
                      className='inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline'
                    >
                      Edytuj
                      <ArrowRight className='size-3.5' />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination ? (
        <div className='flex items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl'>
          <p className='text-xs text-muted-foreground'>
            Strona {pagination.page} z {Math.max(1, pagination.totalPages)} (
            {pagination.total} wyników)
          </p>

          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                updateSearch((currentSearch) => ({
                  ...currentSearch,
                  page: Math.max(1, currentSearch.page - 1),
                }))
              }
              disabled={!canGoToPreviousPage}
            >
              <ArrowLeft className='size-3.5' />
              Poprzednia
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() =>
                updateSearch((currentSearch) => ({
                  ...currentSearch,
                  page: currentSearch.page + 1,
                }))
              }
              disabled={!canGoToNextPage}
            >
              Następna
              <ArrowRight className='size-3.5' />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
