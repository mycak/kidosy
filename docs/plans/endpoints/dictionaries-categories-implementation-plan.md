# API Endpoint Implementation Plan: GET /dictionaries/categories

## 1. Przegląd punktu końcowego

Endpoint **GET /dictionaries/categories** zwraca listę wszystkich dostępnych kategorii dla ofert. To są typy zajęć/warsztatów: programowanie, sporty, sztuka, języki, nauki, itp. Endpoint zwraca pełną listę z metadanymi dla każdej kategorii, może być cachowany agresywnie ponieważ dane się nie zmieniają często.

Proces pobierania:

1. Walidacja query parameters (opcjonalne - language, include_inactive)
2. Pobranie kategorii z bazy lub cache
3. Filtrowanie jeśli potrzeba
4. Zwrócenie listy kategorii

Endpoint obsługuje:

- Non-authenticated access (public data)
- Language-specific names (pl, en, de, etc.)
- Filtration (active/inactive)
- Aggressive caching (1 hour TTL)
- Metadata (icon, color, description)

Odpowiedź zawiera array kategorii z pełnymi detalami.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/dictionaries/categories?language=pl&include_inactive=false
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `language` (enum, default: 'pl') - Język odpowiedzi
  - 'pl' - Polish
  - 'en' - English
  - 'de' - German
- `include_inactive` (boolean, default: false) - Include nieaktywne kategorie

### Request Headers

```
Accept-Language: pl (optional)
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/dictionaries/categories?language=pl" \
  -H "Content-Type: application/json"
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
CategoriesResponseDto = {
  categories: Array<CategoryDto>;
  total: number;
};

CategoryDto = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon_url: string;
  color: HexColor;
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
  "categories": [
    {
      "id": "cat-550e8400-e29b-41d4-a716-446655440000",
      "code": "programming",
      "name": "Programowanie",
      "description": "Kursy i warsztaty programowania dla dzieci",
      "icon_url": "https://cdn.kidosy.pl/icons/programming.svg",
      "color": "#0066CC",
      "is_active": true,
      "display_order": 1,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "cat-550e8400-e29b-41d4-a716-446655440001",
      "code": "sports",
      "name": "Sporty",
      "description": "Zajęcia sportowe i rekreacyjne",
      "icon_url": "https://cdn.kidosy.pl/icons/sports.svg",
      "color": "#FF6B6B",
      "is_active": true,
      "display_order": 2,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "cat-550e8400-e29b-41d4-a716-446655440002",
      "code": "arts",
      "name": "Sztuka",
      "description": "Zajęcia artystyczne i kreatywne",
      "icon_url": "https://cdn.kidosy.pl/icons/arts.svg",
      "color": "#FF9933",
      "is_active": true,
      "display_order": 3,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "cat-550e8400-e29b-41d4-a716-446655440003",
      "code": "languages",
      "name": "Języki",
      "description": "Kursy nauki języków obcych",
      "icon_url": "https://cdn.kidosy.pl/icons/languages.svg",
      "color": "#00CC66",
      "is_active": true,
      "display_order": 4,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "cat-550e8400-e29b-41d4-a716-446655440004",
      "code": "sciences",
      "name": "Nauki",
      "description": "Zajęcia z nauk ścisłych i humanistycznych",
      "icon_url": "https://cdn.kidosy.pl/icons/sciences.svg",
      "color": "#9933CC",
      "is_active": true,
      "display_order": 5,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 5
}
```

### Kody statusu odpowiedzi

- **200 OK** - Kategorie pomyślnie pobrane
- **400 Bad Request** - Nieprawidłowe query parameters
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /dictionaries/categories               │
│    Query params: language, include_inactive                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja Query Parameters (Zod)                         │
│    - language: valid enum                                    │
│    - include_inactive: boolean                               │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Sprawdzenie Cache (Redis)                                │
│    - Key: categories:${language}:${include_inactive}        │
│    - If found: Return cached response (skip to step 8)       │
│    - Cache TTL: 3600 seconds (1 hour)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie kategorii z bazy                                 │
│    - SELECT * FROM categories                               │
│    - WHERE is_active = true                                  │
│    - If include_inactive: fetch all                          │
│    - ORDER BY display_order ASC                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Translacja nazw (jeśli potrzeba)                          │
│    - SELECT * FROM category_translations                    │
│    - WHERE language = requested_language                     │
│    - Merge z base data                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Mapowanie na CategoryDto                                  │
│    - Include all fields                                      │
│    - Format timestamps as ISO 8601                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Cache odpowiedzi (async)                                  │
│    - SET categories:${language}:${include_inactive}          │
│    - TTL: 3600 seconds                                       │
│    - Don't block response                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: CategoriesResponseDto                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Public Data

- No authentication required
- Safe to return all categories

### 6.2 Validacja

```typescript
const categoriesQuerySchema = z.object({
  language: z.enum(['pl', 'en', 'de']).default('pl'),
  include_inactive: z.boolean().default(false).optional(),
});
```

---

## 7. Obsługa błędów

| Scenariusz       | Status | Error Code         | Message            |
| ---------------- | ------ | ------------------ | ------------------ |
| Pobrano          | 200    | -                  | Success            |
| Invalid language | 400    | `VALIDATION_ERROR` | "Invalid language" |
| Database error   | 500    | `DATABASE_ERROR`   | "Internal error"   |

---

## 8. Wydajność

### 8.1 Caching

- **Time-To-Live**: 3600 seconds (1 hour)
- **Cache key**: `categories:${language}:${include_inactive}`
- **Invalidation**: On category update (via message queue)

### 8.2 Response Time

- **P50**: < 50ms (from cache)
- **P95**: < 150ms (from cache)
- **P99**: < 300ms (from cache)
- **P50 (cache miss)**: < 300ms
- **P95 (cache miss)**: < 500ms

---

## 9. Etapy wdrażania

### Faza 1: Schema

- Verify categories table
- Verify translations table (if using)

### Faza 2: Service Layer

- getCategories() method
- Translation handling

### Faza 3: Controller/Route

- GET /dictionaries/categories

### Faza 4: Caching

- Redis setup
- Cache invalidation

### Faza 5: Response Formatting

- Map to DTO
- Format timestamps

### Faza 6: Testing

- Retrieve all
- Filter by language
- Filter by active status
- Cache working

### Faza 7: Deployment

- Staging
- Production
- Pre-warm cache

---

## Checklist

- [ ] Schema verified
- [ ] Service layer
- [ ] Controller/route
- [ ] Redis caching
- [ ] Response formatting
- [ ] Query validation
- [ ] Tests
- [ ] Documentation
- [ ] Production deployed
- [ ] Cache pre-warmed

---

## Notes

- **No authentication**: Public endpoint
- **Caching critical**: High-traffic endpoint
- **Translations**: Support multiple languages
- **Display order**: Control UI order
- **Icons/Colors**: Frontend uses for styling
