# API Endpoint Implementation Plan: PATCH /offers/{offerId}

## 1. Przegląd punktu końcowego

Endpoint **PATCH /offers/{offerId}** pozwala na aktualizację istniejącej oferty zajęć. Endpoint obsługuje:

- **Organizator (właściciel)**: Może aktualizować swoją ofertę (niezależnie od statusu: draft, pending_review, published, rejected)
- **Admin**: Może aktualizować dowolną ofertę

Endpoint wspiera aktualizację częściową - można zaktualizować dowolny podzbiór pól. Jeśli oferta jest już published, zmiany są rejestrowane w historii statusu, ale sama zmiana nie zmienia statusu oferty. Organizator musi przesłać ofertę ponownie do moderacji.

Odpowiedź zawiera zaktualizowane dane podstawowe oferty.

---

## 2. Szczegóły żądania

### Metoda HTTP

**PATCH**

### Struktura URL

```
PATCH /api/v1/offers/{offerId}
```

### Parametry

**Wymagane (Path Parameters):**

- `offerId` (uuid) - Unikalny identyfikator oferty do aktualizacji

**Brak Query Parameters**

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body (UpdateOfferDto - wszystkie pola opcjonalne)

```json
{
  "title": "Kurs programowania 2026 - Advanced",
  "description": "Zaawansowany kurs programowania w Python i JavaScript...",
  "offer_type_id": "uuid-of-weekly-classes",
  "ages": [11, 12, 13, 14, 15],
  "address": "ul. Puławska 456, 02-595 Warszawa",
  "location": {
    "latitude": 52.05,
    "longitude": 21.02
  },
  "start_date": "2026-04-01",
  "end_date": "2026-07-30",
  "available_spots": 25,
  "category_ids": ["uuid-of-educational", "uuid-of-tech"]
}
```

### Wymagane pola

- Brak - wszystkie pola są opcjonalne (partial update)

### Opcjonalne pola

- `title` (string) - nazwa oferty
- `description` (string) - szczegółowy opis
- `offer_type_id` (uuid) - ID typu oferty
- `ages` (integer array) - tablica lat
- `address` (string) - pełny adres tekstowy
- `location` (object) - `{ latitude: number, longitude: number }`
- `start_date` (date: YYYY-MM-DD) - data rozpoczęcia
- `end_date` (date: YYYY-MM-DD) - data zakończenia
- `available_spots` (integer) - liczba dostępnych miejsc
- `category_ids` (uuid array) - IDs kategorii (jeśli dostarczone, zastępuje istniejące)

**Uwaga:** `category_ids`, jeśli dostarczone, zastępuje wszystkie istniejące kategorie (nie dodaje, ale zamienia)

### Przykład żądania

```bash
# Aktualizacja tylko tytułu
curl -X PATCH "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Kurs programowania 2026 - Advanced"
  }'

# Aktualizacja wielu pól
curl -X PATCH "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nowa nazwa kursu",
    "description": "Nowy opis...",
    "available_spots": 30,
    "category_ids": ["uuid-1", "uuid-2"]
  }'

# Admin aktualizuje ofertę innego organizatora
curl -X PATCH "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "available_spots": 15,
    "address": "Nowy adres"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Główny typ żądania - wszystkie pola opcjonalne
UpdateOfferDto = Partial<
  Pick<DbOffer,
    | 'title'
    | 'description'
    | 'offer_type_id'
    | 'ages'
    | 'address'
    | 'start_date'
    | 'end_date'
    | 'available_spots'
  >
> & {
  category_ids?: string[];              // Opcjonalnie - zastępuje istniejące
  location?: LocationInputDto;          // Opcjonalnie
};

// Typ pomocniczy
LocationInputDto = {
  latitude: number;
  longitude: number;
};
```

### DTO Types (Response)

```typescript
// Odpowiedź przy aktualizacji
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

### Odpowiedź sukcesu (200 OK)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Kurs programowania 2026 - Advanced",
  "status": "draft",
  "created_at": "2026-02-05T10:00:00Z",
  "updated_at": "2026-02-07T15:45:30Z"
}
```

### Kody statusu odpowiedzi

- **200 OK** - Oferta pomyślnie zaktualizowana
- **400 Bad Request** - Nieprawidłowe dane wejściowe (błędny format)
- **401 Unauthorized** - Token JWT nieprawidłowy, wygasły lub brakujący
- **403 Forbidden** - Użytkownik nie jest właścicielem oferty (chyba że admin) lub brak dostępu
- **404 Not Found** - Oferta nie istnieje
- **422 Unprocessable Entity** - Dane biznesowe nieprawidłowe (nieistniejące category_id, offer_type_id, złe daty)
- **500 Internal Server Error** - Błąd serwera (błąd bazy)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: PATCH /offers/{offerId}                     │
│    Headers: Authorization: Bearer <JWT>                      │
│    Body: UpdateOfferDto JSON (partial)                       │
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
│ 3. Walidacja parametru path (offerId)                       │
│    - Sprawdzenie czy offerId jest ważnym UUID               │
│    - Return 400 jeśli nieprawidłowy format                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Walidacja schematu (Zod) - partial schema                │
│    - Parse request body jako UpdateOfferDto                 │
│    - Walidacja typów i formatów dla dostarczonech pól       │
│    - Return 400 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Przywołaj OfferService.getOffer(offerId, userId)         │
│    - Pobranie istniejącej oferty                            │
│    - Sprawdzenie czy użytkownik ma dostęp do edycji         │
│    - Return 404 jeśli nie istnieje                          │
│    - Return 403 jeśli nie ma dostępu                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Walidacja biznesowa (dla dostarczonech pól)              │
│    - Jeśli category_ids: sprawdź czy istnieją w DB          │
│    - Jeśli offer_type_id: sprawdź czy istnieje              │
│    - Jeśli dates: sprawdź czy start < end                   │
│    - Jeśli location: sprawdź bounds                         │
│    - Return 422 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Przywołaj OfferService.updateOffer()                     │
│    - Przekaż: offerId, UpdateOfferDto, userId               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Service Logic (OfferService) - Transakcja                │
│                                                               │
│    a) Aktualizacja oferty:                                   │
│       - UPDATE offers SET field=value WHERE id=offerId      │
│       - Tylko dostarczone pola                              │
│       - Ustaw updated_at = CURRENT_TIMESTAMP                │
│                                                               │
│    b) Jeśli category_ids dostarczone:                       │
│       - DELETE FROM offer_categories WHERE offer_id         │
│       - INSERT nowe kategorie (jak przy create)             │
│                                                               │
│    c) Historia zmian (dla published ofert):                 │
│       - INSERT do offer_status_history                      │
│       - old_status = current status                         │
│       - new_status = same as old (bez zmiany statusu)       │
│       - reason = "Oferta została zaktualizowana"            │
│                                                               │
│    d) Obsługa błędów:                                       │
│       - Jeśli error → ROLLBACK transakcji                   │
│       - Return exception                                    │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Mapowanie odpowiedzi                                      │
│    - Mapuj updated offer do OfferMutationResponseDto        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: OfferMutationResponseDto                           │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z bazą danych (Transakcja)

```sql
-- Transakcja begin
BEGIN;

-- 1. Pobierz aktualną ofertę
SELECT * FROM offers WHERE id = $1;

-- 2. Aktualizuj ofertę (tylko dostarczone pola)
UPDATE offers SET
  title = COALESCE($2, title),
  description = COALESCE($3, description),
  offer_type_id = COALESCE($4, offer_type_id),
  ages = COALESCE($5, ages),
  address = COALESCE($6, address),
  location = CASE WHEN $7 IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint($8, $9), 4326)
    ELSE location
  END,
  start_date = COALESCE($10, start_date),
  end_date = COALESCE($11, end_date),
  available_spots = COALESCE($12, available_spots),
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- 3. Jeśli category_ids dostarczone: usuń stare i wstaw nowe
DELETE FROM offer_categories WHERE offer_id = $1;

INSERT INTO offer_categories (id, offer_id, category_id, created_at)
SELECT gen_random_uuid(), $1, category_id, CURRENT_TIMESTAMP
FROM (VALUES ($13), ($14), ...) AS categories(category_id);

-- 4. Jeśli oferta jest published: zaloguj do history
INSERT INTO offer_status_history (
  id, offer_id, old_status, new_status, reason, changed_by, changed_at
) VALUES (
  gen_random_uuid(), $1, (SELECT status FROM offers WHERE id=$1),
  (SELECT status FROM offers WHERE id=$1),
  'Oferta została zaktualizowana', $15, CURRENT_TIMESTAMP
)
WHERE EXISTS (SELECT 1 FROM offers WHERE id=$1 AND status='published');

-- Transakcja commit
COMMIT;
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Token Validation**: Supabase Auth obsługuje walidację
- Token obowiązkowy - brak tokenu → **401 Unauthorized**
- Wygasłe tokeny → **401 Unauthorized**

### 6.2 Autoryzacja

- **Ownership Check**: Organizator może edytować tylko swoją ofertę
  - Jeśli `offer.user_id != auth.uid()` AND user nie jest adminem → **403 Forbidden**
- **Admin bypass**: Admin może edytować dowolną ofertę
- Sprawdzenie na początkowym GET i przed UPDATE

### 6.3 Walidacja danych wejściowych

**Schema walidacja (Zod - partial):**

```typescript
const updateOfferSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().min(10).max(5000).optional(),
    offer_type_id: z.string().uuid().optional(),
    ages: z.array(z.number().int().min(1).max(99)).min(1).optional(),
    address: z.string().min(5).max(500).optional(),
    location: z
      .object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      })
      .optional(),
    start_date: z.string().date().optional(),
    end_date: z.string().date().optional(),
    available_spots: z.number().int().min(1).max(1000).optional(),
    category_ids: z.array(z.string().uuid()).min(1).optional(),
  })
  .strict(); // Dokładnie te pola, nic więcej
```

**Walidacja biznesowa:**

- Jeśli oba `start_date` i `end_date` dostarczone: `start_date < end_date`
- Jeśli tylko jeden z dat: sprawdzić względem drugiego (istniejącego) w DB
- Każdy `category_id` musi istnieć w DB
- `offer_type_id` musi istnieć (jeśli dostarczone)

### 6.4 Ochrona danych

- **Parametryzowane zapytania**: Wszystkie dane przechodzą przez Supabase, brak SQL injection
- **Transakcja**: Atomicity - jeśli jedno UPDATE się nie powiedzie, wszystko się wycofuje
- **Version control**: `updated_at` timestamp dokładnie rejestruje kiedy zmieniono
- **Logging**: Historia zmian dla published ofert

### 6.5 Partial update safety

- **Schema validation**: Zod `.strict()` zabrania dodatkowych pól
- **Null safety**: `COALESCE()` w SQL zapewnia że tylko dostarczone pola są aktualizowane
- **No overwrite**: Jeśli pole nie dostarczone, zachowuj istniejące wartości

### 6.6 Rate Limiting

- Max 100 aktualizacji per organizer per hour
- Max 100 żądań na minutę per IP

### 6.7 Logging i Monitoring

- **Logowanie zmian**: Zarejestruj każdy PATCH (user_id, offer_id, pola, timestamp)
- **Anomalii detektowanie**: Wiele nieudanych 403 z tego samego user_id
- **Sentry**: Error tracking dla 5xx

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                   | Status | Error Code         | Message                                        | Przyczyna               |
| ---------------------------- | ------ | ------------------ | ---------------------------------------------- | ----------------------- |
| Oferta zaktualizowana        | 200    | -                  | -                                              | Success                 |
| Body puste lub {}            | 200    | -                  | -                                              | Success (nic do zmiany) |
| offerId nie jest UUID        | 400    | `VALIDATION_ERROR` | "Invalid offer ID format"                      | Nieprawidłowy format    |
| Nieprawidłowy typ pola       | 400    | `VALIDATION_ERROR` | "title must be string"                         | Wrong type              |
| title puste                  | 400    | `VALIDATION_ERROR` | "title must be 1-255 chars"                    | Invalid length          |
| location.latitude poza range | 400    | `VALIDATION_ERROR` | "latitude must be -90 to 90"                   | Invalid coordinate      |
| start_date >= end_date       | 400    | `VALIDATION_ERROR` | "start_date must be before end_date"           | Invalid range           |
| Nieznane pole w body         | 400    | `VALIDATION_ERROR` | "Unknown field: xyz"                           | Extra field             |
| Brak token JWT               | 401    | `UNAUTHORIZED`     | "Authentication token required"                | Missing token           |
| Token JWT wygasły/invalid    | 401    | `UNAUTHORIZED`     | "Invalid or expired token"                     | Invalid token           |
| User nie jest właścicielem   | 403    | `FORBIDDEN`        | "You don't have permission to edit this offer" | Not owner               |
| Oferta nie istnieje          | 404    | `NOT_FOUND`        | "Offer not found"                              | Doesn't exist           |
| Nieistniejący category_id    | 422    | `BUSINESS_ERROR`   | "Category not found: uuid"                     | Invalid reference       |
| Nieistniejący offer_type_id  | 422    | `BUSINESS_ERROR`   | "Offer type not found: uuid"                   | Invalid reference       |
| Błąd bazy danych             | 500    | `DATABASE_ERROR`   | "Internal server error"                        | DB error                |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'BUSINESS_ERROR'
      | 'DATABASE_ERROR';
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
};
```

### 7.3 Przykłady odpowiedzi błędów

**400 Bad Request:**

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
        "field": "location.latitude",
        "message": "Latitude must be between -90 and 90"
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
    "message": "You do not have permission to edit this offer. Only the owner can make changes."
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Offer with ID '550e8400-e29b-41d4-a716-446655440000' not found"
  }
}
```

**422 Unprocessable Entity:**

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

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Conditional geometry conversion**: Tylko jeśli dostarczone
   - **Rozwiązanie**: Check if location present before ST_MakePoint()

2. **Category replacement**: DELETE + INSERT zamiast merge
   - **Rozwiązanie**: Acceptable dla MVP, zamiast complex merge logic

3. **History logging**: Jeśli oferta published, dodatkowe INSERT
   - **Rozwiązanie**: Asynchroniczne (jeśli możliwe), ale dla MVP synchronicznie

### 8.2 Strategie optymalizacji

**Indeksowanie:**

```sql
-- Już powinny istnieć z POST /offers
CREATE INDEX idx_offers_id_user_id ON offers(id, user_id);
CREATE INDEX idx_offer_categories_offer_id ON offer_categories(offer_id);
```

**Selective updates:**

```typescript
// Tylko aktualizuj pola które się zmieniły
const updateData = {};
if ('title' in dto && dto.title !== undefined) {
  updateData.title = dto.title;
}
// ... dla każdego pola
```

**Transactional efficiency:**

```typescript
// Jedno zapytanie zamiast N
const { data, error } = await supabase.rpc('update_offer_with_relations', {
  offer_id: offerId,
  update_data: { ... },
  category_ids: [ ... ],
});
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 150ms (mniej pracy niż POST)
- **P95**: < 350ms
- **P99**: < 1s

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Reuse existing struktur z POST /offers:
   - `src/services/offers.service.ts` - dodaj `updateOffer()` method
   - `src/controllers/offers.controller.ts` - dodaj handler
   - `src/validators/offers.validator.ts` - dodaj partial schema
   - `src/mappers/offers.mapper.ts` - reuse mapper

2. Nowa logika:
   - Ownership check middleware
   - Partial update logic
   - History logging

3. Database ready:
   - Tabele istniejące
   - Indeksy istniejące

**Deliverables:**

- Service method writeup
- Schema for partial update

---

### Faza 2: Walidacja partial updates

**Kroki:**

1. Stwórz `UpdateOfferValidator`:
   - `validateUpdateOfferDto(data: unknown): UpdateOfferDto`
   - `validatePartialUpdate(dto: UpdateOfferDto): void` - sprawdź logikę między polami
   - `validateOfferOwnership(offerId, userId, userRole): boolean`
   - `validateBusinessRulesForUpdate(dto, currentOffer): void`

2. Zod partial schema:

   ```typescript
   const updateOfferSchema = z
     .object({
       title: z.string().min(1).max(255).optional(),
       // ... wszystkie pola optional
     })
     .strict()
     .refine(
       (obj) => Object.keys(obj).length > 0,
       'At least one field must be provided',
     );
   ```

3. Testy:
   - Valid partial update
   - Empty body (lub {} - powinno być OK)
   - Extra fields rejected
   - Date range validation

**Deliverables:**

- Partial schema
- Unit tests

---

### Faza 3: Walidacja ownership

**Kroki:**

1. Stwórz `OfferOwnershipValidator`:
   - `canEditOffer(offerId, userId, userRole): Promise<boolean>`
   - `getOfferForEditing(offerId, userId): Promise<Offer>`

2. Implementuj logikę:

   ```typescript
   const offer = await supabase
     .from('offers')
     .select('*')
     .eq('id', offerId)
     .single();

   if (!offer) return false;

   return offer.user_id === userId || userRole === 'admin';
   ```

3. Testy:
   - Owner can edit
   - Non-owner cannot edit
   - Admin can edit any
   - Soft-deleted offer cannot edit

**Deliverables:**

- Ownership check
- Tests

---

### Faza 4: Implementacja service logic

**Kroki:**

1. Dodaj do `OfferService`:

   ```typescript
   async updateOffer(
     offerId: string,
     dto: UpdateOfferDto,
     userId: string,
     userRole: 'organizer' | 'admin'
   ): Promise<OfferMutationResponseDto>
   ```

2. Implementuj:
   - Get offer
   - Check ownership
   - Validate business rules
   - Build update object (only provided fields)
   - Execute transaction:
     - UPDATE offer
     - If categories: DELETE + INSERT
     - If published: INSERT history
   - Map response

3. Testy:
   - Partial update works
   - Categories replaced
   - History created for published
   - Rollback on error

**Deliverables:**

- Service method
- Integration tests

---

### Faza 5: Middleware ownership check

**Kroki:**

1. Stwórz middleware:

   ```typescript
   export const offerOwnershipMiddleware = async (req, res, next) => {
     const { offerId } = req.params;
     const { user } = req;

     const canEdit = await offerService.canEditOffer(
       offerId,
       user.id,
       user.role,
     );

     if (!canEdit) {
       return res.status(403).json(forbiddenError);
     }

     next();
   };
   ```

2. Register w route:

   ```typescript
   router.patch(
     '/offers/:offerId',
     authMiddleware,
     offerOwnershipMiddleware,
     offerController.updateOffer.bind(offerController),
   );
   ```

3. Testy:
   - Owner passes
   - Non-owner blocked
   - Admin passes

**Deliverables:**

- Middleware
- Route registered

---

### Faza 6: Implementacja controller

**Kroki:**

1. Stwórz handler:

   ```typescript
   async updateOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const { offerId } = req.params;
       const { user } = req;

       const dto = await validateUpdateOfferDto(req.body);

       const updated = await offerService.updateOffer(
         offerId,
         dto,
         user.id,
         user.role
       );

       res.json(updated);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Walidacja:
   - Parse body
   - Schema validation
   - Ownership (middleware)

3. Testy:
   - Valid update → 200
   - Invalid data → 400
   - Not owner → 403
   - Not found → 404
   - Business error → 422

**Deliverables:**

- Controller method
- Controller tests
- All status codes

---

### Faza 7: E2E testing

**Kroki:**

1. Setup test data:
   - Organizer user
   - Draft, pending, published offers
   - Admin user

2. E2E tests:

   ```typescript
   // Organizator aktualizuje swoją ofertę
   const response = await request(app)
     .patch('/offers/draft-offer-id')
     .set('Authorization', `Bearer ${token}`)
     .send({ title: 'New Title' })
     .expect(200);

   // Invalid data
   await request(app)
     .patch('/offers/draft-offer-id')
     .set('Authorization', `Bearer ${token}`)
     .send({ title: '' })
     .expect(400);

   // Not owner
   await request(app)
     .patch('/offers/other-user-offer')
     .set('Authorization', `Bearer ${token}`)
     .send({ title: 'Hack' })
     .expect(403);

   // Admin can edit any
   await request(app)
     .patch('/offers/any-offer')
     .set('Authorization', `Bearer ${adminToken}`)
     .send({ available_spots: 5 })
     .expect(200);

   // Offer not found
   await request(app)
     .patch('/offers/nonexistent-id')
     .set('Authorization', `Bearer ${token}`)
     .send({ title: 'Test' })
     .expect(404);
   ```

3. Load testing:
   - 50 concurrent updates
   - P95 < 350ms

**Deliverables:**

- E2E tests passing
- Load tests passing

---

### Faza 8: Deployment

**Kroki:**

1. Code review
2. Staging deployment
3. Smoke tests
4. Production deployment
5. Monitoring active

**Deliverables:**

- Production deployed
- Monitoring active

---

## Checklist implementacji

- [ ] **Schema Walidacja**:
  - [ ] Partial Zod schema created
  - [ ] .strict() enforced
  - [ ] Optional fields
  - [ ] Unit tests

- [ ] **Ownership Walidacja**:
  - [ ] Ownership check implemented
  - [ ] Owner canEdit
  - [ ] Admin bypass
  - [ ] Tests passing

- [ ] **Business Walidacja**:
  - [ ] Date range validation
  - [ ] Category reference checking
  - [ ] Offer type reference checking

- [ ] **Service Layer**:
  - [ ] updateOffer() implemented
  - [ ] Partial update logic
  - [ ] Category replacement
  - [ ] History logging
  - [ ] Transactional operation
  - [ ] Integration tests

- [ ] **Controller/Route**:
  - [ ] PATCH /offers/:offerId registered
  - [ ] Auth middleware integrated
  - [ ] Ownership middleware integrated
  - [ ] All status codes (200/400/401/403/404/422/500)

- [ ] **Testing**:
  - [ ] Unit tests validator
  - [ ] Integration tests service
  - [ ] E2E tests all scenarios
  - [ ] Load tests (P95 < 350ms)

- [ ] **Security**:
  - [ ] Auth required
  - [ ] Ownership enforced
  - [ ] Input validation strict
  - [ ] Parametrized queries

- [ ] **Documentation**:
  - [ ] OpenAPI spec updated
  - [ ] Error codes documented

---

## Zasoby i referencje

- **RESTful PATCH**: https://tools.ietf.org/html/rfc5789
- **Supabase Documentation**: https://supabase.com/docs
- **Zod Partial Schema**: https://zod.dev/
- **Express.js Routing**: https://expressjs.com/

---

## Notes

- **Empty body**: Jeśli client wyśle pusty body `{}`, powinno być OK (100 status) - nic do zmiany
- **Category replacement**: category_ids, jeśli dostarczone, zastępuje WSZYSTKIE istniejące, nie scala
- **Ownership first**: Zawsze sprawdzaj ownership PRZED walidacją biznesową
- **Transaction atomicity**: Jeśli jedno UPDATE się nie powiedzie, wszystko ROLLBACK
- **History logging**: Dla published ofert, zaloguj zmianę - ułatwia audit trail
- **Partial update safety**: Użyj `.strict()` w Zod aby zabranic extra pól
- **Soft delete consideration**: Oferta z `deleted_at IS NOT NULL` nie powinna być edytowalna
