import { useState } from 'react';
import { Route } from '@/routes/index';
import { useHomeMapFilters } from '../hooks/useHomeMapFilters';
import {
  useOffersQuery,
  useCategoriesQuery,
  useOfferTypesQuery,
} from '../api/queries';
import { useGeolocation } from '../hooks/useGeolocation';
import { FilterPanel } from './filters/FilterPanel';
import type { OfferListQueryDto } from '@/types';
import type { HomeMapFilters } from '../types';
import { DEFAULT_PER_PAGE } from '../types';

export function HomeMapView() {
  const search = Route.useSearch();
  const { filters, updateFilters, resetFilters, removeFilter } =
    useHomeMapFilters(search);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

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

  const handleFiltersChange = (newFilters: Partial<HomeMapFilters>) => {
    updateFilters(newFilters);
  };

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
    <main className='flex h-screen flex-col'>
      <header className='border-b bg-background p-4'>
        <h1 className='text-2xl font-bold'>Kidosy</h1>
      </header>

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
        {/* Map Section - będzie zaimplementowana w następnym kroku */}
        <section className='relative flex-1 lg:w-3/5'>
          <div className='flex h-full items-center justify-center bg-muted'>
            <p className='text-muted-foreground'>
              {isLoading ? 'Ładowanie mapy...' : 'Mapa (w budowie)'}
            </p>
          </div>
        </section>

        {/* Offers List Section - będzie zaimplementowana w następnym kroku */}
        <section className='flex flex-1 flex-col bg-background lg:w-2/5'>
          <div className='border-b p-4'>
            <div className='text-sm font-medium'>
              Znaleziono:{' '}
              <span className='font-bold'>{data?.pagination.total || 0}</span>{' '}
              ofert
            </div>
          </div>

          <div className='flex-1 overflow-y-auto p-4'>
            {isLoading ? (
              <div>Ładowanie...</div>
            ) : data?.data.length === 0 ? (
              <div className='flex flex-col items-center justify-center p-8 text-center'>
                <p className='mb-4 text-muted-foreground'>
                  Brak ofert spełniających Twoje kryteria
                </p>
                <button
                  onClick={resetFilters}
                  className='rounded-md border px-4 py-2 hover:bg-muted'
                >
                  Wyczyść filtry
                </button>
              </div>
            ) : (
              <div className='space-y-3'>
                {data?.data.map((offer) => (
                  <div
                    key={offer.id}
                    className={`cursor-pointer rounded-lg border p-3 hover:shadow-md ${
                      selectedOfferId === offer.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleOfferSelect(offer.id)}
                  >
                    <h3 className='font-semibold'>{offer.title}</h3>
                    <p className='text-sm text-muted-foreground'>
                      {offer.address}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
