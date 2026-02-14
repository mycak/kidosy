# API Endpoint Implementation Plan: GET /search/organizers

## 1. Przegląd punktu końcowego

Endpoint **GET /search/organizers** umożliwia wyszukiwanie organizatorów/firm prowadzących oferowane zajęcia. Użytkownik może szukać po nazwie organizacji, lokalizacji, kategorii specjalizacji, albo przeglądać listę zweryfikowanych organizatorów. Endpoint zwraca profil organizatora, rating, liczbę ofert, itd.

Proces wyszukiwania:

1. Walidacja query parameters
2. Budowanie kwerendy z filtrami
3. Pobranie organizatorów z paginacją
4. Zwrócenie listy organizatorów

Endpoint obsługuje:

- Text search na nazwie organizacji i biografii
- Filtering: verified status, category specialization, location
- Sorting: rating, offers count, name, newest
- Pagination
- Aggregated stats (average rating, total offers, etc.)

Odpowiedź zawiera array organizatorów z metadanymi.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/search/organizers?q=academy&verified_only=true&location=warsaw&sort=rating&page=1&limit=20
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `q` (string, min 2) - Tekst wyszukiwania (nazwa, bio)
- `location` (string) - Filtruj po kodzie lokalizacji
- `verified_only` (boolean, default: false) - Tylko zweryfikowani
- `specialization` (string) - Filtruj po kategorii specjalizacji
- `sort` (enum, default: 'rating') - Sortowanie
  - 'rating' - Ocena
  - 'offers' - Liczba ofert
  - 'name' - Alfabetycznie
  - 'newest' - Najnowsi
  - 'active_offers' - Licza aktywnych ofert
- `page` (number, default: 1) - Numer strony
- `limit` (number, default: 20, max: 100) - Elementy na stronę

### Request Headers

```
Content-Type: application/json
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/search/organizers?q=academy&verified_only=true&sort=rating" \
  -H "Content-Type: application/json"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
SearchOrganizersResponseDto = {
  results: Array<OrganizerSearchResultDto>;
  pagination: PaginationMetaDto;
};

OrganizerSearchResultDto = {
  id: string;
  name: string;
  bio: string;
  avatar_url: string;
  website: string;
  email: string;
  phone: string;
  location: LocationSummaryDto;
  specializations: Array<CategorySummaryDto>;
  verification_status: VerificationStatus;
  rating: number;
  rating_count: number;
  total_offers: number;
  active_offers: number;
  response_time_hours: number; // Average response time to inquiries
  response_rate: number; // % of inquiries responded to
  social_media: SocialMediaDto;
  created_at: string;
};

type VerificationStatus = 'unverified' | 'pending' | 'verified';

LocationSummaryDto = {
  id: string;
  name: string;
  city: string;
};

CategorySummaryDto = {
  id: string;
  name: string;
};

SocialMediaDto = {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "results": [
    {
      "id": "org-550e8400-e29b-41d4-a716-446655440000",
      "name": "Tech Academy Poland",
      "bio": "Nowoczesne warsztaty programowania dla dzieci",
      "avatar_url": "https://cdn.kidosy.pl/avatars/org-001.jpg",
      "website": "https://techacademy.pl",
      "email": "contact@techacademy.pl",
      "phone": "+48123456789",
      "location": {
        "id": "loc-warsaw",
        "name": "Warszawa - Centrum",
        "city": "Warszawa"
      },
      "specializations": [
        {
          "id": "cat-programming",
          "name": "Programowanie"
        },
        {
          "id": "cat-robotics",
          "name": "Robotyka"
        }
      ],
      "verification_status": "verified",
      "rating": 4.8,
      "rating_count": 127,
      "total_offers": 24,
      "active_offers": 5,
      "response_time_hours": 2.3,
      "response_rate": 0.95,
      "social_media": {
        "facebook": "https://facebook.com/techacademy",
        "instagram": "https://instagram.com/techacademy",
        "linkedin": "https://linkedin.com/company/techacademy"
      },
      "created_at": "2025-01-10T08:00:00Z"
    },
    {
      "id": "org-550e8400-e29b-41d4-a716-446655440001",
      "name": "Future Engineers",
      "bio": "Edukacja robotyki i automatyki dla młodzieży",
      "avatar_url": "https://cdn.kidosy.pl/avatars/org-002.jpg",
      "website": "https://futureengineers.pl",
      "email": "hello@futureengineers.pl",
      "phone": "+48987654321",
      "location": {
        "id": "loc-warsaw",
        "name": "Warszawa - Zachodnia",
        "city": "Warszawa"
      },
      "specializations": [
        {
          "id": "cat-robotics",
          "name": "Robotyka"
        },
        {
          "id": "cat-engineering",
          "name": "Inżynieria"
        }
      ],
      "verification_status": "verified",
      "rating": 4.9,
      "rating_count": 89,
      "total_offers": 18,
      "active_offers": 3,
      "response_time_hours": 1.5,
      "response_rate": 0.98,
      "social_media": {
        "instagram": "https://instagram.com/futureengineers"
      },
      "created_at": "2025-02-01T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 12,
    "total_pages": 1,
    "has_next": false,
    "has_previous": false
  }
}
```

### Kody statusu odpowiedzi

- **200 OK** - Organizatorzy pomyślnie pobrani
- **400 Bad Request** - Nieprawidłowe query parameters
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /search/organizers?...                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja Query Parameters (Zod)                         │
│    - q: optional, min 2 chars                                │
│    - location: optional string                               │
│    - verified_only: optional boolean                         │
│    - specialization: optional string                         │
│    - sort: optional enum                                     │
│    - page/limit: optional pagination                         │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Sprawdzenie Cache (Redis)                                │
│    - Key: organizers:${hash(query_params)}                   │
│    - If found: Return cached response (skip to step 8)       │
│    - Cache TTL: 7200 seconds (2 hours)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Liczenie całkowitych wyników                              │
│    - SELECT COUNT(*) FROM organizers                         │
│    - WHERE status != 'deleted'                               │
│    - Apply filters (location, verified, specialization)      │
│    - Apply search query if provided                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Budowanie Query z Filtrami                               │
│                                                               │
│    Base query:                                               │
│    SELECT o.*, AVG(r.rating) as avg_rating,                 │
│           COUNT(r.id) as rating_count,                       │
│           COUNT(off.id) as total_offers,                     │
│           (SELECT COUNT(*) FROM offers                       │
│            WHERE organizer_id = o.id                         │
│            AND status = 'published') as active_offers        │
│    FROM organizers o                                         │
│    LEFT JOIN ratings r ON o.id = r.organizer_id              │
│    LEFT JOIN offers off ON o.id = off.organizer_id           │
│    WHERE status != 'deleted'                                 │
│                                                               │
│    Filters:                                                  │
│    - IF location: AND o.location_id = location_id            │
│    - IF verified_only: AND verification_status = 'verified'  │
│    - IF specialization: AND o.id IN (                        │
│        SELECT organizer_id FROM organizer_specializations    │
│        WHERE category_id = specialization_id                 │
│      )                                                       │
│    - IF search query: AND                                    │
│      to_tsvector('polish', o.name || o.bio)                  │
│      @@ websearch_to_tsquery('polish', query)                │
│                                                               │
│    Sorting:                                                  │
│    - rating: avg_rating DESC                                 │
│    - offers: total_offers DESC                               │
│    - name: name ASC                                          │
│    - newest: created_at DESC                                 │
│    - active_offers: active_offers DESC                       │
│                                                               │
│    LIMIT + OFFSET dla pagination                             │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Pobranie wyników z bazy                                   │
│    - Execute query                                           │
│    - Include related data: location, specializations, social │
│    - Calculate response_time_hours and response_rate          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Mapowanie na OrganizerSearchResultDto                    │
│    - Format all fields                                       │
│    - Format timestamps as ISO 8601                           │
│    - Aggregate stats from queries                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Cache odpowiedzi (async)                                  │
│    - SET organizers:${hash(query_params)}                    │
│    - TTL: 7200 seconds (2 hours)                             │
│    - Don't block response                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: SearchOrganizersResponseDto                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeńства

### 6.1 Public Data

- No authentication required
- Return only public organizer info
- Don't return personal data (emails visible but used as-is from profile)

### 6.2 Validacja

```typescript
const searchOrganizersQuerySchema = z.object({
  q: z.string().min(2).optional(),
  location: z.string().optional(),
  verified_only: z.boolean().optional(),
  specialization: z.string().optional(),
  sort: z
    .enum(['rating', 'offers', 'name', 'newest', 'active_offers'])
    .optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
```

---

## 7. Obsługa błędów

| Scenariusz       | Status | Error Code         | Message                  |
| ---------------- | ------ | ------------------ | ------------------------ |
| Znaleziono       | 200    | -                  | Success                  |
| Query za krótkie | 400    | `VALIDATION_ERROR` | "Query must be 2+ chars" |
| Invalid sort     | 400    | `VALIDATION_ERROR` | "Invalid sort parameter" |
| Page too high    | 400    | `VALIDATION_ERROR` | "Page out of range"      |
| Database error   | 500    | `DATABASE_ERROR`   | "Internal error"         |

---

## 8. Wydajność

### 8.1 Indeksowanie

```sql
-- Text search
CREATE INDEX idx_organizers_search_tsvector ON organizers
  USING GIN(to_tsvector('polish', name || ' ' || bio));

-- Filter indexes
CREATE INDEX idx_organizers_location ON organizers(location_id);
CREATE INDEX idx_organizers_verification ON organizers(verification_status);
CREATE INDEX idx_organizers_created_at ON organizers(created_at DESC);
CREATE INDEX idx_organizers_status ON organizers(status);

-- Rating aggregation
CREATE INDEX idx_ratings_organizer ON ratings(organizer_id);

-- Specialization indexing
CREATE INDEX idx_org_specializations_organizer ON organizer_specializations(organizer_id);
```

### 8.2 Caching

- **Time-To-Live**: 7200 seconds (2 hours)
- **Cache key**: Hash of query params
- **Invalidation**: On organizer profile update

### 8.3 Response Time

- **P50**: < 300ms
- **P95**: < 600ms
- **P99**: < 1200ms
- **P50 (from cache)**: < 50ms

---

## 9. Etapy wdrażania

### Faza 1: Schema

- Verify organizers table
- organizer_specializations table
- ratings table

### Faza 2: Indexes

- tsvector index for search
- Filter indexes (location, verification, status)
- Composite indexes for common queries

### Faza 3: Service Layer

- searchOrganizers() method
- Query building with filters
- Sorting logic
- Aggregation (ratings, offers count)

### Faza 4: Controller/Route

- GET /search/organizers

### Faza 5: Stats Calculation

- response_time_hours (avg response to leads)
- response_rate (% leads responded)

### Faza 6: Caching

- Redis with query param hashing

### Faza 7: E2E Testing

- Text search
- Filters (single + multiple)
- Sorting options
- Pagination
- Stats accuracy
- Results ranking

### Faza 8: Deployment

- Staging
- Production
- Monitor query performance

---

## Checklist

- [ ] tsvector index created
- [ ] Filter indexes created
- [ ] Service layer implemented
- [ ] Query building with filters
- [ ] Sorting options
- [ ] Stats aggregation
- [ ] Controller/route
- [ ] Parameter validation
- [ ] Caching strategy
- [ ] E2E tests
- [ ] Performance tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **Aggregation**: Count offers and ratings can be expensive - consider materialized view
- **Caching**: 2h TTL for relatively static data
- **Verification badge**: Important for trust - show prominently
- **Response metrics**: Good indicator of professionalism
- **Stats accuracy**: Recalculate periodically (nightly batch job)
- **Sorting**: Rating default for best first
