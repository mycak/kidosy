import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useMemo } from 'react';
import { z } from 'zod';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import { useOrganizerOffersQueryWithOptions } from '@/features/organizer/api/organizer.queries';
import {
  OFFER_STATUS_FILTER_LABELS,
  getOfferStatusLabel,
} from '@/features/organizer/constants/offer-status.constants';
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
      <header className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-semibold'>Moje oferty</h1>
          <p className='text-sm text-muted-foreground'>
            Zarządzaj wszystkimi ofertami i monitoruj liczbę zgłoszeń.
          </p>
        </div>
        <Link
          to='/organizer/offers/new'
          search={currentOffersSearch}
          className='rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
        >
          Dodaj ofertę
        </Link>
      </header>

      <label className='flex w-full max-w-xs flex-col gap-1'>
        <span className='text-xs font-medium uppercase text-muted-foreground'>
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

      <div className='flex flex-wrap gap-3'>
        <label className='flex w-full max-w-xs flex-col gap-1'>
          <span className='text-xs font-medium uppercase text-muted-foreground'>
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
          <span className='text-xs font-medium uppercase text-muted-foreground'>
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
        <p className='rounded-md border border-dashed p-4 text-sm text-muted-foreground'>
          Brak ofert dla wybranego filtra.
        </p>
      ) : (
        <div className='overflow-x-auto rounded-md border'>
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
                <tr key={offerItem.id} className='border-t'>
                  <td className='px-3 py-2'>
                    <p className='font-medium'>{offerItem.title}</p>
                    <p className='text-xs text-muted-foreground'>
                      {offerItem.startDate} → {offerItem.endDate}
                    </p>
                  </td>
                  <td className='px-3 py-2'>{offerItem.offerTypeName}</td>
                  <td className='px-3 py-2'>
                    <span className='rounded bg-muted px-2 py-1 text-xs'>
                      {getOfferStatusLabel(offerItem.status)}
                    </span>
                  </td>
                  <td className='px-3 py-2'>{offerItem.availableSpots}</td>
                  <td className='px-3 py-2'>{offerItem.leadsCount}</td>
                  <td className='px-3 py-2'>
                    <Link
                      to='/organizer/offers/$id/edit'
                      params={{ id: offerItem.id }}
                      search={currentOffersSearch}
                      className='text-primary underline-offset-2 hover:underline'
                    >
                      Edytuj
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination ? (
        <div className='flex items-center justify-between gap-3'>
          <p className='text-xs text-muted-foreground'>
            Strona {pagination.page} z {Math.max(1, pagination.totalPages)} (
            {pagination.total} wyników)
          </p>

          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() =>
                updateSearch((currentSearch) => ({
                  ...currentSearch,
                  page: Math.max(1, currentSearch.page - 1),
                }))
              }
              disabled={!canGoToPreviousPage}
              className='rounded-md border px-2 py-1 text-xs disabled:opacity-50'
            >
              Poprzednia
            </button>
            <button
              type='button'
              onClick={() =>
                updateSearch((currentSearch) => ({
                  ...currentSearch,
                  page: currentSearch.page + 1,
                }))
              }
              disabled={!canGoToNextPage}
              className='rounded-md border px-2 py-1 text-xs disabled:opacity-50'
            >
              Następna
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
