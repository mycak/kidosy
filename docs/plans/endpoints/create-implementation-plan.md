# API Endpoint Implementation Plan: POST /offers

## 1. Przegląd punktu końcowego

Endpoint **POST /offers** pozwala uwierzytelnionym organizatorom na tworzenie nowych ofert zajęć w statusie **draft**. Tworzona oferta nie jest widoczna dla rodziców ani w public API, dopóki jej status nie zmieni się na `published` poprzez proces moderacji.

Endpoint obsługuje tworzenie kompletnej oferty z:

- Podstawowymi informacjami (tytuł, opis, wiek, adres)
- Kategoryzacją (typ oferty, kategorie)
- Lokalizacją geograficzną (współrzędne)
- Datami (rozpoczęcia i zakończenia)
- Harmonogramem zajęć (opcjonalnie dla zajęć cyklicznych)

Odpowiedź zawiera podstawowe informacje o utworzonej ofercie włącznie z ID, statusem i timestamp'ami.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/offers
```

### Parametry

**Brak parametrów path ani query**

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body (CreateOfferDto)

```json
{
  "title": "Kurs programowania dla dzieci 2026",
  "description": "Intensywny kurs nauki programowania w Python dla dzieci w wieku 10-14 lat. Program obejmuje praktyczne projekty, współpracę zespołową i fundamenty informatyki.",
  "offer_type_id": "uuid-of-weekly-classes",
  "ages": [10, 11, 12, 13, 14],
  "address": "ul. Puławska 123, 02-595 Warszawa",
  "location": {
    "latitude": 52.0469,
    "longitude": 21.0122
  },
  "start_date": "2026-03-01",
  "end_date": "2026-06-30",
  "available_spots": 20,
  "category_ids": ["uuid-of-educational", "uuid-of-sport"],
  "schedules": [
    {
      "day_of_week": 1,
      "start_time": "16:00:00",
      "end_time": "17:30:00"
    },
    {
      "day_of_week": 3,
      "start_time": "16:00:00",
      "end_time": "17:30:00"
    }
  ]
}
```

### Wymagane pola

- `title` (string) - nazwa oferty
- `description` (string) - szczegółowy opis
- `offer_type_id` (uuid) - ID typu oferty (weekly-classes, camp, etc.)
- `ages` (integer array) - tablica lat (np. [10, 11, 12])
- `address` (string) - pełny adres tekstowy
- `location` (object) - `{ latitude: number, longitude: number }`
- `start_date` (date: YYYY-MM-DD) - data rozpoczęcia
- `end_date` (date: YYYY-MM-DD) - data zakończenia
- `available_spots` (integer) - liczba dostępnych miejsc
- `category_ids` (uuid array) - IDs kategorii (minimum 1)

### Opcjonalne pola

- `schedules` (array) - harmonogramy zajęć (dla zajęć cyklicznych)
  - `day_of_week` (0-6, gdzie 0=poniedziałek, 6=niedziela)
  - `start_time` (HH:MM:SS)
  - `end_time` (HH:MM:SS)

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/offers" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kurs programowania dla dzieci 2026",
    "description": "Intensywny kurs nauki programowania w Python dla dzieci w wieku 10-14 lat...",
    "offer_type_id": "550e8400-e29b-41d4-a716-446655440001",
    "ages": [10, 11, 12, 13, 14],
    "address": "ul. Puławska 123, 02-595 Warszawa",
    "location": {
      "latitude": 52.0469,
      "longitude": 21.0122
    },
    "start_date": "2026-03-01",
    "end_date": "2026-06-30",
    "available_spots": 20,
    "category_ids": [
      "550e8400-e29b-41d4-a716-446655440010",
      "550e8400-e29b-41d4-a716-446655440011"
    ],
    "schedules": [
      {
        "day_of_week": 1,
        "start_time": "16:00:00",
        "end_time": "17:30:00"
      }
    ]
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Główny typ żądania
CreateOfferDto = Pick<DbOffer,
  | 'title'
  | 'description'
  | 'offer_type_id'
  | 'ages'
  | 'address'
  | 'start_date'
  | 'end_date'
  | 'available_spots'
> & {
  category_ids: string[];              // Tablica UUID kategorii
  location: LocationInputDto;          // Współrzędne geograficzne
  schedules?: OfferScheduleInputDto[]; // Harmonogramy (opcjonalne)
};

// Typy zagnieżdżone
LocationInputDto = {
  latitude: number;
  longitude: number;
};

OfferScheduleInputDto = Pick<DbOfferSchedule,
  'day_of_week' | 'start_time' | 'end_time'
>;
```

### DTO Types (Response)

```typescript
// Odpowiedź przy tworzeniu
OfferMutationResponseDto = Pick<
  DbOffer,
  'id' | 'title' | 'status' | 'created_at' | 'updated_at'
>;
```

### Typy pomocnicze

```typescript
AuthUserDto = Pick<DbUser, 'id' | 'email' | 'created_at'> & {
  role?: 'admin' | 'organizer';
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (201 Created)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Kurs programowania dla dzieci 2026",
  "status": "draft",
  "created_at": "2026-02-07T14:30:45Z",
  "updated_at": "2026-02-07T14:30:45Z"
}
```

### Kody statusu odpowiedzi

- **201 Created** - Oferta pomyślnie utworzona (zawiera Location header z URL nowej oferty)
- **400 Bad Request** - Nieprawidłowe dane wejściowe (brakujące pole, błędny format)
- **401 Unauthorized** - Token JWT nieprawidłowy, wygasły lub brakujący
- **403 Forbidden** - Użytkownik nie jest organizatorem (brak roli 'organizer')
- **422 Unprocessable Entity** - Dane biznesowe nieprawidłowe (nieistniejące category_id, offer_type_id)
- **500 Internal Server Error** - Błąd serwera (błąd bazy, błąd konwersji danych)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /offers                                │
│    Headers: Authorization: Bearer <JWT>                      │
│    Body: CreateOfferDto JSON                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Middleware (Autentykacja)                                │
│    - Ekstrahuj JWT z headera Authorization                  │
│    - Walidacja tokenu, ekstrakcja user_id                   │
│    - Return 401 jeśli token nieprawidłowy                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Middleware (Autoryzacja)                                 │
│    - Sprawdzenie czy user ma rolę 'organizer'               │
│    - Return 403 jeśli nie organizator                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Walidacja schematu (Zod)                                 │
│    - Parse request body jako CreateOfferDto                 │
│    - Sprawdzenie wymaganych pól                             │
│    - Sprawdzenie typów i formatów                           │
│    - Return 400 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Walidacja biznesowa                                      │
│    - Sprawdzenie czy category_ids istnieją w DB             │
│    - Sprawdzenie czy offer_type_id istnieje                 │
│    - Sprawdzenie czy start_date < end_date                  │
│    - Sprawdzenie czy location jest w prawidłowych granicach │
│    - Return 422 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Przywołaj OfferService.createOffer()                     │
│    - Przekaż: CreateOfferDto, userId                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Service Logic (OfferService)                             │
│                                                               │
│    a) Konwersja danych:                                      │
│       - Konwersja LocationInputDto do geometry(Point)       │
│       - Formatowanie daty                                   │
│                                                               │
│    b) Tworzenie oferty:                                      │
│       - INSERT INTO offers                                  │
│       - values: title, description, user_id, status='draft' │
│       - Return: created offer with ID                       │
│                                                               │
│    c) Przypisanie kategorii:                                │
│       - INSERT INTO offer_categories (offer_id, category_id)│
│       - Dla każdego category_id z request                   │
│                                                               │
│    d) Tworzenie harmonogramów (jeśli dostarczone):          │
│       - INSERT INTO offer_schedules                         │
│       - Dla każdego schedule z request                      │
│                                                               │
│    e) Obsługa błędów:                                       │
│       - Jeśli erro przy INSERT → transakcja ROLLBACK        │
│       - Return exception (obsługane przez error middleware) │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Mapowanie odpowiedzi                                      │
│    - Mapuj created offer do OfferMutationResponseDto        │
│    - Ustaw Location header: /offers/{offerId}               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Zwróć odpowiedź JSON                                      │
│    Status: 201 Created                                       │
│    Headers: Location: /offers/{newOfferId}                  │
│    Body: OfferMutationResponseDto                            │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z bazą danych (Transakcja)

```sql
-- Transakcja begin
BEGIN;

-- 1. Utwórz ofertę
INSERT INTO offers (
  id, user_id, offer_type_id, title, description, ages,
  address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
) VALUES (
  gen_random_uuid(), $1, $2, $3, $4, $5,
  $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10, $11,
  'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
RETURNING id, title, status, created_at, updated_at;

-- 2. Przypisz kategorie
INSERT INTO offer_categories (id, offer_id, category_id, created_at)
SELECT gen_random_uuid(), $1, category_id, CURRENT_TIMESTAMP
FROM (VALUES ($12), ($13), ...) AS categories(category_id);

-- 3. Utwórz harmonogramy (jeśli dostarczone)
INSERT INTO offer_schedules (
  id, offer_id, day_of_week, start_time, end_time, is_active, created_at
) VALUES
  (gen_random_uuid(), $1, $14, $15, $16, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), $1, $17, $18, $19, true, CURRENT_TIMESTAMP),
  ...;

-- Transakcja commit
COMMIT;
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Token Validation**: Supabase Auth obsługuje walidację tokenów
- Token obowiązkowy - brak tokenu → **401 Unauthorized**
- Wygasłe tokeny → **401 Unauthorized**

### 6.2 Autoryzacja

- **Role Check**: Tylko użytkownicy z rolą `organizer` mogą tworzyć oferty
- Brak roli organizer → **403 Forbidden**
- User ID ekstrakcja z JWT zapewnia, że oferta przypisana do właściwego użytkownika

### 6.3 Walidacja danych wejściowych

**Schema walidacja (Zod):**

```typescript
const createOfferSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(10).max(5000),
  offer_type_id: z.string().uuid(),
  ages: z.array(z.number().int().min(1).max(99)).min(1),
  address: z.string().min(5).max(500),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  start_date: z.string().date(),
  end_date: z.string().date(),
  available_spots: z.number().int().min(1).max(1000),
  category_ids: z.array(z.string().uuid()).min(1),
  schedules: z
    .array(
      z.object({
        day_of_week: z.number().int().min(0).max(6),
        start_time: z.string().time(),
        end_time: z.string().time(),
      }),
    )
    .optional(),
});
```

**Walidacja biznesowa:**

- `start_date` musi być wcześniej niż `end_date`
- Każdy `category_id` musi istnieć w tabeli `categories`
- `offer_type_id` musi istnieć w tabeli `offer_types`
- `available_spots` musi być >= 1
- Jeśli `schedules` dostarczone:
  - `start_time` < `end_time` dla każdego schedule
  - `day_of_week` w zakresie 0-6

### 6.4 Ochrona danych

- **Geometry validation**: Współrzędne walidowane jako `latitude` [-90, 90] i `longitude` [-180, 180]
- **Parametryzowane zapytania**: Wszystkie dane przechodzą przez Supabase client, brak SQL injection
- **Transakcja**: Jeśli jedno wstawienie się nie powiedzie, wszystko się wycofuje (ATOMIC operation)

### 6.5 CORS i ograniczenia pochodzenia

```
Access-Control-Allow-Origin: https://kidosy.pl
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

### 6.6 Rate Limiting

- Max 50 ofert na godz. per organizator (zapobieganie spam)
- Max 100 żądań na minutę per IP (DDoS protection)

### 6.7 Logging i Monitoring

- **Logowanie utworzenia**: Zarejestruj każde POST (user_id, offer_id, timestamp)
- **Anomalii detektowanie**: Wiele nieudanych 422 z tego samego user_id
- **Sentry**: Monitorowanie dla 5xx błędów

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                        | Status | Error Code         | Message                                      | Przyczyna              |
| --------------------------------- | ------ | ------------------ | -------------------------------------------- | ---------------------- |
| Oferta utworzona                  | 201    | -                  | -                                            | Success                |
| Brakuje wymaganego pola           | 400    | `VALIDATION_ERROR` | "title is required"                          | Missing required field |
| title puste lub > 255             | 400    | `VALIDATION_ERROR` | "title must be 1-255 characters"             | Invalid field length   |
| description < 10 znaków           | 400    | `VALIDATION_ERROR` | "description must be at least 10 characters" | Too short              |
| location.latitude poza range      | 400    | `VALIDATION_ERROR` | "latitude must be between -90 and 90"        | Invalid coordinate     |
| start_date >= end_date            | 400    | `VALIDATION_ERROR` | "start_date must be before end_date"         | Invalid date range     |
| available_spots < 1               | 400    | `VALIDATION_ERROR` | "available_spots must be at least 1"         | Invalid number         |
| schedule: start_time >= end_time  | 400    | `VALIDATION_ERROR` | "start_time must be before end_time"         | Invalid schedule       |
| Brak token JWT                    | 401    | `UNAUTHORIZED`     | "Authentication token required"              | Missing token          |
| Token JWT wygasły/invalid         | 401    | `UNAUTHORIZED`     | "Invalid or expired token"                   | Invalid token          |
| Użytkownik nie jest organizatorem | 403    | `FORBIDDEN`        | "Only organizers can create offers"          | Missing role           |
| Nieistniejący category_id         | 422    | `BUSINESS_ERROR`   | "Category not found: uuid"                   | Invalid reference      |
| Nieistniejący offer_type_id       | 422    | `BUSINESS_ERROR`   | "Offer type not found: uuid"                 | Invalid reference      |
| Błąd bazy danych                  | 500    | `DATABASE_ERROR`   | "Internal server error"                      | DB error               |
| Błąd konwersji geometry           | 500    | `PROCESSING_ERROR` | "Failed to process location"                 | Conversion error       |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'BUSINESS_ERROR'
      | 'DATABASE_ERROR'
      | 'PROCESSING_ERROR';
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
};
```

### 7.3 Przykłady odpowiedzi błędów

**400 Bad Request (Validation):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title must be between 1 and 255 characters"
      },
      {
        "field": "start_date",
        "message": "Start date must be before end date"
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
    "message": "Only organizers can create offers"
  }
}
```

**422 Unprocessable Entity (Business Logic):**

```json
{
  "error": {
    "code": "BUSINESS_ERROR",
    "message": "Invalid category reference",
    "details": [
      {
        "field": "category_ids",
        "message": "Category not found: 550e8400-e29b-41d4-a716-446655440000"
      }
    ]
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

1. **Konwersja geometry**: `ST_SetSRID(ST_MakePoint(lon, lat), 4326)` może być wolna
   - **Rozwiązanie**: Indeks na location kolumnie (GIST)

2. **Multiple INSERTs**: Tworzenie oferty, kategorii, harmonogramów
   - **Rozwiązanie**: Użycie transakcji, batch insert dla kategorii

3. **Foreign key validation**: Walidacja category_ids i offer_type_id
   - **Rozwiązanie**: Indeksy na PK tabel categories i offer_types

### 8.2 Strategie optymalizacji

**Indeksowanie:**

```sql
-- Indeksy na foreign keys
CREATE INDEX idx_offers_user_id ON offers(user_id);
CREATE INDEX idx_offers_offer_type_id ON offers(offer_type_id);
CREATE INDEX idx_offers_status ON offers(status);

-- Indeks na location dla geospatial
CREATE INDEX idx_offers_location ON offers USING GIST(location);

-- Indeksy dla kategorii
CREATE INDEX idx_offer_categories_offer_id ON offer_categories(offer_id);
CREATE INDEX idx_offer_categories_category_id ON offer_categories(category_id);

-- Indeksy dla harmonogramów
CREATE INDEX idx_offer_schedules_offer_id ON offer_schedules(offer_id);
```

**Batch operations:**

```typescript
// Zamiast N pojedynczych INSERT, jeden batch insert
const categoryInserts = categoryIds.map((id) => ({
  offer_id: newOfferId,
  category_id: id,
}));
await supabase.from('offer_categories').insert(categoryInserts);
```

**Transakcja:**

```typescript
// Wszystkie operacje w jednej transakcji
await supabase.rpc('create_offer_with_relations', {
  offer_data: { ... },
  category_ids: [ ... ],
  schedules: [ ... ]
});
```

**Rate limiting cache:**

```typescript
// Redis cache dla rate limiting per user
const key = `offer_create_${userId}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 3600); // 1 hour
}
if (count > 50) {
  return 429; // Too Many Requests
}
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 200ms
- **P95**: < 500ms
- **P99**: < 1.5s

---

## 9. Etapy wdrażania

### Faza 1: Setup projektu i przygotowanie

**Kroki:**

1. Utwórz strukturę folderów:
   - `src/services/offers.service.ts` - logika biznesowa
   - `src/controllers/offers.controller.ts` - handler HTTP
   - `src/validators/offers.validator.ts` - walidacja
   - `src/mappers/offers.mapper.ts` - mapowanie DTO
   - `src/middleware/auth.middleware.ts` - autentykacja
   - `src/middleware/error.middleware.ts` - obsługa błędów

2. Zainstaluj/zweryfikuj dependencies:
   - `express`
   - `zod` dla walidacji
   - `supabase-js` client
   - `uuid` dla UUID validation

3. Zweryfikuj tabele Supabase:
   - Tabela `offers` z kolumnami
   - Tabela `offer_categories` (m2m)
   - Tabela `offer_schedules`
   - Tabela `categories` i `offer_types` (seed data)

**Deliverables:**

- Folder struktura
- Dependencies zainstalowane
- Database connection working

---

### Faza 2: Implementacja walidacji

**Kroki:**

1. Stwórz `OfferValidator` klasy:
   - `validateCreateOfferDto(data: unknown): CreateOfferDto` - validate request
   - `validateCategoryIds(ids: string[]): Promise<void>` - check DB
   - `validateOfferTypeId(id: string): Promise<void>` - check DB
   - `validateSchedules(schedules: any[]): void` - validate logic

2. Implementuj Zod schema:

   ```typescript
   const createOfferSchema = z.object({
     title: z.string().min(1).max(255),
     description: z.string().min(10).max(5000),
     offer_type_id: z.string().uuid(),
     ages: z.array(z.number().int().min(1).max(99)).min(1),
     address: z.string().min(5).max(500),
     location: z.object({
       latitude: z.number().min(-90).max(90),
       longitude: z.number().min(-180).max(180),
     }),
     start_date: z.string().refine(val => /* valid date */),
     end_date: z.string().refine(val => /* valid date */),
     available_spots: z.number().int().min(1).max(1000),
     category_ids: z.array(z.string().uuid()).min(1),
     schedules: z.array(scheduleSchema).optional(),
   }).refine(data => data.start_date < data.end_date, {
     message: "start_date must be before end_date"
   });
   ```

3. Testy jednostkowe:
   - Valid input - pass
   - Missing required field - throw error
   - Invalid date range - throw error
   - Invalid UUID - throw error
   - Invalid schedule - throw error

**Deliverables:**

- `offers.validator.ts`
- Unit tests
- Error types defined

---

### Faza 3: Implementacja mapowania danych

**Kroki:**

1. Stwórz `OfferMapper` klasy:
   - `mapLocationToGeometry(location: LocationInputDto): any`
   - `mapToOfferEntity(dto: CreateOfferDto, userId: string): OfferEntity`
   - `mapResponseToDto(entity: OfferEntity): OfferMutationResponseDto`

2. Implementuj logikę:
   - Konwersja LocationInputDto do geometry(Point)
   - Formatowanie daty (YYYY-MM-DD)
   - Ustawianie domyślnych wartości (status='draft', timestamps)

3. Testy:
   - Geometry conversion working
   - Date formatting correct
   - Response DTO valid

**Deliverables:**

- `offers.mapper.ts`
- Unit tests
- Geometry conversion verified

---

### Faza 4: Implementacja warstwa serwisu

**Kroki:**

1. Stwórz `OfferService` klasy:
   - `async createOffer(dto: CreateOfferDto, userId: string): Promise<OfferMutationResponseDto>`
   - `async validateReferences(dto: CreateOfferDto): Promise<void>` - check categories, offer_type
   - `async insertOfferWithRelations(offer: any, categoryIds: string[], schedules?: any[]): Promise<any>`

2. Wdrożalny Supabase operations:

   ```typescript
   // Transaction: create offer + categories + schedules
   const { data: offer, error: offerError } = await supabase
     .from('offers')
     .insert({
       user_id: userId,
       offer_type_id: dto.offer_type_id,
       title: dto.title,
       description: dto.description,
       ages: dto.ages,
       address: dto.address,
       location: geometry,
       start_date: dto.start_date,
       end_date: dto.end_date,
       available_spots: dto.available_spots,
       status: 'draft',
     })
     .select()
     .single();

   // Insert categories
   const categoryInserts = dto.category_ids.map((id) => ({
     offer_id: offer.id,
     category_id: id,
   }));
   await supabase.from('offer_categories').insert(categoryInserts);

   // Insert schedules
   if (dto.schedules?.length) {
     const scheduleInserts = dto.schedules.map((s) => ({
       offer_id: offer.id,
       ...s,
     }));
     await supabase.from('offer_schedules').insert(scheduleInserts);
   }
   ```

3. Obsługa błędów:
   - Sprawdzenie existence categories/offer_types (422 error)
   - Rollback na error
   - Mapowanie Supabase errors → HTTP errors

4. Testy integracyjne:
   - Create offer successfully - 201
   - Invalid category_id - 422
   - Invalid offer_type_id - 422
   - Database error handling - 500

**Deliverables:**

- `offers.service.ts`
- Integration tests
- Error handling complete

---

### Faza 5: Implementacja middleware

**Kroki:**

1. Stwórz middleware:
   - `authMiddleware` - ekstrahuj JWT, set user context
   - `organizerOnly` - sprawdź role = 'organizer'
   - `errorMiddleware` - catch all errors, convert to ErrorResponseDto
   - `validationMiddleware` - validation errors handling

2. Implementacja:

   ```typescript
   // Auth middleware
   export const authMiddleware = async (req, res, next) => {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json(unauthorizedError);

     const user = await supabase.auth.getUser(token);
     req.user = user;
     next();
   };

   // Organizer check
   export const organizerOnly = (req, res, next) => {
     if (req.user.role !== 'organizer') {
       return res.status(403).json(forbiddenError);
     }
     next();
   };
   ```

3. Testy:
   - Auth middleware - set user context
   - Organizer check - block non-organizers
   - Error middleware - format errors

**Deliverables:**

- Middleware configured
- Middleware tests
- Middleware integrated

---

### Faza 6: Implementacja controller/handler

**Kroki:**

1. Stwórz `OfferController`:
   - `async createOffer(req: Request, res: Response, next: NextFunction): Promise<void>`

2. Implementuj handler:
   - Ekstrahuj body z request
   - Waliduj schema
   - Waliduj biznes
   - Przywołaj service
   - Ustaw Location header
   - Zwróć 201 response lub error

3. Route registration:

   ```typescript
   router.post(
     '/offers',
     authMiddleware,
     organizerOnly,
     offerController.createOffer.bind(offerController),
   );
   ```

4. Testy:
   - Valid request → 201 with location
   - Validation error → 400
   - Auth error → 401
   - Not organizer → 403
   - Business error → 422

**Deliverables:**

- `offers.controller.ts`
- Route registered
- Controller tests
- All status codes tested

---

### Faza 7: Integracja i testowanie end-to-end

**Kroki:**

1. Setup test environment:
   - Test Supabase project
   - Seed categories, offer_types
   - Test user (organizer account)

2. E2E tests:

   ```typescript
   // Scenariusz 1: Pomyślne utworzenie
   const response = await request(app)
     .post('/offers')
     .set('Authorization', `Bearer ${token}`)
     .send(validCreateOfferDto)
     .expect(201);
   expect(response.headers.location).toMatch(/\/offers\/[a-f0-9-]{36}/);
   expect(response.body.status).toBe('draft');

   // Scenariusz 2: Walidacja
   const response = await request(app)
     .post('/offers')
     .set('Authorization', `Bearer ${token}`)
     .send({ title: '' })
     .expect(400);

   // Scenariusz 3: Authorization
   const response = await request(app)
     .post('/offers')
     .send(validCreateOfferDto)
     .expect(401);
   ```

3. Load testing:
   - 50 concurrent requests
   - Verify P95 < 500ms

4. Security testing:
   - SQL injection attempts
   - XSS payloads
   - Authorization bypass

**Deliverables:**

- E2E tests passing
- Load tests passing
- Security tests verified

---

### Faza 8: Deployment i monitoring

**Kroki:**

1. Code review:
   - PR sprawdzenie
   - Code quality (ESLint, TypeScript strict)

2. Deployment:
   - Deploy na staging
   - Smoke tests
   - Deploy na production

3. Monitoring:
   - Sentry dla errors
   - Log track creation count per user/hour
   - Rate limiting alerts
   - P95 response time alerts

4. Documentation:
   - OpenAPI/Swagger spec
   - Error codes documented

**Deliverables:**

- Code reviewed & approved
- Production deployed
- Monitoring active
- Documentation complete

---

## Checklist implementacji

- [ ] **Schema Walidacja**:
  - [ ] Zod schema created
  - [ ] All field validations
  - [ ] Unit tests passing

- [ ] **Business Walidacja**:
  - [ ] Category reference checking
  - [ ] Offer type reference checking
  - [ ] Date range validation
  - [ ] Location bounds validation

- [ ] **Service Layer**:
  - [ ] createOffer() implemented
  - [ ] Transactional operation
  - [ ] Error handling
  - [ ] Integration tests passing

- [ ] **Mapper**:
  - [ ] Geometry conversion
  - [ ] Date formatting
  - [ ] Response DTO mapping

- [ ] **Controller/Route**:
  - [ ] POST /offers registered
  - [ ] Auth middleware integrated
  - [ ] Organizer authorization
  - [ ] Location header set
  - [ ] All status codes (201/400/401/403/422/500)

- [ ] **Middleware**:
  - [ ] Auth middleware
  - [ ] Organizer check middleware
  - [ ] Error handling middleware
  - [ ] Validation middleware

- [ ] **Testing**:
  - [ ] Unit tests for validator
  - [ ] Unit tests for mapper
  - [ ] Integration tests for service
  - [ ] E2E tests for controller
  - [ ] Load tests (P95 < 500ms)

- [ ] **Security**:
  - [ ] Auth required
  - [ ] Organizer role required
  - [ ] Input validation
  - [ ] Rate limiting configured

- [ ] **Performance**:
  - [ ] Indexes created
  - [ ] Batch operations
  - [ ] Transactional queries

- [ ] **Documentation**:
  - [ ] OpenAPI spec
  - [ ] Error codes documented
  - [ ] Response examples

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

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

- **Transaction atomicity**: Upewnij się, że jeśli jedno wstawienie się nie powiedzie, wszystko się wycofuje
- **Geometry conversion**: Latitude/longitude są konwertowane do `ST_SetSRID(ST_MakePoint(lon, lat), 4326)`
- **Location header**: RESTful convention - zwróć `/offers/{newId}` w Location header
- **Rate limiting**: Zaimplementuj per-user, aby zapobiec spam (max 50 ofert/godz)
- **Batch operations**: Wstaw wiele kategorii/harmonogramów w jednym zapytaniu
- **Error recovery**: Jeśli DB INSERT się nie powiedzie, error middleware powinien obsługiwać
