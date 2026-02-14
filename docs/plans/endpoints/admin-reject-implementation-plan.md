# API Endpoint Implementation Plan: POST /admin/offers/{offerId}/reject

## 1. Przegląd punktu końcowego

Endpoint **POST /admin/offers/{offerId}/reject** odrzuca ofertę podczas procesu moderacji, zmieniając jej status z `pending_review` na `rejected`. Tylko administratorzy mogą odrzucać oferty. Endpoint wymaga powodu odrzucenia, który jest wysyłany do organizatora w emailu zawierającym sugestie naprawy.

Proces odrzucania:

1. Walidacja autentykacji i uprawnień (admin only)
2. Pobranie oferty z bazy danych
3. Walidacja statusu oferty (musi być pending_review)
4. Walidacja powodu odrzucenia (required, min length)
5. Zmiana statusu na rejected i ustawienie reject reason
6. Logowanie akcji w historii oferty
7. Wysłanie emaila z powodem do organizatora (async)
8. Zwrócenie zaktualizowanej oferty z informacją o odrzuceniu

Endpoint obsługuje:

- Admin-only authorization (RLS policy)
- Status machine validation (pending_review → rejected only)
- Rejection reason storage i tracking
- Audit logging dla compliance
- Email notifications z powodem odrzucenia

Odpowiedź zawiera zaktualizowaną ofertę, powód odrzucenia, timestamp odrzucenia i admin ID.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/admin/offers/{offerId}/reject
```

### Parametry

**Path Parameters:**

- `offerId` (string, UUID) - ID oferty do odrzucenia

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Wymaga Authorization** - Token JWT z rolą `admin`

### Request Body (AdminRejectOfferRequestDto)

```json
{
  "reason": "Description does not meet minimum requirements. Please provide more detailed information about the activity.",
  "rejection_category": "incomplete_description"
}
```

### Wymagane pola

- `reason` (string) - Powód odrzucenia (min 20 znaków, max 500)
- `rejection_category` (enum) - Kategoria dla trackingu statistyk

### Opcjonalne pola

- Brak

### Walidacja pola reason

- Minimalna długość: 20 znaków
- Maksymalna długość: 500 znaków
- Musi zawierać konstruktywne feedback
- Należy podać konkretne problemy i sugestie

### Dostępne kategorie odrzucenia

```typescript
type RejectionCategory =
  | 'inappropriate_content' // Nieodpowiednia treść
  | 'incomplete_description' // Niekompletny opis
  | 'invalid_age_range' // Nieprawidłowy zakres wiekowy
  | 'missing_schedule' // Brakuje harmonogramu
  | 'invalid_location' // Nieprawidłowa lokalizacja
  | 'duplicate_offer' // Duplikat oferty
  | 'policy_violation' // Naruszenie polityki
  | 'other'; // Inne
```

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/admin/offers/550e8400-e29b-41d4-a716-446655440000/reject" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "reason": "The title and description do not adequately describe the activity. Please provide more information about what participants will learn and specific instructor qualifications.",
    "rejection_category": "incomplete_description"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// RequestBody
AdminRejectOfferRequestDto = {
  reason: string;
  rejection_category: RejectionCategory;
};

type RejectionCategory =
  | 'inappropriate_content'
  | 'incomplete_description'
  | 'invalid_age_range'
  | 'missing_schedule'
  | 'invalid_location'
  | 'duplicate_offer'
  | 'policy_violation'
  | 'other';
```

### DTO Types (Response)

```typescript
// Odpowiedź zawiera ofertę i info o odrzuceniu
AdminRejectOfferResponseDto = {
  offer: PublicOfferDetailsDto;
  rejected_at: string; // ISO timestamp
  rejected_by: string; // admin user ID
  rejection_reason: string;
  rejection_category: RejectionCategory;
};

// Reuse existing types:
PublicOfferDetailsDto = {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  offer_type_id: string;
  ages: Array<number>;
  location: LocationDto;
  status: OfferStatus; // 'rejected'
  available_spots: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  rejection_reason?: string; // nullable, present only if rejected
  rejection_category?: RejectionCategory;
  categories: Array<CategoryDto>;
  schedules: Array<OfferScheduleDto>;
};

LocationDto = {
  type: 'Point';
  coordinates: [number, number];
};

CategoryDto = {
  id: string;
  name: string;
};

OfferScheduleDto = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type OfferStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
```

### Typy pomocnicze

```typescript
ErrorResponseDto = {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "offer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "organizer_id": "660e8400-e29b-41d4-a716-446655440001",
    "title": "Summer Programming Workshop for Kids",
    "description": "Learn Python basics in 5 weeks. Perfect for beginners aged 8-12.",
    "offer_type_id": "770e8400-e29b-41d4-a716-446655440002",
    "ages": [8, 9, 10, 11, 12],
    "location": {
      "type": "Point",
      "coordinates": [21.0122, 52.2297]
    },
    "status": "rejected",
    "available_spots": 15,
    "start_date": "2026-06-15",
    "end_date": "2026-07-20",
    "created_at": "2026-02-01T10:30:00Z",
    "updated_at": "2026-02-07T15:20:00Z",
    "published_at": null,
    "rejection_reason": "The title and description do not adequately describe the activity. Please provide more information about what participants will learn and specific instructor qualifications.",
    "rejection_category": "incomplete_description",
    "categories": [{ "id": "cat-1", "name": "STEM" }],
    "schedules": []
  },
  "rejected_at": "2026-02-07T15:20:00Z",
  "rejected_by": "admin-user-id-456",
  "rejection_reason": "The title and description do not adequately describe the activity. Please provide more information about what participants will learn and specific instructor qualifications.",
  "rejection_category": "incomplete_description"
}
```

### Kody statusu odpowiedzi

- **200 OK** - Oferta pomyślnie odrzucona
- **400 Bad Request** - Nieprawidłowe dane wejściowe (reason too short, invalid category)
- **401 Unauthorized** - Brak autoryzacji (no JWT token)
- **403 Forbidden** - Użytkownik nie ma uprawnień (not admin)
- **404 Not Found** - Oferta nie znaleziona
- **409 Conflict** - Oferta nie jest w statusie pending_review (już published/rejected)
- **422 Unprocessable Entity** - Business logic error
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /admin/offers/{offerId}/reject        │
│    Headers: Authorization: Bearer <token>                   │
│    Body: AdminRejectOfferRequestDto                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Extract JWT Token                                         │
│    - Parse Authorization header                              │
│    - Extract user ID and role                                │
│    - Return 401 jeśli token invalid/missing                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja Role (RLS Policy)                              │
│    - Check if user.role === 'admin'                          │
│    - Return 403 jeśli not admin                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Walidacja Parametrów Path                                │
│    - Parse offerId from URL                                  │
│    - Validate UUID format                                    │
│    - Return 400 jeśli invalid format                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Walidacja Request Body                                    │
│    - Validate reason (20-500 chars)                          │
│    - Validate rejection_category (enum)                      │
│    - Return 400 jeśli validation fails                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Pobranie oferty z bazy                                    │
│    - SELECT * FROM offers WHERE id = offerId                │
│    - Include categories, schedules                           │
│    - Return 404 jeśli not found                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Walidacja statusu oferty                                  │
│    - Check if status === 'pending_review'                    │
│    - Return 409 jeśli not pending (już published/rejected)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Przywołaj OfferService.rejectOffer()                     │
│    - Przekaż: offerId, reason, category, admin userId       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. OfferService Logic - Transakcja                           │
│                                                               │
│    a) Aktualizacja statusu oferty:                          │
│       - UPDATE offers                                        │
│       - SET status = 'rejected'                              │
│       - SET rejection_reason = reason                        │
│       - SET rejection_category = category                    │
│       - SET updated_at = NOW()                               │
│       - WHERE id = offerId                                  │
│       - Verify row affected (1)                              │
│                                                               │
│    b) Logowanie w historii:                                 │
│       - INSERT INTO offer_history                           │
│       - action: 'rejected'                                   │
│       - actor_id: adminUserId                               │
│       - metadata: {reason, category}                         │
│                                                               │
│    c) Obsługa błędów:                                       │
│       - Transaction rollback jeśli co fails                  │
│       - Return appropriate error                             │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Pobranie zaktualizowanej oferty                          │
│     - SELECT * FROM offers WHERE id = offerId               │
│     - Include all relations                                  │
│     - Include rejection_reason, rejection_category           │
│     - Mapuj na PublicOfferDetailsDto                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 11. Wysłanie emaila z powodem odrzucenia (async)            │
│     - Queue job: send_offer_rejected_email                  │
│     - Organizer email, rejection reason, resubmit link      │
│     - Don't block response on email success                 │
│     - Log failures                                           │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 12. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: AdminRejectOfferResponseDto                        │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z bazą danych

```typescript
// 1. Pobranie oferty
const { data: offer, error: fetchError } = await supabase
  .from('offers')
  .select(`
    *,
    categories:offer_categories(id, name),
    schedules:offer_schedules(id, day_of_week, start_time, end_time)
  `)
  .eq('id', offerId)
  .single();

if (fetchError || !offer) {
  return 404 Not Found;
}

// 2. Walidacja statusu
if (offer.status !== 'pending_review') {
  return 409 Conflict - Already processed (rejected/published);
}

// 3. Transakcja: Reject offer
const { data: updated, error: updateError } = await supabase
  .from('offers')
  .update({
    status: 'rejected',
    rejection_reason: reason,
    rejection_category: category,
    updated_at: new Date().toISOString(),
  })
  .eq('id', offerId)
  .select(`
    *,
    categories:offer_categories(id, name),
    schedules:offer_schedules(id, day_of_week, start_time, end_time)
  `)
  .single();

if (updateError || !updated) {
  return 500 Database Error;
}

// 4. Logowanie w historii
const { error: historyError } = await supabase
  .from('offer_history')
  .insert({
    offer_id: offerId,
    action: 'rejected',
    actor_id: adminUserId,
    actor_type: 'admin',
    metadata: {
      reason,
      category,
      rejected_by_admin: adminUserId,
    },
    created_at: new Date().toISOString(),
  });

if (historyError) {
  logger.error('Failed to log offer rejection', { historyError, offerId });
  // Nie blokuj response na logging failure
}

// 5. Wysłanie emaila (async)
await emailQueue.add('offer_rejected', {
  offerId,
  organizerId: offer.organizer_id,
  organizerEmail: offer.organizer?.email,
  offerTitle: offer.title,
  rejectionReason: reason,
  rejectionCategory: category,
});

// 6. Return
return {
  offer: mapToPublicOfferDetailsDto(updated),
  rejected_at: updated.updated_at,
  rejected_by: adminUserId,
  rejection_reason: reason,
  rejection_category: category,
};
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i Autoryzacja

- **JWT Required**: Musi mieć valid access token
- **Admin Role Required**: Tylko admini mogą odrzucać (checked w JWT claims)
- **RLS Policy**: Database RLS policy enforcement
  ```sql
  CREATE POLICY "Admins can reject offers"
    ON offers
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
  ```
- **Audit Trail**: Każda akcja logowana z admin ID i powodem

### 6.2 Walidacja danych wejściowych

**Schema walidacja (Zod):**

```typescript
const rejectOfferSchema = z.object({
  reason: z
    .string()
    .min(20, 'Reason must be at least 20 characters')
    .max(500, 'Reason must not exceed 500 characters')
    .trim(),
  rejection_category: z.enum([
    'inappropriate_content',
    'incomplete_description',
    'invalid_age_range',
    'missing_schedule',
    'invalid_location',
    'duplicate_offer',
    'policy_violation',
    'other',
  ]),
});
```

**Path Parameter Validation:**

```typescript
const offerId = z
  .string()
  .uuid('Invalid offer ID format')
  .parse(req.params.offerId);
```

### 6.3 Ochrona przed atakami

**Authorization checks:**

```typescript
export const adminRoleRequired = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json(unauthorizedError);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json(forbiddenError);
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json(unauthorizedError);
  }
};
```

**Rate limiting for admins:**

```typescript
// Optional: Track admin actions для detection of compromised account
const key = `admin_actions_${adminUserId}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 3600); // 1 hour
}
// Alert if > 50 rejections per hour
if (count > 50) {
  logger.warn('Suspicious admin activity', { adminUserId, count });
}
```

**CORS:**

```
Access-Control-Allow-Origin: https://admin.kidosy.pl
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 6.4 Ochrona danych

- **Parametryzowane zapytania**: Supabase RLS handlel
- **Transactional safety**: All-or-nothing update + history log
- **SSL/TLS**: Cała komunikacja encrypted
- **Audit logging**: Complete metadata recorded
- **Data retention**: Keep rejection reasons dla auditingu (1+ year)

### 6.5 Logging i Monitoring

- **Success logging**: Admin rejection actions
- **Audit trail**: Complete history w offer_history tabeli
- **Suspicious activity**: Alert na anomalous rejection patterns
- **Sentry**: Error tracking dla database/service failures
- **Statistics**: Track rejection reasons dla trend analysis

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz            | Status | Error Code         | Message                                       | Przyczyna                |
| --------------------- | ------ | ------------------ | --------------------------------------------- | ------------------------ |
| Odrzucenie pomyślne   | 200    | -                  | -                                             | Success                  |
| Brak JWT token        | 401    | `AUTH_ERROR`       | "Unauthorized"                                | Missing token            |
| Invalid JWT token     | 401    | `AUTH_ERROR`       | "Invalid token"                               | Token malformed          |
| Rola nie admin        | 403    | `AUTH_ERROR`       | "Forbidden - Admin access required"           | Not admin                |
| Reason < 20 chars     | 400    | `VALIDATION_ERROR` | "Reason must be at least 20 characters"       | Too short                |
| Reason > 500 chars    | 400    | `VALIDATION_ERROR` | "Reason must not exceed 500 characters"       | Too long                 |
| Invalid category      | 400    | `VALIDATION_ERROR` | "Invalid rejection category"                  | Unknown category         |
| Invalid offerId       | 400    | `VALIDATION_ERROR` | "Invalid offer ID format"                     | Not UUID                 |
| Oferta nie znaleziona | 404    | `NOT_FOUND`        | "Offer not found"                             | ID doesn't exist         |
| Oferta nie pending    | 409    | `CONFLICT`         | "Offer is not pending review"                 | Status != pending_review |
| Oferta już odrzucona  | 409    | `CONFLICT`         | "Offer has already been rejected"             | Status = rejected        |
| Database error        | 500    | `DATABASE_ERROR`   | "Internal server error"                       | DB failure               |
| Email sending failed  | 500    | `EMAIL_ERROR`      | "Rejection succeeded but notification failed" | Email service            |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code:
      | 'AUTH_ERROR'
      | 'VALIDATION_ERROR'
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

**400 Bad Request (Validation):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "reason",
        "message": "Reason must be at least 20 characters long"
      },
      {
        "field": "rejection_category",
        "message": "Invalid rejection category"
      }
    ]
  }
}
```

**403 Forbidden:**

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Forbidden - Admin access required",
    "details": [
      {
        "field": "role",
        "message": "Only administrators can reject offers"
      }
    ]
  }
}
```

**409 Conflict:**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot reject this offer",
    "details": [
      {
        "field": "status",
        "message": "Offer is already in rejected status or has been published. Only pending_review offers can be rejected."
      }
    ]
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Database UPDATE**: Update offers table
   - **Rozwiązanie**: Indexed on id (primary key), indexed on status

2. **History INSERT**: Logging rejection with metadata
   - **Rozwiązanie**: Async insert (enqueue if needed)

3. **Email sending**: Async queue
   - **Rozwiązanie**: Background job, don't block response

### 8.2 Strategie optymalizacji

**Database indexing:**

```sql
-- Primary key index (default)
CREATE UNIQUE INDEX idx_offers_id ON offers(id);

-- Status index for filtering pending offers
CREATE INDEX idx_offers_status ON offers(status);

-- Rejection category index for analytics
CREATE INDEX idx_offers_rejection_category ON offers(rejection_category);

-- Timestamp index for sorting
CREATE INDEX idx_offers_updated_at ON offers(updated_at DESC);
```

**Query optimization:**

```typescript
// Select offers and all relations efficiently
const offer = await supabase
  .from('offers')
  .select(
    `*,
    categories:offer_categories(id, name),
    schedules:offer_schedules(*)
  `,
  )
  .eq('id', offerId)
  .single();
```

**Async operations:**

```typescript
// Don't wait for email, history logging
Promise.all([
  emailQueue.add(...), // fire and forget
]).catch(err => logger.error('Async tasks failed', err));
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 300ms (SELECT + UPDATE + SELECT)
- **P95**: < 600ms
- **P99**: < 1000ms

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Rozbuduj strukturę folderów (z /admin/approve):
   - `src/services/admin.service.ts` - dodaj rejectOffer()
   - `src/controllers/admin.controller.ts` - dodaj rejectOffer()
   - `src/validators/admin.validator.ts` - dodaj rejection validation

2. Skonfiguruj Supabase:
   - Sprawdź czy offer_history table ma metadata field
   - Sprawdź czy offers table ma rejection_reason, rejection_category

3. Database schema update (jeśli potrzebne):

   ```sql
   ALTER TABLE offers ADD COLUMN rejection_reason TEXT;
   ALTER TABLE offers ADD COLUMN rejection_category VARCHAR(50);

   CREATE INDEX idx_offers_rejection_category ON offers(rejection_category);
   ```

**Deliverables:**

- DB schema updated
- New columns in place

---

### Faza 2: Walidacja Schematu

**Kroki:**

1. Rozbuduj `AdminValidator`:

   ```typescript
   const rejectOfferSchema = z.object({
     reason: z.string()
       .min(20, 'Reason must be at least 20 characters')
       .max(500, 'Reason must not exceed 500 characters')
       .trim(),
     rejection_category: z.enum([...]),
   });
   ```

2. Implementuj:
   - Reason length validation
   - Category enum validation
   - Reason content validation (no empty spaces)

3. Testy:
   - Valid rejection → pass
   - Reason too short → throw
   - Reason too long → throw
   - Invalid category → throw
   - Whitespace trimming → pass

**Deliverables:**

- Reject validation schema in validator
- Unit tests

---

### Faza 3: Implementacja Service Layer

**Kroki:**

1. Rozbuduj `AdminService.rejectOffer()`:

   ```typescript
   async rejectOffer(
     offerId: string,
     reason: string,
     category: RejectionCategory,
     adminUserId: string
   ): Promise<AdminRejectOfferResponseDto> {
     // 1. Fetch offer
     // 2. Validate status
     // 3. Update status
     // 4. Log history
     // 5. Queue email
     // 6. Return result
   }
   ```

2. Implementuj:
   - Offer fetching with relations
   - Status validation (only pending_review)
   - Transactional update (status + reason + category)
   - History logging with full metadata
   - Email queuing with reason
   - Error handling

3. Testy integracyjne:
   - Reject pending offer → 200 with rejected status
   - Reject already rejected → 409
   - Reject published → 409
   - Reject not found → 404
   - History logged with reason → verify in DB
   - Email queued with reason → verify in Redis

**Deliverables:**

- `admin.service.ts` with rejectOffer()
- Integration tests

---

### Faza 4: Implementacja Controller/Handler

**Kroki:**

1. Rozbuduj `AdminController.rejectOffer()`:

   ```typescript
   async rejectOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const { offerId } = validateAdminParams(req.params);
       const { reason, rejection_category } = await validateRejectDto(req.body);
       const result = await adminService.rejectOffer(
         offerId,
         reason,
         rejection_category,
         req.user.id
       );
       res.status(200).json(result);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Route:

   ```typescript
   router.post(
     '/admin/offers/:offerId/reject',
     adminRoleRequired,
     adminController.rejectOffer.bind(adminController),
   );
   ```

3. Testy:
   - Valid reject → 200
   - Invalid reason → 400
   - Not admin → 403
   - Offer not found → 404
   - Already rejected → 409

**Deliverables:**

- `admin.controller.ts` with rejectOffer()
- Route registered
- Controller tests

---

### Faza 5: Email Template Setup

**Kroki:**

1. Setup email template (Mailjet):

   ```
   Subject: Your offer "[Offer Title]" was not approved

   Hi [Organizer Name],

   Thank you for submitting your offer "[Offer Title]" to Kidosy.
   After careful review, we were unable to approve it at this time.

   Reason for rejection:
   [Rejection Reason - multi-line]

   How to improve your offer:
   - Review the feedback above
   - Update your offer details
   - Resubmit for review

   Category: [Rejection Category]

   [Resubmit Offer Button]

   Questions? Contact our support team.

   Best regards,
   Kidosy Review Team
   ```

2. Queue implementation:
   - Bull/RabbitMQ job handler
   - Include full rejection reason w email
   - Retry logic dla failed sends

3. Test:
   - Email sent after rejection
   - Email contains reason
   - Email contains links

**Deliverables:**

- Email template configured
- Queue job handler for reject
- Email tests

---

### Faza 6: Logging i Audit Trail

**Kroki:**

1. Implementuj audit logging:

   ```typescript
   const { error: historyError } = await supabase.from('offer_history').insert({
     offer_id: offerId,
     action: 'rejected',
     actor_id: adminUserId,
     actor_type: 'admin',
     metadata: {
       reason,
       category,
       rejected_by_admin: adminUserId,
     },
   });
   ```

2. Setup analytics:
   - Track rejection reasons per category
   - Track rejection patterns over time
   - Monitor admin rejection rates

3. Monitoring:
   - Rejection rate per category
   - Average rejection reason quality
   - Error rate

**Deliverables:**

- Audit logging implemented
- Analytics queries prepared
- Monitoring dashboards

---

### Faza 7: E2E Testing

**Kroki:**

1. Setup test environment:
   - Test Supabase instance
   - Test admin user
   - Test pending offers
   - Email queue mock

2. E2E tests:

   ```typescript
   // Successful rejection
   const response = await request(app)
     .post(`/admin/offers/${pendingOffer.id}/reject`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({
       reason:
         'The description needs more details about what children will learn.',
       rejection_category: 'incomplete_description',
     })
     .expect(200);
   expect(response.body.offer.status).toBe('rejected');
   expect(response.body.rejection_reason).toBeDefined();

   // Reason too short
   await request(app)
     .post(`/admin/offers/${pendingOffer.id}/reject`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({
       reason: 'Too short',
       rejection_category: 'incomplete_description',
     })
     .expect(400);

   // Not admin
   await request(app)
     .post(`/admin/offers/${pendingOffer.id}/reject`)
     .set('Authorization', `Bearer ${organizerToken}`)
     .send({ reason: '...', rejection_category: 'incomplete_description' })
     .expect(403);

   // Already rejected
   const rejectedOffer = { ...pendingOffer, status: 'rejected' };
   await request(app)
     .post(`/admin/offers/${rejectedOffer.id}/reject`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({ reason: '...', rejection_category: 'incomplete_description' })
     .expect(409);
   ```

3. Load testing:
   - 50 concurrent rejections
   - Verify no race conditions
   - Verify all emails queued

**Deliverables:**

- E2E tests passing
- Load tests passing

---

### Faza 8: Deployment

**Kroki:**

1. Code review
   - Security review (authorization)
   - Reason quality standards
   - Email template review

2. Staging deployment
   - Database migration (new columns)
   - Test RLS policies
   - Test email sending

3. Production deployment
   - Blue-green strategy
   - Smoke tests
   - Monitor error rates

4. Monitoring:
   - Rejection rate
   - Error distribution
   - Email delivery rate
   - Rejection reason analytics

**Deliverables:**

- Production deployed
- Monitoring active

---

## Checklist implementacji

- [ ] **Setup**:
  - [ ] Database schema updated (rejection fields)
  - [ ] Service/Controller methods added
  - [ ] Dependencies ready

- [ ] **Admin Authorization**:
  - [ ] JWT verification
  - [ ] Admin role check (reuse from approve)
  - [ ] Route protected

- [ ] **Walidacja**:
  - [ ] Reason length validation (20-500)
  - [ ] Category enum validation
  - [ ] UUID format validation
  - [ ] Unit tests

- [ ] **Service Layer**:
  - [ ] rejectOffer() implemented
  - [ ] Offer fetching with relations
  - [ ] Status validation (pending_review only)
  - [ ] Transactional update (status + reason + category)
  - [ ] History logging with metadata
  - [ ] Email queuing
  - [ ] Error handling
  - [ ] Integration tests

- [ ] **Controller/Route**:
  - [ ] POST /admin/offers/{offerId}/reject registered
  - [ ] Admin middleware integrated
  - [ ] All status codes (200/400/401/403/404/409/500)

- [ ] **Email Setup**:
  - [ ] Template configured
  - [ ] Rejection reason included
  - [ ] Queue job handler
  - [ ] Retry logic
  - [ ] Tests passing

- [ ] **Audit Logging**:
  - [ ] History INSERT logged
  - [ ] Reason stored in metadata
  - [ ] Category tracked
  - [ ] Admin ID recorded

- [ ] **Analytics**:
  - [ ] Rejection reasons tracked
  - [ ] Category statistics
  - [ ] Trends analyzed

- [ ] **Testing**:
  - [ ] Unit tests validator
  - [ ] Integration tests service
  - [ ] E2E tests all scenarios
  - [ ] Load tests

- [ ] **Security**:
  - [ ] JWT validation
  - [ ] Admin role required
  - [ ] RLS policies enforced
  - [ ] HTTPS enforced
  - [ ] Audit trail complete

- [ ] **Documentation**:
  - [ ] OpenAPI spec updated
  - [ ] Rejection reasons documented

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

---

## Zasoby i referencje

- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Bull Queue**: https://github.com/OptimalBits/bull
- **JWT Best Practices**: https://tools.ietf.org/html/rfc7519
- **Express.js**: https://expressjs.com/

---

## Notes

- **Reason is critical**: Must be helpful and constructive, not generic
- **Category tracking**: Essential для analytics i improvements
- **Transactional safety**: Update + history in single transaction
- **Email must include reason**: Organizer needs feedback to improve
- **Admin-only**: Zawsze require admin role w middleware
- **No overwriting**: Jeśli status != pending_review, zwróć 409
- **Idempotency**: Reject twice = 409 (safer than allowing re-reject)
- **Published_at**: Leave null jeśli rejected (never published)
- **Updated_at**: ZAWSZE update with current timestamp
- **Rejection records**: Keep indefinitely dla audit/compliance
- **Analytics**: Track reasons để identify common issues
- **History metadata**: Store reason + category dla auditingu
- **Email async**: Queue job, don't block response
- **Resubmit flow**: Frontend should allow resubmit po rejection (draft state)
