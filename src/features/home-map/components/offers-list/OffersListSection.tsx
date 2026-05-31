import type { PaginatedResponseDto, PublicOfferListItemDto } from '@/types';
import type { SortBy, SortOrder } from '../../types';
import { Button } from '@/components/ui/button';
import { OffersListHeader } from './OffersListHeader';
import { OffersList } from './OffersList';
import { OffersListPagination } from './OffersListPagination';
import { OffersListSkeleton } from './OffersListSkeleton';

interface OffersListSectionProps {
  offers: PublicOfferListItemDto[];
  pagination:
    | PaginatedResponseDto<PublicOfferListItemDto>['pagination']
    | undefined;
  isLoading: boolean;
  selectedOfferId: string | null;
  onOfferSelect: (offerId: string) => void;
  onOfferHover: (offerId: string | null) => void;
  onResetFilters: () => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  onPageChange: (page: number) => void;
}

const EMPTY_RESULTS = 0;

export function OffersListSection({
  offers,
  pagination,
  isLoading,
  selectedOfferId,
  onOfferSelect,
  onOfferHover,
  onResetFilters,
  sortBy,
  sortOrder,
  onSortChange,
  onPageChange,
}: OffersListSectionProps) {
  const totalResults = pagination?.total ?? EMPTY_RESULTS;
  const totalPages = pagination?.total_pages ?? 1;
  const currentPage = pagination?.page ?? 1;

  return (
    <section className='m-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-linear-to-br from-white/80 via-emerald-50/70 to-rose-50/70 shadow-sm lg:w-2/5'>
      <div className='border-b p-4'>
        <OffersListHeader
          totalResults={totalResults}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={onSortChange}
        />
      </div>

      <div className='flex-1 overflow-y-auto p-4' data-offers-list-scroll='true'>
        {isLoading ? (
          <OffersListSkeleton />
        ) : offers.length === EMPTY_RESULTS ? (
          <div className='flex flex-col items-center justify-center p-8 text-center'>
            <p className='mb-4 text-muted-foreground'>
              Brak ofert spełniających Twoje kryteria
            </p>
            <Button variant='outline' onClick={onResetFilters}>
              Wyczyść filtry
            </Button>
          </div>
        ) : (
          <OffersList
            offers={offers}
            selectedOfferId={selectedOfferId}
            onOfferSelect={onOfferSelect}
            onOfferHover={onOfferHover}
          />
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <OffersListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
}
