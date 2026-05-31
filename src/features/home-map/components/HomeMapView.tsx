import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  BriefcaseBusiness,
  MapPinned,
  RefreshCcw,
  Sparkles,
  SlidersHorizontal,
  TriangleAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { OfferListQueryDto } from '@/types';
import type { HomeMapFilters, SortBy, SortOrder } from '../types';
import type { HomeMapSearchParams } from '../schemas';
import { DEFAULT_PER_PAGE } from '../types';

const SCROLL_DELTA_THRESHOLD = 2;
const OFFERS_LIST_SCROLL_SELECTOR = '[data-offers-list-scroll="true"]';

function isScrollEventInsideOffersList(
  eventTarget: EventTarget | null,
): boolean {
  if (!(eventTarget instanceof Element)) {
    return false;
  }

  return eventTarget.closest(OFFERS_LIST_SCROLL_SELECTOR) !== null;
}

export function HomeMapView() {
  const search = Route.useSearch() as unknown as HomeMapSearchParams;
  const navigate = useNavigate({ from: '/' });
  const { filters, updateFilters, resetFilters, removeFilter } =
    useHomeMapFilters(search);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [hoveredOfferId, setHoveredOfferId] = useState<string | null>(null);
  const [isFiltersDialogOpen, setIsFiltersDialogOpen] = useState(false);
  const [isInfoPanelCollapsed, setIsInfoPanelCollapsed] = useState(false);
  const lastScrollTopRef = useRef(0);
  const lastTouchYRef = useRef<number | null>(null);

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

  const handleOfferSelect = useCallback((offerId: string | null) => {
    setSelectedOfferId(offerId);
  }, []);

  const handleOfferHover = useCallback((offerId: string | null) => {
    setHoveredOfferId(offerId);
  }, []);

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

  const handleResetFilters = useCallback(() => {
    setSelectedOfferId(null);
    setHoveredOfferId(null);
    resetFilters();
  }, [resetFilters]);

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

  useEffect(() => {
    const mainScrollContainer = document.getElementById('app-main-scroll');

    if (!mainScrollContainer) {
      return;
    }

    lastScrollTopRef.current = mainScrollContainer.scrollTop;

    const handleScroll = () => {
      const currentScrollTop = mainScrollContainer.scrollTop;

      if (currentScrollTop <= SCROLL_DELTA_THRESHOLD) {
        setIsInfoPanelCollapsed(false);
        lastScrollTopRef.current = currentScrollTop;
        return;
      }

      const wasScrolledDown =
        currentScrollTop > lastScrollTopRef.current + SCROLL_DELTA_THRESHOLD;
      const wasScrolledUp =
        currentScrollTop < lastScrollTopRef.current - SCROLL_DELTA_THRESHOLD;

      if (wasScrolledDown) {
        setIsInfoPanelCollapsed(true);
      } else if (wasScrolledUp) {
        setIsInfoPanelCollapsed(false);
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    mainScrollContainer.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      mainScrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleWheelCapture = useCallback(
    (event: React.WheelEvent<HTMLElement>) => {
      const isUpwardScrollInsideOffersList =
        event.deltaY < -SCROLL_DELTA_THRESHOLD &&
        isScrollEventInsideOffersList(event.target);

      if (isUpwardScrollInsideOffersList) {
        return;
      }

      if (event.deltaY > SCROLL_DELTA_THRESHOLD) {
        setIsInfoPanelCollapsed(true);
      } else if (event.deltaY < -SCROLL_DELTA_THRESHOLD) {
        setIsInfoPanelCollapsed(false);
      }
    },
    [],
  );

  const handleTouchStartCapture = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const firstTouch = event.touches[0];

      if (!firstTouch) {
        return;
      }

      lastTouchYRef.current = firstTouch.clientY;
    },
    [],
  );

  const handleTouchMoveCapture = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      const firstTouch = event.touches[0];

      if (!firstTouch || lastTouchYRef.current === null) {
        return;
      }

      const touchDeltaY = lastTouchYRef.current - firstTouch.clientY;

      const isUpwardScrollInsideOffersList =
        touchDeltaY < -SCROLL_DELTA_THRESHOLD &&
        isScrollEventInsideOffersList(event.target);

      if (isUpwardScrollInsideOffersList) {
        lastTouchYRef.current = firstTouch.clientY;
        return;
      }

      if (touchDeltaY > SCROLL_DELTA_THRESHOLD) {
        setIsInfoPanelCollapsed(true);
      } else if (touchDeltaY < -SCROLL_DELTA_THRESHOLD) {
        setIsInfoPanelCollapsed(false);
      }

      lastTouchYRef.current = firstTouch.clientY;
    },
    [],
  );

  const handleTouchEndCapture = useCallback(() => {
    lastTouchYRef.current = null;
  }, []);

  if (isError) {
    return (
      <div className='flex min-h-screen items-center justify-center p-8'>
        <div className='ui-panel ui-entrance w-full max-w-md rounded-[32px] p-6 text-center'>
          <div className='mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
            <TriangleAlert className='size-6' />
          </div>
          <h2 className='mt-4 text-2xl font-semibold'>
            Ups! Coś poszło nie tak
          </h2>
          <p className='mt-2 text-sm text-muted-foreground'>
            {error instanceof Error
              ? error.message
              : 'Wystąpił nieoczekiwany błąd'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className='ui-entrance mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:-translate-y-px hover:shadow-md'
          >
            <RefreshCcw className='size-4' />
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  return (
    <section
      className='flex min-h-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-sky-50/50 via-emerald-50/50 to-rose-50/50'
      onWheelCapture={handleWheelCapture}
      onTouchStartCapture={handleTouchStartCapture}
      onTouchMoveCapture={handleTouchMoveCapture}
      onTouchEndCapture={handleTouchEndCapture}
    >
      <div
        className={`overflow-hidden border-b border-white/70 bg-linear-to-r from-sky-100/70 via-white to-emerald-100/70 shadow-[0_10px_24px_-18px_rgb(15_23_42/0.35)] backdrop-blur-xl transition-all duration-300 ${
          isInfoPanelCollapsed
            ? 'max-h-0 border-transparent py-0 opacity-0'
            : 'max-h-64 px-4 py-3 opacity-100'
        }`}
      >
        <div className='mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex max-w-3xl flex-col'>
            <div className='flex items-center gap-2'>
              <Badge
                variant='secondary'
                className='gap-1.5 rounded-full px-3 py-1'
              >
                <Sparkles className='size-3' />
                Wyszukiwarka zajęć
              </Badge>

              <Badge
                variant='outline'
                className='hidden gap-1.5 rounded-full px-3 py-1 md:inline-flex'
              >
                <BriefcaseBusiness className='size-3' />
                narzędzia dla organizatorów
              </Badge>
            </div>

            <h1 className='mt-2 text-2xl font-semibold tracking-tight sm:text-3xl'>
              Z myślą o dzieciach.
            </h1>
            <p className='mt-1 text-sm leading-6 text-muted-foreground sm:text-base'>
              Odkryj zajęcia i aktywności dla Twoich dzieci. Wyszukaj idealne
              zajęcia wśród ofert w Twojej okolicy.
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground lg:justify-end'>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 shadow-sm'>
              <MapPinned className='size-3.5 text-sky-500' />
              mapa + lista
            </span>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 shadow-sm'>
              <BriefcaseBusiness className='size-3.5 text-emerald-500' />
              narzędzia dla organizatorów
            </span>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/85 px-3 py-1.5 shadow-sm'>
              <ArrowRight className='size-3.5 text-rose-500' />
              szybkie filtrowanie
            </span>
          </div>
        </div>
      </div>

      <div className='h-1 bg-linear-to-r from-sky-200 via-emerald-200 to-rose-200' />

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
        <section className='relative min-h-64 flex-1 p-4 lg:min-h-0 lg:w-3/5'>
          <Dialog
            open={isFiltersDialogOpen}
            onOpenChange={setIsFiltersDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                type='button'
                variant='secondary'
                className='absolute left-8 top-8 z-20 gap-2 rounded-full border border-white/80 bg-white/95 px-4 py-2 text-sm shadow-md backdrop-blur hover:bg-white'
              >
                <SlidersHorizontal className='h-4 w-4' />
                Filtry
              </Button>
            </DialogTrigger>
            <DialogContent className='max-h-[90dvh] max-w-[calc(100vw-2rem)] overflow-y-auto p-6 sm:max-w-[calc(100vw-3rem)] sm:p-7 lg:max-w-4xl **:data-[slot=dialog-close]:right-3 **:data-[slot=dialog-close]:top-3 **:data-[slot=dialog-close]:size-11 **:data-[slot=dialog-close]:rounded-xl [&_[data-slot=dialog-close]_svg]:size-5'>
              <DialogHeader>
                <DialogTitle>Filtry wyszukiwania</DialogTitle>
                <DialogDescription className='sr-only'>
                  Zmień filtry wyszukiwania ofert. Możesz zawęzić wyniki według
                  kategorii, typu zajęć, wieku i lokalizacji.
                </DialogDescription>
              </DialogHeader>
              <FilterPanel
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onResetFilters={handleResetFilters}
                onRemoveFilter={removeFilter}
                categories={categoriesData || []}
                offerTypes={offerTypesData || []}
                onUseCurrentLocation={handleUseCurrentLocation}
                isLoadingCurrentLocation={isLoadingLocation}
                isLoadingCategories={isLoadingCategories}
                isLoadingOfferTypes={isLoadingOfferTypes}
                variant='dialog'
                isCollapsible={false}
              />
            </DialogContent>
          </Dialog>

          <div className='h-full overflow-hidden rounded-[28px] border border-white/70 bg-white/70 shadow-sm'>
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
          onResetFilters={handleResetFilters}
          sortBy={search.sort_by}
          sortOrder={search.sort_order}
          onSortChange={handleSortChange}
          onPageChange={handlePageChange}
        />
      </div>
    </section>
  );
}
