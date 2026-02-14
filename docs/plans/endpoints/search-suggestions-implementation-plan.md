# API Endpoint Implementation Plan: GET /search/suggestions

## 1. Przegląd punktu końcowego

Endpoint **GET /search/suggestions** zwraca autocomplete suggestions dla pola wyszukiwania. Gdy użytkownik wpisuje w search box, endpoint zwraca propozycje: ostatnie wyszukiwania, popularne terminy, nazwy ofert, kategorie, itd. Endpoint optymalizowany dla szybkich odpowiedzi (autocompletion use case).

Proces pobierania:

1. Walidacja query string (min 2 chars)
2. Pobranie suggestions z bazy/cache
3. Agregacja: recent + popular + matching offers
4. Zwrócenie top N suggestions

Endpoint obsługuje:

- Prefix matching (na nazwach ofert, kategoriach)
- Recent searches (per user if logged in, or per IP)
- Popular searches (trend analysis)
- Category/Location suggestions
- Redis caching for performance

Odpowiedź zawiera array suggestions.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/search/suggestions?q=pro
```

### Parametry

**Query Parameters:**

- `q` (string, required, min 2) - Query prefix dla autocomplete
- `limit` (number, default: 10, max: 50) - Liczba suggestions

### Request Headers

```
Authorization: Bearer <access_token> (optional)
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/search/suggestions?q=pro&limit=10" \
  -H "Content-Type: application/json"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
SearchSuggestionsResponseDto = {
  suggestions: Array<SuggestionDto>;
};

SuggestionDto = {
  id: string;
  text: string;
  type: SuggestionType;
  metadata?: SuggestionMetadataDto;
  icon?: string;
};

type SuggestionType = 'offer' | 'category' | 'location' | 'popular' | 'recent';

SuggestionMetadataDto = {
  offer_id?: string;
  category_id?: string;
  location_id?: string;
  price?: number;
  location_name?: string;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "suggestions": [
    {
      "id": "sug-001",
      "text": "Programowanie dla początkujących",
      "type": "offer",
      "metadata": {
        "offer_id": "offer-550e8400",
        "price": 1500,
        "location_name": "Warszawa"
      },
      "icon": "🖥️"
    },
    {
      "id": "sug-002",
      "text": "Programowanie w Pythonie",
      "type": "offer",
      "metadata": {
        "offer_id": "offer-550e8401",
        "price": 2000,
        "location_name": "Kraków"
      },
      "icon": "🐍"
    },
    {
      "id": "sug-003",
      "text": "Programowanie",
      "type": "category",
      "metadata": {
        "category_id": "cat-programming"
      },
      "icon": "💻"
    },
    {
      "id": "sug-004",
      "text": "Programowanie gier",
      "type": "popular",
      "icon": "🎮"
    }
  ]
}
```

### Kody statusu odpowiedzi

- **200 OK** - Suggestions pomyślnie pobrane
- **400 Bad Request** - Query za krótk lub brakujący
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /search/suggestions?q=pro              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja Query (Zod)                                     │
│    - q: required, min 2 chars                                │
│    - limit: optional, max 50                                 │
│    - Lowercase, strip whitespace                             │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Sprawdzenie Cache (Redis)                                │
│    - Key: suggestions:${q}:${limit}                          │
│    - If found: Return cached response (skip to step 10)      │
│    - TTL: 3600 seconds (1 hour - can be longer)             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Agregowanie Suggestions Sources (parallel queries)       │
│                                                               │
│    a) Recent Searches:                                       │
│       - If user logged in: Get last 5 searches for user      │
│       - Query: SELECT DISTINCT query FROM search_history     │
│       - WHERE user_id = logged_in_user                       │
│       - AND query ILIKE prefix%                              │
│       - ORDER BY searched_at DESC LIMIT 5                    │
│       - If not logged in: Get from IP-based tracking         │
│                                                               │
│    b) Popular Searches (Trends):                             │
│       - SELECT query, COUNT(*) as popularity                │
│       - FROM search_history                                  │
│       - WHERE query ILIKE prefix%                            │
│       - AND searched_at > NOW() - interval '30 days'         │
│       - GROUP BY query                                       │
│       - ORDER BY popularity DESC LIMIT 5                     │
│                                                               │
│    c) Offer Titles (Prefix Match):                           │
│       - SELECT id, title, price, location FROM offers        │
│       - WHERE status = 'published'                           │
│       - AND title ILIKE prefix%                              │
│       - ORDER BY relevance/popularity DESC                   │
│       - LIMIT 5                                              │
│                                                               │
│    d) Categories (Prefix Match):                             │
│       - SELECT id, name FROM categories                      │
│       - WHERE name ILIKE prefix%                             │
│       - AND is_active = true                                 │
│       - ORDER BY display_order ASC LIMIT 3                   │
│                                                               │
│    e) Locations (Prefix Match):                              │
│       - SELECT id, name FROM locations                       │
│       - WHERE name ILIKE prefix%                             │
│       - AND is_active = true                                 │
│       - ORDER BY popularity DESC LIMIT 2                     │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Merge & Rank Suggestions                                  │
│    - Combine all sources                                      │
│    - Deduplicate (if same text appears multiple times)       │
│    - Apply ranking:                                          │
│      - Recent searches: score 100                              │
│      - Offer titles: score 80-90 (by popularity)             │
│      - Categories: score 70                                   │
│      - Popular searches: score 60-80 (by trend)              │
│      - Locations: score 50                                    │
│    - Sort by score DESC                                      │
│    - Take top K (limit param)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Mapowanie na SuggestionDto                               │
│    - Insert metadata (offer_id, category_id, etc.)           │
│    - Assign icons based on type                              │
│    - Format response                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Cache odpowiedzi (async)                                  │
│    - SET suggestions:${q}:${limit}                           │
│    - TTL: 3600 seconds                                       │
│    - Don't block response                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Log Search Query (async)                                  │
│    - If user logged in: INSERT INTO search_history           │
│    - If anon: Track by IP address                            │
│    - Store: query, timestamp, user_id/ip                    │
│    - Don't block response                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: SearchSuggestionsResponseDto                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Public Data

- No authentication required
- Return only published offers

### 6.2 Validacja

```typescript
const suggestionsQuerySchema = z.object({
  q: z.string().min(2).max(100),
  limit: z.number().int().min(1).max(50).default(10).optional(),
});
```

### 6.3 Rate Limiting

- Per IP: max 100 requests per minute (generous for autocomplete)
- No need for stricter limits (read-only, cacheable)

---

## 7. Obsługa błędów

| Scenariusz       | Status | Error Code         | Message                          |
| ---------------- | ------ | ------------------ | -------------------------------- |
| Pobrano          | 200    | -                  | Success                          |
| Query za krótkie | 400    | `VALIDATION_ERROR` | "Query must be at least 2 chars" |
| Query brakuje    | 400    | `VALIDATION_ERROR` | "Query required"                 |
| Limit too high   | 400    | `VALIDATION_ERROR` | "Limit must be max 50"           |
| Database error   | 500    | `DATABASE_ERROR`   | "Internal error"                 |

---

## 8. Wydajność

### 8.1 Indeksowanie

```sql
-- Prefix search indexes
CREATE INDEX idx_offers_title_prefix ON offers(title text_pattern_ops);
CREATE INDEX idx_categories_name_prefix ON categories(name text_pattern_ops);
CREATE INDEX idx_locations_name_prefix ON locations(name text_pattern_ops);

-- Search history for recent/popular searches
CREATE INDEX idx_search_history_query ON search_history(query, searched_at DESC);
CREATE INDEX idx_search_history_user ON search_history(user_id, searched_at DESC);
```

### 8.2 Caching

- **Time-To-Live**: 3600 seconds (1 hour)
- **Cache key**: `suggestions:${query}:${limit}`
- **Regeneration**: On server restart or manual invalidation

### 8.3 Response Time

- **P50 (from cache)**: < 50ms
- **P95 (from cache)**: < 100ms
- **P50 (cache miss, small dataset)**: < 200ms
- **P95 (cache miss)**: < 500ms

---

## 9. Etapy wdrażania

### Faza 1: Schema

- search_history table (for tracking)
- Indexes for prefix search

### Faza 2: Service Layer

- getSuggestions() method
- Parallel query execution
- Ranking logic

### Faza 3: Search History Tracking

- Log searches (user-based and IP-based)
- Cleanup old records (retention policy)

### Faza 4: Controller/Route

- GET /search/suggestions
- Parameter validation

### Faza 5: Ranking Algorithm

- Score calculation per source
- Deduplication logic

### Faza 6: Caching

- Redis setup
- Cache invalidation strategy

### Faza 7: E2E Testing

- Basic suggestions
- Recent searches (for logged-in users)
- Popular searches
- Deduplication
- Cache working
- Response time under 200ms

### Faza 8: Deployment

- Staging
- Production
- Monitor response times

---

## Checklist

- [ ] Schema verified (search_history table)
- [ ] Prefix search indexes
- [ ] Service layer implemented
- [ ] Parallel query execution
- [ ] Ranking algorithm
- [ ] Deduplication logic
- [ ] Controller/route
- [ ] Redis caching
- [ ] Search history tracking
- [ ] Parameter validation
- [ ] E2E tests
- [ ] Performance tests (response time < 200ms)
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **Autocomplete use case**: Must be fast (< 200ms)
- **Caching essential**: High-traffic endpoint
- **Deduplication**: Same suggestion from multiple sources should appear once
- **Recent searches**: Personalized if logged in, shared if not
- **Popular searches**: Trending - what are people searching most
- **Ranking**: Balance between personalization and discovery
- **History retention**: Keep 30 days min, delete older (GDPR)
- **Prefix search**: ILIKE with % suffix for efficiency
