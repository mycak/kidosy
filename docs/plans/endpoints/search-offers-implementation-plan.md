# API Endpoint Implementation Plan: GET /search/offers

## 1. Przegląd punktu końcowego

Endpoint **GET /search/offers** umożliwia wyszukiwanie dostępnych ofert z zaawansowanymi filtrami. Użytkownicy mogą szukać po tekście (nazwa, opis), filtrować po kategorii, lokalizacji, wymaganym wieku, terminie, cenie, i wielu innych kryteriach. Endpoint obsługuje paginację, sortowanie i faceted search.

Proces wyszukiwania:

1. Walidacja query parameters
2. Budowanie zaawansowanej kwerendy SQL (fulltext search + filters)
3. Liczenie wyników
4. Pobranie paginated resultów
5. Zwrócenie listy ofert z metadata

Endpoint obsługuje:

- Full-text search na tytule i opisie (PostgreSQL tsvector)
- Filtering: kategoria, typ, lokalizacja, wiek, cena, data
- Sorting: relevance, recency, price, popularity
- Pagination
- Faceted search (count per filter)
- Elasticsearch alternative for scaling

Odpowiedź zawiera array ofert pasujących do kryteriów + facets.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/search/offers?q=programowanie&category=programming&location=warsaw&age_min=8&age_max=15&sort=relevance&page=1&limit=20
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `q` (string, min 2) - Tekst wyszukiwania (fulltext search)
- `category` (string) - Filtruj po kodzie kategorii
- `type` (string) - Filtruj po kodzie typu
- `location` (string) - Filtruj po kodzie lokalizacji
- `age_min` (number) - Minimalne wymagane wiek dziecka (inclusive)
- `age_max` (number) - Maksymalne wymagane wiek dziecka (inclusive)
- `price_min` (number) - Minimalna cena
- `price_max` (number) - Maksymalna cena
- `date_from` (string, ISO) - Oferty od daty
- `date_to` (string, ISO) - Oferty do daty
- `verified_only` (boolean, default: false) - Tylko zweryfikowani organizatorzy
- `available_only` (boolean, default: true) - Tylko z dostępnymi miejscami
- `sort` (enum, default: 'relevance') - Sortowanie
  - 'relevance' - Relevancja wyszukiwania
  - 'newest' - Najnowsze
  - 'price_asc' - Cena rosnąco
  - 'price_desc' - Cena malejąco
  - 'rating' - Ocena
- `page` (number, default: 1) - Numer strony
- `limit` (number, default: 20, max: 100) - Elementy na stronę
- `include_facets` (boolean, default: true) - Include faceted search counts

### Request Headers

```
Content-Type: application/json
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/search/offers?q=programowanie&category=programming&age_min=8&age_max=15&sort=relevance&page=1" \
  -H "Content-Type: application/json"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
SearchOffersResponseDto = {
  results: Array<OfferSearchResultDto>;
  pagination: PaginationMetaDto;
  facets?: SearchFacetsDto;
  query_summary: QuerySummaryDto;
};

OfferSearchResultDto = {
  id: string;
  title: string;
  description: string;
  category: CategorySummaryDto;
  type: TypeSummaryDto;
  location: LocationSummaryDto;
  organizer: OrganizerSummaryDto;
  age_min: number;
  age_max: number;
  price: number;
  available_spots: number;
  total_spots: number;
  start_date: string;
  end_date: string;
  rating: number;
  rating_count: number;
  relevance_score?: number; // If fulltext search
  created_at: string;
};

SearchFacetsDto = {
  categories: Array<FacetItemDto>;
  types: Array<FacetItemDto>;
  locations: Array<FacetItemDto>;
  price_ranges: Array<FacetItemDto>;
  age_ranges: Array<FacetItemDto>;
};

FacetItemDto = {
  value: string;
  label: string;
  count: number;
  is_selected: boolean;
};

QuerySummaryDto = {
  query: string;
  filters_applied: number;
  total_results: number;
  execution_time_ms: number;
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
  "results": [
    {
      "id": "offer-550e8400-e29b-41d4-a716-446655440000",
      "title": "Letni Kurs Programowania w Pythonie",
      "description": "Intensywny kurs nauki Pythona dla początkujących. Nauczymy dzieci podstaw programowania...",
      "category": {
        "id": "cat-programming",
        "code": "programming",
        "name": "Programowanie"
      },
      "type": {
        "id": "type-course",
        "code": "course",
        "name": "Kurs"
      },
      "location": {
        "id": "loc-warsaw",
        "code": "warsaw_center",
        "name": "Warszawa - Centrum"
      },
      "organizer": {
        "id": "org-123",
        "name": "Tech Academy Poland",
        "verified": true
      },
      "age_min": 10,
      "age_max": 16,
      "price": 1500,
      "available_spots": 5,
      "total_spots": 20,
      "start_date": "2026-06-01T09:00:00Z",
      "end_date": "2026-08-31T17:00:00Z",
      "rating": 4.8,
      "rating_count": 42,
      "relevance_score": 0.95,
      "created_at": "2026-01-15T10:00:00Z"
    },
    {
      "id": "offer-550e8400-e29b-41d4-a716-446655440001",
      "title": "Warsztaty Robotyki",
      "description": "Zapoznaj się z robotyką poprzez praktyczne projekty...",
      "category": {
        "id": "cat-programming",
        "code": "programming",
        "name": "Programowanie"
      },
      "type": {
        "id": "type-workshop",
        "code": "workshop",
        "name": "Warsztat"
      },
      "location": {
        "id": "loc-warsaw",
        "code": "warsaw_west",
        "name": "Warszawa - Zachodnia"
      },
      "organizer": {
        "id": "org-456",
        "name": "Future Engineers",
        "verified": true
      },
      "age_min": 9,
      "age_max": 14,
      "price": 800,
      "available_spots": 3,
      "total_spots": 15,
      "start_date": "2026-03-15T10:00:00Z",
      "end_date": "2026-03-15T14:00:00Z",
      "rating": 4.9,
      "rating_count": 28,
      "relevance_score": 0.87,
      "created_at": "2026-02-01T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 127,
    "total_pages": 7,
    "has_next": true,
    "has_previous": false
  },
  "facets": {
    "categories": [
      {
        "value": "programming",
        "label": "Programowanie",
        "count": 42,
        "is_selected": true
      },
      {
        "value": "sports",
        "label": "Sporty",
        "count": 31,
        "is_selected": false
      },
      {
        "value": "arts",
        "label": "Sztuka",
        "count": 28,
        "is_selected": false
      }
    ],
    "price_ranges": [
      {
        "value": "0-500",
        "label": "Poniżej 500 zł",
        "count": 45,
        "is_selected": false
      },
      {
        "value": "500-1000",
        "label": "500-1000 zł",
        "count": 38,
        "is_selected": false
      },
      {
        "value": "1000-2000",
        "label": "1000-2000 zł",
        "count": 28,
        "is_selected": false
      }
    ],
    "age_ranges": [
      {
        "value": "6-9",
        "label": "6-9 lat",
        "count": 35,
        "is_selected": false
      },
      {
        "value": "10-13",
        "label": "10-13 lat",
        "count": 52,
        "is_selected": false
      },
      {
        "value": "14-18",
        "label": "14-18 lat",
        "count": 40,
        "is_selected": false
      }
    ]
  },
  "query_summary": {
    "query": "programowanie",
    "filters_applied": 2,
    "total_results": 127,
    "execution_time_ms": 145
  }
}
```

### Kody statusu odpowiedzi

- **200 OK** - Wyszukiwanie pomyślne
- **400 Bad Request** - Nieprawidłowe query parameters
- **422 Unprocessable Entity** - Business logic error
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /search/offers?q=...&category=...      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja Query Parameters (Zod)                         │
│    - q: optional, min 2 chars                                │
│    - category/type/location: optional UUIDs                  │
│    - age_min/age_max: optional numbers                       │
│    - price_min/price_max: optional numbers                   │
│    - dates: optional ISO datetimes                           │
│    - sort: valid enum                                        │
│    - page/limit: valid pagination                            │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Normalizacja Query Stringa                               │
│    - Trim whitespace                                         │
│    - Lowercase for search                                    │
│    - Remove special chars (keep only alphanumeric + space)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Liczenie całkowitych wyników (dla facets)                │
│    - SELECT COUNT(*) FROM offers                            │
│    - Apply all filters (category, location, age, price)     │
│    - Don't apply search query yet                            │
│    - Store count_all for facets                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Fulltext Search Query Building                            │
│                                                               │
│    a) Jeśli q (search query) podane:                         │
│       - Parse query string (handle quotes, operators)        │
│       - Build tsvector query zaindexowany w PostgreSQL       │
│       - Use websearch_to_tsquery() for simple search         │
│       - Calculate relevance score                            │
│                                                               │
│    b) Jeśli brak q:                                          │
│       - Order by sort parameter                              │
│       - No relevance score                                   │
│                                                               │
│    c) Query example:                                         │
│       SELECT offers.*, search_score                          │
│       FROM offers                                            │
│       WHERE status = 'published'                             │
│       AND date_range overlaps with query range               │
│       AND age_range overlaps with query range                │
│       AND category_id IN (...)                               │
│       AND location_id IN (...)                               │
│       AND price BETWEEN ... AND ...                          │
│       AND available_spots > 0                                │
│       AND (                                                  │
│         to_tsvector('polish', title || description)           │
│         @@ websearch_to_tsquery('polish', search_query)      │
│       )                                                      │
│       ORDER BY search_score DESC, created_at DESC            │
│       LIMIT limit OFFSET offset                              │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Pobranie wyników z bazy                                   │
│    - Execute zabudowana query                                │
│    - Include organizer, category, type info                  │
│    - LIMIT + offset dla pagination                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Budowanie Facets (jeśli requested)                        │
│    - Query counts per category (filtered by current filters) │
│    - Query counts per type                                   │
│    - Query counts per location                               │
│    - Price ranges: count offers per bracket                  │
│    - Age ranges: count offers per bracket                    │
│    - Mark selected facets                                    │
│                                                               │
│    SELECT category_id, COUNT(*)                              │
│    FROM offers                                               │
│    WHERE ... all filters EXCEPT category ...                 │
│    GROUP BY category_id                                      │
│    (Similar for other facets)                                │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Mapowanie na SearchOffersResponseDto                     │
│    - Transform offers to OfferSearchResultDto                │
│    - Include facets if requested                             │
│    - Include query summary with execution time               │
│    - Format timestamps as ISO 8601                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Cache odpowiedzi (optional - Redis)                       │
│    - Key: search:${hash(query_params)}                       │
│    - TTL: 300 seconds (5 minutes)                            │
│    - Mark as uncacheable if user is logged in (personalized) │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: SearchOffersResponseDto                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeńства

### 6.1 Public Data

- No authentication required
- Return only published offers

### 6.2 Validacja

```typescript
const searchOffersQuerySchema = z.object({
  q: z.string().min(2).optional(),
  category: z.string().optional(),
  type: z.string().optional(),
  location: z.string().optional(),
  age_min: z.number().int().min(1).max(100).optional(),
  age_max: z.number().int().min(1).max(100).optional(),
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  verified_only: z.boolean().optional(),
  available_only: z.boolean().optional(),
  sort: z
    .enum(['relevance', 'newest', 'price_asc', 'price_desc', 'rating'])
    .optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  include_facets: z.boolean().optional(),
});
```

### 6.3 SQL Injection Prevention

- Use parameterized queries for all params
- Sanitize search query before tsvector
- tsvector/tsquery handles special chars safely

---

## 7. Obsługa błędów

| Scenariusz          | Status | Error Code         | Message                          |
| ------------------- | ------ | ------------------ | -------------------------------- |
| Znaleziono          | 200    | -                  | Success                          |
| Query za krótkie    | 400    | `VALIDATION_ERROR` | "Query must be at least 2 chars" |
| Invalid age range   | 400    | `VALIDATION_ERROR` | "age_min must be <= age_max"     |
| Invalid price range | 400    | `VALIDATION_ERROR` | "price_min must be <= price_max" |
| Invalid date range  | 400    | `VALIDATION_ERROR` | "date_from must be <= date_to"   |
| Invalid sort        | 400    | `VALIDATION_ERROR` | "Invalid sort parameter"         |
| Page too high       | 400    | `VALIDATION_ERROR` | "Page out of range"              |
| Database error      | 500    | `DATABASE_ERROR`   | "Internal error"                 |

---

## 8. Wydajność

### 8.1 Indeksowanie

```sql
-- Fulltext search index
CREATE INDEX idx_offers_search_tsvector ON offers
  USING GIN(to_tsvector('polish', title || ' ' || description));

-- Filter indexes
CREATE INDEX idx_offers_category ON offers(category_id);
CREATE INDEX idx_offers_location ON offers(location_id);
CREATE INDEX idx_offers_age_range ON offers(age_min, age_max);
CREATE INDEX idx_offers_price ON offers(price);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_dates ON offers(start_date, end_date);

-- Composite indexes for common filters
CREATE INDEX idx_offers_status_category
  ON offers(status, category_id, start_date DESC);
```

### 8.2 Caching

- **Time-To-Live**: 300 seconds (5 minutes)
- **Cache key**: Hash of query params
- **Don't cache**: Personalized results, user-specific filters
- **Invalidation**: On offer publish/update

### 8.3 Response Time

- **P50 (indexed query)**: < 200ms
- **P95 (indexed query)**: < 500ms
- **P99 (complex query)**: < 1500ms
- **P50 (from cache)**: < 50ms

---

## 9. Etapy wdrażania

### Faza 1: Schema & Indexes

- Verify offers table structure
- Create tsvector index
- Create filter indexes
- Create composite indexes

### Faza 2: Fulltext Search

- PostgreSQL fulltext configuration (Polish)
- websearch_to_tsquery implementation
- Relevance scoring

### Faza 3: Service Layer

- searchOffers() method
- Query building logic
- Facets calculation

### Faza 4: Controller/Route

- GET /search/offers
- Parameter validation

### Faza 5: Facets

- Facet counts per category/type/location
- Facet calculation logic

### Faza 6: Sorting & Pagination

- All sort options
- Offset-based pagination

### Faza 7: Caching

- Redis setup
- Query param hashing

### Faza 8: E2E Testing

- Text search
- Filters (single + multiple)
- Sorting options
- Pagination
- Facets accuracy
- Empty results
- Large result sets

### Faza 9: Performance Testing

- Load testing with concurrent searches
- Query optimization
- Index verification

### Faza 10: Deployment

- Staging
- Production
- Monitor query performance

---

## Checklist

- [ ] tsvector index created
- [ ] Filter indexes created
- [ ] Composite indexes created
- [ ] Fulltext search implementation
- [ ] Relevance scoring
- [ ] Service layer implemented
- [ ] Query building logic
- [ ] Facets calculation
- [ ] Controller/route
- [ ] Parameter validation
- [ ] Sorting all options
- [ ] Pagination working
- [ ] Caching strategy
- [ ] E2E tests
- [ ] Performance tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **Fulltext search**: PostgreSQL native, faster than Elasticsearch at moderate scale
- **Tsvector**: Pre-indexed for performance on large dataset
- **Facets**: Essential for UX - show available filters
- **Caching**: Short TTL (5min) for fresh results
- **Sorting**: Relevance default for search, newest for browse
- **Price/age ranges**: Buckets for facets (not infinite options)
- **Scaling**: Consider Elasticsearch if 100k+ offers
