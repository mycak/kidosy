# API Endpoint Implementation Plan: GET /admin/offers/pending-review

## 1. Przegląd punktu końcowego

Endpoint **GET /admin/offers/pending-review** zwraca listę ofert oczekujących na moderację (status `pending_review`). Tylko administratorzy mogą przeglądać tę listę. Endpoint obsługuje pagination, sorting i filtering aby ułatwić adminom przeglądanie i moderowanie ofert.

Proces pobierania:

1. Walidacja autentykacji i uprawnień (admin only)
2. Parsowanie query parameters (pagination, sorting, filtering)
3. Budowanie query z filtrami
4. Pobranie ofert z bazy danych (z relacjami)
5. Zwrócenie listę ofert z metadata (total count, page info)

Endpoint obsługuje:

- Admin-only authorization (RLS policy)
- Pagination (page, limit)
- Sorting (by created_at, title, offer_type, age_range)
- Filtering (by offer_type, age_range, location radius)
- Search w tytule i opisie
- Reuse existing offer DTO types

Odpowiedź zawiera array ofert, total count, page info dla frontend pagination.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/admin/offers/pending-review?page=1&limit=20&sort=created_at&order=desc&search=python
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `page` (number, default: 1) - Numer strony (1-indexed)
- `limit` (number, default: 20, max: 100) - Liczba elementów na stronę
- `sort` (enum, default: created_at) - Pole sortowania
  - `created_at` - Data utworzenia oferty
  - `title` - Tytuł oferty
  - `organizer_name` - Nazwa organizatora
  - `age_min` - Minimalna wiek grupy docelowej
- `order` (enum, default: desc) - Kierunek sortowania
  - `asc` - Ascending
  - `desc` - Descending
- `search` (string) - Szukaj w tytule i opisie (min 3 znaki)
- `offer_type_id` (string, UUID) - Filtruj po typie oferty
- `age_min` (number) - Filtruj: minimalna wiek >= to
- `age_max` (number) - Filtruj: maksymalna wiek <= to
- `location_lat` (number) - Szerokość geograficzna do filtrowania
- `location_lon` (number) - Długość geograficzna do filtrowania
- `location_radius_km` (number, default: 50) - Promień w km dla filtrowania geograficznego

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Wymaga Authorization** - Token JWT z rolą `admin`

### Request Body

```
Brak - GET request
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/admin/offers/pending-review?page=1&limit=20&sort=created_at&order=desc&search=programming" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Lista ofert oczekujących
AdminPendingOffersResponseDto = {
  data: Array<AdminOfferSummaryDto>;
  pagination: PaginationMetaDto;
};

AdminOfferSummaryDto = {
  id: string;
  title: string;
  organizer_id: string;
  organizer_name: string;
  offer_type_id: string;
  offer_type_name: string;
  ages: Array<number>;
  location: LocationDto;
  status: 'pending_review';
  available_spots: number;
  start_date: string;  // ISO
  end_date: string;    // ISO
  created_at: string;  // ISO
  updated_at: string;  // ISO
  days_waiting: number; // liczba dni od submitted
  submitted_at: string; // ISO, kiedy przesłana
  categories: Array<string>; // nazwy kategorii
};

LocationDto = {
  type: 'Point';
  coordinates: [number, number];
};

PaginationMetaDto = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Summer Python Workshop",
      "organizer_id": "660e8400-e29b-41d4-a716-446655440001",
      "organizer_name": "TechKids Academy",
      "offer_type_id": "770e8400-e29b-41d4-a716-446655440002",
      "offer_type_name": "Workshop",
      "ages": [10, 11, 12],
      "location": {
        "type": "Point",
        "coordinates": [21.0122, 52.2297]
      },
      "status": "pending_review",
      "available_spots": 20,
      "start_date": "2026-06-15",
      "end_date": "2026-06-20",
      "created_at": "2026-02-01T10:30:00Z",
      "updated_at": "2026-02-07T10:30:00Z",
      "days_waiting": 6,
      "submitted_at": "2026-02-01T10:30:00Z",
      "categories": ["STEM", "Programming"]
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Art Painting Classes",
      "organizer_id": "660e8400-e29b-41d4-a716-446655440002",
      "organizer_name": "Creative Studio",
      "offer_type_id": "770e8400-e29b-41d4-a716-446655440003",
      "offer_type_name": "Class",
      "ages": [5, 6, 7],
      "location": {
        "type": "Point",
        "coordinates": [21.005, 52.23]
      },
      "status": "pending_review",
      "available_spots": 15,
      "start_date": "2026-03-01",
      "end_date": "2026-04-30",
      "created_at": "2026-02-05T14:20:00Z",
      "updated_at": "2026-02-05T14:20:00Z",
      "days_waiting": 2,
      "submitted_at": "2026-02-05T14:20:00Z",
      "categories": ["Arts"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  }
}
```

### Kody statusu odpowiedzi

- **200 OK** - Pomyślnie pobrano listę
- **400 Bad Request** - Nieprawidłowe query parameters
- **401 Unauthorized** - Brak autoryzacji
- **403 Forbidden** - Użytkownik nie ma uprawnień (not admin)
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /admin/offers/pending-review?...       │
│    Headers: Authorization: Bearer <token>                   │
│    Query: page, limit, sort, order, search, filters         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Extract JWT Token & Verify Admin Role                    │
│    - Parse Authorization header                              │
│    - Check role === 'admin'                                  │
│    - Return 401/403 jeśli unauthorized                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Parsowanie Query Parameters (Zod)                        │
│    - Validate page (min 1, default 1)                        │
│    - Validate limit (1-100, default 20)                      │
│    - Validate sort (enum: created_at, title, ...)           │
│    - Validate order (asc/desc)                               │
│    - Validate search (optional, min 3 chars)                 │
│    - Validate filters (optional, valid formats)              │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Budowanie Query Parametrów                               │
│    - offset = (page - 1) * limit                             │
│    - sort_field = mapSortField(sort)                         │
│    - search_query = normalizeSearch(search)                  │
│    - geo_filter = buildGeoFilter(lat, lon, radius)          │
│    - age_filter = buildAgeFilter(age_min, age_max)          │
│    - type_filter = offer_type_id (optional)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Queryowanie bazy danych (Supabase)                        │
│                                                               │
│    - SELECT COUNT(*) FROM offers WHERE status='pending_     │
│      review' AND filters...                                  │
│    - SELECT * FROM offers WHERE status='pending_review'      │
│      AND filters... LIMIT limit OFFSET offset ORDER BY...   │
│    - Include relations: organizer, offer_type, categories   │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Obliczanie Pagination Metadata                           │
│    - total_pages = CEIL(total_count / limit)                │
│    - has_next = page < total_pages                           │
│    - has_previous = page > 1                                 │
│    - days_waiting = NOW() - submitted_at                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Mapowanie na AdminOfferSummaryDto                         │
│    - Extract fields z offer + relations                      │
│    - Convert location do LocationDto                         │
│    - Extract category names                                  │
│    - Calculate days_waiting                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: AdminPendingOffersResponseDto                      │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z bazą danych

```typescript
// 1. Normalize search
const searchQuery = search?.toLowerCase().trim();

// 2. Build filters
const filters = {
  status: 'pending_review',
  offer_type_id: offer_type_id || undefined,
  age_range: age_min && age_max ? [age_min, age_max] : undefined,
};

// 3. Get total count
const { count: total } = await supabase
  .from('offers')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'pending_review')
  .ilike('title', `%${searchQuery}%`) // if search provided
  .gte('ages[0]', age_min) // if age filtering
  .lte('ages[-1]', age_max);

// 4. Get paginated data
const offset = (page - 1) * limit;
const { data: offers, error } = await supabase
  .from('offers')
  .select(
    `
    *,
    organizerProfile:organizer_id(company_name),
    offerType:offer_type_id(name),
    categories:offer_categories(name)
  `,
  )
  .eq('status', 'pending_review')
  .ilike('title', `%${searchQuery}%`)
  .gte('ages[0]', age_min)
  .lte('ages[-1]', age_max)
  .eq('offer_type_id', offer_type_id)
  .order(sortField, { ascending: order === 'asc' })
  .range(offset, offset + limit - 1);

// 5. Geo filtering (optional, post-query)
if (location_lat && location_lon && location_radius_km) {
  offers = offers.filter((offer) => {
    const distance = calculateDistance(
      location_lat,
      location_lon,
      offer.location.coordinates[1],
      offer.location.coordinates[0],
    );
    return distance <= location_radius_km;
  });
}

// 6. Map to DTO
const data = offers.map((offer) => ({
  id: offer.id,
  title: offer.title,
  organizer_id: offer.organizer_id,
  organizer_name: offer.organizerProfile?.company_name,
  offer_type_id: offer.offer_type_id,
  offer_type_name: offer.offerType?.name,
  ages: offer.ages,
  location: { type: 'Point', coordinates: offer.location },
  status: 'pending_review',
  available_spots: offer.available_spots,
  start_date: offer.start_date,
  end_date: offer.end_date,
  created_at: offer.created_at,
  updated_at: offer.updated_at,
  days_waiting: Math.floor(
    (new Date() - new Date(offer.created_at)) / (1000 * 60 * 60 * 24),
  ),
  submitted_at: offer.created_at,
  categories: offer.categories.map((cat) => cat.name),
}));

// 7. Return paginated response
return {
  data,
  pagination: {
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
    has_next: page < Math.ceil(total / limit),
    has_previous: page > 1,
  },
};
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i Autoryzacja

- **JWT Required**: Must have valid token
- **Admin Role Required**: Only admins access (RLS policy)
- **RLS Policy**:
  ```sql
  CREATE POLICY "Admins can view pending offers"
    ON offers
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin' AND status = 'pending_review');
  ```

### 6.2 Walidacja Query Parameters

**Schema (Zod):**

```typescript
const pendingOffersQuerySchema = z.object({
  page: z.number().int().min(1, 'Page must be >= 1').default(1),
  limit: z.number().int().min(1).max(100, 'Limit max 100').default(20),
  sort: z
    .enum(['created_at', 'title', 'organizer_name', 'age_min'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().min(3, 'Search min 3 chars').optional(),
  offer_type_id: z.string().uuid('Invalid UUID').optional(),
  age_min: z.number().int().min(0).max(100).optional(),
  age_max: z.number().int().min(0).max(100).optional(),
  location_lat: z.number().min(-90).max(90).optional(),
  location_lon: z.number().min(-180).max(180).optional(),
  location_radius_km: z.number().min(1).max(500).default(50),
});
```

### 6.3 Rate Limiting (optional)

```typescript
// Per admin per minute
const key = `pending_offers_list_${adminUserId}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 60);
}
if (count > 100) { // 100 requests per minute per admin
  return 429 Too Many Requests;
}
```

### 6.4 CORS

```
Access-Control-Allow-Origin: https://admin.kidosy.pl
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Authorization
```

### 6.5 Logging

- Log all list requests (admin ID, filters used)
- Track search queries (für analytics)
- Monitor response times
- Alert on suspiciously large pages (admin downloading all?)

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz       | Status | Error Code         | Message                        |
| ---------------- | ------ | ------------------ | ------------------------------ |
| Pobrano listę    | 200    | -                  | Success                        |
| Page < 1         | 400    | `VALIDATION_ERROR` | "Page must be >= 1"            |
| Limit > 100      | 400    | `VALIDATION_ERROR` | "Limit max 100"                |
| Invalid sort     | 400    | `VALIDATION_ERROR` | "Invalid sort field"           |
| Search < 3 chars | 400    | `VALIDATION_ERROR` | "Search min 3 chars"           |
| Invalid UUID     | 400    | `VALIDATION_ERROR` | "Invalid offer_type_id format" |
| Brak JWT         | 401    | `AUTH_ERROR`       | "Unauthorized"                 |
| Not admin        | 403    | `AUTH_ERROR`       | "Forbidden"                    |
| Database error   | 500    | `DATABASE_ERROR`   | "Internal error"               |

---

## 8. Rozważania wydajności

### 8.1 Indeksowanie

```sql
-- Must have indexes for performance
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_created_at ON offers(created_at DESC);
CREATE INDEX idx_offers_title ON offers(title);
CREATE INDEX idx_offers_offer_type_id ON offers(offer_type_id);

-- For search (if using ILIKE)
CREATE INDEX idx_offers_title_gin ON offers USING GIN(to_tsvector('english', title));
```

### 8.2 Query Optimization

- Use `head: true` with count to avoid data load
- Limit page size to reasonable max (100)
- Use LIMIT + OFFSET efficiently
- Consider materialized views for complex filters

### 8.3 Response Time Targets

- **P50**: < 200ms
- **P95**: < 500ms
- **P99**: < 1000ms

---

## 9. Etapy wdrażania

### Faza 1: Setup

- DB indexes created
- Service/Controller setup

### Faza 2: Query Parameter Validation

- Zod schemas
- Unit tests

### Faza 3: Service Layer

- Query building logic
- Filtering/Sorting/Pagination
- Integration tests

### Faza 4: Controller/Route

- Route registered
- Controller tests

### Faza 5: Frontend Integration

- Admin console displays list
- Pagination controls work
- Search/filter working

### Faza 6: Performance Testing

- Load tests (50 concurrent requests)
- Query optimization verification

### Faza 7: Deployment

- Staging tests
- Production deployment

---

## Checklist

- [ ] Database indexes created
- [ ] Query parameter validation
- [ ] Service layer (query building, filtering)
- [ ] Controller/route registered
- [ ] Admin authorization enforced
- [ ] Pagination working
- [ ] Search working
- [ ] Sorting working
- [ ] Location filtering working
- [ ] E2E tests passing
- [ ] Performance tests (P50/P95/P99)
- [ ] Logging/monitoring
- [ ] Documentation updated
- [ ] Production deployed

---

## Notes

- **Pagination**: Use offset/limit, not cursors (simpler)
- **Search**: Implement full-text search or ILIKE for MVP
- **Sorting**: Limited set of fields (don't allow arbitrary)
- **Filtering**: Geo radius calculation done server-side
- **Caching**: Optional - consider caching pending queue per minute
- **Real-time**: Could use WebSocket for live count updates
- **Days waiting**: Calculate server-side for consistency
