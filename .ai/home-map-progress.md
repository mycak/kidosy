# Home Map View - Progress Log

## ✅ Ukończone (Krok 1-3 z planu implementacji)

### Krok 1: Setup projektu i zależności ✅

**Zainstalowane pakiety:**

- ✅ `@googlemaps/markerclusterer` - klasterowanie markerów na mapie
- ✅ TanStack Router i TanStack Query (już zainstalowane)
- ✅ Zod (już zainstalowany)
- ✅ Lucide React (już zainstalowany)

**Konfiguracja:**

- ✅ TanStack Router skonfigurowany z generowaniem routeTree
- ✅ TanStack Query skonfigurowany z domyślnymi opcjami (5min staleTime, retry logic)
- ✅ Plik konfiguracyjny `tsr.config.json` dla automatycznej generacji routów
- ✅ `.env.example` z przykładowymi zmiennymi środowiskowymi

### Krok 2: Definicja typów i schemas ✅

**Utworzone pliki:**

- ✅ `src/features/home-map/types.ts` - ViewModels i typy klienckie
  - `HomeMapFilters` - stan filtrów
  - `LocationData` - dane lokalizacji
  - `MapCenter` - centrum mapy
  - `PaginationMeta` - metadane paginacji
  - `SortBy`, `SortOrder` - typy sortowania
  - Stałe: `DEFAULT_FILTERS`, `RADIUS_OPTIONS`, `AGE_OPTIONS`, etc.

- ✅ `src/features/home-map/schemas.ts` - Zod schemas dla walidacji
  - `locationDataSchema` - walidacja współrzędnych
  - `homeMapFiltersSchema` - walidacja filtrów z logiką (max_age >= min_age)
  - `homeMapSearchParamsSchema` - walidacja query params z URL

### Krok 3: API integration layer ✅

**Utworzone pliki:**

- ✅ `src/features/home-map/api/query-keys.ts` - klucze cache dla TanStack Query
- ✅ `src/features/home-map/api/offers.ts` - `fetchOffers()`
- ✅ `src/features/home-map/api/dictionaries.ts` - `fetchCategories()`, `fetchOfferTypes()`
- ✅ `src/features/home-map/api/queries.ts` - React Query hooks:
  - `useOffersQuery()` - z placeholderData dla płynnej paginacji
  - `useCategoriesQuery()` - z 1h cache (dane rzadko się zmieniają)
  - `useOfferTypesQuery()` - z 1h cache

### Krok 4: Custom hooks ✅

**Utworzone pliki:**

- ✅ `src/features/home-map/hooks/useHomeMapFilters.ts`
  - Parse URL params do filtrów
  - `updateFilters()` - aktualizacja URL i localStorage
  - `resetFilters()` - reset do wartości domyślnych
  - `updateSingleFilter()` - aktualizacja pojedynczego filtra
  - `removeFilter()` - usunięcie filtra

- ✅ `src/features/home-map/hooks/useGoogleMapsLoader.ts`
  - Ładowanie Google Maps API
  - Error handling
  - Obsługa braku API key

- ✅ `src/features/home-map/hooks/useGeolocation.ts`
  - `getCurrentLocation()` - pobieranie lokalizacji użytkownika
  - `reverseGeocode()` - konwersja współrzędnych na nazwę miejsca
  - Error handling dla wszystkich przypadków (PERMISSION_DENIED, TIMEOUT, etc.)

### Routing i struktura ✅

**Utworzone pliki:**

- ✅ `src/routes/__root.tsx` - root route z Outlet i DevTools
- ✅ `src/routes/index.tsx` - route dla strony głównej z walidacją search params
- ✅ `src/routeTree.gen.ts` - automatycznie generowany przez TanStack Router CLI
- ✅ `src/router.ts` - konfiguracja routera z deklaracją modułu
- ✅ `src/App.tsx` - zaktualizowany z QueryClientProvider i RouterProvider

### Komponent główny (MVP) ✅

**Utworzone pliki:**

- ✅ `src/features/home-map/components/HomeMapView.tsx` - główny widok strony
  - Integracja z TanStack Router (search params)
  - Integracja z TanStack Query (pobieranie ofert)
  - Podstawowy layout (header + mapa placeholder + lista)
  - Error state
  - Empty state
  - Loading state
  - Podstawowa lista ofert z kliknięciem

## 📊 Status implementacji

**Ukończone:** Kroki 1-4 (setup, typy, API, hooki, podstawowy widok)
**Do zrobienia:** Kroki 5-14 (komponenty UI, testy, optymalizacja)

**Procent ukończenia:** ~30% (4/14 kroków)

## 🚀 Co działa obecnie:

1. ✅ Aplikacja kompiluje się bez błędów TypeScript
2. ✅ Serwer deweloperski uruchomiony na http://localhost:5173/
3. ✅ Podstawowy routing działający (strona główna `/`)
4. ✅ Query params w URL (można testować np. `/?page=2&min_age=5`)
5. ✅ Podstawowa struktura widoku (header + placeholder mapy + lista)
6. ✅ TanStack Query DevTools dostępne w trybie dev
7. ✅ TanStack Router DevTools dostępne w trybie dev

## 📝 Następne kroki (Krok 5-7):

### Priorytet 1: Komponenty filtrów (Krok 5)

- [ ] `FilterPanel.tsx` - główny kontener filtrów
- [ ] `AgeRangeFilter.tsx` - wybór zakresu wiekowego
- [ ] `CategoryMultiSelect.tsx` - multi-select kategorii
- [ ] `OfferTypeMultiSelect.tsx` - multi-select typów
- [ ] `LocationSearchInput.tsx` - Google Places Autocomplete
- [ ] `RadiusSlider.tsx` - slider promienia
- [ ] `ActiveFiltersChips.tsx` - wyświetlanie aktywnych filtrów
- [ ] `FilterChip.tsx` - pojedynczy chip

### Priorytet 2: Komponenty mapy (Krok 6)

- [ ] `MapSection.tsx` - sekcja z mapą
- [ ] `GoogleMapContainer.tsx` - wrapper Google Maps
- [ ] `OfferQuickPreview.tsx` - szybki podgląd oferty
- [ ] `MapLoadingSkeleton.tsx` - skeleton loader
- [ ] Funkcje pomocnicze dla markerów i klastrów

### Priorytet 3: Komponenty listy (Krok 7)

- [ ] `OffersListSection.tsx` - sekcja z listą
- [ ] `OffersListHeader.tsx` - nagłówek z licznikiem i sortowaniem
- [ ] `ResultsCount.tsx` - licznik wyników
- [ ] `SortSelector.tsx` - wybór sortowania
- [ ] `OffersList.tsx` - lista ofert
- [ ] `OfferCard.tsx` - karta oferty
- [ ] `OffersListPagination.tsx` - paginacja
- [ ] `OffersListSkeleton.tsx` - skeleton loader

## 🔧 Uwagi techniczne:

- **TanStack Router**: Używa file-based routing, automatyczne generowanie routeTree
- **Cache strategy**: 5min dla ofert, 1h dla słowników (categories/types)
- **Error handling**: Retry logic dla 5xx, brak retry dla 4xx
- **localStorage**: Zapamiętywanie nazwy ostatniej lokalizacji
- **Type safety**: Pełna integracja TypeScript z router types

## 📦 Struktura katalogów:

```
src/features/home-map/
├── api/
│   ├── dictionaries.ts
│   ├── offers.ts
│   ├── queries.ts
│   └── query-keys.ts
├── components/
│   ├── filters/         (do zrobienia)
│   ├── map/            (do zrobienia)
│   ├── offers-list/    (do zrobienia)
│   ├── shared/         (do zrobienia)
│   └── HomeMapView.tsx ✅
├── hooks/
│   ├── useGeolocation.ts ✅
│   ├── useGoogleMapsLoader.ts ✅
│   └── useHomeMapFilters.ts ✅
├── schemas.ts ✅
└── types.ts ✅
```

## 🎯 Szacowany czas pozostały:

- Krok 5 (Filtry): 8-10h
- Krok 6 (Mapa): 10-12h
- Krok 7 (Lista): 8-10h
- Kroki 8-14: ~40h

**Łącznie pozostało:** ~65-75h roboczych
