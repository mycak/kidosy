# API Endpoint Implementation Plan: GET /dictionaries/locations

## 1. Przegląd punktu końcowego

Endpoint **GET /dictionaries/locations** zwraca listę dostępnych lokalizacji dla ofert. Lokalizacje to miasta, dzielnice lub regiony gdzie mogą się odbywać zajęcia. Endpoint obsługuje geolokalizację, wyszukiwanie, i może być cachowany.

Proces pobierania:

1. Walidacja query parameters (opcjonalne - search, latitude, longitude, radius)
2. Pobranie lokalizacji z bazy lub cache
3. Filtrowanie/sortowanie jeśli potrzeba
4. Zwrócenie listy lokalizacji

Endpoint obsługuje:

- Non-authenticated access (public data)
- Text search
- Geolocation-based search (latitude/longitude + radius)
- Distance calculation using PostGIS
- Caching

Odpowiedź zawiera array lokalizacji z współrzędnymi i metadanymi.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/dictionaries/locations?search=Warszawa&latitude=52.2297&longitude=21.0122&radius=50
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `search` (string, min 2) - Szukaj po nazwie lokalizacji
- `latitude` (number) - Szerokość geograficzna do geowyszukiwania
- `longitude` (number) - Długość geograficzna do geowyszukiwania
- `radius` (number, default: 50, max: 500) - Promień w km dla geowyszukiwania
- `limit` (number, default: 20, max: 100) - Limit wyników
- `order_by` (enum, default: 'name') - Sortowanie
  - 'name' - Alfabetycznie
  - 'distance' - Po odległości (wymaga lat/long)

### Request Headers

```
Content-Type: application/json
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/dictionaries/locations?search=Warszawa&limit=20" \
  -H "Content-Type: application/json"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
LocationsResponseDto = {
  locations: Array<LocationDto>;
  total: number;
};

LocationDto = {
  id: string;
  code: string;
  name: string;
  city: string;
  district: string;
  region: string;
  latitude: number;
  longitude: number;
  is_active: boolean;
  distance_km?: number; // Only if geolocation used
  created_at: string;
  updated_at: string;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK) - Text Search

```json
{
  "locations": [
    {
      "id": "loc-550e8400-e29b-41d4-a716-446655440000",
      "code": "warsaw_center",
      "name": "Warszawa - Centrum",
      "city": "Warszawa",
      "district": "Śródmieście",
      "region": "Mazowieckie",
      "latitude": 52.2297,
      "longitude": 21.0122,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "loc-550e8400-e29b-41d4-a716-446655440001",
      "code": "warsaw_west",
      "name": "Warszawa - Zachodnia",
      "city": "Warszawa",
      "district": "Włochy",
      "region": "Mazowieckie",
      "latitude": 52.1885,
      "longitude": 20.9289,
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 2
}
```

### Odpowiedź sukcesu (200 OK) - Geolocation Search

```json
{
  "locations": [
    {
      "id": "loc-550e8400-e29b-41d4-a716-446655440000",
      "code": "warsaw_center",
      "name": "Warszawa - Centrum",
      "city": "Warszawa",
      "district": "Śródmieście",
      "region": "Mazowieckie",
      "latitude": 52.2297,
      "longitude": 21.0122,
      "is_active": true,
      "distance_km": 0.5,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "loc-550e8400-e29b-41d4-a716-446655440001",
      "code": "warsaw_west",
      "name": "Warszawa - Zachodnia",
      "city": "Warszawa",
      "district": "Włochy",
      "region": "Mazowieckie",
      "latitude": 52.1885,
      "longitude": 20.9289,
      "is_active": true,
      "distance_km": 5.2,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 2
}
```

### Kody statusu odpowiedzi

- **200 OK** - Lokalizacje pomyślnie pobrane
- **400 Bad Request** - Nieprawidłowe query parameters
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /dictionaries/locations                │
│    Query params: search, latitude, longitude, radius        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja Query Parameters (Zod)                         │
│    - search: optional string (min 2)                         │
│    - latitude: optional number (-90 to 90)                   │
│    - longitude: optional number (-180 to 180)                │
│    - radius: optional number (max 500)                       │
│    - limit: optional number (max 100)                        │
│    - order_by: optional enum                                 │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Sprawdzenie Cache (Redis)                                │
│    - Key based on query params: locations:${hash}           │
│    - If found: Return cached response (skip to step 8)       │
│    - Cache TTL: 7200 seconds (2 hours)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Budowanie Query w zależności od parametrów               │
│                                                               │
│    a) Text Search (search != null):                          │
│       - SELECT * FROM locations                             │
│       - WHERE name ILIKE '%search%'                          │
│       - OR city ILIKE '%search%'                             │
│       - WHERE is_active = true                               │
│       - ORDER BY name ASC                                    │
│                                                               │
│    b) Geolocation Search (lat + long provided):              │
│       - SELECT *,                                            │
│       - ST_Distance(                                         │
│         point,                                               │
│         ST_Point(longitude, latitude)                        │
│       ) / 1000 AS distance_km                                │
│       - WHERE is_active = true                               │
│       - AND ST_DWithin(                                      │
│         point,                                               │
│         ST_Point(longitude, latitude),                       │
│         radius * 1000                                        │
│       )                                                      │
│       - ORDER BY distance_km ASC                             │
│                                                               │
│    c) Default (no filters):                                  │
│       - SELECT * FROM locations                             │
│       - WHERE is_active = true                               │
│       - ORDER BY name ASC                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Pobranie z bazy (Query z kroku 4)                         │
│    - Execute SQL query                                       │
│    - LIMIT + offset jeśli potrzeba                           │
│    - Total count (separate query)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Mapowanie na LocationDto                                  │
│    - Include all fields                                      │
│    - Include distance_km jeśli geolocation                   │
│    - Format timestamps as ISO 8601                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Cache odpowiedzi (async)                                  │
│    - SET locations:${hash} (hash based na params)            │
│    - TTL: 7200 seconds (2 hours)                             │
│    - Don't block response                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: LocationsResponseDto                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Public Data

- No authentication required
- Safe to return all locations

### 6.2 Validacja

```typescript
const locationsQuerySchema = z.object({
  search: z.string().min(2).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radius: z.number().min(1).max(500).default(50).optional(),
  limit: z.number().min(1).max(100).default(20).optional(),
  order_by: z.enum(['name', 'distance']).default('name').optional(),
});
```

### 6.3 Koordynaty geograficzne

- Both latitude AND longitude required for geosearch
- Validate that both are provided together
- Return error if only one provided

---

## 7. Obsługa błędów

| Scenariusz        | Status | Error Code         | Message                                |
| ----------------- | ------ | ------------------ | -------------------------------------- |
| Pobrano           | 200    | -                  | Success                                |
| Invalid search    | 400    | `VALIDATION_ERROR` | "Search must be at least 2 chars"      |
| Invalid coords    | 400    | `VALIDATION_ERROR` | "Invalid coordinates"                  |
| Only lat, no long | 400    | `VALIDATION_ERROR` | "Both latitude and longitude required" |
| Invalid radius    | 400    | `VALIDATION_ERROR` | "Radius must be 1-500 km"              |
| Database error    | 500    | `DATABASE_ERROR`   | "Internal error"                       |

---

## 8. Wydajność

### 8.1 Indeksowanie

```sql
CREATE INDEX idx_locations_name ON locations USING GIN(name gin_trgm_ops);
CREATE INDEX idx_locations_city ON locations USING GIN(city gin_trgm_ops);
CREATE INDEX idx_locations_point ON locations USING GIST(point);
CREATE INDEX idx_locations_active ON locations(is_active);
```

### 8.2 PostGIS

- Use `point` geometry type with GIST index
- ST_DWithin for radius search (uses index)
- ST_Distance for distance calculation

### 8.3 Caching

- **Time-To-Live**: 7200 seconds (2 hours)
- **Cache key**: Hash of all query params
- **Invalidation**: On location update

### 8.4 Response Time

- **P50 (text search)**: < 100ms
- **P95 (text search)**: < 250ms
- **P50 (geolocation)**: < 300ms (PostGIS calculation)
- **P95 (geolocation)**: < 600ms
- **P50 (from cache)**: < 50ms

---

## 9. Etapy wdrażania

### Faza 1: Schema & PostGIS

- Verify locations table
- Setup `point` geometry column
- Enable PostGIS extension

### Faza 2: Indexes

- Create GIN indexes for text search
- Create GIST index for geometry

### Faza 3: Service Layer

- getLocations() method
- Text search logic
- Geolocation logic
- Distance calculation

### Faza 4: Controller/Route

- GET /dictionaries/locations

### Faza 5: Caching

- Redis setup with query param hashing
- Cache invalidation strategy

### Faza 6: Response Formatting

- Map to DTO
- Include distance_km conditionally

### Faza 7: Testing

- Text search
- Geolocation search
- Distance calculation accuracy
- Cache working
- Boundary conditions (0 results, 100+ results)

### Faza 8: Deployment

- Staging
- Production
- PostGIS verification

---

## Checklist

- [ ] PostGIS enabled
- [ ] Schema with geometry column
- [ ] Indexes created (GIN, GIST)
- [ ] Service layer (text + geo search)
- [ ] Distance calculation
- [ ] Controller/route
- [ ] Redis caching with hashing
- [ ] Response formatting
- [ ] Query validation
- [ ] Tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **PostGIS Required**: For geospatial queries
- **GIST Index**: Critical for performance on geometry
- **GIN Index**: For text search (ILIKE)
- **Caching**: Cache binary on query params hash
- **Both coordinates required**: No partial geolocation
- **Distance optional**: Only in geolocation response
- **Radius in km**: Convert to meters for PostGIS ST_DWithin
