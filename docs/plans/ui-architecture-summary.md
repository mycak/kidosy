# UI Architecture Planning Summary - Kidosy MVP

## Decisions

1. **Routing Structure**: Zaakceptowano trójpoziomową hierarchię routingu z rozdzieleniem widoków na publiczne, organizatora i admina. Wszystkie ścieżki przechowywane w `shared/constants/paths.ts`.

2. **Layout System**: Zaakceptowano system trzech głównych layoutów (PublicLayout, OrganizerLayout, AdminLayout) z dedykowaną nawigacją dla każdej roli użytkownika.

3. **Desktop Layout dla Mapy**: **Modyfikacja rekomendacji** - Filtry powinny być umieszczone nad mapą zamiast po lewej stronie, aby zapewnić więcej przestrzeni na wyświetlanie mapy. Reszta zgodnie z rekomendacją (lista wyników + mapa).

4. **Zarządzanie Stanem Filtrów**: Zaakceptowano wykorzystanie TanStack Router do synchronizacji z URL query params, Zustand dla stanu UI, localStorage dla persistence, oraz debouncing dla filtrów tekstowych.

5. **Multi-step Form**: Zaakceptowano 4-krokowy wizard dla dodawania/edycji oferty z auto-save drafts i walidacją krok po kroku.

6. **System Powiadomień**: Zaakceptowano wielowarstwowy system powiadomień: toast notifications (shadcn/ui), in-app notifications z badge'ami, status indicators i confirmation dialogs.

7. **Obsługa Stanów API**: Zaakceptowano pattern TanStack Query z dedykowanymi stanami loading (skeleton loaders), error (retry mechanisms) i empty (CTA prompts).

8. **Dostępność WCAG 2.1 AA**: Zaakceptowano pełne wymagania dostępności z pominięciem testowania (axe DevTools, keyboard-only testing, screen reader testing).

9. **Optymalizacja Wydajności**: Zaakceptowano strategię cache'owania z różnymi staleTime dla różnych typów danych, code splitting, image optimization i performance budgets.

10. **Bezpieczeństwo UI**: Zaakceptowano shared Zod schemas, route guards (authGuard, adminGuard), JWT token management i XSS prevention.

---

## Matched Recommendations

### 1. Struktura Routingu (TanStack Router)

**Widoki publiczne:**
- `/` - Strona główna z mapą i filtrowaniem (GET /offers)
- `/offers/:id` - Szczegóły oferty (GET /offers/{id})
- `/auth/login` - Logowanie
- `/auth/register` - Rejestracja
- `/auth/password-reset` - Reset hasła

**Widoki organizatora (authenticated):**
- `/organizer/dashboard` - Panel główny
- `/organizer/offers` - Lista ofert (GET /my-offers)
- `/organizer/offers/new` - Nowa oferta (POST /offers)
- `/organizer/offers/:id/edit` - Edycja (PATCH /offers/{id})
- `/organizer/leads` - Zgłoszenia (GET /leads)
- `/organizer/profile` - Profil (GET/PATCH /profile)

**Widoki admina:**
- `/admin/pending` - Kolejka moderacyjna (GET /admin/offers/pending)
- `/admin/duplicates` - Duplikaty (GET /admin/offers/duplicates)
- `/admin/users` - Użytkownicy (GET /admin/users)
- `/admin/email-logs` - Logi (GET /admin/email-logs)

### 2. Layout System

**PublicLayout:**
- Header: logo, przycisk "Dla organizatorów"
- Brak sidebaru
- Footer z linkami

**OrganizerLayout:**
- Header: logo, nawigacja pozioma, dropdown użytkownika
- Opcjonalny sidebar na desktop
- Breadcrumbs

**AdminLayout:**
- Header z informacją o trybie admin
- Sidebar z nawigacją
- Badge z liczbą pending offers

### 3. Widok Mapy i Filtrów - Layout

**Desktop (≥1024px):**
- **Modyfikacja:** Filtry umieszczone **NAD MAPĄ** zamiast w lewej kolumnie
- Layout dwuszpaltowy:
  - Górny pasek: Panel filtrów (full width, zwijany)
  - Lewa kolumna: Lista wyników z przewijaniem
  - Prawa kolumna (60%): Mapa interaktywna
- Synchronizacja: kliknięcie na marker ↔ podświetlenie w liście

**Tablet (768-1023px):**
- Filtry w drawer/modal (przycisk "Filtry" z badge)
- Toggle między mapą a listą
- Mapa 40% wysokości, lista 60%

**Mobile (<768px):**
- Stack verticalny
- Sticky header z przyciskiem "Filtry" i toggle Mapa/Lista
- Domyślnie: mapa fullscreen z FAB
- Filtry w bottom sheet
- Aktywne filtry jako chips pod headerem

### 4. Zarządzanie Stanem i Synchronizacja

**State Management:**
- **TanStack Router:** Query params synchronizacja (`?age=6-8&category=sport&location=Warsaw&radius=10&page=1`)
- **Zustand:** Stan UI (panel otwarty/zamknięty, aktywne sekcje)
- **TanStack Query:** Cache wyników API z auto invalidation

**Persistence:**
- localStorage dla ostatnich filtrów
- Query params jako source of truth
- Debouncing 500ms dla search

**Paginacja:**
- Infinite scroll na mobile
- "Load more" / klasyczna paginacja na desktop
- Prefetching następnej strony

### 5. Multi-step Form dla Ofert

**Krok 1: Podstawowe informacje**
- Nazwa, opis, kategorie (multi-select), typ oferty
- Walidacja: TanStack Form + Zod
- Progress bar

**Krok 2: Szczegóły**
- Przedział wiekowy (sliders)
- Terminy (date pickers)
- Harmonogram (repeatable fields dla dni/godzin)
- Liczba miejsc

**Krok 3: Lokalizacja**
- Google Maps Autocomplete
- Draggable marker na mapie
- Podgląd lokalizacji

**Krok 4: Zdjęcia i Podsumowanie**
- Upload zdjęć (drag & drop, max 10, 5MB)
- Reorder images (drag & drop)
- Podgląd oferty
- "Zapisz jako szkic" / "Wyślij do moderacji"

**Features:**
- Nawigacja między krokami
- Auto-save co 30s
- Async validation (duplikaty przed submit)

### 6. System Powiadomień

**Toast Notifications (shadcn/ui):**
- Sukces (zielony): "Oferta wysłana", "Zapisano"
- Błędy (czerwony): "Nie udało się zapisać"
- Info (niebieski): "Auto-save completed"
- Pozycja: top-right (desktop), top-center (mobile)
- Auto-dismiss: 5s (sukces), 10s (błąd)

**In-app Notifications:**
- Badge z liczbą nowych zgłoszeń
- Dropdown z listą powiadomień
- Real-time updates (opcjonalnie Supabase Realtime)

**Status Indicators:**
- Skeleton loaders dla list
- Spinner dla akcji
- Empty states z CTA
- Error boundaries z retry

**Confirmation Dialogs:**
- Dla destrukcyjnych akcji (usuwanie, odrzucanie)
- AlertDialog z jasnym pytaniem + kontekstem

### 7. Obsługa Stanów API (TanStack Query)

**Query Pattern:**
```typescript
useQuery({
  queryKey: ['offers', filters],
  queryFn: () => fetchOffers(filters),
  staleTime: 5 * 60 * 1000, // 5 min dla public offers
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
})
```

**Loading States:**
- Pierwsze ładowanie: Skeleton loaders
- Background refetch: Dyskretny indicator
- Infinite scroll: Loader na dole
- Mutacje: Disabled button + spinner

**Error States:**
- Network error: Alert + "Spróbuj ponownie"
- 404: Dedykowana strona
- 403/401: Redirect do login + komunikat
- Validation: Inline errors pod polami

**Empty States:**
- Brak wyników: Ilustracja + "Wyczyść filtry"
- Brak ofert: Empty state + "Dodaj pierwszą ofertę"
- Brak zgłoszeń: Komunikat zachęcający

**Optimistic Updates:**
- Update lead status
- Rollback + toast przy błędzie

### 8. Dostępność (WCAG 2.1 AA)

**Ogólne:**
- Semantic HTML (nav, main, aside)
- ARIA attributes (shadcn/ui ready)
- Kontrast 4.5:1
- Focus indicators
- Skip links

**Mapa:**
- Alternatywny widok listy
- ARIA labels dla markerów
- Keyboard navigation: Tab + Enter
- Screen reader announcements

**Filtry:**
- Labels dla wszystkich inputs
- Checkboxes/radio zamiast custom toggles
- Keyboard shortcuts (Esc, Space)
- Live region (aria-live) dla liczby wyników

**Formularze:**
- Labels z htmlFor/id
- Error messages (aria-describedby)
- Required fields oznaczone
- Focus na błędnym polu po submit

**Nawigacja:**
- Logiczna Tab order
- Focus trap w modalach
- Breadcrumbs z aria-current

### 9. Optymalizacja Wydajności

**TanStack Query Caching:**
```typescript
// Public offers: 5 min staleTime
// Offer details: 10 min staleTime
// Dictionaries: Infinity staleTime
// User offers: 1 min staleTime
```

**Code Splitting:**
- Route-based (TanStack Router auto)
- Dynamic imports:
  - Map component (Google Maps)
  - Image upload
  - Rich text editor
  - Admin panel

**Image Optimization:**
- Lazy loading (loading="lazy")
- Responsive images (srcset)
- WebP + JPEG fallback
- Supabase Storage CDN transformation

**Bundle Optimization:**
- Tree-shaking (Vite auto)
- vite-bundle-visualizer
- Import only needed icons
- Separate vendor chunks

**Performance Targets:**
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- TTI < 3.5s (mobile)

**Monitoring:**
- Lighthouse CI
- GA4 Web Vitals
- Performance budgets

### 10. Bezpieczeństwo UI

**Shared Zod Schemas:**
- `/src/schemas/offerSchema.ts`
- `/src/schemas/leadSchema.ts`
- `/src/schemas/profileSchema.ts`
- `/src/schemas/authSchemas.ts`

**Route Protection:**
```typescript
// authGuard dla protected routes
// adminGuard dla admin routes
// Redirect do login z return URL
```

**Walidacja:**
- TanStack Form + Zod
- Real-time validation (onChange)
- Async validation (email uniqueness, duplikaty)
- Client + Server validation (zawsze backend)

**XSS Prevention:**
- DOMPurify dla user HTML
- React auto-escape
- CSP headers

**Token Management:**
- JWT w httpOnly cookie (Supabase)
- Auto-refresh przed expiration
- Logout przy 401
- CSRF protection

---

## UI Architecture Planning Summary

### Główne Wymagania Architektury UI

Kidosy MVP to platforma typu marketplace łącząca rodziców z organizatorami zajęć dla dzieci. Architektura UI musi wspierać trzy główne persony użytkowników:

1. **Anonimowy rodzic** - przeglądanie ofert bez logowania
2. **Zalogowany organizator** - zarządzanie ofertami i zgłoszeniami
3. **Administrator** - moderacja i zarządzanie platformą

**Kluczowe założenia techniczne:**
- **Framework:** React 18+ z TypeScript i Vite
- **Routing:** TanStack Router (z synchronizacją URL)
- **State Management:** TanStack Query (server state) + Zustand (client state)
- **Forms:** TanStack Form + Zod validation
- **UI Components:** shadcn/ui + Tailwind CSS + Radix UI
- **Maps:** Google Maps JavaScript API
- **Analytics:** Google Analytics 4

### Kluczowe Widoki, Ekrany i Przepływy Użytkownika

#### 1. Publiczne Widoki (Rodzic)

**Strona Główna (`/`)**
- **Desktop:**
  - Filtry w górnym pasku (zwijany)
  - Layout dwuszpaltowy: lista wyników (40%) + mapa (60%)
  - Synchronizacja kliknięć marker ↔ lista
- **Mobile:**
  - Toggle między widokiem mapy a listy
  - Filtry w bottom sheet
  - Aktywne filtry jako chips

**Szczegóły Oferty (`/offers/:id`)**
- Modal lub dedykowana strona
- Galeria zdjęć, szczegóły, mapa lokalizacji
- Formularz zgłoszenia (bez logowania)
- Walidacja: imię dziecka, wiek, email/telefon rodzica

**Przepływ:**
1. Rodzic otwiera stronę → widzi mapę z ofertami
2. Stosuje filtry (wiek, kategoria, lokalizacja, typ)
3. Klika marker/ofertę → widzi szczegóły
4. Wypełnia formularz zgłoszenia
5. Otrzymuje email potwierdzenie

#### 2. Widoki Organizatora (Authenticated)

**Dashboard (`/organizer/dashboard`)**
- Podsumowanie: liczba ofert (draft, pending, published, archived)
- Badge z nowymi zgłoszeniami
- Szybkie akcje: "Dodaj ofertę", "Zobacz zgłoszenia"

**Moje Oferty (`/organizer/offers`)**
- Lista ofert z filtrowaniem po statusie
- Akcje: Edytuj, Usuń, Podgląd, Archiwizuj
- Sortowanie: data utworzenia, data zmian, nazwa, termin

**Dodawanie Oferty (`/organizer/offers/new`)**
- 4-krokowy wizard:
  1. Podstawowe info (nazwa, opis, kategorie, typ)
  2. Szczegóły (wiek, terminy, harmonogram, miejsca)
  3. Lokalizacja (autocomplete + mapa)
  4. Zdjęcia + podsumowanie
- Auto-save co 30s
- "Zapisz jako szkic" / "Wyślij do moderacji"

**Edycja Oferty (`/organizer/offers/:id/edit`)**
- Ten sam formularz co dodawanie
- Pre-populated z obecnymi wartościami
- Historia zmian (audyt)

**Zgłoszenia (`/organizer/leads`)**
- Lista zgłoszeń do wszystkich ofert
- Filtry: oferta, status (nowe, kontaktowane, zatwierdzone, odrzucone)
- Akcje: Zmień status, Dodaj notatki
- Dane dziecka i rodzica

**Profil (`/organizer/profile`)**
- Edycja: nazwa firmy, telefon, email
- Zmiana email wymaga weryfikacji

**Przepływ:**
1. Organizator rejestruje się → weryfikuje email
2. Loguje się → widzi dashboard
3. Dodaje ofertę (wizard) → zapisuje jako draft
4. Wysyła do moderacji → czeka na zatwierdzenie admina
5. Otrzymuje email o zatwierdzeniu
6. Otrzymuje powiadomienia o nowych zgłoszeniach
7. Zarządza zgłoszeniami (zmienia statusy)

#### 3. Widoki Admina

**Kolejka Moderacyjna (`/admin/pending`)**
- Lista ofert pending_review
- Sortowanie po dacie wysłania
- Podgląd pełnych szczegółów
- Akcje: Zatwierdź, Odrzuć (z powodem)

**Duplikaty (`/admin/duplicates`)**
- Para ofert flagowanych jako potencjalnie duplikaty
- Similarity score
- Akcje: Oznacz jako reviewed, Usuń duplikat

**Użytkownicy (`/admin/users`)**
- Lista organizatorów
- Filtry: status konta, data rejestracji
- Akcje: Zobacz oferty użytkownika, Blokuj/Odblokuj

**Logi Emaili (`/admin/email-logs`)**
- Historia wysłanych emaili
- Filtry: typ (weryfikacja, zatwierdzenie, odrzucenie, zgłoszenie)
- Status dostarczenia

**Przepływ:**
1. Admin loguje się
2. Widzi badge z liczbą pending offers
3. Przegląda kolejkę → sprawdza ofertę
4. Zatwierdza (email do organizatora) lub odrzuca (z powodem)
5. Przegląda duplikaty → oznacza jako reviewed
6. Monitoruje logi emaili

### Strategia Integracji z API i Zarządzania Stanem

#### API Integration Pattern

**TanStack Query jako główny mechanizm:**

```typescript
// Public offers (cached 5 min)
const { data: offers } = useQuery({
  queryKey: ['offers', filters],
  queryFn: () => supabaseClient
    .from('offers')
    .select('*')
    .eq('status', 'published')
    .filter(...filters),
  staleTime: 5 * 60 * 1000,
})

// Dictionaries (cached indefinitely)
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: () => supabaseClient.from('categories').select('*'),
  staleTime: Infinity,
})

// User offers (fresh data)
const { data: myOffers } = useQuery({
  queryKey: ['my-offers', userId],
  queryFn: () => supabaseClient
    .from('offers')
    .select('*')
    .eq('organizer_id', userId),
  staleTime: 1 * 60 * 1000,
})
```

**Mutations z Optimistic Updates:**

```typescript
const updateLeadStatus = useMutation({
  mutationFn: (data) => supabaseClient
    .from('leads')
    .update({ status: data.status })
    .eq('id', data.leadId),
  onMutate: async (data) => {
    // Optimistic update
    await queryClient.cancelQueries(['leads'])
    const previous = queryClient.getQueryData(['leads'])
    queryClient.setQueryData(['leads'], (old) => 
      old.map(lead => lead.id === data.leadId 
        ? { ...lead, status: data.status } 
        : lead
      )
    )
    return { previous }
  },
  onError: (err, data, context) => {
    // Rollback
    queryClient.setQueryData(['leads'], context.previous)
    toast.error('Nie udało się zaktualizować statusu')
  },
  onSettled: () => {
    queryClient.invalidateQueries(['leads'])
  },
})
```

#### State Management Strategy

**TanStack Query:** Server state (API data)
- Offers, leads, user profile, dictionaries
- Automatic caching, refetching, invalidation
- Optimistic updates dla lepszego UX

**Zustand:** Client state (UI)
```typescript
// Filter panel state
const useFilterStore = create((set) => ({
  isPanelOpen: true,
  activeFilters: {},
  togglePanel: () => set((state) => ({ 
    isPanelOpen: !state.isPanelOpen 
  })),
  setFilter: (key, value) => set((state) => ({
    activeFilters: { ...state.activeFilters, [key]: value }
  })),
}))

// Auth state (synced with Supabase)
const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}))
```

**TanStack Router:** URL as source of truth dla filtrów
```typescript
// Route definition
const homeRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: (search) => filterSchema.parse(search),
  component: HomePage,
})

// Usage in component
const navigate = useNavigate()
const { age, category, location } = homeRoute.useSearch()

// Update URL = update filters
navigate({ 
  search: { age: '6-8', category: 'sport', location: 'Warsaw' } 
})
```

**localStorage:** Persistence ostatnich filtrów
```typescript
// Save on filter change
useEffect(() => {
  localStorage.setItem('lastFilters', JSON.stringify(activeFilters))
}, [activeFilters])

// Load on mount
const savedFilters = JSON.parse(localStorage.getItem('lastFilters') || '{}')
```

#### API Error Handling

**Axios Interceptors (lub Supabase client wrapper):**
```typescript
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    queryClient.clear()
  }
  if (event === 'SIGNED_IN') {
    queryClient.invalidateQueries()
  }
})

// Global error handling
const handleApiError = (error) => {
  if (error.code === '401') {
    // Redirect to login
    navigate({ to: PATHS.AUTH.LOGIN })
    toast.error('Sesja wygasła. Zaloguj się ponownie.')
  } else if (error.code === '403') {
    toast.error('Brak uprawnień do tej akcji.')
  } else if (error.code === '404') {
    toast.error('Nie znaleziono zasobu.')
  } else {
    toast.error('Wystąpił błąd. Spróbuj ponownie.')
  }
}
```

### Responsywność, Dostępność i Bezpieczeństwo

#### Responsywność (Mobile-First)

**Breakpoints (Tailwind):**
- `sm: 640px` - Small devices
- `md: 768px` - Tablets
- `lg: 1024px` - Desktops
- `xl: 1280px` - Large screens

**Layout Strategy:**
- Mobile (<768px): Single column, stacked
- Tablet (768-1023px): Adaptive layout, toggles
- Desktop (≥1024px): Multi-column, sidebars

**Key Responsive Components:**
- Mapa: Full-height mobile, 60% desktop
- Filtry: Bottom sheet mobile, top bar desktop
- Formularze: Single column, max-width 600px
- Modals: Full-screen mobile, centered desktop

#### Dostępność (WCAG 2.1 AA)

**Semantic HTML:**
```html
<nav aria-label="Główna nawigacja">
  <ul role="list">
    <li><a href="/">Strona główna</a></li>
  </ul>
</nav>

<main id="main-content">
  <h1>Znajdź zajęcia dla dzieci</h1>
  <section aria-labelledby="filters-heading">
    <h2 id="filters-heading">Filtry</h2>
    ...
  </section>
</main>
```

**Keyboard Navigation:**
- Tab order logiczny
- Focus indicators (outline)
- Skróty klawiszowe (Esc zamyka modal, Space zaznacza)
- Focus trap w modalach

**Screen Reader Support:**
- ARIA labels dla interactive elements
- Live regions dla dynamicznych zmian
- Alt text dla obrazów
- Descriptive link text

**Color Contrast:**
- Minimum 4.5:1 dla tekstu
- Nie tylko kolor dla przekazu informacji
- Focus indicators widoczne

#### Bezpieczeństwo

**Authentication & Authorization:**
```typescript
// Route guard (TanStack Router)
const authGuard = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    throw redirect({
      to: PATHS.AUTH.LOGIN,
      search: { redirect: window.location.pathname }
    })
  }
  return { user: session.user }
}

// Admin guard
const adminGuard = async ({ context }) => {
  if (context.user.user_metadata.role !== 'admin') {
    throw redirect({ to: PATHS.HOME })
  }
}

// Usage
const organizerRoute = new Route({
  path: '/organizer',
  beforeLoad: authGuard,
})
```

**Input Validation (Zod):**
```typescript
// Shared schema
const offerSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(10).max(2000),
  offer_type_id: z.string().uuid(),
  category_ids: z.array(z.string().uuid()).min(1),
  ages: z.array(z.number().min(0)).min(1),
  address: z.string().min(1),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
  }),
  start_date: z.date(),
  end_date: z.date(),
}).refine(data => data.end_date >= data.start_date, {
  message: "Data końcowa musi być późniejsza niż początkowa",
  path: ["end_date"],
})

// Form usage
const form = useForm({
  defaultValues: offer,
  validators: {
    onChange: offerSchema,
  },
  onSubmit: async ({ value }) => {
    await createOffer(value)
  },
})
```

**XSS Prevention:**
- React auto-escapes JSX
- DOMPurify dla user HTML (jeśli rich text)
- CSP headers w production
- Sanitize przed wyświetleniem

**CSRF Protection:**
- Supabase JWT tokens (httpOnly cookies)
- SameSite=Strict dla cookies
- Validate token na każdym request

**Token Management:**
- Auto-refresh przed expiration
- Secure storage (httpOnly cookie)
- Clear on logout
- Expire after 30 min inactivity

### Kwestie Dodatkowe

#### Centralizacja Paths

Wszystkie ścieżki routingu przechowywane w `src/shared/constants/paths.ts`:
- Type-safe routing
- Łatwa refaktoryzacja
- Helper functions dla dynamic paths
- Patterns dla route matching

#### Performance Budgets

**Lighthouse CI thresholds:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

**Bundle size limits:**
- Initial bundle: < 200KB (gzipped)
- Vendor chunk: < 150KB
- Route chunks: < 50KB każdy

#### Analytics Events (GA4)

**Tracked events:**
- `page_view` - każda zmiana route
- `search` - użycie filtrów
- `view_item` - otwarcie szczegółów oferty
- `lead_submit` - wysłanie formularza zgłoszenia
- `offer_create` - utworzenie oferty
- `offer_submit` - wysłanie do moderacji
- `offer_approve` - zatwierdzenie przez admina
- `offer_reject` - odrzucenie przez admina

#### Component Structure

**Atomic Design Pattern:**
```
src/components/
  ui/              # shadcn/ui components (atoms)
  forms/           # Form components (molecules)
  features/        # Feature-specific (organisms)
    OfferCard/
    OfferFilters/
    LeadsList/
  layouts/         # Layout components
    PublicLayout/
    OrganizerLayout/
    AdminLayout/
  pages/           # Page components (templates)
```

---

## Unresolved Issues

### 1. Real-time Notifications

**Pytanie:** Czy implementować real-time notifications (Supabase Realtime) już w MVP, czy pozostawić przy polling/refresh?

**Implikacje:**
- Real-time: Lepszy UX, większa złożoność
- Polling: Prostsze, opóźnienie w powiadomieniach

**Rekomendacja do dyskusji:** Polling dla MVP, real-time w post-MVP.

### 2. Image Upload UX

**Pytanie:** Czy upload zdjęć powinien być bezpośrednio do Supabase Storage w kroku 4 formularza, czy najpierw do temporary storage, potem przy final submit?

**Implikacje:**
- Bezpośredni upload: Szybsze zapisanie oferty
- Temporary: Lepsze zarządzanie przy anulowaniu

**Rekomendacja do dyskusji:** Bezpośredni upload z możliwością usunięcia przy anulowaniu.

### 3. Offline Support

**Pytanie:** Czy MVP powinno wspierać basic offline capabilities (Service Worker, cache API responses)?

**Implikacje:**
- Offline: Lepszy UX na słabym internecie
- Online-only: Prostsze, szybsze development

**Rekomendacja do dyskusji:** Online-only dla MVP, offline w post-MVP.

### 4. Map Clustering Algorithm

**Pytanie:** Jaki algorytm klastrowania markerów na mapie? Google Maps domyślny czy custom (np. Supercluster)?

**Implikacje:**
- Google Maps default: Prostsze
- Supercluster: Większa kontrola, lepsze performance

**Rekomendacja do dyskusji:** Google Maps MarkerClusterer dla MVP.

### 5. Form Auto-save Conflict Resolution

**Pytanie:** Co się dzieje gdy auto-save zapisuje draft, a użytkownik jednocześnie klika "Wyślij do moderacji"?

**Implikacje:**
- Race condition możliwa
- Potrzeba lock mechanism lub queue

**Rekomendacja do dyskusji:** Disable auto-save podczas manual submit, show spinner.

### 6. Admin Dashboard Metrics

**Pytanie:** Czy admin dashboard powinien pokazywać metryki (liczba ofert, użytkowników, zgłoszeń) czy tylko lista zadań (pending, duplicates)?

**Implikacje:**
- Metryki: Lepszy overview, dodatkowe API calls
- Lista zadań: Prostsze, focused

**Rekomendacja do dyskusji:** Lista zadań dla MVP, metrics w post-MVP.

### 7. Email Template Management

**Pytanie:** Czy email templates powinny być edytowalne przez admina w UI, czy hardcoded w kodzie?

**Implikacje:**
- Edytowalne: Większa elastyczność, złożoność
- Hardcoded: Prostsze, wymagają deployment przy zmianie

**Rekomendacja do dyskusji:** Hardcoded dla MVP, edytowalne w post-MVP.

### 8. Multi-language Support

**Pytanie:** Czy architektura powinna przewidywać i18n (internationalization) już w MVP, nawet jeśli na start tylko Polski?

**Implikacje:**
- Tak: Łatwiejsza późniejsza ekspansja, więcej boilerplate
- Nie: Szybsze MVP, trudniejsze dodanie później

**Rekomendacja do dyskusji:** Struktura gotowa (i18n keys), ale tylko PL translations dla MVP.

---

**Data podsumowania:** 8 lutego 2026
**Status:** Gotowe do implementacji UI architecture
**Następny krok:** Szczegółowe wireframes i user flows dla kluczowych przepływów
