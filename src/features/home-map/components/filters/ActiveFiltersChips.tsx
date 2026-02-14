import { FilterChip } from './FilterChip';
import type { HomeMapFilters } from '../../types';

interface ActiveFiltersChipsProps {
  filters: HomeMapFilters;
  onRemoveFilter: (filterKey: keyof HomeMapFilters) => void;
  onRemoveCategory: (categoryId: string) => void;
  onRemoveOfferType: (offerTypeId: string) => void;
  categoriesData?: Array<{ id: string; name: string }>;
  offerTypesData?: Array<{ id: string; name: string }>;
}

export function ActiveFiltersChips({
  filters,
  onRemoveFilter,
  onRemoveCategory,
  onRemoveOfferType,
  categoriesData = [],
  offerTypesData = [],
}: ActiveFiltersChipsProps) {
  const hasActiveFilters =
    filters.min_age !== undefined ||
    filters.max_age !== undefined ||
    filters.categories.length > 0 ||
    filters.offer_types.length > 0 ||
    filters.location !== null ||
    filters.search;

  if (!hasActiveFilters) {
    return null;
  }

  const ageLabel =
    filters.min_age !== undefined && filters.max_age !== undefined
      ? `Wiek: ${filters.min_age}-${filters.max_age} lat`
      : filters.min_age !== undefined
        ? `Wiek od ${filters.min_age} lat`
        : filters.max_age !== undefined
          ? `Wiek do ${filters.max_age} lat`
          : null;

  return (
    <div className='flex flex-wrap gap-2'>
      {ageLabel && (
        <FilterChip
          label={ageLabel}
          onRemove={() => {
            onRemoveFilter('min_age');
            onRemoveFilter('max_age');
          }}
        />
      )}

      {filters.categories.map((categoryId) => {
        const category = categoriesData.find((c) => c.id === categoryId);
        return (
          <FilterChip
            key={categoryId}
            label={category?.name || categoryId}
            onRemove={() => onRemoveCategory(categoryId)}
          />
        );
      })}

      {filters.offer_types.map((typeId) => {
        const type = offerTypesData.find((t) => t.id === typeId);
        return (
          <FilterChip
            key={typeId}
            label={type?.name || typeId}
            onRemove={() => onRemoveOfferType(typeId)}
          />
        );
      })}

      {filters.location && (
        <FilterChip
          label={filters.location.name || 'Lokalizacja'}
          onRemove={() => onRemoveFilter('location')}
          variant='location'
        />
      )}

      {filters.search && (
        <FilterChip
          label={`Szukaj: "${filters.search}"`}
          onRemove={() => onRemoveFilter('search')}
        />
      )}
    </div>
  );
}
