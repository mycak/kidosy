# API Endpoint Implementation Plan: GET /admin/offers/duplicates

## 1. Przegląd punktu końcowego

Endpoint **GET /admin/offers/duplicates** zwraca listę potencjalnych duplikatów ofert, których zawartość jest bardzo podobna. System automatycznie identyfikuje duplikaty na podstawie:

- Podobieństwa tytułu (fuzzy matching)
- Przeszczególności lokalizacji (tego samego organizatora w bliskości geograficznej)
- Tego samego offer_type i grupy wiekowej
- Overlapping dat oferowania

Tylko administratorzy mogą przeglądać tę listę. Duplikaty mogą być spowodowane przypadkową retransmisją, autorami testowy lub celową spamem.

Proces pobierania:

1. Walidacja autentykacji i uprawnień (admin only)
2. Parsowanie query parameters (pagination, sorting, filtering)
3. Queryowanie ofert z potencjalnymi duplikatami
4. Obliczanie similarity score dla każdej pary
5. Filtrowani e pary z score > threshold
6. Zwrócenie listę z metadata

Endpoint obsługuje:

- Admin-only authorization
- Pagination
- Sorting by similarity score
- Filtering by organizer
- Similarity threshold configurability

Odpowiedź zawiera grupy zbliżonych ofert z similarity scores.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/admin/offers/duplicates?page=1&limit=20&min_score=0.75&organizer_id=...
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `page` (number, default: 1) - Numer strony
- `limit` (number, default: 20, max: 100) - Elementy na stronie
- `min_score` (number, default: 0.75, 0-1) - Minimalny similarity score (0.75 = 75%)
- `sort` (enum, default: score) - Sortowanie
  - `score` - Similarity score (highest first)
  - `date` - Data (newest first)
  - `organizer` - Nazwa organizatora
- `organizer_id` (string, UUID) - Filtruj po organizatorze (niebezpieczeństwo: pokazywanie jego duplikatów)
- `status` (enum) - Filtruj po statusie
  - `all` - Wszystkie oferty (default)
  - `pending` - Tylko pending_review
  - `published` - Tylko published

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
curl -X GET "https://api.kidosy.pl/admin/offers/duplicates?page=1&limit=20&min_score=0.8" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Lista potencjalnych duplikatów
AdminDuplicatesResponseDto = {
  data: Array<DuplicateGroupDto>;
  pagination: PaginationMetaDto;
};

DuplicateGroupDto = {
  group_id: string; // unique ID dla tej grupy
  similarity_score: number; // 0-1, avg score
  offers: Array<DuplicateOfferDto>;
  potential_reasons: Array<string>; // why we think they're duplicates
};

DuplicateOfferDto = {
  id: string;
  title: string;
  organizer_id: string;
  organizer_name: string;
  status: OfferStatus;
  start_date: string;
  end_date: string;
  created_at: string;
  location: LocationDto;
  similarity_details: SimilarityDetailsDto;
};

SimilarityDetailsDto = {
  title_similarity: number; // 0-1
  location_similarity: number; // 0-1 (based on distance)
  type_match: boolean; // same offer_type?
  age_overlap: boolean; // overlapping age ranges?
  date_overlap: boolean; // overlapping dates?
  organizer_match: boolean; // same organizer?
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
      "group_id": "dup-group-550e8400",
      "similarity_score": 0.92,
      "offers": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Summer Python Workshop 2026",
          "organizer_id": "660e8400-e29b-41d4-a716-446655440001",
          "organizer_name": "TechKids Academy",
          "status": "pending_review",
          "start_date": "2026-06-15",
          "end_date": "2026-06-20",
          "created_at": "2026-02-03T10:30:00Z",
          "location": {
            "type": "Point",
            "coordinates": [21.0122, 52.2297]
          },
          "similarity_details": {
            "title_similarity": 0.95,
            "location_similarity": 0.98,
            "type_match": true,
            "age_overlap": true,
            "date_overlap": true,
            "organizer_match": false
          }
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440001",
          "title": "Python Summer Course for Kids",
          "organizer_id": "660e8400-e29b-41d4-a716-446655440002",
          "organizer_name": "Code Academy",
          "status": "pending_review",
          "start_date": "2026-06-16",
          "end_date": "2026-06-22",
          "created_at": "2026-02-03T11:45:00Z",
          "location": {
            "type": "Point",
            "coordinates": [21.005, 52.23]
          },
          "similarity_details": {
            "title_similarity": 0.95,
            "location_similarity": 0.98,
            "type_match": true,
            "age_overlap": true,
            "date_overlap": true,
            "organizer_match": false
          }
        }
      ],
      "potential_reasons": [
        "Very similar titles (95% match)",
        "Close geographic locations (0.5 km apart)",
        "Same offer type (Workshop)",
        "Overlapping age ranges (8-12)",
        "Overlapping dates (15-22 June)"
      ]
    },
    {
      "group_id": "dup-group-660e8400",
      "similarity_score": 0.85,
      "offers": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440002",
          "title": "Art Painting Classes Warsaw",
          "organizer_id": "660e8400-e29b-41d4-a716-446655440003",
          "organizer_name": "Creative Studio Ltd",
          "status": "published",
          "start_date": "2026-03-01",
          "end_date": "2026-04-30",
          "created_at": "2026-02-01T08:00:00Z",
          "location": {
            "type": "Point",
            "coordinates": [21.0122, 52.2297]
          },
          "similarity_details": {
            "title_similarity": 0.8,
            "location_similarity": 0.99,
            "type_match": true,
            "age_overlap": true,
            "date_overlap": false,
            "organizer_match": false
          }
        },
        {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "title": "Painting Art Class Warsaw",
          "organizer_id": "660e8400-e29b-41d4-a716-446655440004",
          "organizer_name": "Studio Kreatywne",
          "status": "draft",
          "start_date": "2026-02-15",
          "end_date": "2026-04-15",
          "created_at": "2026-02-05T14:20:00Z",
          "location": {
            "type": "Point",
            "coordinates": [21.012, 52.2298]
          },
          "similarity_details": {
            "title_similarity": 0.8,
            "location_similarity": 0.99,
            "type_match": true,
            "age_overlap": true,
            "date_overlap": true,
            "organizer_match": false
          }
        }
      ],
      "potential_reasons": [
        "Similar titles (80% match)",
        "Same location (10m apart)",
        "Same offer type (Class)",
        "Overlapping age ranges (6-10)",
        "Partially overlapping dates"
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "total_pages": 1,
    "has_next": false,
    "has_previous": false
  }
}
```

### Kody statusu

- **200 OK** - Pomyślnie pobrano
- **400 Bad Request** - Nieprawidłowe query
- **401 Unauthorized** - Brak autoryzacji
- **403 Forbidden** - Not admin
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Algorytm detekacji duplikatów

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Pobierz wszystkie oferty zstatusem pending/published      │
│    ORDER BY created_at DESC                                 │
│    LIMIT n (e.g., last 500 offers)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Dla każdej pary ofert (i, j) gdzie i < j:               │
│    Oblicz similarity scores                                  │
│                                                               │
│    a) Title similarity:                                      │
│       - Levenshtein distance normalizowany                   │
│       - OR full-text similarity                              │
│       - Score: 0-1                                           │
│                                                               │
│    b) Location similarity:                                  │
│       - Haversine distance między coordinates                │
│       - Normalized: 1 - (distance_km / 50km)                │
│       - Score: 0-1                                           │
│                                                               │
│    c) Type match:                                            │
│       - Same offer_type_id? → 1.0 : 0.0                     │
│                                                               │
│    d) Age overlap:                                           │
│       - intersection(ages1, ages2) > 0? → 1.0 : 0.0        │
│                                                               │
│    e) Date overlap:                                          │
│       - (start1 <= end2) AND (start2 <= end1)? → 1.0 : 0.0 │
│                                                               │
│    f) Organizer match:                                       │
│       - Same organizer_id? → 1.0 : 0.0                      │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Oblicz zagregowany similarity score                       │
│                                                               │
│    final_score = (                                           │
│      title_similarity * 0.4 +                               │
│      location_similarity * 0.3 +                             │
│      type_match * 0.1 +                                      │
│      age_overlap * 0.1 +                                     │
│      date_overlap * 0.05 +                                   │
│      organizer_match * (-0.1)  // same organizer = less likely dup │
│    )                                                          │
│                                                               │
│    Normalize to 0-1 range                                    │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Filtruj pary gdzie score >= min_score (threshold)        │
│    Default: 0.75 (75% similarity)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Cluster parami w grupy (graph clustering)                │
│    - Jeśli (A,B) i (B,C) są duplikaty → (A,B,C) = grupa   │
│    - Unikaj duplikatów w response                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Cache wyniki (5 minut)                                    │
│    - Duplicate detection is expensive                        │
│    - Store in Redis aby uniknąć powtórnego obliczania      │
│    - Invalidate when new offer submitted                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Paginate i sort wyniki                                    │
│    - Sort by similarity_score DESC (highest first)           │
│    - Apply pagination (page, limit)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć response z group_id, offers, reasons              │
└─────────────────────────────────────────────────────────────┘
```

### Kodowanie similarity

```typescript
function calculateSimilarityScore(offer1, offer2, minScore = 0.75) {
  // 1. Title similarity (Levenshtein)
  const titleSim = calculateLevenshteinSimilarity(
    offer1.title.toLowerCase(),
    offer2.title.toLowerCase(),
  );

  // 2. Location similarity
  const distance = haversineDistance(
    offer1.location.coordinates,
    offer2.location.coordinates,
  );
  const locationSim = Math.max(0, 1 - distance / 50); // 50km max

  // 3. Type match
  const typeMatch = offer1.offer_type_id === offer2.offer_type_id ? 1 : 0;

  // 4. Age overlap
  const ageOverlap = hasAgeOverlap(offer1.ages, offer2.ages) ? 1 : 0;

  // 5. Date overlap
  const dateOverlap = hasDateOverlap(offer1, offer2) ? 1 : 0;

  // 6. Organizer match (negative weight - same organizer less likely)
  const organizerMatch = offer1.organizer_id === offer2.organizer_id ? 1 : 0;

  // Weighted average
  const score =
    titleSim * 0.4 +
    locationSim * 0.3 +
    typeMatch * 0.1 +
    ageOverlap * 0.1 +
    dateOverlap * 0.05 +
    organizerMatch * -0.1;

  return Math.max(0, Math.min(1, score)); // Clamp to 0-1
}
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Required**: Must have valid token
- **Admin Role Required**: Only admins

### 6.2 Walidacja Parametrów

```typescript
const duplicatesQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  min_score: z.number().min(0).max(1).default(0.75),
  sort: z.enum(['score', 'date', 'organizer']).default('score'),
  organizer_id: z.string().uuid().optional(),
  status: z.enum(['all', 'pending', 'published']).default('all'),
});
```

### 6.3 Performance & Caching

- **Expensive operation**: Store results in Redis (5 min TTL)
- **Limit scope**: Only check recent 500 offers (not all-time)
- **Rate limiting**: Max 5 requests/min per admin

---

## 7. Obsługa błędów

| Scenariusz        | Status | Error Code         | Message                 |
| ----------------- | ------ | ------------------ | ----------------------- |
| Pobrano           | 200    | -                  | Success                 |
| Invalid min_score | 400    | `VALIDATION_ERROR` | "min_score must be 0-1" |
| Brak JWT          | 401    | `AUTH_ERROR`       | "Unauthorized"          |
| Not admin         | 403    | `AUTH_ERROR`       | "Forbidden"             |
| Database error    | 500    | `DATABASE_ERROR`   | "Internal error"        |

---

## 8. Wydajność

### 8.1 Algorytm

- **O(n²) complexity**: n = number of offers to check
- **Optimizations**:
  - Only check recent offers (last 500)
  - Cache results (5 min)
  - Invalidate on new submission
  - Prune pairs with score < threshold

### 8.2 Response Time

- **P50**: < 300ms (cached)
- **P95**: < 600ms
- **P99**: < 2000ms (fresh calculation)

---

## 9. Etapy wdrażania

### Faza 1: Similarity Algorithms

- Levenshtein distance
- Haversine distance
- Overlap calculations
- Unit tests

### Faza 2: Service Layer

- Duplicate detection logic
- Scoring function
- Caching (Redis)
- Integration tests

### Faza 3: Controller/Route

- Route registered
- Parameter validation
- Response mapping

### Faza 4: Admin Console

- Display duplicate groups
- Show similarity scores
- Action buttons (merge, dismiss, reject one)

### Faza 5: Performance Testing

- Load tests
- Cache effectiveness
- Query optimization

### Faza 6: Deployment

- Staging
- Production

---

## Checklist

- [ ] Levenshtein distance implemented
- [ ] Haversine distance implemented
- [ ] Similarity scoring
- [ ] Clustering logic
- [ ] Redis caching
- [ ] Service layer
- [ ] Controller/route
- [ ] Parameter validation
- [ ] Admin authorization
- [ ] E2E tests
- [ ] Performance tests
- [ ] Caching effectiveness verified
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **Threshold tuning**: min_score=0.75 is sweet spot (75% + all match types)
- **False positives**: Some legitimate similar offerings exist
- **Admin judgment**: Duplicates = not automatically deleted, flagged for review
- **Action items**: Endpoint doesn't delete - just flags for admin decision
- **Background job**: Could run duplicate detection nightly, cache results
- **Machine learning**: Future: Could use ML for better similarity scoring
