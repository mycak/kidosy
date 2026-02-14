# API Endpoint Implementation Plan: GET /organizer/leads

## 1. Przegląd punktu końcowego

Endpoint **GET /organizer/leads** zwraca listę leadów (potencjalnych uczestników) dla zalogowanego organizatora. Organizator może przeglądać wszystkich rodziców/opiekunów którzy wyrazili zainteresowanie jego ofertami, z możliwością filtrowania, sortowania i wyszukiwania.

Proces pobierania:

1. Walidacja autentykacji (organizator only)
2. Parsowanie query parameters (pagination, sorting, filtering)
3. Pobranie leadów dla użytkownika
4. Zwrócenie listy leadów z metadata

Endpoint obsługuje:

- Organizer-only authorization (RLS policy)
- Pagination (page, limit)
- Sorting (by status, created_at, offer_name, parent_name)
- Filtering (by status, offer_id, date range)
- Search w email/name parenta
- Status tracking (new, contacted, converted, rejected)

Odpowiedź zawiera array leadów z informacjami o rodzinie i dzieciach.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/organizer/leads?page=1&limit=20&status=new&sort=created_at&order=desc
```

### Parametry

**Query Parameters (wszystkie opcjonalne):**

- `page` (number, default: 1) - Numer strony
- `limit` (number, default: 20, max: 100) - Elementy na stronę
- `status` (enum) - Filtruj po statusie
  - `all` - Wszystkie
  - `new` - Nowe (default)
  - `contacted` - Skontaktowani
  - `converted` - Zakonwertowani
  - `rejected` - Odrzuceni
- `offer_id` (string, UUID) - Filtruj po ofercie
- `sort` (enum, default: created_at) - Sortowanie
  - `created_at` - Data zgłoszenia
  - `offer_name` - Nazwa oferty
  - `parent_name` - Imię rodzica
  - `status` - Status leada
- `order` (enum, default: desc) - Kierunek
- `search` (string, min 2) - Szukaj w email/name
- `date_from` (string, ISO) - Filtruj od daty
- `date_to` (string, ISO) - Filtruj do daty

### Request Headers

```
Authorization: Bearer <access_token>
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/organizer/leads?page=1&limit=20&status=new&search=john" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Lista leadów
OrganizerLeadsResponseDto = {
  data: Array<LeadDetailDto>;
  pagination: PaginationMetaDto;
  summary: LeadSummaryStatsDto;
};

LeadDetailDto = {
  id: string;
  offer_id: string;
  offer_name: string;
  parent_email: string;
  parent_name: string;
  parent_phone: string;
  contact_preference: ContactPreference;
  children: Array<LeadChildDto>;
  additional_message: string;
  status: LeadStatus;
  status_updated_at: string;
  created_at: string;
  notes: string; // Internal notes by organizer
};

LeadChildDto = {
  id: string;
  name: string;
  age: number;
  interests: Array<string>;
};

LeadSummaryStatsDto = {
  total_leads: number;
  new_leads: number;
  contacted_leads: number;
  converted_leads: number;
  conversion_rate: number; // converted / total
};

type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected' | 'archived';
type ContactPreference = 'email' | 'phone' | 'sms';

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
      "id": "lead-550e8400-e29b-41d4-a716-446655440000",
      "offer_id": "offer-550e8400",
      "offer_name": "Summer Python Workshop",
      "parent_email": "parent@example.com",
      "parent_name": "Jan Kowalski",
      "parent_phone": "+48123456789",
      "contact_preference": "email",
      "children": [
        {
          "id": "child-123",
          "name": "Anna Kowalska",
          "age": 10,
          "interests": ["programming"]
        }
      ],
      "additional_message": "Bardzo zainteresowani workshops em",
      "status": "new",
      "status_updated_at": "2026-02-07T16:30:00Z",
      "created_at": "2026-02-07T16:30:00Z",
      "notes": ""
    },
    {
      "id": "lead-550e8400-e29b-41d4-a716-446655440001",
      "offer_id": "offer-550e8400",
      "offer_name": "Summer Python Workshop",
      "parent_email": "maria@example.com",
      "parent_name": "Maria Nowak",
      "parent_phone": "+48987654321",
      "contact_preference": "phone",
      "children": [
        {
          "id": "child-456",
          "name": "Tomasz Nowak",
          "age": 11,
          "interests": ["games", "programming"]
        },
        {
          "id": "child-457",
          "name": "Ewa Nowak",
          "age": 9,
          "interests": ["art"]
        }
      ],
      "additional_message": null,
      "status": "contacted",
      "status_updated_at": "2026-02-06T10:15:00Z",
      "created_at": "2026-02-05T14:20:00Z",
      "notes": "Zadzwonił em, zainteresowani, czeka na odpowiedź"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3,
    "has_next": true,
    "has_previous": false
  },
  "summary": {
    "total_leads": 45,
    "new_leads": 15,
    "contacted_leads": 20,
    "converted_leads": 8,
    "conversion_rate": 0.178
  }
}
```

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /organizer/leads?...                   │
│    Headers: Authorization: Bearer <token>                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Extract JWT + Verify Organizer Role                      │
│    - Check role === 'organizer'                              │
│    - Extract user_id (organizer_id)                          │
│    - Return 401/403 jeśli unauthorized                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Parsowanie Query Parameters (Zod)                        │
│    - Validate page, limit, status, sort, order              │
│    - Validate date range jeśli provided                      │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Budowanie Query Parametrów                               │
│    - offset = (page - 1) * limit                             │
│    - Filters: organizer_id = userId                          │
│    - status filter                                           │
│    - offer_id filter                                         │
│    - date range filter                                       │
│    - search filter (email/name ILIKE)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Queryowanie bazy danych                                   │
│    - SELECT COUNT(*) dla total                              │
│    - SELECT * FROM leads WHERE filters ORDER BY...          │
│    - Include: children, offer info                           │
│    - LIMIT + OFFSET dla pagination                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Obliczanie Summary Statistics                             │
│    - Count leads per status (cached query)                   │
│    - Calculate conversion rate                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Mapowanie na LeadDetailDto                               │
│    - Extract fields z leads + relations                      │
│    - Include children details                                │
│    - Include organizer notes                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: OrganizerLeadsResponseDto                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Required**: Must have valid token
- **Organizer Role Required**: Only own leads (RLS policy)

### 6.2 Walidacja

```typescript
const organizerLeadsQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  status: z
    .enum(['all', 'new', 'contacted', 'converted', 'rejected'])
    .default('all'),
  sort: z
    .enum(['created_at', 'offer_name', 'parent_name', 'status'])
    .default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().min(2).optional(),
  offer_id: z.string().uuid().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
});
```

### 6.3 RLS Policy

```sql
CREATE POLICY "Organizers can view their own leads"
  ON leads
  FOR SELECT
  USING (
    offer_id IN (
      SELECT id FROM offers
      WHERE organizer_id = auth.uid()
    )
  );
```

---

## 7. Obsługa błędów

| Scenariusz     | Status | Error Code         | Message             |
| -------------- | ------ | ------------------ | ------------------- |
| Pobrano        | 200    | -                  | Success             |
| Invalid page   | 400    | `VALIDATION_ERROR` | "Page must be >= 1" |
| Brak JWT       | 401    | `AUTH_ERROR`       | "Unauthorized"      |
| Not organizer  | 403    | `AUTH_ERROR`       | "Forbidden"         |
| Database error | 500    | `DATABASE_ERROR`   | "Internal error"    |

---

## 8. Wydajność

### 8.1 Indeksowanie

```sql
CREATE INDEX idx_leads_organizer ON leads(organizer_id, created_at DESC);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_search ON leads(parent_email, parent_name);
```

### 8.2 Caching

- **Summary statistics**: Cache for 5 minutes
- **Query results**: Don't cache (real-time data)

### 8.3 Response Time

- **P50**: < 300ms
- **P95**: < 600ms
- **P99**: < 1200ms

---

## 9. Etapy wdrażania

### Faza 1: Schema & Indexes

- Verify leads table structure
- Create indexes

### Faza 2: Query Building

- RLS policy validation
- Filtering logic
- Sorting logic

### Faza 3: Service Layer

- Query building
- Integration tests

### Faza 4: Controller/Route

- Route registered
- Parameter validation

### Faza 5: Frontend Integration

- Organizer console
- Lead list display
- Pagination/filtering

### Faza 6: E2E Testing

- List own leads only
- Filtering works
- Search works
- Pagination works

### Faza 7: Performance Testing

- Load tests
- Query optimization

### Faza 8: Deployment

- Staging
- Production

---

## Checklist

- [ ] RLS policy configured
- [ ] Indexes created
- [ ] Query parameter validation
- [ ] Service layer (query building)
- [ ] Controller/route
- [ ] Sorting all fields
- [ ] Filtering all fields
- [ ] Search functionality
- [ ] Summary statistics
- [ ] E2E tests
- [ ] Performance tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **RLS Policy**: Critical - Organizer can only see own leads
- **Performance**: Use indexes on organizer_id, status, created_at
- **Real-time**: Don't cache query results
- **Summary statistics**: CAN be cached (5 min is fine)
- **Search**: Use ILIKE for email/name
