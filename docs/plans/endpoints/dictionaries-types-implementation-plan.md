# API Endpoint Implementation Plan: GET /dictionaries/types

## 1. Przegląd punktu końcowego

Endpoint **GET /dictionaries/types** zwraca listę dostępnych typów zajęć/ofert. Typy określają formę zajęć: warsztaty, kursy, obozy, spotkania, wyjazdy, itp. Endpoint zwraca pełną listę z metadanymi, może być cachowany agresywnie.

Proces pobierania:

1. Walidacja query parameters (opcjonalne - language, category_id)
2. Pobranie typów z bazy lub cache
3. Fil­trowanie po kategorii jeśli potrzeba
4. Zwrócenie listy typów

Endpoint obsługuje:

- Non-authenticated access (public data)
- Language-specific names
- Filtration by category
- Aggressive caching (1 hour TTL)
- Metadata (icon, description, features)

Odpowiedź zawiera array typów z pełnymi detalami.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/dictionaries/types?language=pl&category_id=cat-123
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `language` (enum, default: 'pl') - Język odpowiedzi
  - 'pl', 'en', 'de'
- `category_id` (string, UUID) - Filtruj po kategorii
- `include_inactive` (boolean, default: false) - Include nieaktywne typy

### Request Headers

```
Content-Type: application/json
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/dictionaries/types?language=pl" \
  -H "Content-Type: application/json"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
TypesResponseDto = {
  types: Array<TypeDto>;
  total: number;
};

TypeDto = {
  id: string;
  code: string;
  name: string;
  description: string;
  category_id: string;
  icon_url: string;
  color: HexColor;
  features: Array<string>;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

type HexColor = string; // e.g., "#FF5733"
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "types": [
    {
      "id": "type-550e8400-e29b-41d4-a716-446655440000",
      "code": "workshop",
      "name": "Warsztat",
      "description": "Zajęcia praktyczne z umiejętnościami",
      "category_id": "cat-550e8400-e29b-41d4-a716-446655440000",
      "icon_url": "https://cdn.kidosy.pl/icons/workshop.svg",
      "color": "#00AACC",
      "features": ["hands_on", "small_groups", "project_based"],
      "is_active": true,
      "display_order": 1,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "type-550e8400-e29b-41d4-a716-446655440001",
      "code": "course",
      "name": "Kurs",
      "description": "Systematyczne, wielotygodniowe zajęcia",
      "category_id": "cat-550e8400-e29b-41d4-a716-446655440000",
      "icon_url": "https://cdn.kidosy.pl/icons/course.svg",
      "color": "#0066FF",
      "features": ["structured", "long_term", "certification"],
      "is_active": true,
      "display_order": 2,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "type-550e8400-e29b-41d4-a716-446655440002",
      "code": "camp",
      "name": "Obóz",
      "description": "Intensywne zajęcia dzień w dzień",
      "category_id": "cat-550e8400-e29b-41d4-a716-446655440001",
      "icon_url": "https://cdn.kidosy.pl/icons/camp.svg",
      "color": "#FF9900",
      "features": ["full_day", "intensive", "social"],
      "is_active": true,
      "display_order": 3,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "type-550e8400-e29b-41d4-a716-446655440003",
      "code": "trip",
      "name": "Wyjazd",
      "description": "Zajęcia z wyjazdem poza miasto",
      "category_id": "cat-550e8400-e29b-41d4-a716-446655440001",
      "icon_url": "https://cdn.kidosy.pl/icons/trip.svg",
      "color": "#33CC66",
      "features": ["outdoor", "travel", "adventure"],
      "is_active": true,
      "display_order": 4,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 4
}
```

### Kody statusu odpowiedzi

- **200 OK** - Typy pomyślnie pobrane
- **400 Bad Request** - Nieprawidłowe query parameters
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /dictionaries/types                    │
│    Query params: language, category_id, include_inactive    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja Query Parameters (Zod)                         │
│    - language: valid enum                                    │
│    - category_id: valid UUID (optional)                      │
│    - include_inactive: boolean                               │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Sprawdzenie Cache (Redis)                                │
│    - Key: types:${language}:${category_id}:${include_inactive}
│    - If found: Return cached response (skip to step 8)       │
│    - Cache TTL: 3600 seconds (1 hour)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie typów z bazy                                     │
│    - SELECT * FROM types                                    │
│    - WHERE is_active = true                                  │
│    - If include_inactive: fetch all                          │
│    - If category_id: filter WHERE category_id = ...         │
│    - ORDER BY display_order ASC                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Translacja nazw (jeśli potrzeba)                          │
│    - SELECT * FROM type_translations                        │
│    - WHERE language = requested_language                     │
│    - Merge z base data                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Mapowanie na TypeDto                                      │
│    - Include all fields including features                   │
│    - Format timestamps as ISO 8601                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Cache odpowiedzi (async)                                  │
│    - SET types:${language}:${category_id}:${include_inactive}
│    - TTL: 3600 seconds                                       │
│    - Don't block response                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: TypesResponseDto                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Public Data

- No authentication required
- Safe to return all types

### 6.2 Validacja

```typescript
const typesQuerySchema = z.object({
  language: z.enum(['pl', 'en', 'de']).default('pl'),
  category_id: z.string().uuid().optional(),
  include_inactive: z.boolean().default(false).optional(),
});
```

---

## 7. Obsługa błędów

| Scenariusz          | Status | Error Code         | Message            |
| ------------------- | ------ | ------------------ | ------------------ |
| Pobrano             | 200    | -                  | Success            |
| Invalid language    | 400    | `VALIDATION_ERROR` | "Invalid language" |
| Invalid category_id | 400    | `VALIDATION_ERROR` | "Invalid UUID"     |
| Database error      | 500    | `DATABASE_ERROR`   | "Internal error"   |

---

## 8. Wydajność

### 8.1 Caching

- **Time-To-Live**: 3600 seconds (1 hour)
- **Cache key**: `types:${language}:${category_id}:${include_inactive}`
- **Invalidation**: On type update

### 8.2 Response Time

- **P50**: < 50ms (from cache)
- **P95**: < 150ms (from cache)
- **P99**: < 300ms (from cache)

---

## 9. Etapy wdrażania

### Faza 1: Schema

- Verify types table
- Verify type_translations table
- Features array handling

### Faza 2: Service Layer

- getTypes() method
- Category filtering
- Translation handling

### Faza 3: Controller/Route

- GET /dictionaries/types

### Faza 4: Caching

- Redis setup
- Cache invalidation

### Faza 5: Response Formatting

- Map to DTO
- Include features array

### Faza 6: Testing

- Retrieve all
- Filter by category
- Filter by language
- Cache working

### Faza 7: Deployment

- Staging
- Production
- Cache pre-warming

---

## Checklist

- [ ] Schema verified
- [ ] Service layer
- [ ] Controller/route
- [ ] Redis caching
- [ ] Category filtering
- [ ] Response formatting
- [ ] Query validation
- [ ] Tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **No authentication**: Public endpoint
- **Caching critical**: High-traffic endpoint
- **Features array**: Used by frontend for filtering
- **Category filtering**: Optional but useful
- **Display order**: UI ordering control
