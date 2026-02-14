# API Endpoint Implementation Plan: GET /offers/{offerId}

## 1. Przegląd punktu końcowego

Endpoint **GET /offers/{offerId}** pozwala użytkownikom na wyświetlenie pełnych szczegółów konkretnej oferty zajęć. Endpoint obsługuje trzy poziomy dostępu:

- **Anonimowy/Publiczny**: Może wyświetlać tylko opublikowane oferty
- **Uwierzytelniony (Organizator)**: Może wyświetlać własne oferty (niezależnie od statusu) oraz wszystkie opublikowane oferty
- **Admin**: Może wyświetlać wszystkie oferty i wszystkie statusy

Odpowiedź zawiera kompletne informacje o ofercie: harmonogramy, obrazy, dane organizatora (ograniczone dla ofert neopublikowanych), oraz historię zmian statusu (dla organizatorów i adminów).

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/offers/{offerId}
```

### Parametry

**Wymagane (Path Parameters):**

- `offerId` (uuid) - Unikalny identyfikator oferty

**Opcjonalne (Query Parameters):**

- `include_history` (boolean, default: `false`) - Czy dołączyć historię zmian statusu oferty (dostępne tylko dla organizatorów/adminów)

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body

Brak treści żądania (GET request).

### Przykład żądania

```bash
# Pobierz opublikowaną ofertę (dostępne publicznie)
curl -X GET "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000"

# Pobierz szczegóły własnej oferty z historią
curl -X GET "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000?include_history=true" \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Admin pobiera dowolną ofertę
curl -X GET "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Główny typ odpowiedzi
PublicOfferDetailsDto = Pick<DbOffer,
  | 'id'
  | 'title'
  | 'description'
  | 'ages'
  | 'address'
  | 'start_date'
  | 'end_date'
  | 'available_spots'
  | 'status'
  | 'created_at'
  | 'updated_at'
> & {
  offer_type: OfferTypeDto;           // Typ zajęć
  categories: CategoryDto[];          // Kategorie
  location: GeoPointDto;              // Współrzędne geograficzne
  organizer: PublicOrganizerDto;      // Dane organizatora (ograniczone)
  images: OfferImageDto[];            // Obrazy oferty
  schedules: OfferScheduleDto[];      // Harmonogramy (tylko jeśli status = 'published')
};

// Typy zagnieżdżone
OfferTypeDto = Pick<DbOfferType, 'id' | 'name' | 'slug'>;
CategoryDto = Pick<DbCategory, 'id' | 'name' | 'slug' | 'description'>;
GeoPointDto = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};
PublicOrganizerDto = Pick<DbOrganizerProfile,
  'id' | 'company_name' | 'phone' | 'email_public'
>;
OfferImageDto = Pick<DbOfferImage, 'id' | 'storage_path' | 'display_order'>;
OfferScheduleDto = Pick<DbOfferSchedule,
  'id' | 'day_of_week' | 'start_time' | 'end_time' | 'is_active'
>;

// Opcjonalnie, jeśli include_history=true
OfferStatusHistoryDto = Pick<DbOfferStatusHistory,
  'id' | 'old_status' | 'new_status' | 'reason' | 'changed_at'
> & {
  changed_by: Pick<DbUser, 'id' | 'email'>;
};
```

### Typy pomocnicze

```typescript
AuthUserDto = Pick<DbUser, 'id' | 'email' | 'created_at'> & {
  role?: 'admin' | 'organizer';
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Kurs programowania dla dzieci",
  "description": "Intensywny kurs nauki programowania w Python dla dzieci w wieku 10-14 lat...",
  "ages": [10, 11, 12, 13, 14],
  "address": "ul. Puławska 123, 02-595 Warszawa",
  "start_date": "2026-03-01",
  "end_date": "2026-06-30",
  "available_spots": 15,
  "status": "published",
  "created_at": "2026-02-07T10:00:00Z",
  "updated_at": "2026-02-07T12:30:00Z",
  "offer_type": {
    "id": "uuid",
    "name": "Zajęcia cykliczne",
    "slug": "weekly-classes"
  },
  "categories": [
    {
      "id": "uuid",
      "name": "Edukacyjne",
      "slug": "educational",
      "description": "Zajęcia edukacyjne rozwijające umiejętności"
    }
  ],
  "location": {
    "type": "Point",
    "coordinates": [21.0122, 52.0469]
  },
  "organizer": {
    "id": "uuid",
    "company_name": "TechKids Sp. z o.o.",
    "phone": "+48123456789",
    "email_public": "kontakt@techkids.pl"
  },
  "images": [
    {
      "id": "uuid",
      "storage_path": "offers/550e8400-e29b-41d4-a716-446655440000/image-1.webp",
      "display_order": 1
    }
  ],
  "schedules": [
    {
      "id": "uuid",
      "day_of_week": 1,
      "start_time": "16:00:00",
      "end_time": "17:30:00",
      "is_active": true
    }
  ]
}
```

### Odpowiedź z historią statusu (200 OK, when include_history=true)

```json
{
  "...": "...same as above...",
  "status_history": [
    {
      "id": "uuid",
      "old_status": "draft",
      "new_status": "pending_review",
      "reason": "Organizator przesłał ofertę do weryfikacji",
      "changed_at": "2026-02-07T11:00:00Z",
      "changed_by": {
        "id": "user-uuid",
        "email": "organizer@techkids.pl"
      }
    },
    {
      "id": "uuid",
      "old_status": "pending_review",
      "new_status": "published",
      "reason": "Zatwierdzono przez moderatora",
      "changed_at": "2026-02-07T12:30:00Z",
      "changed_by": {
        "id": "admin-uuid",
        "email": "admin@kidosy.pl"
      }
    }
  ]
}
```

### Kody statusu odpowiedzi

- **200 OK** - Oferta znaleziona i zwrócona (użytkownik ma dostęp)
- **400 Bad Request** - Nieprawidłowy format `offerId` (nie jest ważnym UUID)
- **401 Unauthorized** - Token JWT nieprawidłowy, wygasły lub brakujący (dla zasobów wymagających autoryzacji)
- **403 Forbidden** - Oferta istnieje, ale użytkownik nie ma dostępu (np. neopublikowana oferta dla anonimowego)
- **404 Not Found** - Oferta nie istnieje lub została usunięta (soft deleted)
- **500 Internal Server Error** - Błąd serwera (błąd bazy, błąd konwersji danych)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /offers/{offerId}                       │
│    Headers: Authorization: Bearer <JWT>                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Middleware (Autoryzacja i Autentykacja)                  │
│    - Wyciąg JWT z headera Authorization                     │
│    - Walidacja tokenów i ekstrakcja user_id, role           │
│    - Jeśli brak tokenu: ustaw role = 'anon'                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja parametrów                                      │
│    - Sprawdź format UUID dla offerId                         │
│    - Sprawdź query range dla include_history (boolean)       │
│    - Return 400 jeśli nieprawidłowe                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Przywołaj OfferService.getOfferDetails()                 │
│    - Przekaż: offerId, userId, userRole, include_history   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Service Logic (OfferService)                             │
│                                                               │
│    a) Pobierz ofertę + relacyjne dane:                       │
│       - SELECT offers WHERE id = offerId                     │
│       - JOIN offer_types, offer_categories, categories      │
│       - JOIN organizer_profiles                              │
│       - JOIN offer_images, offer_schedules                  │
│       - RLS Policy weryfikuje dostęp na poziomie bazy        │
│                                                               │
│    b) Jeśli offerta nie zwrócona przez RLS:                │
│       - Sprawdź czy oferta w ogóle istnieje                  │
│       - Return 403 Forbidden (access denied)                 │
│       - Jeśli nie istnieje: Return 404 Not Found             │
│                                                               │
│    c) Jeśli include_history=true:                            │
│       - SELECT FROM offer_status_history WHERE offer_id     │
│       - JOIN users dla changed_by info                       │
│                                                               │
│    d) Mapuj surowe dane do PublicOfferDetailsDto             │
│       - Konwersja geometry(Point) do GeoPointDto             │
│       - Format daty                                          │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Zwróć odpowiedź JSON                                      │
│    Status: 200 OK                                            │
│    Body: PublicOfferDetailsDto                               │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z bazą danych

```sql
-- 1. Query główny (Supabase RLS policies weryfikują dostęp)
SELECT
  o.id,
  o.title,
  o.description,
  o.ages,
  o.address,
  ST_AsGeoJSON(o.location) as location,
  o.start_date,
  o.end_date,
  o.available_spots,
  o.status,
  o.created_at,
  o.updated_at,
  ot.id as offer_type_id,
  ot.name as offer_type_name,
  ot.slug as offer_type_slug,
  op.id as organizer_id,
  op.company_name,
  op.phone,
  op.email_public
FROM offers o
JOIN offer_types ot ON o.offer_type_id = ot.id
JOIN organizer_profiles op ON o.user_id = op.user_id
WHERE o.id = $1
  AND o.deleted_at IS NULL;

-- 2. Kategorie
SELECT
  c.id,
  c.name,
  c.slug,
  c.description
FROM categories c
JOIN offer_categories oc ON c.id = oc.category_id
WHERE oc.offer_id = $1;

-- 3. Obrazy
SELECT
  id,
  storage_path,
  display_order
FROM offer_images
WHERE offer_id = $1
ORDER BY display_order ASC;

-- 4. Harmonogramy (tylko dla published offers)
SELECT
  id,
  day_of_week,
  start_time,
  end_time,
  is_active
FROM offer_schedules
WHERE offer_id = $1
  AND is_active = true
ORDER BY day_of_week ASC;

-- 5. Historia statusu (jeśli include_history=true)
SELECT
  id,
  old_status,
  new_status,
  reason,
  changed_at,
  changed_by (ID i email)
FROM offer_status_history
WHERE offer_id = $1
ORDER BY changed_at DESC;
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Token Validation**: Supabase Auth obsługuje walidację tokenów
- Token powinien być przesłany w nagłówku `Authorization: Bearer <token>`
- Wygasłe tokeny zwracają **401 Unauthorized**

### 6.2 Autoryzacja i Kontrola dostępu

**Row Level Security (RLS) Policies:**

```sql
-- Policy 1: Anonimowy użytkownik vidi tylko published oferty
CREATE POLICY "anon_see_published_offers" ON offers
  FOR SELECT
  USING (
    auth.role() = 'anon'
    AND status = 'published'
    AND deleted_at IS NULL
  );

-- Policy 2: Organizator vidi swoje oferty + published
CREATE POLICY "organizer_see_own_and_published" ON offers
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      user_id = auth.uid()
      OR (status = 'published' AND deleted_at IS NULL)
    )
  );

-- Policy 3: Admin vidi wszystkie oferty
CREATE POLICY "admin_see_all_offers" ON offers
  FOR SELECT
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
```

### 6.3 Ochrona danych wrażliwych

**Dane publiczne (dla neopublikowanych ofert):**

- Ograniczenie danych organizatora do: `company_name`, `phone`, `email_public`
- **Brak dostępu do**:
  - Email użytkownika (z tabeli `users`)
  - Danych rejestracyjnych organizatora
  - Harmonogramów (harmonogramy zwracane tylko dla published ofert)

**Walidacja logiki w kodzie aplikacji:**

```typescript
// Jeśli oferta nie jest published i użytkownik nie jest właścicielem/adminem
// ogranicza informacje o organizatorze
if (offer.status !== 'published' && !isOwnerOrAdmin) {
  organizer = sanitizePublicOrganizerData(organizer);
}
```

### 6.4 Walidacja wejścia

- **offerId**: Walidacja UUID format (Supabase UUID type zapewnia bezpieczeństwo)
- **include_history**: Parsowanie jako boolean, default `false`
- Nie ma wstrzykiwania SQL dzięki parametryzowanym zapytaniom

### 6.5 CORS i ograniczenia pochodzenia

- Skonfiguruj CORS headers:
  ```
  Access-Control-Allow-Origin: https://kidosy.pl
  Access-Control-Allow-Methods: GET, OPTIONS
  Access-Control-Allow-Headers: Authorization, Content-Type
  ```

### 6.6 Rate Limiting

- Zaimplementuj rate limiting aby zapobiec enumeration attack:
  - Max 100 żądań na minutę per IP
  - Max 10 żądań na sekundę per authenticated user

### 6.7 Logging i Monitoring

- **Logowanie dostępu**: Zarejestruj każdy GET (zwłaszcza do wrażliwych danych)
- **Anomalii detektowanie**: Wiele nieudanych 404/403 z tego samego IP
- Sentry/monitoring dla 5xx błędów

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                                          | Status | Error Code         | Message                                         | Przyczyna                                |
| --------------------------------------------------- | ------ | ------------------ | ----------------------------------------------- | ---------------------------------------- |
| Oferta znaleziona i dostępna                        | 200    | -                  | -                                               | Success                                  |
| offerId nie jest UUID                               | 400    | `VALIDATION_ERROR` | "Invalid offer ID format"                       | Nieprawidłowy format parametru           |
| include_history nie jest boolean                    | 400    | `VALIDATION_ERROR` | "Invalid include_history parameter"             | Nieprawidłowy parametr query             |
| Brak tokenu JWT (dla restricted)                    | 401    | `UNAUTHORIZED`     | "Authentication required"                       | Token brakuje/wygasł                     |
| Token JWT nieprawidłowy                             | 401    | `UNAUTHORIZED`     | "Invalid or expired token"                      | Dekodowanie tokenu nie powiodło się      |
| Oferta istnieje, ale draft/pending i nie właściciel | 403    | `FORBIDDEN`        | "You do not have permission to view this offer" | RLS Policy blokuje dostęp                |
| Oferta nie istnieje                                 | 404    | `NOT_FOUND`        | "Offer not found"                               | offer_id nie znaleziony lub soft deleted |
| Błąd bazy danych                                    | 500    | `DATABASE_ERROR`   | "Internal server error"                         | Błąd Supabase                            |
| Błąd mapowania danych                               | 500    | `PROCESSING_ERROR` | "Failed to process offer data"                  | Błąd konwersji geometry, formatowania    |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'DATABASE_ERROR'
      | 'PROCESSING_ERROR';
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
};
```

### 7.3 Przykłady odpowiedzi błędów

**400 Bad Request:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid offer ID format. Expected UUID.",
    "details": [
      {
        "field": "offerId",
        "message": "Must be a valid UUID v4"
      }
    ]
  }
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired authentication token"
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to view this offer"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Offer with ID '550e8400-e29b-41d4-a716-446655440000' not found"
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Internal server error. Please try again later."
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Multiple JOINs**: Zapytanie wymaga 7+ JOINów (offer → types, categories, images, schedules, organizer)
   - **Rozwiązanie**: Użyj indeksów na foreign keys (`user_id`, `offer_type_id`)
   - **Rozwiązanie**: Eager loading - załaduj wszystko w jednym zapytaniu

2. **Konwersja geometry**: `ST_AsGeoJSON(location)` może być wolna dla dużych zbiorów
   - **Rozwiązanie**: Cache wyników dla popularnych ofert

3. **Historia statusu**: Jeśli include_history=true, dodatkowe zapytanie
   - **Rozwiązanie**: Załaduj na żądanie, nie domyślnie

### 8.2 Strategie optymalizacji

**Indeksowanie:**

```sql
-- Indeksy na foreign keys
CREATE INDEX idx_offers_user_id ON offers(user_id);
CREATE INDEX idx_offers_offer_type_id ON offers(offer_type_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_deleted_at ON offers(deleted_at);

-- Indeks na location dla geospatial queries
CREATE INDEX idx_offers_location ON offers USING GIST(location);

-- Indeksy dla JOINów
CREATE INDEX idx_offer_categories_offer_id ON offer_categories(offer_id);
CREATE INDEX idx_offer_categories_category_id ON offer_categories(category_id);
```

**Caching:**

```typescript
// Cache public offers dla 5 minut
const cacheKey = `offer:${offerId}:${userId}`;
const cachedOffer = await cache.get(cacheKey);

if (cachedOffer) {
  return cachedOffer;
}

// Jeśli nie w cache, pobierz z bazy
const offer = await getOfferFromDatabase(offerId, userId);

// Cache na 5 minut
if (offer.status === 'published') {
  await cache.set(cacheKey, offer, 300);
}
```

**Paginacja dla historii statusu:**

- Historia może być duża, załaduj 10 najnowszych wpisów domyślnie
- Dodaj `limit` parametr do query

**N+1 Query Prevention:**

- Załaduj wszystkie kategorie, obrazy, harmonogramy w głównym zapytaniu
- Unikaj pętli wewnątrz kodu aplikacji

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 100ms
- **P95**: < 300ms
- **P99**: < 1s

---

## 9. Etapy wdrażania

### Faza 1: Setup projektu i przygotowanie

**Kroki:**

1. Utwórz strukturę folderów:
   - `src/services/offers.service.ts` - logika biznesowa
   - `src/controllers/offers.controller.ts` - handler HTTP
   - `src/validators/offers.validator.ts` - walidacja
   - `src/mappers/offers.mapper.ts` - mapowanie DTO

2. Zainstaluj/zweryfikuj dependencies:
   - `express` lub framework HTTP
   - `zod` dla walidacji
   - `uuid` dla walidacji UUID
   - `supabase-js` client

3. Zweryfikuj tabele Supabase:
   - RLS policies są aktywne
   - Indeksy są stworzone
   - Seed data jest załadowana

**Deliverables:**

- Folder struktura gotowa
- Dependencies zainstalowane
- Database connection working

---

### Faza 2: Implementacja walidacji

**Kroki:**

1. Stwórz `OfferValidator` klasy z metodami:
   - `validateOfferId(offerId: string): void` - sprawdź UUID format
   - `validateQueryParams(includeHistory?: string): void` - sprawdź boolean

2. Implementuj Zod schema:

   ```typescript
   const getOfferSchema = z.object({
     offerId: z.string().uuid('Must be valid UUID'),
     includeHistory: z.boolean().optional().default(false),
   });
   ```

3. Testy jednostkowe:
   - Valid UUID - pass
   - Invalid UUID - throw error
   - Valid boolean - pass
   - Invalid boolean string - throw error

**Deliverables:**

- `offers.validator.ts` - kompletna walidacja
- Unit tests dla validatora
- Error types defined

---

### Faza 3: Implementacja mapowania danych

**Kroki:**

1. Stwórz `OfferMapper` klasy z metodami:
   - `mapOfferToDetailsDto(raw: DatabaseRow[], userId?: string): PublicOfferDetailsDto`
   - `mapLocationToGeoPoint(geometry: any): GeoPointDto`
   - `sanitizeOrganizerData(organizer: any, isOwner: boolean): PublicOrganizerDto`

2. Implementuj logikę:
   - Konwersja geometry(Point) do GeoPointDto
   - Formatowanie dziedzin daty
   - Ograniczenie danych organizatora

3. Testy:
   - Mapowanie geometry prawidłowe
   - Organizator data sanitization
   - Walidacja typów output

**Deliverables:**

- `offers.mapper.ts` - mapowanie DTO
- Unit tests dla mappera
- Geometry conversion working

---

### Faza 4: Implementacja warstwa serwisu

**Kroki:**

1. Stwórz `OfferService` klasy z metodami:
   - `async getOfferDetails(offerId: string, userId: string | null, userRole: 'anon' | 'authenticated' | 'admin', includeHistory: boolean): Promise<PublicOfferDetailsDto>`

2. Wdrożalny Supabase queries:

   ```typescript
   // Zapytanie główne
   const { data: offer, error } = await supabase
     .from('offers')
     .select(
       `
       *,
       offer_type: offer_types(id, name, slug),
       categories: offer_categories!inner(
         category: categories(id, name, slug, description)
       ),
       images: offer_images(id, storage_path, display_order),
       schedules: offer_schedules(id, day_of_week, start_time, end_time, is_active),
       organizer: organizer_profiles(id, company_name, phone, email_public)
     `,
     )
     .eq('id', offerId);
   ```

3. Obsługa błędów:
   - Sprawdzenie czy zwrócono dane (jeśli nie → 404)
   - Error handling dla Supabase errors
   - Mapowanie Supabase error → HTTP error

4. Testy integracyjne:
   - Pobierz opublikowaną ofertę jako anon - sukces
   - Pobierz draft oferty jako anon - 403
   - Pobierz własną draft ofertę jako organizator - sukces
   - Pobierz dowolną ofertę jako admin - sukces
   - Oferta nie istnieje - 404

**Deliverables:**

- `offers.service.ts` - logika biznesowa
- Integration tests z Supabase
- Error handling complete

---

### Faza 5: Implementacja controller/handler

**Kroki:**

1. Stwórz `OfferController` klasy:
   - `async getOffer(req: Request, res: Response, next: NextFunction): Promise<void>`

2. Implementuj handler:
   - Ekstrahuj parametry (offerId z path, include_history z query)
   - Ekstrahuj user info z JWT middleware (userId, role)
   - Waliduj parametry
   - Przywołaj service
   - Zwróć response lub error

3. Middleware:
   - Auth middleware - ekstrahuj JWT, ustaw user context
   - Error handling middleware - catch all errors, convert to ErrorResponseDto
   - Request logging middleware

4. Route registration:

   ```typescript
   router.get(
     '/offers/:offerId',
     authMiddleware,
     offerController.getOffer.bind(offerController),
   );
   ```

5. Testy:
   - Prawidłowy request → 200 z DTO
   - Bez JWT dla public → 200
   - Z JWT dla organizer → 200
   - Invalid UUID → 400
   - Not found → 404

**Deliverables:**

- `offers.controller.ts` - HTTP handler
- Middleware configured
- Route registered
- Controller tests passing

---

### Faza 6: Integracja i testowanie end-to-end

**Kroki:**

1. Setup test environment:
   - Test Supabase project (lub emulator)
   - Seed test data (oferuje, użytkownicy, organizatorzy)

2. E2E tests:

   ```typescript
   // Scenariusz 1: Publiczny dostęp do opublikowanej oferty
   const response = await request(app)
     .get('/offers/550e8400-e29b-41d4-a716-446655440000')
     .expect(200);
   expect(response.body.title).toBeDefined();

   // Scenariusz 2: Uniemożliwienie dostępu do draft'a
   const response = await request(app)
     .get('/offers/draft-offer-id')
     .expect(403);

   // Scenariusz 3: Admin dostęp
   const response = await request(app)
     .set('Authorization', `Bearer ${adminToken}`)
     .get('/offers/draft-offer-id')
     .expect(200);
   ```

3. Load testing:
   - K6 lub Apache JMeter
   - 100 concurrent users
   - Verify P95 < 300ms

4. Security testing:
   - SQLi attempts (oferty będą filtered by RLS)
   - Unauthorized access attempts
   - XSS payloads w odpowiedzi

**Deliverables:**

- E2E tests passing
- Load tests passing
- Security tests verified
- Performance benchmarks documented

---

### Faza 7: Deployment i monitoring

**Kroki:**

1. Code review:
   - PR sprawdzenie przez innego developera
   - Code quality checks (ESLint, TypeScript strict)

2. Deployment:
   - Deploy na staging
   - Smoke tests (podstawowe testy)
   - Deploy na production

3. Monitoring setup:
   - Sentry dla error tracking
   - DataDog/CloudWatch dla performance
   - Logowanie zapytań do bazy
   - Alert rules dla anomalii

4. Documentation:
   - Swagger/OpenAPI spec
   - README dla setup
   - Runbook dla incident response

5. Rollback plan:
   - Przygotuj feature flag do quick disable
   - Versioning strategy

**Deliverables:**

- Kod deployed do production
- Monitoring active
- Documentation complete
- Rollback plan ready

---

## Checklist implementacji

- [ ] **Walidacja**:
  - [ ] UUID validation dla offerId
  - [ ] Boolean parsing dla include_history
  - [ ] Error responses formattowane

- [ ] **Service Logic**:
  - [ ] Supabase queries working
  - [ ] RLS policies blocking non-authorized access
  - [ ] Geometry conversion working
  - [ ] Data mapping to DTO

- [ ] **Controller/Route**:
  - [ ] GET /offers/:offerId registered
  - [ ] Auth middleware integrated
  - [ ] Error middleware catching
  - [ ] 200/400/401/403/404/500 handling

- [ ] **Tests**:
  - [ ] Unit tests dla validator, mapper, service
  - [ ] Integration tests z Supabase
  - [ ] E2E tests z różnymi rolami
  - [ ] Load tests (P95 < 300ms)

- [ ] **Security**:
  - [ ] RLS policies active
  - [ ] Data sanitization
  - [ ] Rate limiting configured
  - [ ] CORS configured

- [ ] **Performance**:
  - [ ] Indeksy created
  - [ ] Caching implemented
  - [ ] Query optimization verified
  - [ ] Benchmarks documented

- [ ] **Documentation**:
  - [ ] OpenAPI/Swagger spec
  - [ ] README dla setup
  - [ ] Error codes documented
  - [ ] Monitoring setup

- [ ] **Deployment**:
  - [ ] Staging deployment successful
  - [ ] Production deployment successful
  - [ ] Rollback verfied
  - [ ] Monitoring alerts active

---

## Zasoby i referencje

- **Supabase Documentation**: https://supabase.com/docs
- **PostgreSQL Spatial (PostGIS)**: https://postgis.net/
- **Express.js Guide**: https://expressjs.com/
- **Zod Validation**: https://zod.dev/
- **Jest Testing**: https://jestjs.io/
- **OpenAPI Specification**: https://swagger.io/specification/
- **OWASP Security**: https://owasp.org/

---

## Notes

- **RLS Policies wykonują się automatycznie** na poziomie bazy - brak dodatkowego sprawdzania kodu.
- **Geometry konwersja**: Supabase zwraca geometry jako WKB, należy konwertować do GeoJSON za pomocą `ST_AsGeoJSON()`.
- **Rate limiting**: Można zaimplementować za pomocą `express-rate-limit` middleware.
- **Caching**: Redis można użyć dla cache'u lub proste in-memory solution dla MVP.
- **Monitoring**: Sentry Free tier wystarczy dla MVP, upgrade jeśli potrzeba więcej.
