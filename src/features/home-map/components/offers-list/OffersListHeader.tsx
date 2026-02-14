import type { SortBy, SortOrder } from '../../types';
import { ResultsCount } from './ResultsCount';
import { SortSelector } from './SortSelector';

interface OffersListHeaderProps {
  totalResults: number;
  isLoading: boolean;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

export function OffersListHeader({
  totalResults,
  isLoading,
  sortBy,
  sortOrder,
  onSortChange,
}: OffersListHeaderProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <ResultsCount totalResults={totalResults} isLoading={isLoading} />
      <SortSelector
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
      />
    </div>
  );
}
