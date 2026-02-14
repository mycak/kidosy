# Plan implementacji widoku: Strona Główna z Mapą i Filtrowaniem

## 1. Przegląd

Strona główna aplikacji Kidosy to kluczowy widok umożliwiający rodzicom przeglądanie i wyszukiwanie zajęć dodatkowych dla dzieci. Widok składa się z interaktywnej mapy Google Maps przedstawiającej oferty jako sklasteryzowane markery oraz panelu filtrów umożliwiającego wielokryterialne wyszukiwanie (wiek dziecka, kategoria zajęć, typ oferty, lokalizacja geograficzna, promień wyszukiwania).

Dodatkowo widok zawiera listę wyników synchronizowaną z mapą, umożliwiającą alternatywny sposób przeglądania ofert. Kluczowe cele to:

- Szybkie odkrywanie dostępnych zajęć w okolicy użytkownika
- Intuicyjne filtrowanie według wielu kryteriów jednocześnie
- Responsywny design działający na urządzeniach mobilnych i desktopowych
- Wysoka wydajność (ładowanie mapy < 3s, aktualizacja filtrów w czasie rzeczywistym)
- Dostępność zgodna z WCAG AA

---

## 2. Routing widoku

**Ścieżka:** `/`

**Konfiguracja routingu (TanStack Router):**

```typescript
// src/routes/index.tsx
export const Route = createFileRoute('/')({
  component: HomeMapView,
  validateSearch: (search: Record<string, unknown>) => {
    return homeMapSearchParamsSchema.parse(search);
  },
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps: { search } }) => {
    // Prefetch offers data based on search params
    return queryClient.ensureQueryData(offersQueryOptions(search));
  },
});
```

**Query parameters** (zachowywane w URL dla deep linking i bookmarking):

- `min_age` - minimalny wiek dziecka (number)
- `max_age` - maksymalny wiek dziecka (number)
- `categories` - identyfikatory kategorii rozdzielone przecinkami (string)
- `offer_types` - identyfikatory typów ofert rozdzielone przecinkami (string)
- `location_lat` - szerokość geograficzna centrum wyszukiwania (number)
- `location_lon` - długość geograficzna centrum wyszukiwania (number)
- `radius_km` - promień wyszukiwania w km (number)
- `search` - wyszukiwanie pełnotekstowe (string)
- `page` - numer strony wyników (number, default: 1)

---

## 3. Struktura komponentów

```
HomeMapView (page)
├── FilterPanel
│   ├── AgeRangeFilter
│   ├── CategoryMultiSelect
│   ├── OfferTypeMultiSelect
│   ├── LocationSearchInput
│   │   └── GooglePlacesAutocomplete
│   ├── RadiusSlider
│   └── ActiveFiltersChips
│       └── FilterChip
├── MapSection
│   ├── GoogleMapContainer
│   │   ├── MarkerClusterer
│   │   └── OfferMarker
│   ├── OfferQuickPreview (modal/popup)
│   └── MapLoadingSkeleton
├── OffersListSection
│   ├── OffersListHeader
│   │   ├── ResultsCount
│   │   └── SortSelector
│   ├── OffersList
│   │   └── OfferCard
│   ├── OffersListPagination
│   └── OffersListSkeleton
└── EmptyState
```

**Layout:**

- Desktop (≥1024px): Split panel - mapa po lewej (60%), lista po prawej (40%)
- Tablet (768-1023px): Split panel - mapa po lewej (50%), lista po prawej (50%)
- Mobile (<768px): Toggle między mapą a listą, filtry w bottom sheet

---

## 4. Szczegóły komponentów

### 4.1. `HomeMapView` (strona główna)

**Opis:** Główny komponent widoku, orkiestruje przepływ danych między filtrami, mapą i listą ofert. Zarządza stanem filtrów, pobieraniem danych z API, synchronizacją URL z parametrami wyszukiwania oraz komunikacją między komponentami potomnymi.

**Główne elementy:**

```tsx
<main className='h-screen flex flex-col'>
  <header>{/* Navigation, logo */}</header>

  <FilterPanel filters={filters} onFiltersChange={handleFiltersChange} />

  <div className='flex-1 flex flex-col lg:flex-row'>
    <MapSection
      offers={offersData}
      selectedOfferId={selectedOfferId}
      onOfferSelect={handleOfferSelect}
      center={mapCenter}
    />

    <OffersListSection
      offers={offersData}
      selectedOfferId={selectedOfferId}
      onOfferSelect={handleOfferSelect}
      pagination={paginationData}
      onPageChange={handlePageChange}
    />
  </div>

  {offersData.length === 0 && <EmptyState />}
</main>
```

**Obsługiwane zdarzenia:**

- `onFiltersChange(newFilters)` - zmiana filtrów, aktualizacja URL i refetch danych
- `onOfferSelect(offerId)` - kliknięcie w ofertę (marker lub card), synchronizacja widoków
- `onPageChange(page)` - zmiana strony listy wyników
- `onMapCenterChange(lat, lon)` - przesunięcie mapy przez użytkownika (opcjonalnie aktualizuje filtry lokalizacji)

**Warunki walidacji:**

- Filtry są walidowane schema Zod przed wysłaniem do API
- Query params w URL są parsowane i walidowane przez TanStack Router
- Współrzędne geograficzne muszą być w zakresie: lat ∈ [-90, 90], lon ∈ [-180, 180]
- Promień musi być > 0
- Wiek min/max musi być >= 0, max >= min

**Typy:**

- `HomeMapFilters` (ViewModel)
- `OfferListQueryDto` (API Request)
- `PaginatedResponseDto<PublicOfferListItemDto>` (API Response)

**Propsy:** Brak (główny komponent routowanej strony)

---

### 4.2. `FilterPanel`

**Opis:** Panel poziomy (desktop) lub bottom sheet (mobile) zawierający wszystkie dostępne filtry. Umożliwia wielokryterialne wyszukiwanie ofert. Wyświetla aktywne filtry jako chips z możliwością szybkiego usunięcia. Komunikuje zmiany filtrów do rodzica poprzez callback.

**Główne elementy:**

```tsx
<section className='bg-white border-b p-4 lg:p-6'>
  <div className='flex flex-wrap gap-4'>
    <AgeRangeFilter
      minAge={filters.min_age}
      maxAge={filters.max_age}
      onChange={handleAgeChange}
    />

    <CategoryMultiSelect
      selectedCategories={filters.categories}
      onChange={handleCategoriesChange}
    />

    <OfferTypeMultiSelect
      selectedTypes={filters.offer_types}
      onChange={handleTypesChange}
    />

    <LocationSearchInput
      location={filters.location}
      onChange={handleLocationChange}
    />

    <RadiusSlider radiusKm={filters.radius_km} onChange={handleRadiusChange} />

    <Button variant='ghost' onClick={handleResetFilters}>
      Wyczyść filtry
    </Button>
  </div>

  <ActiveFiltersChips filters={filters} onRemoveFilter={handleRemoveFilter} />
</section>
```

**Obsługiwane zdarzenia:**

- `onChange(filterKey, value)` - zmiana pojedynczego filtra
- `onReset()` - reset wszystkich filtrów do wartości domyślnych
- `onRemoveFilter(filterKey)` - usunięcie pojedynczego filtra

**Warunki walidacji:**

- Każdy sub-komponent waliduje swoje dane przed przekazaniem do rodzica
- Nie dopuszcza nieprawidłowych wartości (np. wiek ujemny, nieprawidłowy UUID)

**Typy:**

- `HomeMapFilters` (ViewModel)
- `FilterPanelProps` (Component Interface)

**Propsy:**

```typescript
interface FilterPanelProps {
  filters: HomeMapFilters;
  onFiltersChange: (newFilters: Partial<HomeMapFilters>) => void;
  isLoading?: boolean;
}
```

---

### 4.3. `AgeRangeFilter`

**Opis:** Komponent do wyboru zakresu wiekowego dziecka. Implementuje dual-range slider lub dwa osobne selecty z predefiniowanymi przedziałami wiekowymi (3-5, 6-8, 9-12, 13+) oraz możliwością ręcznego ustawienia wartości.

**Główne elementy:**

```tsx
<div className='flex items-center gap-2'>
  <Label htmlFor='min-age'>Wiek:</Label>

  <Select
    value={minAge?.toString()}
    onValueChange={(val) => onChange(parseInt(val), maxAge)}
  >
    <SelectTrigger id='min-age' className='w-20'>
      <SelectValue placeholder='Od' />
    </SelectTrigger>
    <SelectContent>
      {AGE_OPTIONS.map((age) => (
        <SelectItem key={age} value={age.toString()}>
          {age}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>

  <span>-</span>

  <Select
    value={maxAge?.toString()}
    onValueChange={(val) => onChange(minAge, parseInt(val))}
  >
    <SelectTrigger className='w-20'>
      <SelectValue placeholder='Do' />
    </SelectTrigger>
    <SelectContent>
      {AGE_OPTIONS.map((age) => (
        <SelectItem key={age} value={age.toString()}>
          {age}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Obsługiwane zdarzenia:**

- `onChange(minAge, maxAge)` - zmiana przedziału wiekowego

**Warunki walidacji:**

- `minAge` >= 0
- `maxAge` >= `minAge`
- Wartości muszą być liczbami całkowitymi

**Typy:**

- `number | undefined` dla min/max age

**Propsy:**

```typescript
interface AgeRangeFilterProps {
  minAge: number | undefined;
  maxAge: number | undefined;
  onChange: (minAge: number | undefined, maxAge: number | undefined) => void;
}
```

---

### 4.4. `CategoryMultiSelect`

**Opis:** Multi-select dropdown do wyboru kategorii zajęć (sport, artystyczne, edukacyjne, itp.). Pobiera dostępne kategorie z endpointu `/dictionaries/categories` i wyświetla je z ikonami i kolorami. Obsługuje zaznaczanie wielu kategorii jednocześnie. Pokazuje licznik wybranych kategorii.

**Główne elementy:**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant='outline' className='gap-2'>
      <FilterIcon className='h-4 w-4' />
      Kategorie
      {selectedCategories.length > 0 && (
        <Badge variant='secondary'>{selectedCategories.length}</Badge>
      )}
    </Button>
  </PopoverTrigger>

  <PopoverContent className='w-80'>
    <div className='space-y-2'>
      <Input
        placeholder='Szukaj kategorii...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className='max-h-64 overflow-y-auto space-y-1'>
        {filteredCategories.map((category) => (
          <div key={category.id} className='flex items-center gap-2'>
            <Checkbox
              id={`category-${category.id}`}
              checked={selectedCategories.includes(category.id)}
              onCheckedChange={(checked) => handleToggle(category.id, checked)}
            />
            <Label
              htmlFor={`category-${category.id}`}
              className='flex items-center gap-2 cursor-pointer'
            >
              <span style={{ color: category.color }}>{category.icon}</span>
              {category.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  </PopoverContent>
</Popover>
```

**Obsługiwane zdarzenia:**

- `onChange(selectedCategoryIds)` - zmiana zaznaczonych kategorii
- `onSearch(query)` - filtrowanie listy kategorii w czasie rzeczywistym

**Warunki walidacji:**

- Każdy wybrany ID musi być prawidłowym UUID
- Lista kategorii musi być pusta lub zawierać tylko istniejące kategorie

**Typy:**

- `CategoryDto[]` (z API)
- `string[]` (selectedCategories - array UUID)

**Propsy:**

```typescript
interface CategoryMultiSelectProps {
  selectedCategories: string[];
  onChange: (categoryIds: string[]) => void;
}
```

---

### 4.5. `OfferTypeMultiSelect`

**Opis:** Multi-select dropdown do wyboru typów ofert (zajęcia cykliczne, kolonie, półkolonie, obozy). Podobny do CategoryMultiSelect, ale z endpointu `/dictionaries/types`. Wyświetla typy z ikonami i opisami.

**Główne elementy:**

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant='outline' className='gap-2'>
      <ListIcon className='h-4 w-4' />
      Typ zajęć
      {selectedTypes.length > 0 && (
        <Badge variant='secondary'>{selectedTypes.length}</Badge>
      )}
    </Button>
  </PopoverTrigger>

  <PopoverContent className='w-80'>
    <div className='space-y-1'>
      {offerTypes.map((type) => (
        <div key={type.id} className='flex items-center gap-2'>
          <Checkbox
            id={`type-${type.id}`}
            checked={selectedTypes.includes(type.id)}
            onCheckedChange={(checked) => handleToggle(type.id, checked)}
          />
          <Label htmlFor={`type-${type.id}`} className='flex-1 cursor-pointer'>
            <div className='font-medium'>{type.name}</div>
            <div className='text-sm text-muted-foreground'>
              {type.description}
            </div>
          </Label>
        </div>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

**Obsługiwane zdarzenia:**

- `onChange(selectedTypeIds)` - zmiana zaznaczonych typów

**Warunki walidacji:**

- Każdy wybrany ID musi być prawidłowym UUID
- Lista typów musi być pusta lub zawierać tylko istniejące typy

**Typy:**

- `OfferTypeDto[]` (z API)
- `string[]` (selectedTypes - array UUID)

**Propsy:**

```typescript
interface OfferTypeMultiSelectProps {
  selectedTypes: string[];
  onChange: (typeIds: string[]) => void;
}
```

---

### 4.6. `LocationSearchInput`

**Opis:** Input z Google Places Autocomplete do wyszukiwania lokalizacji. Po wyborze miasta/adresu zwraca współrzędne geograficzne. Ma dodatkowy przycisk "Użyj mojej lokalizacji" korzystający z Geolocation API przeglądarki.

**Główne elementy:**

```tsx
<div className='flex items-center gap-2'>
  <div className='relative flex-1'>
    <MapPinIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />

    <Input
      ref={autocompleteInputRef}
      type='text'
      placeholder='Wpisz miasto lub adres...'
      value={locationQuery}
      onChange={(e) => setLocationQuery(e.target.value)}
      className='pl-10'
    />
  </div>

  <Button
    variant='outline'
    size='icon'
    onClick={handleUseMyLocation}
    disabled={isGettingLocation}
    title='Użyj mojej lokalizacji'
  >
    {isGettingLocation ? (
      <Loader2Icon className='h-4 w-4 animate-spin' />
    ) : (
      <NavigationIcon className='h-4 w-4' />
    )}
  </Button>
</div>
```

**Obsługiwane zdarzenia:**

- `onChange(location)` - zmiana lokalizacji (zawiera lat, lon, nazwę miejsca)
- `onUseMyLocation()` - kliknięcie przycisku geolokalizacji
- `onPlaceSelect(place)` - użytkownik wybrał miejsce z autocomplete

**Warunki walidacji:**

- Współrzędne muszą być prawidłowymi liczbami: lat ∈ [-90, 90], lon ∈ [-180, 180]
- Nazwa miejsca nie może być pusta po wyborze z autocomplete

**Typy:**

- `LocationData` (ViewModel)
- `google.maps.places.PlaceResult` (Google Maps API)

**Propsy:**

```typescript
interface LocationSearchInputProps {
  location: LocationData | undefined;
  onChange: (location: LocationData | undefined) => void;
}

interface LocationData {
  lat: number;
  lon: number;
  placeName: string;
}
```

---

### 4.7. `RadiusSlider`

**Opis:** Slider do wyboru promienia wyszukiwania w kilometrach (5, 10, 20, 50 km). Wyświetla aktualnie wybraną wartość obok slidera. Aktywny tylko gdy ustawiona jest lokalizacja.

**Główne elementy:**

```tsx
<div className='flex items-center gap-4 w-full max-w-xs'>
  <Label htmlFor='radius-slider' className='whitespace-nowrap'>
    Promień:
  </Label>

  <Slider
    id='radius-slider'
    min={RADIUS_MIN}
    max={RADIUS_MAX}
    step={RADIUS_STEP}
    value={[radiusKm || RADIUS_DEFAULT]}
    onValueChange={([value]) => onChange(value)}
    disabled={!hasLocation}
    className='flex-1'
  />

  <span className='text-sm font-medium w-12 text-right'>
    {radiusKm || RADIUS_DEFAULT} km
  </span>
</div>
```

**Obsługiwane zdarzenia:**

- `onChange(radiusKm)` - zmiana promienia

**Warunki walidacji:**

- Promień musi być > 0
- Promień musi być w zakresie [5, 50] km (predefiniowane wartości)

**Typy:**

- `number | undefined` dla radiusKm

**Propsy:**

```typescript
interface RadiusSliderProps {
  radiusKm: number | undefined;
  onChange: (radiusKm: number | undefined) => void;
  hasLocation: boolean;
}
```

---

### 4.8. `ActiveFiltersChips`

**Opis:** Wyświetla aktywne filtry jako chips (tags) z przyciskiem do usunięcia każdego filtra osobno. Pomaga użytkownikowi zobaczyć, które filtry są aktywne i szybko je wyczyścić.

**Główne elementy:**

```tsx
<div
  className='flex flex-wrap gap-2 mt-3'
  role='list'
  aria-label='Aktywne filtry'
>
  {filters.min_age !== undefined && (
    <FilterChip
      label={`Wiek: ${filters.min_age}-${filters.max_age || '+'}`}
      onRemove={() => onRemoveFilter('age')}
    />
  )}

  {filters.categories.length > 0 && (
    <FilterChip
      label={`Kategorie: ${filters.categories.length}`}
      onRemove={() => onRemoveFilter('categories')}
    />
  )}

  {filters.offer_types.length > 0 && (
    <FilterChip
      label={`Typy: ${filters.offer_types.length}`}
      onRemove={() => onRemoveFilter('offer_types')}
    />
  )}

  {filters.location && (
    <FilterChip
      label={`${filters.location.placeName} (${filters.radius_km}km)`}
      onRemove={() => onRemoveFilter('location')}
    />
  )}

  {filters.search && (
    <FilterChip
      label={`"${filters.search}"`}
      onRemove={() => onRemoveFilter('search')}
    />
  )}
</div>
```

**Obsługiwane zdarzenia:**

- `onRemoveFilter(filterKey)` - usunięcie pojedynczego filtra

**Warunki walidacji:** Brak (tylko wyświetlanie)

**Typy:**

- `HomeMapFilters` (ViewModel)

**Propsy:**

```typescript
interface ActiveFiltersChipsProps {
  filters: HomeMapFilters;
  onRemoveFilter: (filterKey: keyof HomeMapFilters) => void;
}
```

---

### 4.9. `FilterChip`

**Opis:** Pojedynczy chip reprezentujący aktywny filtr. Zawiera label i przycisk "X" do usunięcia.

**Główne elementy:**

```tsx
<Badge variant='secondary' className='gap-1 pr-1' role='listitem'>
  <span>{label}</span>
  <Button
    variant='ghost'
    size='icon'
    className='h-4 w-4 p-0'
    onClick={onRemove}
    aria-label={`Usuń filtr ${label}`}
  >
    <XIcon className='h-3 w-3' />
  </Button>
</Badge>
```

**Obsługiwane zdarzenia:**

- `onRemove()` - kliknięcie przycisku usunięcia

**Warunki walidacji:** Brak

**Typy:** Brak specyficznych

**Propsy:**

```typescript
interface FilterChipProps {
  label: string;
  onRemove: () => void;
}
```

---

### 4.10. `MapSection`

**Opis:** Sekcja zawierająca Google Maps z markerami ofert i funkcjonalnością klasterowania. Wyświetla loading skeleton podczas ładowania mapy. Obsługuje kliknięcia w markery i pokazuje quick preview oferty.

**Główne elementy:**

```tsx
<section className='relative flex-1 lg:w-3/5' aria-label='Mapa z ofertami'>
  {isLoading ? (
    <MapLoadingSkeleton />
  ) : (
    <>
      <GoogleMapContainer
        offers={offers}
        center={center}
        selectedOfferId={selectedOfferId}
        onOfferSelect={onOfferSelect}
        onCenterChange={onCenterChange}
      />

      {selectedOfferId && (
        <OfferQuickPreview
          offerId={selectedOfferId}
          onClose={() => onOfferSelect(null)}
        />
      )}
    </>
  )}
</section>
```

**Obsługiwane zdarzenia:**

- `onOfferSelect(offerId)` - kliknięcie w marker
- `onCenterChange(lat, lon)` - przesunięcie mapy (opcjonalne)
- `onZoomChange(zoom)` - zmiana zoom (opcjonalne)

**Warunki walidacji:** Brak (dane są już zwalidowane)

**Typy:**

- `PublicOfferListItemDto[]` (offers)
- `MapCenter` (ViewModel)

**Propsy:**

```typescript
interface MapSectionProps {
  offers: PublicOfferListItemDto[];
  selectedOfferId: string | null;
  onOfferSelect: (offerId: string | null) => void;
  center: MapCenter | undefined;
  isLoading?: boolean;
}

interface MapCenter {
  lat: number;
  lng: number;
}
```

---

### 4.11. `GoogleMapContainer`

**Opis:** Wrapper dla Google Maps JavaScript API. Inicjalizuje mapę, renderuje markery ofert z klasterowaniem (MarkerClusterer), obsługuje interakcje użytkownika. Wykorzystuje `@googlemaps/js-api-loader` i `@googlemaps/markerclusterer`.

**Główne elementy:**

```tsx
<div
  ref={mapRef}
  className='w-full h-full'
  role='application'
  aria-label='Interaktywna mapa ofert'
>
  {/* Google Maps renderuje się w tym divie */}
</div>
```

**Obsługiwane zdarzenia:**

- `onClick(marker)` - kliknięcie w marker oferty
- `onDragEnd()` - przesunięcie mapy
- `onZoomChanged()` - zmiana poziomu zoom

**Warunki walidacji:**

- API key Google Maps musi być skonfigurowany
- Współrzędne centrum mapy muszą być prawidłowe

**Typy:**

- `PublicOfferListItemDto[]` (offers)
- `google.maps.Map` (Google Maps API)
- `google.maps.Marker` (Google Maps API)

**Propsy:**

```typescript
interface GoogleMapContainerProps {
  offers: PublicOfferListItemDto[];
  center: MapCenter | undefined;
  selectedOfferId: string | null;
  onOfferSelect: (offerId: string | null) => void;
  onCenterChange?: (center: MapCenter) => void;
}
```

---

### 4.12. `OfferMarker`

**Opis:** Komponent reprezentujący pojedynczy marker oferty na mapie (w rzeczywistości to helper do tworzenia Google Maps Marker, nie React komponent). Zawiera logikę tworzenia custom ikony markera z numerem dostępnych miejsc.

**Główne elementy:** N/A (helper function/class dla Google Maps)

**Obsługiwane zdarzenia:**

- `onClick` - kliknięcie w marker

**Warunki walidacji:** Brak

**Typy:**

- `PublicOfferListItemDto` (offer data)

**Propsy:** N/A (funkcja pomocnicza)

---

### 4.13. `OfferQuickPreview`

**Opis:** Modal/popup wyświetlający szybki podgląd oferty po kliknięciu w marker na mapie. Zawiera podstawowe informacje: nazwę, kategorię, wiek, lokalizację, pierwsze zdjęcie oraz link "Zobacz szczegóły" prowadzący do pełnej strony oferty.

**Główne elementy:**

```tsx
<Card className='absolute bottom-4 left-4 right-4 lg:right-auto lg:w-96 shadow-lg z-10'>
  <CardHeader className='relative'>
    <Button
      variant='ghost'
      size='icon'
      className='absolute right-2 top-2'
      onClick={onClose}
      aria-label='Zamknij podgląd'
    >
      <XIcon className='h-4 w-4' />
    </Button>

    {offer.images[0] && (
      <img
        src={offer.images[0].storage_path}
        alt={offer.title}
        className='w-full h-32 object-cover rounded-t-lg'
      />
    )}
  </CardHeader>

  <CardContent className='space-y-2'>
    <CardTitle className='text-lg'>{offer.title}</CardTitle>

    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
      <UsersIcon className='h-4 w-4' />
      <span>Wiek: {formatAgeRange(offer.ages)}</span>
    </div>

    <div className='flex items-center gap-2 text-sm text-muted-foreground'>
      <MapPinIcon className='h-4 w-4' />
      <span>{offer.address}</span>
    </div>

    <div className='flex flex-wrap gap-1'>
      {offer.categories.map((cat) => (
        <Badge key={cat.id} variant='outline'>
          {cat.name}
        </Badge>
      ))}
    </div>
  </CardContent>

  <CardFooter>
    <Button asChild className='w-full'>
      <Link to='/offers/$offerId' params={{ offerId: offer.id }}>
        Zobacz szczegóły
      </Link>
    </Button>
  </CardFooter>
</Card>
```

**Obsługiwane zdarzenia:**

- `onClose()` - zamknięcie podglądu

**Warunki walidacji:** Brak (dane pobrane z API)

**Typy:**

- `PublicOfferListItemDto` (offer)

**Propsy:**

```typescript
interface OfferQuickPreviewProps {
  offerId: string;
  onClose: () => void;
}
```

---

### 4.14. `MapLoadingSkeleton`

**Opis:** Skeleton loader wyświetlany podczas ładowania mapy. Symuluje wizualnie mapę Google Maps.

**Główne elementy:**

```tsx
<div className='w-full h-full bg-muted animate-pulse flex items-center justify-center'>
  <Loader2Icon className='h-8 w-8 animate-spin text-muted-foreground' />
</div>
```

**Obsługiwane zdarzenia:** Brak

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:** Brak

---

### 4.15. `OffersListSection`

**Opis:** Sekcja zawierająca listę wyników ofert. Wyświetla nagłówek z licznikiem wyników i selectorem sortowania, listę kart ofert, paginację oraz skeleton loadery podczas ładowania.

**Główne elementy:**

```tsx
<section
  className='flex-1 lg:w-2/5 flex flex-col bg-background'
  aria-label='Lista ofert'
>
  <OffersListHeader
    resultsCount={totalResults}
    sortBy={sortBy}
    sortOrder={sortOrder}
    onSortChange={onSortChange}
  />

  <div className='flex-1 overflow-y-auto p-4'>
    {isLoading ? (
      <OffersListSkeleton count={perPage} />
    ) : (
      <OffersList
        offers={offers}
        selectedOfferId={selectedOfferId}
        onOfferSelect={onOfferSelect}
      />
    )}
  </div>

  <OffersListPagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={onPageChange}
  />
</section>
```

**Obsługiwane zdarzenia:**

- `onOfferSelect(offerId)` - kliknięcie w kartę oferty
- `onPageChange(page)` - zmiana strony
- `onSortChange(sortBy, sortOrder)` - zmiana sortowania

**Warunki walidacji:** Brak (dane już zwalidowane)

**Typy:**

- `PublicOfferListItemDto[]` (offers)
- `PaginationMeta` (ViewModel)

**Propsy:**

```typescript
interface OffersListSectionProps {
  offers: PublicOfferListItemDto[];
  selectedOfferId: string | null;
  onOfferSelect: (offerId: string | null) => void;
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  isLoading?: boolean;
}
```

---

### 4.16. `OffersListHeader`

**Opis:** Nagłówek listy ofert zawierający licznik wyników i selektor sortowania.

**Główne elementy:**

```tsx
<div className='border-b p-4 flex items-center justify-between'>
  <ResultsCount count={resultsCount} />

  <SortSelector
    sortBy={sortBy}
    sortOrder={sortOrder}
    onSortChange={onSortChange}
  />
</div>
```

**Obsługiwane zdarzenia:**

- `onSortChange(sortBy, sortOrder)` - zmiana sortowania

**Warunki walidacji:** Brak

**Typy:**

- `SortBy`, `SortOrder` (ViewModel)

**Propsy:**

```typescript
interface OffersListHeaderProps {
  resultsCount: number;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}
```

---

### 4.17. `ResultsCount`

**Opis:** Komponent wyświetlający liczbę znalezionych wyników z informacją live dla screen readerów.

**Główne elementy:**

```tsx
<div
  className='text-sm font-medium'
  role='status'
  aria-live='polite'
  aria-atomic='true'
>
  Znaleziono: <span className='font-bold'>{count}</span>{' '}
  {getOffersPluralForm(count)}
</div>
```

**Obsługiwane zdarzenia:** Brak

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:**

```typescript
interface ResultsCountProps {
  count: number;
}
```

---

### 4.18. `SortSelector`

**Opis:** Dropdown do wyboru sposobu sortowania wyników (odległość, data utworzenia, data aktualizacji, trafność).

**Główne elementy:**

```tsx
<Select
  value={`${sortBy}-${sortOrder}`}
  onValueChange={(value) => {
    const [newSortBy, newSortOrder] = value.split('-') as [SortBy, SortOrder];
    onSortChange(newSortBy, newSortOrder);
  }}
>
  <SelectTrigger className='w-48'>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value='distance-asc'>Odległość: najbliższe</SelectItem>
    <SelectItem value='date_created-desc'>Najnowsze</SelectItem>
    <SelectItem value='date_updated-desc'>Ostatnio zaktualizowane</SelectItem>
    <SelectItem value='relevance-desc'>Najbardziej trafne</SelectItem>
  </SelectContent>
</Select>
```

**Obsługiwane zdarzenia:**

- `onSortChange(sortBy, sortOrder)` - zmiana sortowania

**Warunki walidacji:**

- sortBy musi być jednym z: 'distance' | 'relevance' | 'date_created' | 'date_updated'
- sortOrder musi być: 'asc' | 'desc'
- 'distance' wymaga ustawionej lokalizacji
- 'relevance' wymaga ustawionego wyszukiwania tekstowego

**Typy:**

- `SortBy`, `SortOrder` (ViewModel)

**Propsy:**

```typescript
type SortBy = 'distance' | 'relevance' | 'date_created' | 'date_updated';
type SortOrder = 'asc' | 'desc';

interface SortSelectorProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}
```

---

### 4.19. `OffersList`

**Opis:** Lista kart ofert. Wyświetla wszystkie oferty z aktualnej strony wyników.

**Główne elementy:**

```tsx
<div className='space-y-3' role='list'>
  {offers.map((offer) => (
    <OfferCard
      key={offer.id}
      offer={offer}
      isSelected={offer.id === selectedOfferId}
      onSelect={() => onOfferSelect(offer.id)}
    />
  ))}
</div>
```

**Obsługiwane zdarzenia:**

- `onOfferSelect(offerId)` - kliknięcie w kartę

**Warunki walidacji:** Brak

**Typy:**

- `PublicOfferListItemDto[]` (offers)

**Propsy:**

```typescript
interface OffersListProps {
  offers: PublicOfferListItemDto[];
  selectedOfferId: string | null;
  onOfferSelect: (offerId: string | null) => void;
}
```

---

### 4.20. `OfferCard`

**Opis:** Karta pojedynczej oferty w liście. Wyświetla kompaktową informację: zdjęcie, nazwę, kategorie, wiek, lokalizację, odległość (jeśli dostępna). Podświetla się gdy jest wybrana. Po kliknięciu synchronizuje widok mapy (przewija do markera) i otwiera quick preview.

**Główne elementy:**

```tsx
<Card
  className={cn(
    'cursor-pointer transition-all hover:shadow-md',
    isSelected && 'ring-2 ring-primary',
  )}
  onClick={onSelect}
  role='listitem'
>
  <div className='flex gap-3 p-3'>
    {offer.images[0] && (
      <img
        src={offer.images[0].storage_path}
        alt={offer.title}
        className='w-20 h-20 object-cover rounded'
      />
    )}

    <div className='flex-1 space-y-1'>
      <h3 className='font-semibold text-sm line-clamp-2'>{offer.title}</h3>

      <div className='flex flex-wrap gap-1'>
        {offer.categories.map((cat) => (
          <Badge key={cat.id} variant='secondary' className='text-xs'>
            {cat.name}
          </Badge>
        ))}
      </div>

      <div className='flex items-center gap-3 text-xs text-muted-foreground'>
        <span className='flex items-center gap-1'>
          <UsersIcon className='h-3 w-3' />
          {formatAgeRange(offer.ages)}
        </span>

        <span className='flex items-center gap-1'>
          <MapPinIcon className='h-3 w-3' />
          {offer.address}
        </span>

        {offer.distance_km !== undefined && (
          <span className='flex items-center gap-1'>
            <NavigationIcon className='h-3 w-3' />
            {offer.distance_km.toFixed(1)} km
          </span>
        )}
      </div>
    </div>
  </div>
</Card>
```

**Obsługiwane zdarzenia:**

- `onSelect()` - kliknięcie w kartę

**Warunki walidacji:** Brak

**Typy:**

- `PublicOfferListItemDto` (offer)

**Propsy:**

```typescript
interface OfferCardProps {
  offer: PublicOfferListItemDto;
  isSelected: boolean;
  onSelect: () => void;
}
```

---

### 4.21. `OffersListPagination`

**Opis:** Komponent paginacji wyświetlający przyciski nawigacji między stronami wyników.

**Główne elementy:**

```tsx
<div className='border-t p-4 flex items-center justify-between'>
  <Button
    variant='outline'
    onClick={() => onPageChange(currentPage - 1)}
    disabled={currentPage === 1}
  >
    <ChevronLeftIcon className='h-4 w-4 mr-1' />
    Poprzednia
  </Button>

  <span className='text-sm'>
    Strona {currentPage} z {totalPages}
  </span>

  <Button
    variant='outline'
    onClick={() => onPageChange(currentPage + 1)}
    disabled={currentPage === totalPages}
  >
    Następna
    <ChevronRightIcon className='h-4 w-4 ml-1' />
  </Button>
</div>
```

**Obsługiwane zdarzenia:**

- `onPageChange(page)` - zmiana strony

**Warunki walidacji:**

- page musi być >= 1 i <= totalPages

**Typy:**

- `PaginationMeta` (ViewModel)

**Propsy:**

```typescript
interface OffersListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}
```

---

### 4.22. `OffersListSkeleton`

**Opis:** Skeleton loader dla listy ofert, wyświetlany podczas ładowania danych.

**Główne elementy:**

```tsx
<div className='space-y-3'>
  {Array.from({ length: count }).map((_, i) => (
    <Card key={i} className='p-3'>
      <div className='flex gap-3'>
        <Skeleton className='w-20 h-20 rounded' />
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-3 w-1/2' />
          <Skeleton className='h-3 w-2/3' />
        </div>
      </div>
    </Card>
  ))}
</div>
```

**Obsługiwane zdarzenia:** Brak

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:**

```typescript
interface OffersListSkeletonProps {
  count?: number; // default: 5
}
```

---

### 4.23. `EmptyState`

**Opis:** Komponent wyświetlany gdy filtry nie zwróciły żadnych wyników. Zachęca użytkownika do zmiany kryteriów wyszukiwania.

**Główne elementy:**

```tsx
<div className='flex flex-col items-center justify-center h-full p-8 text-center'>
  <SearchXIcon className='h-16 w-16 text-muted-foreground mb-4' />

  <h2 className='text-xl font-semibold mb-2'>
    Brak ofert spełniających Twoje kryteria
  </h2>

  <p className='text-muted-foreground mb-4'>
    Spróbuj zmienić filtry lub rozszerzyć zakres wyszukiwania
  </p>

  <Button variant='outline' onClick={onResetFilters}>
    Wyczyść wszystkie filtry
  </Button>
</div>
```

**Obsługiwane zdarzenia:**

- `onResetFilters()` - reset filtrów

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:**

```typescript
interface EmptyStateProps {
  onResetFilters: () => void;
}
```

---

## 5. Typy

### 5.1. DTO Types (z API - plik types.ts)

Wykorzystywane typy z pliku `types.ts`:

```typescript
// Główna odpowiedź API
type GetOffersResponse = PaginatedResponseDto<PublicOfferListItemDto>;

// Pojedyncza oferta w liście
type PublicOfferListItemDto = Pick<
  DbOffer,
  | 'id'
  | 'title'
  | 'description'
  | 'ages'
  | 'address'
  | 'start_date'
  | 'end_date'
  | 'available_spots'
  | 'created_at'
  | 'updated_at'
> & {
  offer_type: OfferTypeDto;
  categories: CategoryDto[];
  location: GeoPointDto;
  organizer: PublicOrganizerDto;
  images: OfferImageDto[];
  schedules: OfferScheduleInputDto[];
};

// Parametry query dla API
type OfferListQueryDto = {
  page?: number;
  per_page?: number;
  sort_by?: 'distance' | 'relevance' | 'date_created' | 'date_updated';
  sort_order?: 'asc' | 'desc';
  min_age?: number;
  max_age?: number;
  categories?: string;
  offer_types?: string;
  location_lat?: number;
  location_lon?: number;
  radius_km?: number;
  search?: string;
};

// Paginacja
type PaginatedResponseDto<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

// Kategoria
type CategoryDto = Pick<DbCategory, 'id' | 'name' | 'slug' | 'description'>;

// Typ oferty
type OfferTypeDto = Pick<DbOfferType, 'id' | 'name' | 'slug'>;

// Zdjęcie oferty
type OfferImageDto = Pick<
  DbOfferImage,
  'id' | 'storage_path' | 'display_order'
>;

// Lokalizacja (GeoJSON Point)
type GeoPointDto = {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
};

// Organizator (publiczne dane)
type PublicOrganizerDto = Pick<
  DbOrganizerProfile,
  'id' | 'company_name' | 'phone' | 'email_public'
>;
```

### 5.2. ViewModel Types (nowe typy dla widoku)

```typescript
// Filters state w komponencie (ViewModel)
interface HomeMapFilters {
  min_age: number | undefined;
  max_age: number | undefined;
  categories: string[]; // UUID array
  offer_types: string[]; // UUID array
  location: LocationData | undefined;
  radius_km: number | undefined;
  search: string | undefined;
}

// Dane lokalizacji w filtrze
interface LocationData {
  lat: number;
  lon: number;
  placeName: string;
}

// Centrum mapy
interface MapCenter {
  lat: number;
  lng: number;
}

// Metadane paginacji (ViewModel)
interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  perPage: number;
}

// Sortowanie
type SortBy = 'distance' | 'relevance' | 'date_created' | 'date_updated';
type SortOrder = 'asc' | 'desc';

// Stan sortowania
interface SortState {
  sortBy: SortBy;
  sortOrder: SortOrder;
}
```

### 5.3. Zod Schemas (walidacja)

```typescript
import { z } from 'zod';

// Schema dla query params w URL (TanStack Router)
const homeMapSearchParamsSchema = z
  .object({
    min_age: z.coerce.number().int().min(0).optional(),
    max_age: z.coerce.number().int().min(0).optional(),
    categories: z.string().optional(), // comma-separated UUIDs
    offer_types: z.string().optional(), // comma-separated UUIDs
    location_lat: z.coerce.number().min(-90).max(90).optional(),
    location_lon: z.coerce.number().min(-180).max(180).optional(),
    radius_km: z.coerce.number().positive().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
  })
  .refine(
    (data) => {
      if (data.min_age !== undefined && data.max_age !== undefined) {
        return data.max_age >= data.min_age;
      }
      return true;
    },
    {
      message: 'max_age musi być >= min_age',
    },
  );

// Schema dla lokalizacji
const locationDataSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  placeName: z.string().min(1),
});

// Schema dla HomeMapFilters
const homeMapFiltersSchema = z
  .object({
    min_age: z.number().int().min(0).optional(),
    max_age: z.number().int().min(0).optional(),
    categories: z.array(z.string().uuid()),
    offer_types: z.array(z.string().uuid()),
    location: locationDataSchema.optional(),
    radius_km: z.number().positive().optional(),
    search: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.min_age !== undefined && data.max_age !== undefined) {
        return data.max_age >= data.min_age;
      }
      return true;
    },
    {
      message: 'Maksymalny wiek musi być większy lub równy minimalnemu',
    },
  );
```

---

## 6. Zarządzanie stanem

### 6.1. Server State (TanStack Query)

Dane z API (oferty, kategorie, typy ofert) są zarządzane przez TanStack Query. Zapewnia to automatyczne cachowanie, refetching, error handling i loading states.

**Query Keys:**

```typescript
const offersQueryKeys = {
  all: ['offers'] as const,
  lists: () => [...offersQueryKeys.all, 'list'] as const,
  list: (filters: OfferListQueryDto) =>
    [...offersQueryKeys.lists(), filters] as const,
  details: () => [...offersQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...offersQueryKeys.details(), id] as const,
};

const dictionariesQueryKeys = {
  categories: ['dictionaries', 'categories'] as const,
  offerTypes: ['dictionaries', 'offer-types'] as const,
};
```

**Query Functions:**

```typescript
// Hook do pobierania ofert
function useOffersQuery(filters: OfferListQueryDto) {
  return useQuery({
    queryKey: offersQueryKeys.list(filters),
    queryFn: () => fetchOffers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    placeholderData: keepPreviousData, // Płynna zmiana stron
  });
}

// Hook do pobierania kategorii (agresywny caching)
function useCategoriesQuery() {
  return useQuery({
    queryKey: dictionariesQueryKeys.categories,
    queryFn: fetchCategories,
    staleTime: 60 * 60 * 1000, // 1 hour cache (rzadko się zmieniają)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// Hook do pobierania typów ofert
function useOfferTypesQuery() {
  return useQuery({
    queryKey: dictionariesQueryKeys.offerTypes,
    queryFn: fetchOfferTypes,
    staleTime: 60 * 60 * 1000, // 1 hour cache
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
```

### 6.2. Client State (URL + React State)

Filtry są przechowywane w **URL query parameters** (source of truth) za pomocą TanStack Router. To umożliwia:

- Deep linking (możliwość udostępnienia linku z filtrami)
- Bookmarking (zapamiętanie ulubionych wyszukiwań)
- Browser history (cofanie/do przodu przeglądarki)

**Lokalny stan UI:**

- `selectedOfferId` - aktualnie wybrana oferta (synchronizacja map-lista)
- `isMapVisible` - toggle mapy/listy na mobile
- Stany loading/error są zarządzane przez TanStack Query

**Custom Hook do zarządzania filtrami:**

```typescript
function useHomeMapFilters() {
  const navigate = useNavigate();
  const search = Route.useSearch(); // z TanStack Router

  // Parse URL params to filters
  const filters: HomeMapFilters = useMemo(
    () => ({
      min_age: search.min_age,
      max_age: search.max_age,
      categories: search.categories ? search.categories.split(',') : [],
      offer_types: search.offer_types ? search.offer_types.split(',') : [],
      location:
        search.location_lat && search.location_lon
          ? {
              lat: search.location_lat,
              lon: search.location_lon,
              placeName: localStorage.getItem('lastLocationName') || '',
            }
          : undefined,
      radius_km: search.radius_km,
      search: search.search,
    }),
    [search],
  );

  // Update filters in URL
  const updateFilters = useCallback(
    (newFilters: Partial<HomeMapFilters>) => {
      const merged = { ...filters, ...newFilters };

      // Convert to URL params
      navigate({
        search: {
          min_age: merged.min_age,
          max_age: merged.max_age,
          categories: merged.categories.join(',') || undefined,
          offer_types: merged.offer_types.join(',') || undefined,
          location_lat: merged.location?.lat,
          location_lon: merged.location?.lon,
          radius_km: merged.radius_km,
          search: merged.search,
          page: 1, // Reset page when filters change
        },
      });

      // Save location name to localStorage
      if (merged.location) {
        localStorage.setItem('lastLocationName', merged.location.placeName);
      }
    },
    [filters, navigate],
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    navigate({ search: { page: 1 } });
  }, [navigate]);

  return { filters, updateFilters, resetFilters };
}
```

### 6.3. Persistence (localStorage)

Niektóre dane są zapisywane w localStorage dla lepszego UX:

- `lastLocationName` - nazwa ostatnio wybranej lokalizacji (do odtworzenia po powrocie)
- `preferredRadius` - preferowany promień wyszukiwania
- `mapCenter` - ostatnie centrum mapy (do zapamiętania pozycji)

---

## 7. Integracja API

### 7.1. Endpoint: GET /offers

**Request:**

```typescript
async function fetchOffers(
  filters: OfferListQueryDto,
): Promise<PaginatedResponseDto<PublicOfferListItemDto>> {
  const params = new URLSearchParams();

  if (filters.page) params.append('page', filters.page.toString());
  if (filters.per_page) params.append('per_page', filters.per_page.toString());
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.sort_order) params.append('sort_order', filters.sort_order);
  if (filters.min_age !== undefined)
    params.append('min_age', filters.min_age.toString());
  if (filters.max_age !== undefined)
    params.append('max_age', filters.max_age.toString());
  if (filters.categories) params.append('categories', filters.categories);
  if (filters.offer_types) params.append('offer_types', filters.offer_types);
  if (filters.location_lat !== undefined)
    params.append('location_lat', filters.location_lat.toString());
  if (filters.location_lon !== undefined)
    params.append('location_lon', filters.location_lon.toString());
  if (filters.radius_km !== undefined)
    params.append('radius_km', filters.radius_km.toString());
  if (filters.search) params.append('search', filters.search);

  const response = await fetch(`/api/offers?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch offers');
  }

  return response.json();
}
```

**Response Type:** `PaginatedResponseDto<PublicOfferListItemDto>`

**Error Handling:**

- 400 Bad Request - nieprawidłowe parametry (wyświetl błąd walidacji)
- 422 Unprocessable Entity - błąd walidacji (wyświetl szczegóły)
- 500 Internal Server Error - błąd serwera (wyświetl ogólny komunikat błędu)

### 7.2. Endpoint: GET /dictionaries/categories

**Request:**

```typescript
async function fetchCategories(): Promise<CategoryDto[]> {
  const response = await fetch('/api/dictionaries/categories', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch categories');
  }

  const data = await response.json();
  return data.categories; // Zakładając response: { categories: CategoryDto[] }
}
```

**Response Type:** `CategoryDto[]`

### 7.3. Endpoint: GET /dictionaries/types

**Request:**

```typescript
async function fetchOfferTypes(): Promise<OfferTypeDto[]> {
  const response = await fetch('/api/dictionaries/types', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch offer types');
  }

  const data = await response.json();
  return data.types; // Zakładając response: { types: OfferTypeDto[] }
}
```

**Response Type:** `OfferTypeDto[]`

---

## 8. Interakcje użytkownika

### 8.1. Zmiana filtrów

**Scenariusz:** Użytkownik zmienia wiek dziecka w filtrze

1. Użytkownik wybiera wiek min/max w `AgeRangeFilter`
2. Komponent wywołuje `onChange(minAge, maxAge)`
3. `FilterPanel` wywołuje `onFiltersChange({ min_age, max_age })`
4. `HomeMapView` aktualizuje URL query params przez `updateFilters()`
5. TanStack Router wykrywa zmianę URL i aktualizuje `search` state
6. `useOffersQuery` wykrywa zmianę `filters` i wykonuje nowe zapytanie API
7. Podczas ładowania wyświetlane są skeletony
8. Po otrzymaniu danych, mapa i lista aktualizują się
9. `ResultsCount` aktualizuje liczbę wyników z `aria-live="polite"` (dla screen readerów)

**Podobnie dla innych filtrów:** kategorie, typy, lokalizacja, promień, wyszukiwanie

### 8.2. Wybór lokalizacji

**Scenariusz A:** Użytkownik wpisuje miasto w `LocationSearchInput`

1. Użytkownik wpisuje tekst w input (np. "Warszawa")
2. Google Places Autocomplete pokazuje sugestie
3. Użytkownik wybiera "Warszawa, Polska"
4. Komponent pobiera współrzędne z Google Places API
5. Wywołuje `onChange({ lat: 52.2297, lon: 21.0122, placeName: 'Warszawa, Polska' })`
6. Filtry aktualizują URL i wykonują zapytanie API
7. Mapa przesuwa się do wybranej lokalizacji

**Scenariusz B:** Użytkownik klika "Użyj mojej lokalizacji"

1. Użytkownik klika przycisk z ikoną nawigacji
2. Komponent wywołuje `navigator.geolocation.getCurrentPosition()`
3. Przeglądarka prosi o pozwolenie na dostęp do lokalizacji
4. Po otrzymaniu współrzędnych, komponent wykonuje reverse geocoding (Google Geocoding API)
5. Wywołuje `onChange({ lat, lon, placeName })`
6. Filtry aktualizują się, mapa przesuwa do lokalizacji użytkownika

### 8.3. Kliknięcie w marker na mapie

**Scenariusz:** Użytkownik klika marker oferty na mapie

1. Użytkownik klika marker na `GoogleMapContainer`
2. Komponent wywołuje `onOfferSelect(offerId)`
3. `MapSection` otwiera `OfferQuickPreview` z `offerId`
4. `OfferQuickPreview` pobiera dane oferty (już dostępne w cache z listy)
5. Wyświetla popup z podstawowymi danymi
6. Jednocześnie `OffersListSection` podświetla odpowiednią kartę w liście
7. Lista automatycznie scrolluje do podświetlonej karty (smooth scroll)

### 8.4. Kliknięcie w kartę oferty na liście

**Scenariusz:** Użytkownik klika kartę oferty w `OffersList`

1. Użytkownik klika `OfferCard`
2. Komponent wywołuje `onSelect()`
3. `OffersListSection` wywołuje `onOfferSelect(offerId)`
4. `MapSection` podświetla odpowiedni marker na mapie
5. Mapa przesuwa się (pan) do markera z animacją
6. Marker "skacze" (bounce animation)
7. `OfferQuickPreview` otwiera się z danymi oferty

### 8.5. Zmiana strony wyników

**Scenariusz:** Użytkownik klika "Następna" w paginacji

1. Użytkownik klika przycisk "Następna"
2. `OffersListPagination` wywołuje `onPageChange(currentPage + 1)`
3. `HomeMapView` aktualizuje URL param `page`
4. `useOffersQuery` wykonuje zapytanie API dla nowej strony
5. Dzięki `placeholderData: keepPreviousData` poprzednie wyniki pozostają widoczne podczas ładowania
6. Po otrzymaniu nowych danych, lista płynnie aktualizuje się
7. Lista automatycznie scrolluje do góry

### 8.6. Link "Zobacz szczegóły"

**Scenariusz:** Użytkownik klika "Zobacz szczegóły" w `OfferQuickPreview`

1. Użytkownik klika link/przycisk
2. TanStack Router nawiguje do `/offers/:offerId`
3. Widok szczegółów oferty ładuje pełne dane oferty
4. Użytkownik może wrócić przyciskiem "Wstecz" i zachować filtry (dzięki URL state)

---

## 9. Warunki i walidacja

### 9.1. Walidacja filtrów (komponent `FilterPanel`)

**Wiek dziecka:**

- `min_age` >= 0
- `max_age` >= `min_age`
- Jeśli jedno pole jest puste, drugie może być
- Błędy walidacji wyświetlane pod polem (Zod schema error messages)

**Kategorie i typy:**

- Każdy wybrany ID musi być prawidłowym UUID
- UUID musi istnieć w dostępnych opcjach (weryfikacja tylko po stronie select - nie można wybrać nieistniejącego)

**Lokalizacja:**

- Współrzędne muszą być w zakresie: lat ∈ [-90, 90], lon ∈ [-180, 180]
- `placeName` nie może być pusty po wyborze z autocomplete
- Jeśli geolokalizacja nie działa (brak uprawnień, timeout), wyświetl błąd toast

**Promień:**

- Musi być > 0
- Predefiniowane wartości: 5, 10, 20, 50 km
- Aktywny tylko gdy lokalizacja jest ustawiona

**Wyszukiwanie tekstowe:**

- Opcjonalne, bez ograniczeń długości (API ma limit)
- Debouncing 300ms przed wysłaniem zapytania

### 9.2. Walidacja przed wysłaniem do API (funkcja `fetchOffers`)

Przed wysłaniem zapytania API, filtry są walidowane przez `homeMapFiltersSchema`:

```typescript
function prepareApiFilters(filters: HomeMapFilters): OfferListQueryDto {
  // Validate with Zod
  const validated = homeMapFiltersSchema.parse(filters);

  // Convert to API format
  return {
    min_age: validated.min_age,
    max_age: validated.max_age,
    categories: validated.categories.join(',') || undefined,
    offer_types: validated.offer_types.join(',') || undefined,
    location_lat: validated.location?.lat,
    location_lon: validated.location?.lon,
    radius_km: validated.radius_km,
    search: validated.search,
  };
}
```

Jeśli walidacja się nie powiedzie:

- Zod rzuca `ZodError` z listą błędów
- Błędy są wyświetlane użytkownikowi w formie toast notifications
- Zapytanie API nie jest wysyłane

### 9.3. Warunki weryfikowane przez UI

**Komponent `SortSelector`:**

- Sortowanie po odległości ("distance") jest dostępne **tylko** gdy ustawiona jest lokalizacja
- Jeśli lokalizacja nie jest ustawiona, opcja "Odległość" jest disabled
- Tooltip wyjaśnia: "Ustaw lokalizację aby sortować po odległości"

**Komponent `RadiusSlider`:**

- Slider jest disabled gdy lokalizacja nie jest ustawiona
- Tooltip wyjaśnia: "Wybierz lokalizację aby ustawić promień"

**Komponent `ResultsCount`:**

- Wyświetla "Znaleziono: 0 ofert" gdy brak wyników
- Live region `aria-live="polite"` informuje screen readery o zmianie liczby wyników

**Komponent `EmptyState`:**

- Wyświetlany gdy `offers.length === 0` **i** `!isLoading` **i** `!isError`
- Sugeruje użytkownikowi zmianę filtrów lub reset

**Błędy API:**

- 400/422 - wyświetl szczegóły błędów walidacji w toast
- 500 - wyświetl ogólny komunikat "Wystąpił błąd. Spróbuj ponownie."
- Network error - "Problem z połączeniem. Sprawdź internet."

---

## 10. Obsługa błędów

### 10.1. Błędy API (TanStack Query)

**Błędy HTTP:**

```typescript
function useOffersQuery(filters: OfferListQueryDto) {
  return useQuery({
    queryKey: offersQueryKeys.list(filters),
    queryFn: () => fetchOffers(filters),
    retry: (failureCount, error: any) => {
      // Nie ponawiaj dla błędów 4xx
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Ponów maksymalnie 2 razy dla 5xx
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

**Wyświetlanie błędów:**

```typescript
// W komponencie HomeMapView
const { data, isLoading, isError, error } = useOffersQuery(apiFilters);

if (isError) {
  return (
    <ErrorState
      error={error}
      onRetry={() => refetch()}
    />
  );
}
```

**Komponent `ErrorState`:**

```tsx
function ErrorState({ error, onRetry }: ErrorStateProps) {
  const message =
    error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd';

  return (
    <div className='flex flex-col items-center justify-center h-full p-8 text-center'>
      <AlertCircleIcon className='h-16 w-16 text-destructive mb-4' />
      <h2 className='text-xl font-semibold mb-2'>Ups! Coś poszło nie tak</h2>
      <p className='text-muted-foreground mb-4'>{message}</p>
      <Button onClick={onRetry}>Spróbuj ponownie</Button>
    </div>
  );
}
```

### 10.2. Błędy Geolokalizacji

**Gdy użytkownik odmawia dostępu lub geolokalizacja nie działa:**

```typescript
function handleUseMyLocation() {
  setIsGettingLocation(true);

  if (!navigator.geolocation) {
    toast.error('Twoja przeglądarka nie obsługuje geolokalizacji');
    setIsGettingLocation(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        // Reverse geocoding
        const placeName = await reverseGeocode(latitude, longitude);
        onChange({ lat: latitude, lon: longitude, placeName });
      } catch (error) {
        toast.error('Nie udało się pobrać nazwy lokalizacji');
      } finally {
        setIsGettingLocation(false);
      }
    },
    (error) => {
      setIsGettingLocation(false);

      switch (error.code) {
        case error.PERMISSION_DENIED:
          toast.error(
            'Dostęp do lokalizacji został odrzucony. Sprawdź ustawienia przeglądarki.',
          );
          break;
        case error.POSITION_UNAVAILABLE:
          toast.error('Lokalizacja niedostępna. Spróbuj ponownie.');
          break;
        case error.TIMEOUT:
          toast.error('Przekroczono czas oczekiwania na lokalizację.');
          break;
        default:
          toast.error('Nie udało się pobrać lokalizacji.');
      }
    },
    {
      timeout: 10000,
      enableHighAccuracy: true,
    },
  );
}
```

### 10.3. Błędy Google Maps

**Gdy Google Maps nie załaduje się:**

```typescript
function useGoogleMapsLoader() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });

    loader.load()
      .then(() => setIsLoaded(true))
      .catch((err) => {
        console.error('Google Maps failed to load:', err);
        setError(new Error('Nie udało się załadować mapy. Odśwież stronę.'));
      });
  }, []);

  return { isLoaded, error };
}

// W komponencie GoogleMapContainer
const { isLoaded, error } = useGoogleMapsLoader();

if (error) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      <p className="text-destructive">{error.message}</p>
    </div>
  );
}

if (!isLoaded) {
  return <MapLoadingSkeleton />;
}
```

### 10.4. Błędy walidacji (Zod)

**Gdy filtry nie przejdą walidacji:**

```typescript
try {
  const validated = homeMapFiltersSchema.parse(filters);
  // Proceed with API call
} catch (error) {
  if (error instanceof ZodError) {
    // Wyświetl każdy błąd w toast
    error.errors.forEach((err) => {
      toast.error(`${err.path.join('.')}: ${err.message}`);
    });
  }
}
```

### 10.5. Edge Cases

**Brak wyników:**

- Wyświetl `EmptyState` z sugestią zmiany filtrów
- Nie traktuj jako błędu (200 OK z pustą `data: []`)

**Timeout API:**

- TanStack Query automatycznie ponawia zapytanie (retry)
- Po trzech nieudanych próbach wyświetl komunikat błędu

**Duplikaty w URL (użytkownik ręcznie edytuje URL):**

- TanStack Router waliduje query params przez `validateSearch`
- Nieprawidłowe wartości są ignorowane lub zastępowane domyślnymi

**Bardzo duża liczba filtrów (długi URL):**

- Większość przeglądarek obsługuje URL do 2000 znaków
- Jeśli przekroczono, rozważ użycie POST zamiast GET (nie w MVP)

---

## 11. Kroki implementacji

### Krok 1: Setup projektu i zależności

**Zadania:**

1. Zainstaluj zależności:

   ```bash
   npm install @tanstack/react-router @tanstack/react-query
   npm install @googlemaps/js-api-loader @googlemaps/markerclusterer
   npm install zod
   npm install clsx tailwind-merge
   npm install date-fns
   npm install lucide-react # ikony
   ```

2. Skonfiguruj TanStack Router:

   ```typescript
   // src/routes/__root.tsx
   export const Route = createRootRoute({
     component: RootComponent,
   });
   ```

3. Skonfiguruj TanStack Query:

   ```typescript
   // src/main.tsx
   const queryClient = new QueryClient({
     defaultOptions: {
       queries: {
         staleTime: 5 * 60 * 1000,
         gcTime: 10 * 60 * 1000,
       },
     },
   });

   <QueryClientProvider client={queryClient}>
     <RouterProvider router={router} />
   </QueryClientProvider>
   ```

4. Skonfiguruj Google Maps API key w `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

**Czas:** 1-2 godziny

---

### Krok 2: Definicja typów i schemas

**Zadania:**

1. Zweryfikuj typy w `src/types.ts` (już istnieją w projekcie)
2. Stwórz ViewModels w `src/features/home-map/types.ts`:

   ```typescript
   export interface HomeMapFilters { ... }
   export interface LocationData { ... }
   export interface MapCenter { ... }
   export interface PaginationMeta { ... }
   export type SortBy = ...
   export type SortOrder = ...
   ```

3. Stwórz Zod schemas w `src/features/home-map/schemas.ts`:
   ```typescript
   export const homeMapSearchParamsSchema = z.object({ ... });
   export const locationDataSchema = z.object({ ... });
   export const homeMapFiltersSchema = z.object({ ... });
   ```

**Czas:** 2-3 godziny

---

### Krok 3: API integration layer

**Zadania:**

1. Stwórz katalog `src/features/home-map/api/`
2. Zaimplementuj `fetchOffers()` w `api/offers.ts`
3. Zaimplementuj `fetchCategories()` w `api/dictionaries.ts`
4. Zaimplementuj `fetchOfferTypes()` w `api/dictionaries.ts`
5. Stwórz query keys w `api/query-keys.ts`
6. Stwórz query hooks w `api/queries.ts`:
   ```typescript
   export function useOffersQuery(filters: OfferListQueryDto) { ... }
   export function useCategoriesQuery() { ... }
   export function useOfferTypesQuery() { ... }
   ```

**Czas:** 3-4 godziny

---

### Krok 4: Custom hooks

**Zadania:**

1. Stwórz `src/features/home-map/hooks/`
2. Zaimplementuj `useHomeMapFilters.ts`:
   - Parse URL params to filters
   - `updateFilters()`
   - `resetFilters()`
   - Sync z localStorage

3. Zaimplementuj `useGoogleMapsLoader.ts`:
   - Ładowanie Google Maps API
   - Error handling

4. Zaimplementuj `useGeolocation.ts`:
   - `getCurrentPosition()`
   - `reverseGeocode()`
   - Error handling

**Czas:** 4-5 godzin

---

### Krok 5: Komponenty UI - filtry

**Zadania:**

1. Stwórz katalog `src/features/home-map/components/filters/`
2. Zaimplementuj komponenty:
   - `FilterPanel.tsx`
   - `AgeRangeFilter.tsx`
   - `CategoryMultiSelect.tsx`
   - `OfferTypeMultiSelect.tsx`
   - `LocationSearchInput.tsx` (z Google Places Autocomplete)
   - `RadiusSlider.tsx`
   - `ActiveFiltersChips.tsx`
   - `FilterChip.tsx`

3. Dodaj testy jednostkowe dla każdego komponentu

**Czas:** 8-10 godzin

---

### Krok 6: Komponenty UI - mapa

**Zadania:**

1. Stwórz katalog `src/features/home-map/components/map/`
2. Zaimplementuj komponenty:
   - `MapSection.tsx`
   - `GoogleMapContainer.tsx`
   - `OfferQuickPreview.tsx`
   - `MapLoadingSkeleton.tsx`

3. Zaimplementuj funkcje pomocnicze:
   - `createOfferMarker()` - tworzenie markera z custom icon
   - `createMarkerClusterer()` - MarkerClusterer setup

4. Obsługa interakcji:
   - Kliknięcie w marker
   - Synchronizacja z listą
   - Animacje (bounce marker, pan to marker)

**Czas:** 10-12 godzin

---

### Krok 7: Komponenty UI - lista ofert

**Zadania:**

1. Stwórz katalog `src/features/home-map/components/offers-list/`
2. Zaimplementuj komponenty:
   - `OffersListSection.tsx`
   - `OffersListHeader.tsx`
   - `ResultsCount.tsx`
   - `SortSelector.tsx`
   - `OffersList.tsx`
   - `OfferCard.tsx`
   - `OffersListPagination.tsx`
   - `OffersListSkeleton.tsx`

3. Synchronizacja z mapą:
   - Scroll do wybranej karty
   - Podświetlenie wybranej karty

**Czas:** 8-10 godzin

---

### Krok 8: Komponent główny strony

**Zadania:**

1. Zaimplementuj `src/routes/index.tsx`:
   - Setup TanStack Router route
   - `validateSearch` dla query params
   - `loader` dla prefetching danych

2. Zaimplementuj `HomeMapView.tsx`:
   - Orkiestracja wszystkich komponentów
   - Zarządzanie stanem `selectedOfferId`
   - Komunikacja między komponentami
   - Layout (responsive grid)

3. Obsługa empty state i error state

**Czas:** 6-8 godzin

---

### Krok 9: Dostępność (a11y)

**Zadania:**

1. Dodaj ARIA labels, roles, live regions
2. Zweryfikuj kontrast kolorów (WCAG AA)
3. Keyboard navigation:
   - Filtry dostępne przez Tab
   - Enter/Space do otwierania dropdowns
   - Escape do zamykania modali
4. Screen reader testing:
   - VoiceOver (macOS)
   - NVDA (Windows)
5. Skip links:
   - "Skip to main content"
   - "Skip to filters"

**Czas:** 4-5 godzin

---

### Krok 10: Responsive design

**Zadania:**

1. Desktop layout (≥1024px):
   - Split panel: mapa 60%, lista 40%
   - Filtry poziomo nad mapą

2. Tablet layout (768-1023px):
   - Split panel: mapa 50%, lista 50%
   - Filtry w bottom sheet (collapsible)

3. Mobile layout (<768px):
   - Toggle między mapą a listą (tabs)
   - Filtry w bottom sheet (slide up)
   - Sticky filter button

4. Touch targets:
   - Min 48x48px dla wszystkich interaktywnych elementów

**Czas:** 6-8 godzin

---

### Krok 11: Optymalizacja wydajności

**Zadania:**

1. Lazy loading obrazków:

   ```tsx
   <img loading="lazy" ... />
   ```

2. React.memo dla komponentów list:

   ```typescript
   export const OfferCard = React.memo(OfferCardComponent);
   ```

3. Debouncing dla search input (300ms)

4. Virtual scrolling dla długich list (react-virtual)

5. Prefetching:
   - Prefetch next page podczas scrollowania
   - Prefetch offer details on hover

6. Code splitting:
   ```typescript
   const GoogleMapContainer = lazy(() => import('./GoogleMapContainer'));
   ```

**Czas:** 4-5 godzin

---

### Krok 12: Testing

**Zadania:**

1. Unit tests (Vitest):
   - Hooki: `useHomeMapFilters`, `useGeolocation`
   - Funkcje pomocnicze: `formatAgeRange`, `createOfferMarker`
   - Validators: Zod schemas

2. Integration tests (React Testing Library):
   - Renderowanie komponentów z providers
   - Interakcje użytkownika (kliknięcia, filtrowanie)
   - API mocking (MSW)

3. E2E tests (Playwright):
   - Pełny flow: wybór filtrów → wyniki → kliknięcie oferty
   - Geolocation flow
   - Responsive breakpoints

**Czas:** 10-12 godzin

---

### Krok 13: Error handling i edge cases

**Zadania:**

1. Komponenty błędów:
   - `ErrorState.tsx`
   - Toast notifications (sonner)

2. Error boundaries:
   - Map error boundary
   - List error boundary

3. Retry logic (TanStack Query)

4. Graceful degradation:
   - Brak Google Maps → fallback do listy
   - Brak geolokalizacji → manual location search only

**Czas:** 3-4 godziny

---

### Krok 14: Dokumentacja i polish

**Zadania:**

1. Dokumentacja kodu:
   - JSDoc dla publicznych API
   - README dla modułu `home-map`

2. Storybook stories dla komponentów UI (opcjonalnie)

3. Final polish:
   - Loading states transitions
   - Smooth animations
   - Error messages copy review

4. Performance audit:
   - Lighthouse score > 90
   - Ładowanie < 3s on 3G

**Czas:** 4-5 godzin

---

## Łączny szacowany czas implementacji: 75-95 godzin roboczych

**Podział na sprinty (2-tygodniowe):**

**Sprint 1 (40h):** Kroki 1-4 (Setup, typy, API, hooki)
**Sprint 2 (40h):** Kroki 5-7 (Komponenty UI)
**Sprint 3 (40h):** Kroki 8-11 (Strona główna, a11y, responsive, optymalizacja)
**Sprint 4 (20h):** Kroki 12-14 (Testing, error handling, dokumentacja)

---

## Notatki końcowe

- Priorytetem jest **działająca wersja desktop** (kroki 1-8), następnie responsive (krok 10)
- Można zacząć od uproszczonej wersji filtrów (tylko wiek + lokalizacja), a potem dodać pozostałe
- Google Maps może być zastąpiony prostą mapą (Leaflet) do prototypowania, a potem zamieniony
- Testy E2E (krok 12) można wykonać jako ostatnie, po zweryfikowaniu funkcjonalności ręcznie
- Accessibility (krok 9) powinien być implementowany na bieżąco, a nie jako osobny krok na końcu

---

**Powodzenia w implementacji!** 🚀
