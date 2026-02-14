import { useMemo, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { HomeMapFilters } from '../types';
import type { HomeMapSearchParams } from '../schemas';
import { DEFAULT_FILTERS } from '../types';

const LOCATION_NAME_STORAGE_KEY = 'lastLocationName';

export function useHomeMapFilters(search: HomeMapSearchParams) {
  const navigate = useNavigate({ from: '/' });

  const filters: HomeMapFilters = useMemo(() => {
    const locationName = localStorage.getItem(LOCATION_NAME_STORAGE_KEY) || '';

    return {
      min_age: search.min_age,
      max_age: search.max_age,
      categories: search.categories ? search.categories.split(',') : [],
      offer_types: search.offer_types ? search.offer_types.split(',') : [],
      location:
        search.location_lat && search.location_lon
          ? {
              lat: search.location_lat,
              lon: search.location_lon,
              name: locationName,
            }
          : null,
      radius_km: search.radius_km,
      search: search.search,
    };
  }, [search]);

  const updateFilters = useCallback(
    (newFilters: Partial<HomeMapFilters>) => {
      const merged = { ...filters, ...newFilters };

      if (merged.location) {
        localStorage.setItem(LOCATION_NAME_STORAGE_KEY, merged.location.name);
      }

      navigate({
        search: (prev) => ({
          ...prev,
          min_age: merged.min_age,
          max_age: merged.max_age,
          categories: merged.categories.length
            ? merged.categories.join(',')
            : undefined,
          offer_types: merged.offer_types.length
            ? merged.offer_types.join(',')
            : undefined,
          location_lat: merged.location?.lat,
          location_lon: merged.location?.lon,
          radius_km: merged.radius_km,
          search: merged.search,
          page: 1,
        }),
      });
    },
    [filters, navigate],
  );

  const resetFilters = useCallback(() => {
    navigate({
      search: {
        page: 1,
        sort_by: 'date_created',
        sort_order: 'desc',
      },
    });
  }, [navigate]);

  const updateSingleFilter = useCallback(
    <K extends keyof HomeMapFilters>(key: K, value: HomeMapFilters[K]) => {
      updateFilters({ [key]: value });
    },
    [updateFilters],
  );

  const removeFilter = useCallback(
    (key: keyof HomeMapFilters) => {
      const resetValue = DEFAULT_FILTERS[key];
      updateFilters({ [key]: resetValue });
    },
    [updateFilters],
  );

  return {
    filters,
    updateFilters,
    updateSingleFilter,
    removeFilter,
    resetFilters,
  };
}
