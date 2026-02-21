import { useCallback, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Route } from '@/routes/index';
import { useHomeMapFilters } from '../hooks/useHomeMapFilters';
import {
  useOffersQuery,
  useCategoriesQuery,
  useOfferTypesQuery,
} from '../api/queries';
import { useGeolocation } from '../hooks/useGeolocation';
import { FilterPanel } from './filters/FilterPanel';
import { MapSection } from './map/MapSection';
import { OffersListSection } from './offers-list/OffersListSection';
import type { OfferListQueryDto } from '@/types';
import type { HomeMapFilters, SortBy, SortOrder } from '../types';
import type { HomeMapSearchParams } from '../schemas';
import { DEFAULT_PER_PAGE } from '../types';

const BRAND_LETTERS = [
  { letter: 'K', className: 'text-sky-500' },
  { letter: 'i', className: 'text-emerald-500' },
  { letter: 'd', className: 'text-rose-400' },
  { letter: 'o', className: 'text-amber-400' },
  { letter: 's', className: 'text-violet-400' },
  { letter: 'y', className: 'text-teal-500' },
];

export function HomeMapView() {
  const search = Route.useSearch() as unknown as HomeMapSearchParams;
  const navigate = useNavigate({ from: '/' });
  const { filters, updateFilters, resetFilters, removeFilter } =
    useHomeMapFilters(search);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [hoveredOfferId, setHoveredOfferId] = useState<string | null>(null);

  const { getCurrentLocation, isLoading: isLoadingLocation } = useGeolocation();

  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategoriesQuery();
  const { data: offerTypesData, isLoading: isLoadingOfferTypes } =
    useOfferTypesQuery();

  const apiFilters: OfferListQueryDto = {
    page: search.page,
    per_page: DEFAULT_PER_PAGE,
    sort_by: search.sort_by,
    sort_order: search.sort_order,
    min_age: filters.min_age,
    max_age: filters.max_age,
    categories: filters.categories.join(',') || undefined,
    offer_types: filters.offer_types.join(',') || undefined,
    location_lat: filters.location?.lat,
    location_lon: filters.location?.lon,
    radius_km: filters.radius_km,
    search: filters.search,
  };

  const { data, isLoading, isError, error } = useOffersQuery(apiFilters);

  const handleOfferSelect = (offerId: string | null) => {
    setSelectedOfferId(offerId);
  };

  const handleOfferHover = (offerId: string | null) => {
    setHoveredOfferId(offerId);
  };

  const fitBoundsKey = [
    filters.min_age ?? '',
    filters.max_age ?? '',
    filters.categories.join(','),
    filters.offer_types.join(','),
    filters.location ? `${filters.location.lat}:${filters.location.lon}` : '',
    filters.radius_km ?? '',
    filters.search ?? '',
  ].join('|');

  const handleFiltersChange = (newFilters: Partial<HomeMapFilters>) => {
    updateFilters(newFilters);
  };

  const handleSortChange = useCallback(
    (sortBy: SortBy, sortOrder: SortOrder) => {
      navigate({
        search: (previous: unknown) => ({
          ...(previous as HomeMapSearchParams),
          sort_by: sortBy,
          sort_order: sortOrder,
          page: 1,
        }),
      } as unknown as Parameters<typeof navigate>[0]);
    },
    [navigate],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      navigate({
        search: (previous: unknown) => ({
          ...(previous as HomeMapSearchParams),
          page,
        }),
      } as unknown as Parameters<typeof navigate>[0]);
    },
    [navigate],
  );

  const handleUseCurrentLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      updateFilters({
        location,
        radius_km: filters.radius_km || 10,
      });
    }
  };

  if (isError) {
    return (
      <div className='flex min-h-screen items-center justify-center p-8'>
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-semibold'>
            Ups! Coś poszło nie tak
          </h2>
          <p className='mb-4 text-muted-foreground'>
            {error instanceof Error
              ? error.message
              : 'Wystąpił nieoczekiwany błąd'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className='flex h-screen flex-col bg-gradient-to-br from-sky-50 via-emerald-50 to-rose-50'>
      <header className='border-b border-white/50 bg-white/70 p-4 backdrop-blur'>
        <div className='mb-3'>
          <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            {BRAND_LETTERS.map((item, index) => (
              <span key={`${item.letter}-${index}`} className={item.className}>
                {item.letter}
              </span>
            ))}
          </h1>
          <p className='text-sm text-gray-600 sm:text-base mt-1'>
            Odkryj zajęcia i aktywności dla Twoich dzieci. Wyszukaj idealne
            zajęcia wśród ofert w Twojej okolicy.
          </p>
        </div>
      </header>

      <div className='h-1 bg-gradient-to-r from-sky-200 via-emerald-200 to-rose-200' />

      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onResetFilters={resetFilters}
        onRemoveFilter={removeFilter}
        categories={categoriesData || []}
        offerTypes={offerTypesData || []}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLoadingCurrentLocation={isLoadingLocation}
        isLoadingCategories={isLoadingCategories}
        isLoadingOfferTypes={isLoadingOfferTypes}
      />

      <div className='flex flex-1 flex-col lg:flex-row'>
        <section className='relative min-h-64 flex-1 p-4 lg:min-h-auto lg:w-3/5'>
          <div className='h-full overflow-hidden rounded-2xl border border-white/70 bg-white/70 shadow-sm'>
            <MapSection
              offers={data?.data || []}
              location={filters.location}
              selectedOfferId={selectedOfferId}
              hoveredOfferId={hoveredOfferId}
              fitBoundsKey={fitBoundsKey}
              onOfferSelect={handleOfferSelect}
            />
          </div>
        </section>

        <OffersListSection
          offers={data?.data || []}
          pagination={data?.pagination}
          isLoading={isLoading}
          selectedOfferId={selectedOfferId}
          onOfferSelect={handleOfferSelect}
          onOfferHover={handleOfferHover}
          onResetFilters={resetFilters}
          sortBy={search.sort_by}
          sortOrder={search.sort_order}
          onSortChange={handleSortChange}
          onPageChange={handlePageChange}
        />
      </div>
    </main>
  );
}
