import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AgeRangeFilter } from './AgeRangeFilter';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { OfferTypeMultiSelect } from './OfferTypeMultiSelect';
import { LocationSearchInput } from './LocationSearchInput';
import { RadiusSlider } from './RadiusSlider';
import { ActiveFiltersChips } from './ActiveFiltersChips';
import type { HomeMapFilters, LocationData } from '../../types';

interface FilterPanelProps {
  filters: HomeMapFilters;
  onFiltersChange: (filters: Partial<HomeMapFilters>) => void;
  onResetFilters: () => void;
  onRemoveFilter: (filterKey: keyof HomeMapFilters) => void;
  categories: Array<{ id: string; name: string }>;
  offerTypes: Array<{ id: string; name: string }>;
  onUseCurrentLocation?: () => void;
  isLoadingCurrentLocation?: boolean;
  isLoadingCategories?: boolean;
  isLoadingOfferTypes?: boolean;
  variant?: 'inline' | 'dialog';
  isCollapsible?: boolean;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onResetFilters,
  onRemoveFilter,
  categories,
  offerTypes,
  onUseCurrentLocation,
  isLoadingCurrentLocation = false,
  isLoadingCategories = false,
  isLoadingOfferTypes = false,
  variant = 'inline',
  isCollapsible = true,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFiltersChange({ search: value || undefined });
  };

  const handleAgeChange = (
    minAge: number | undefined,
    maxAge: number | undefined,
  ) => {
    onFiltersChange({ min_age: minAge, max_age: maxAge });
  };

  const handleCategoriesChange = (categoryIds: string[]) => {
    onFiltersChange({ categories: categoryIds });
  };

  const handleOfferTypesChange = (typeIds: string[]) => {
    onFiltersChange({ offer_types: typeIds });
  };

  const handleLocationChange = (location: LocationData | null) => {
    onFiltersChange({
      location,
      radius_km: location ? filters.radius_km || 10 : undefined,
    });
  };

  const handleRadiusChange = (radiusKm: number | undefined) => {
    onFiltersChange({ radius_km: radiusKm });
  };

  const handleRemoveCategory = (categoryId: string) => {
    const newCategories = filters.categories.filter((id) => id !== categoryId);
    onFiltersChange({ categories: newCategories });
  };

  const handleRemoveOfferType = (typeId: string) => {
    const newTypes = filters.offer_types.filter((id) => id !== typeId);
    onFiltersChange({ offer_types: newTypes });
  };

  const hasActiveFilters =
    filters.min_age !== undefined ||
    filters.max_age !== undefined ||
    filters.categories.length > 0 ||
    filters.offer_types.length > 0 ||
    filters.location !== null ||
    filters.search;

  const shouldShowExpandedContent = isCollapsible ? isExpanded : true;
  const isDialogVariant = variant === 'dialog';
  const primaryFiltersGridClass = isDialogVariant
    ? 'grid grid-cols-1 gap-4 lg:grid-cols-3'
    : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';
  const secondaryFiltersGridClass = isDialogVariant
    ? 'grid grid-cols-1 gap-6 lg:grid-cols-2'
    : 'grid gap-6 sm:grid-cols-2';

  const panelHeaderAndContent = (
    <>
      <div className='flex items-center justify-between'>
        {isCollapsible ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className='flex items-center gap-2 transition-opacity hover:opacity-70'
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Zwiń filtry' : 'Rozwiń filtry'}
          >
            <Filter className='h-5 w-5 text-muted-foreground' />
            <h2 className='text-lg font-semibold'>Filtry</h2>
            {isExpanded ? (
              <ChevronUp className='h-5 w-5 text-muted-foreground' />
            ) : (
              <ChevronDown className='h-5 w-5 text-muted-foreground' />
            )}
          </button>
        ) : (
          <div className='flex items-center gap-2'>
            <Filter className='h-5 w-5 text-muted-foreground' />
            <h2 className='text-lg font-semibold'>Filtry</h2>
          </div>
        )}
        {hasActiveFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onResetFilters}
            className='gap-1 text-muted-foreground hover:text-foreground'
          >
            <X className='h-4 w-4' />
            Wyczyść wszystko
          </Button>
        )}
      </div>

      {shouldShowExpandedContent && (
        <div className='mt-4 flex flex-col gap-4'>
          <Input
            type='text'
            placeholder='Szukaj zajęć...'
            value={filters.search || ''}
            onChange={handleSearchChange}
            className='w-full border-white/60 bg-white/80 shadow-sm focus-visible:ring-sky-200'
            aria-label='Wyszukaj zajęcia'
          />

          <div className={primaryFiltersGridClass}>
            <CategoryMultiSelect
              selectedCategories={filters.categories}
              categories={categories}
              onChange={handleCategoriesChange}
              isLoading={isLoadingCategories}
            />

            <OfferTypeMultiSelect
              selectedTypes={filters.offer_types}
              offerTypes={offerTypes}
              onChange={handleOfferTypesChange}
              isLoading={isLoadingOfferTypes}
            />

            <LocationSearchInput
              location={filters.location}
              onChange={handleLocationChange}
              onUseCurrentLocation={onUseCurrentLocation}
              isLoadingCurrentLocation={isLoadingCurrentLocation}
            />
          </div>

          <div className={secondaryFiltersGridClass}>
            <AgeRangeFilter
              minAge={filters.min_age}
              maxAge={filters.max_age}
              onChange={handleAgeChange}
            />

            <RadiusSlider
              radiusKm={filters.radius_km}
              onChange={handleRadiusChange}
              disabled={!filters.location}
            />
          </div>

          {hasActiveFilters && (
            <div className='pt-2'>
              <ActiveFiltersChips
                filters={filters}
                onRemoveFilter={onRemoveFilter}
                onRemoveCategory={handleRemoveCategory}
                onRemoveOfferType={handleRemoveOfferType}
                categoriesData={categories}
                offerTypesData={offerTypes}
              />
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div
      className={
        isDialogVariant
          ? 'w-full'
          : 'border-b border-white/50 bg-linear-to-r from-white/70 via-emerald-50/70 to-rose-50/70 backdrop-blur'
      }
    >
      <div className={isDialogVariant ? 'w-full' : 'p-4 lg:p-6'}>
        {isDialogVariant ? (
          panelHeaderAndContent
        ) : (
          <Card className='border-white/60 bg-white/80 shadow-sm'>
            <CardContent className='px-4 py-0 lg:px-6 lg:py-0'>
              {panelHeaderAndContent}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
