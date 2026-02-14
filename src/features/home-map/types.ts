/**
 * ViewModel types for Home Map View
 * These types represent the client-side state and differ from API DTOs
 */

export interface HomeMapFilters {
  min_age: number | undefined;
  max_age: number | undefined;
  categories: string[];
  offer_types: string[];
  location: LocationData | null;
  radius_km: number | undefined;
  search: string | undefined;
}

export interface LocationData {
  lat: number;
  lon: number;
  name: string;
}

export interface MapCenter {
  lat: number;
  lng: number;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  perPage: number;
}

export type SortBy = 'distance' | 'relevance' | 'date_created' | 'date_updated';
export type SortOrder = 'asc' | 'desc';

export interface SortState {
  sortBy: SortBy;
  sortOrder: SortOrder;
}

export const DEFAULT_FILTERS: HomeMapFilters = {
  min_age: undefined,
  max_age: undefined,
  categories: [],
  offer_types: [],
  location: null,
  radius_km: 10,
  search: undefined,
};

export const DEFAULT_SORT_STATE: SortState = {
  sortBy: 'date_created',
  sortOrder: 'desc',
};

export const RADIUS_OPTIONS = [5, 10, 20, 50] as const;
export const RADIUS_MIN = 5;
export const RADIUS_MAX = 50;
export const RADIUS_STEP = 5;
export const RADIUS_DEFAULT = 10;

export const AGE_OPTIONS = Array.from({ length: 15 }, (_, i) => i + 3);

export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;
