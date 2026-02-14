# API Endpoint Implementation Plan: POST /offers/{offerId}/submit

## 1. Przegląd punktu końcowego

Endpoint **POST /offers/{offerId}/submit** pozwala uwierzytelnionym organizatorom na przesłanie swojej oferty do procesu moderacji. Zmienia status oferty z `draft` lub `rejected` na `pending_review`, co powoduje, że oferta trafia do kolejki moderacyjnej i czeka na zatwierdzenie przez administratora.

Endpoint obsługuje:

- Walidację kompletności oferty (wszystkie wymagane pola)
- Zmianę statusu
- Rejestrowanie zmian w historii
- Opcjonalną wiadomość od organizatora (np. odpowiedź na wcześniejsze odrzucenie)
- Wysłanie emaila do admina o nowej ofercie do moderacji

Odpowiedź zawiera zaktualizowane dane oferty z nowym statusem.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/offers/{offerId}/submit
```

### Parametry

**Wymagane (Path Parameters):**

- `offerId` (uuid) - Unikalny identyfikator oferty do przesłania

**Brak Query Parameters**

### Request Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Request Body (SubmitOfferDto)

```json
{
  "message": "Poprawiłem opis zgodnie z uwagami. Poproszę ponowną weryfikację."
}
```

### Wymagane pola

- Brak - cała oferta i message są opcjonalne

### Opcjonalne pola

- `message` (string) - Opcjonalna wiadomość od organizatora (max 500 znaków)
  - Przydatna przy ponownym przesłaniu po odrzuceniu
  - Może zawierać odpowiedź na uwagi moderatora

### Przykład żądania

```bash
# Przesłanie nowej oferty (bez wiadomości)
curl -X POST "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000/submit" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'

# Ponowne przesłanie po odrzuceniu
curl -X POST "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000/submit" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Poprawiłem opis zgodnie z uwagami. Poproszę ponowną weryfikację."
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Główny typ żądania
SubmitOfferDto = {
  message?: string;  // Opcjonalna wiadomość
};
```

### DTO Types (Response)

```typescript
// Odpowiedź przy przesłaniu
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
  "title": "Kurs programowania dla dzieci 2026",
  "status": "pending_review",
  "created_at": "2026-02-05T10:00:00Z",
  "updated_at": "2026-02-07T16:20:15Z"
}
```

### Kody statusu odpowiedzi

- **200 OK** - Oferta pomyślnie przesłana do moderacji
- **400 Bad Request** - Nieprawidłowe dane wejściowe (message za długi, etc.)
- **401 Unauthorized** - Token JWT nieprawidłowy, wygasły lub brakujący
- **403 Forbidden** - Użytkownik nie jest właścicielem oferty lub brak dostępu
- **404 Not Found** - Oferta nie istnieje
- **409 Conflict** - Oferta już w pending_review, published lub archived (nie może być przesłana)
- **422 Unprocessable Entity** - Oferta niekompletna (brakuje wymaganych pól)
- **500 Internal Server Error** - Błąd serwera (błąd bazy, błąd wysłania emaila)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /offers/{offerId}/submit               │
│    Headers: Authorization: Bearer <JWT>                      │
│    Body: SubmitOfferDto JSON (optional message)              │
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
│ 4. Walidacja schematu (Zod)                                 │
│    - Parse request body jako SubmitOfferDto                 │
│    - Sprawdzenie message length (<= 500)                    │
│    - Return 400 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Przywołaj OfferService.getOffer(offerId, userId)         │
│    - Pobranie istniejącej oferty                            │
│    - Sprawdzenie czy użytkownik jest właścicielem           │
│    - Return 404 jeśli nie istnieje                          │
│    - Return 403 jeśli nie ma dostępu                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Walidacja stanu przejścia (State Machine)                │
│    - Sprawdzenie czy status jest draft lub rejected         │
│    - Return 409 jeśli inny status                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Walidacja kompletności oferty                            │
│    - Sprawdzenie czy wszystkie wymagane pola są wypełnione  │
│    - title, description, address, location, start_date,    │
│    - end_date, available_spots, category_ids               │
│    - Return 422 (UNPROCESSABLE_ENTITY) jeśli brakuje pól   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Duplikaty detektowanie (opcjonalnie)                     │
│    - Fuzzy search dla potencjalnych duplikatów              │
│    - Zaloguj do offer_duplicates (status='pending')         │
│    - Nie blokuj submisji, tylko zaloguj                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Przywołaj OfferService.submitForReview()                 │
│    - Przekaż: offerId, userId, message                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Service Logic (OfferService) - Transakcja               │
│                                                               │
│     a) Zmiana statusu:                                       │
│        - UPDATE offers                                       │
│        - status = 'pending_review'                           │
│        - updated_at = CURRENT_TIMESTAMP                      │
│        - WHERE id = offerId                                  │
│                                                               │
│     b) Historia zmian:                                       │
│        - INSERT do offer_status_history                      │
│        - old_status = 'draft' lub 'rejected'                 │
│        - new_status = 'pending_review'                       │
│        - reason = message lub 'Oferta przesłana do moderacji'│
│        - changed_by = userId                                 │
│        - changed_at = CURRENT_TIMESTAMP                      │
│                                                               │
│     c) Obsługa błędów:                                       │
│        - Jeśli error → ROLLBACK transakcji                   │
│        - Return exception                                    │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 11. Wysłanie notyfikacji (asynchronicznie)                   │
│     - Email do admina z powiadomieniem                       │
│     - Email do organizatora z potwierdzeniem                │
│     - Jeśli error przy email: log warning, nie fail          │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 12. Mapowanie odpowiedzi                                     │
│     - Mapuj updated offer do OfferMutationResponseDto       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 13. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: OfferMutationResponseDto                           │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z bazą danych (Transakcja)

```sql
-- Transakcja begin
BEGIN;

-- 1. Pobierz aktualną ofertę
SELECT * FROM offers WHERE id = $1 AND deleted_at IS NULL;

-- 2. Sprawdzenie statusu (draft lub rejected)
SELECT status FROM offers WHERE id = $1;

-- 3. Aktualizuj status na pending_review
UPDATE offers SET
  status = 'pending_review',
  updated_at = CURRENT_TIMESTAMP
WHERE id = $1
RETURNING *;

-- 4. Zaloguj zmianę statusu
INSERT INTO offer_status_history (
  id, offer_id, old_status, new_status, reason, changed_by, changed_at
) VALUES (
  gen_random_uuid(), $1, $2, 'pending_review', $3, $4, CURRENT_TIMESTAMP
);

-- Transakcja commit
COMMIT;

-- 5. Async: Wysłanie emaila do admina
-- email_type = 'offer_published' (notification o nowej ofercie)
-- recipient_email = admin_email
-- INSERT do email_logs (asynchronicznie)
```

### Walidacja kompletności oferty

```typescript
// Sprawdzenie wymaganych pól
const requiredFields = [
  'title', // nie puste, >= 1 char
  'description', // nie puste, >= 10 chars
  'ages', // array, >= 1 element
  'address', // nie puste
  'location', // musi mieć latitude i longitude
  'start_date', // musi być data
  'end_date', // musi być data, > start_date
  'available_spots', // >= 1
  'offer_type_id', // nie null
  'categories', // >= 1 kategoria
];

// Dla każdego pola - sprawdź czy jest wypełnione
for (const field of requiredFields) {
  if (
    !offer[field] ||
    (Array.isArray(offer[field]) && offer[field].length === 0)
  ) {
    throw new ValidationError(`Missing required field: ${field}`);
  }
}
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Token Validation**: Supabase Auth obsługuje walidację
- Token obowiązkowy - brak tokenu → **401 Unauthorized**
- Wygasłe tokeny → **401 Unauthorized**

### 6.2 Autoryzacja

- **Ownership Check**: Tylko właściciel (organizator) może przesłać swoją ofertę
  - Jeśli `offer.user_id != auth.uid()` → **403 Forbidden**
- Admin może przesłać ofertę organizatora (za pośrednictwem innego endpointu, jeśli potrzeba)

### 6.3 State Machine Walidacja

- **Status transitions**: Tylko ze statusu `draft` lub `rejected` na `pending_review`
- Nie można przesłać już `pending_review`, `published` czy `archived`
- Return **409 Conflict** jeśli nieprawidłowy stan przejścia

### 6.4 Walidacja kompletności

- **Required fields**: Sprawdzenie czy wszystkie wymagane pola są wypełnione
- Jeśli brakuje warunków: **422 Unprocessable Entity**
- Szczegółowe komunikaty o brakujących polach

### 6.5 Walidacja danych wejściowych

**Schema walidacja (Zod):**

```typescript
const submitOfferSchema = z
  .object({
    message: z.string().max(500).optional(),
  })
  .strict();
```

### 6.6 Ochrona danych

- **Parametryzowane zapytania**: Supabase client handluje
- **Transakcja**: Atomicity - status i history zmieniane razem
- **Soft delete**: Soft-deleted offers nie mogą być przesłane

### 6.7 Email safety

- **Asynchroniczne wysyłanie**: Nie blokuj response, jeśli email się nie powiedzie
- **Rate limiting na email**: Max 5 submissions per organizer per day (zapobieganie spam)

### 6.8 Logging i Monitoring

- **Logowanie submisji**: Zarejestruj każdy POST (user_id, offer_id, timestamp)
- **Moderation queue tracking**: Monitoruj rozmiar queue
- **Anomalii detektowanie**: Wiele submissions z tego samego user_id w krótkim czasie
- **Sentry**: Error tracking dla email failures

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                 | Status | Error Code         | Message                                       | Przyczyna             |
| -------------------------- | ------ | ------------------ | --------------------------------------------- | --------------------- |
| Oferta przesłana pomyślnie | 200    | -                  | -                                             | Success               |
| offerId nie jest UUID      | 400    | `VALIDATION_ERROR` | "Invalid offer ID format"                     | Bad format            |
| message > 500 znaków       | 400    | `VALIDATION_ERROR` | "message must be max 500 characters"          | Too long              |
| message puste string ''    | 200    | -                  | -                                             | OK (optional)         |
| Brak token JWT             | 401    | `UNAUTHORIZED`     | "Authentication token required"               | Missing token         |
| Token JWT wygasły/invalid  | 401    | `UNAUTHORIZED`     | "Invalid or expired token"                    | Invalid token         |
| User nie jest właścicielem | 403    | `FORBIDDEN`        | "Only owner can submit for review"            | Not owner             |
| Oferta nie istnieje        | 404    | `NOT_FOUND`        | "Offer not found"                             | Doesn't exist         |
| Oferta już pending_review  | 409    | `CONFLICT`         | "Offer is already pending review"             | Invalid state         |
| Oferta już published       | 409    | `CONFLICT`         | "Published offers cannot be resubmitted"      | Invalid state         |
| Oferta archived            | 409    | `CONFLICT`         | "Archived offers cannot be modified"          | Invalid state         |
| Brakuje required fields    | 422    | `VALIDATION_ERROR` | "Offer is incomplete"                         | Missing fields        |
| Konkretne missing fields   | 422    | `VALIDATION_ERROR` | "Missing required fields: title, description" | Details               |
| Błąd bazy danych           | 500    | `DATABASE_ERROR`   | "Internal server error"                       | DB error              |
| Błąd wysłania emaila       | 500    | `EMAIL_ERROR`      | "Failed to send notification"                 | Email service failure |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'DATABASE_ERROR'
      | 'EMAIL_ERROR';
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
        "field": "message",
        "message": "Message must be max 500 characters"
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
    "message": "Only the offer owner can submit for review"
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Offer not found"
  }
}
```

**409 Conflict (Status):**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Offer cannot be submitted - it is already pending review",
    "details": [
      {
        "field": "status",
        "message": "Current status: pending_review. Can only submit draft or rejected offers."
      }
    ]
  }
}
```

**422 Unprocessable Entity:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Offer is incomplete and cannot be submitted",
    "details": [
      {
        "field": "description",
        "message": "Description is too short (minimum 10 characters)"
      },
      {
        "field": "categories",
        "message": "At least one category must be selected"
      },
      {
        "field": "available_spots",
        "message": "Available spots must be at least 1"
      }
    ]
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Pobieranie kompletnej oferty**: Wiele JOINów dla walidacji
   - **Rozwiązanie**: Cache struktury oferty

2. **Email sending**: Wysyłanie emaila blokuje response
   - **Rozwiązanie**: Async job queue (Bull, RabbitMQ)

3. **Duplikat detektowanie**: Fuzzy search może być wolny
   - **Rozwiązanie**: Asynchronicznie, po commicie response

### 8.2 Strategie optymalizacji

**Query optimization:**

```sql
-- Pobierz ofertę z walidacją w jednym query
SELECT
  o.*,
  COUNT(oc.id) as category_count,
  CASE WHEN o.status NOT IN ('draft', 'rejected') THEN 1 ELSE 0 END as invalid_status
FROM offers o
LEFT JOIN offer_categories oc ON o.id = oc.offer_id
WHERE o.id = $1
GROUP BY o.id;
```

**Async email:**

```typescript
// Nie czekaj na email, queue job
await emailQueue.add('send_notification', {
  offerId,
  type: 'offer_submitted',
  timestamp: new Date(),
});
```

**Duplikat detection async:**

```typescript
// Po commicie:
await duplicateDetectionQueue.add('check_duplicates', {
  offerId,
  timestamp: new Date(),
});
```

**Rate limiting cache:**

```typescript
// Redis
const key = `submit_offer_${userId}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 86400); // 24h
}
if (count > 5) {
  return 429; // Too Many Requests
}
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 100ms (tylko status change)
- **P95**: < 250ms
- **P99**: < 500ms

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Reuse existing struktur:
   - `src/services/offers.service.ts` - dodaj `submitForReview()` method
   - `src/controllers/offers.controller.ts` - dodaj handler
   - `src/validators/offers.validator.ts` - dodaj schema
   - `src/mappers/offers.mapper.ts` - reuse mapper
   - `src/middleware/auth.middleware.ts` - reuse auth
   - `src/middleware/ownership.middleware.ts` - reuse ownership

2. Nowa logika:
   - State machine validation
   - Offer completeness validation
   - Notification service

3. Database ready:
   - Tabele istniejące
   - offer_status_history ready

**Deliverables:**

- Ready to implement

---

### Faza 2: State Machine Walidacja

**Kroki:**

1. Stwórz `OfferStateValidator`:
   - `validateStatusTransition(currentStatus, targetStatus): boolean`
   - `canSubmitForReview(currentStatus): boolean`

2. Implementuj:

   ```typescript
   const VALID_TRANSITIONS = {
     draft: ['pending_review'],
     rejected: ['pending_review'],
     pending_review: [],
     published: [],
     archived: [],
   };

   const canTransition = (from, to) => {
     return VALID_TRANSITIONS[from]?.includes(to) ?? false;
   };
   ```

3. Testy:
   - draft → pending_review ✓
   - rejected → pending_review ✓
   - pending_review → pending_review ✗
   - published → pending_review ✗

**Deliverables:**

- State machine validator
- Unit tests

---

### Faza 3: Offer Completeness Walidacja

**Kroki:**

1. Stwórz `OfferCompletenessValidator`:
   - `validateOfferComplete(offer): Promise<ValidationResult>`
   - `getMissingFields(offer): string[]`

2. Wymagane pola:

   ```typescript
   const REQUIRED_FIELDS = {
     title: { minLength: 1, maxLength: 255 },
     description: { minLength: 10, maxLength: 5000 },
     ages: { type: 'array', minItems: 1 },
     address: { minLength: 5, maxLength: 500 },
     location: { required: true },
     start_date: { required: true },
     end_date: { required: true, afterField: 'start_date' },
     available_spots: { type: 'number', min: 1 },
     offer_type_id: { required: true, existsInDb: true },
     categories: { type: 'array', minItems: 1 },
   };
   ```

3. Testy:
   - Complete offer ✓
   - Missing title ✗
   - Short description ✗
   - No categories ✗
   - Invalid date range ✗

**Deliverables:**

- Completeness validator
- Unit tests
- Detailed error messages

---

### Faza 4: Implementacja service logic

**Kroki:**

1. Dodaj do `OfferService`:

   ```typescript
   async submitForReview(
     offerId: string,
     userId: string,
     message?: string
   ): Promise<OfferMutationResponseDto>
   ```

2. Implementuj:
   - Get offer + validate ownership
   - Validate state transition
   - Validate completeness
   - Build update object (status = pending_review)
   - Execute transaction:
     - UPDATE offer status
     - INSERT history entry
   - Queue email notifications
   - Map response

3. Testy:
   - Submit draft successfully
   - Submit rejected successfully
   - Cannot submit pending_review (409)
   - Missing fields (422)
   - History entry created

**Deliverables:**

- Service method
- Integration tests
- Email async queue ready

---

### Faza 5: Notification Service

**Kroki:**

1. Stwórz `NotificationService`:
   - `async notifyAdminOfSubmission(offerId, organizerEmail, organizerName)`
   - `async notifyOrganizerOfSubmission(organizerEmail, offerTitle)`

2. Email templates:
   - To admin: "New offer submitted for review"
   - To organizer: "Your offer has been submitted"

3. Error handling:
   - Log failures, don't throw
   - Retry logic (exponential backoff)
   - Fallback: log to database

4. Testy (mocked email service):
   - Admin email sent
   - Organizer email sent
   - Graceful failure

**Deliverables:**

- Notification service
- Email templates
- Async queue ready

---

### Faza 6: Implementacja controller

**Kroki:**

1. Stwórz handler:

   ```typescript
   async submitForReview(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const { offerId } = req.params;
       const { user } = req;

       const dto = await validateSubmitOfferDto(req.body);

       const updated = await offerService.submitForReview(
         offerId,
         user.id,
         dto.message
       );

       res.json(updated);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Route registration:

   ```typescript
   router.post(
     '/offers/:offerId/submit',
     authMiddleware,
     offerOwnershipMiddleware,
     offerController.submitForReview.bind(offerController),
   );
   ```

3. Testy:
   - Valid submit → 200
   - Message too long → 400
   - Not owner → 403
   - Not found → 404
   - Status conflict → 409
   - Missing fields → 422

**Deliverables:**

- Controller method
- Route registered
- Controller tests

---

### Faza 7: E2E testing

**Kroki:**

1. Setup test data:
   - Organizer
   - Complete draft offer
   - Incomplete draft offer
   - Rejected offer
   - Already pending offer

2. E2E tests:

   ```typescript
   // Draft complete → pending_review
   const response = await request(app)
     .post(`/offers/${draftOfferId}/submit`)
     .set('Authorization', `Bearer ${token}`)
     .send({})
     .expect(200);
   expect(response.body.status).toBe('pending_review');

   // Rejected → pending_review
   const response = await request(app)
     .post(`/offers/${rejectedOfferId}/submit`)
     .set('Authorization', `Bearer ${token}`)
     .send({ message: 'Fixed issues' })
     .expect(200);

   // Incomplete draft → 422
   const response = await request(app)
     .post(`/offers/${incompleteOfferId}/submit`)
     .set('Authorization', `Bearer ${token}`)
     .send({})
     .expect(422);

   // Already pending → 409
   const response = await request(app)
     .post(`/offers/${pendingOfferId}/submit`)
     .set('Authorization', `Bearer ${token}`)
     .send({})
     .expect(409);

   // Not found
   await request(app)
     .post('/offers/nonexistent/submit')
     .set('Authorization', `Bearer ${token}`)
     .send({})
     .expect(404);

   // Not owner
   await request(app)
     .post(`/offers/${otherUserOfferId}/submit`)
     .set('Authorization', `Bearer ${token}`)
     .send({})
     .expect(403);
   ```

3. Email verification:
   - Mock email service
   - Verify emails queued
   - Verify email content

4. History verification:
   - Verify offer_status_history entry created
   - Verify old_status, new_status, reason

**Deliverables:**

- E2E tests passing
- Email integration verified
- History verified

---

### Faza 8: Deployment

**Kroki:**

1. Code review
2. Staging deployment
3. Smoke tests
4. Production deployment
5. Monitoring:
   - Submission rate
   - Email delivery rate
   - Error rate

**Deliverables:**

- Production deployed
- Monitoring active

---

## Checklist implementacji

- [ ] **State Machine Walidacja**:
  - [ ] Validator created
  - [ ] Valid transitions only
  - [ ] Unit tests

- [ ] **Completeness Walidacja**:
  - [ ] Validator created
  - [ ] All required fields checked
  - [ ] Detailed error messages
  - [ ] Unit tests

- [ ] **Service Layer**:
  - [ ] submitForReview() implemented
  - [ ] Ownership check
  - [ ] State validation
  - [ ] Completeness validation
  - [ ] Transactional operation
  - [ ] History logging
  - [ ] Async notifications
  - [ ] Integration tests

- [ ] **Notification Service**:
  - [ ] Email templates created
  - [ ] Admin notification
  - [ ] Organizer notification
  - [ ] Async queue ready
  - [ ] Error handling

- [ ] **Controller/Route**:
  - [ ] POST /offers/:offerId/submit registered
  - [ ] Auth middleware integrated
  - [ ] Ownership middleware integrated
  - [ ] All status codes (200/400/401/403/404/409/422/500)

- [ ] **Testing**:
  - [ ] Unit tests validator
  - [ ] Integration tests service
  - [ ] E2E tests all scenarios
  - [ ] Email verification
  - [ ] History verification

- [ ] **Security**:
  - [ ] Auth required
  - [ ] Ownership enforced
  - [ ] State machine enforced
  - [ ] Input validation strict
  - [ ] Rate limiting

- [ ] **Documentation**:
  - [ ] OpenAPI spec updated
  - [ ] Error codes documented
  - [ ] State transitions documented

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

---

## Zasoby i referencje

- **State Machine Pattern**: https://en.wikipedia.org/wiki/Finite-state_machine
- **Async Job Queues**: https://github.com/OptimalBits/bull
- **Supabase Documentation**: https://supabase.com/docs
- **Express.js Routing**: https://expressjs.com/

---

## Notes

- **State transitions**: Jest to klasyczny state machine - oferta może przejść tylko między określonymi stanami
- **Completeness validation**: Musisz sprawdzić WSZYSTKIE wymagane pola przed przesłaniem
- **Email async**: NIE czekaj na email w response, queue job i zwróć 200 natychmiast
- **History logging**: Zawsze zaloguj zmianę statusu dla auditingu
- **Rate limiting**: Zapobiegaj spam - max 5 submissions per day per organizer
- **Message optional**: Wiadomość jest opcjonalna, przydatna dla ponownych przesłań
- **Error details**: Daj dokładnie które pola brakują/są złe, aby organizator wiedział co poprawić
- **Soft delete**: Soft-deleted offers nie mogą być przesłane
