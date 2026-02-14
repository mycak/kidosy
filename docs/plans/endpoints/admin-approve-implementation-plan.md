# API Endpoint Implementation Plan: POST /admin/offers/{offerId}/approve

## 1. Przegląd punktu końcowego

Endpoint **POST /admin/offers/{offerId}/approve** zatwierdza ofertę po sprawdzeniu moderacyjnym, zmieniając jej status z `pending_review` na `published`. Tylko administratorzy mogą zatwierdzać oferty. Endpoint wysyła powiadomienia email do organizatora o zatwierdzeniu.

Proces zatwierdzania:

1. Walidacja autentykacji i uprawnień (admin only)
2. Pobranie oferty z bazy danych
3. Walidacja statusu oferty (musi być w pending_review)
4. Zmiana statusu na published
5. Logowanie akcji w historii oferty
6. Wysłanie emaila powiadomienia do organizatora (async)
7. Zwrócenie zaktualizowanej oferty

Endpoint obsługuje:

- Admin-only authorization (RLS policy)
- Status machine validation (pending_review → published only)
- Offer draft completeness check (already done at submit)
- Audit logging dla compliance
- Email notifications (organizator)

Odpowiedź zawiera zaktualizowaną ofertę z nowym statusem i timestampem zatwierdzenia.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/admin/offers/{offerId}/approve
```

### Parametry

**Path Parameters:**

- `offerId` (string, UUID) - ID oferty do zatwierdzenia

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Wymaga Authorization** - Token JWT z rolą `admin`

### Request Body

```json
{}
```

**Brak wymaganych pól** - Endpoint nie wymaga body, zatwierdzenie to bezdane operacja

### Opcjonalne pola

- Brak

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/admin/offers/550e8400-e29b-41d4-a716-446655440000/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{}'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Body jest puste, więc nie ma request DTO
// Ścieżka zawiera: offerId (string)
AdminApproveOfferRequestDto = {};
```

### DTO Types (Response)

```typescript
// Odpowiedź zawiera zaktualizowaną ofertę
AdminApproveOfferResponseDto = {
  offer: PublicOfferDetailsDto;
  approved_at: string; // ISO timestamp
  approved_by: string; // admin user ID
};

// Reuse existing types:
PublicOfferDetailsDto = {
  id: string;
  organizer_id: string;
  title: string;
  description: string;
  offer_type_id: string;
  ages: Array<number>;
  location: LocationDto;  // GeoJSON
  status: OfferStatus; // 'published'
  available_spots: number;
  start_date: string; // ISO
  end_date: string; // ISO
  created_at: string;
  updated_at: string;
  published_at: string | null;
  categories: Array<CategoryDto>;
  schedules: Array<OfferScheduleDto>;
};

LocationDto = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

CategoryDto = {
  id: string;
  name: string;
};

OfferScheduleDto = {
  id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // HH:MM
  end_time: string; // HH:MM
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
    "status": "published",
    "available_spots": 15,
    "start_date": "2026-06-15",
    "end_date": "2026-07-20",
    "created_at": "2026-02-01T10:30:00Z",
    "updated_at": "2026-02-07T14:45:00Z",
    "published_at": "2026-02-07T14:45:00Z",
    "categories": [
      { "id": "cat-1", "name": "STEM" },
      { "id": "cat-2", "name": "Programming" }
    ],
    "schedules": [
      {
        "id": "sched-1",
        "day_of_week": 1,
        "start_time": "16:00",
        "end_time": "17:30"
      },
      {
        "id": "sched-2",
        "day_of_week": 3,
        "start_time": "16:00",
        "end_time": "17:30"
      }
    ]
  },
  "approved_at": "2026-02-07T14:45:00Z",
  "approved_by": "admin-user-id-123"
}
```

### Kody statusu odpowiedzi

- **200 OK** - Oferta pomyślnie zatwierdzona
- **400 Bad Request** - Nieprawidłowe ID (nie UUID format)
- **401 Unauthorized** - Brak autoryzacji (no JWT token)
- **403 Forbidden** - Użytkownik nie ma uprawnień (not admin)
- **404 Not Found** - Oferta nie znaleziona
- **409 Conflict** - Oferta nie jest w statusie pending_review (już approved/rejected)
- **422 Unprocessable Entity** - Business logic error
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /admin/offers/{offerId}/approve       │
│    Headers: Authorization: Bearer <token>                   │
│    Body: {} (empty)                                          │
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
│ 5. Pobranie oferty z bazy                                    │
│    - SELECT * FROM offers WHERE id = offerId                │
│    - Include categories, schedules                           │
│    - Return 404 jeśli not found                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Walidacja statusu oferty                                  │
│    - Check if status === 'pending_review'                    │
│    - Return 409 jeśli not pending (już published/rejected)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Przywołaj OfferService.approveOffer()                    │
│    - Przekaż: offerId, admin userId, timestamp              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. OfferService Logic - Transakcja                           │
│                                                               │
│    a) Aktualizacja statusu oferty:                          │
│       - UPDATE offers                                        │
│       - SET status = 'published', updated_at = NOW()        │
│       - WHERE id = offerId                                  │
│       - Verify row affected (1)                              │
│                                                               │
│    b) Ustawienie published_at timestamp:                    │
│       - SET published_at = (jeśli null, set NOW())          │
│       - Preserve jeśli już ustawione (republish scenario)   │
│                                                               │
│    c) Logowanie w historii:                                 │
│       - INSERT INTO offer_history                           │
│       - action: 'approved', actor_id, timestamp              │
│       - metadata: {approved_by_admin: userId}               │
│                                                               │
│    d) Obsługa błędów:                                       │
│       - Transaction rollback jeśli co fails                  │
│       - Return appropriate error                             │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Pobranie zaktualizowanej oferty                           │
│    - SELECT * FROM offers WHERE id = offerId                │
│    - Include all relations (categories, schedules, etc)      │
│    - Mapuj na PublicOfferDetailsDto                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Wysłanie emaila powiadomienia (async)                    │
│     - Queue job: send_offer_approved_email                  │
│     - Organizer email, offer title, link                     │
│     - Don't block response on email success                 │
│     - Log failures                                           │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 11. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: AdminApproveOfferResponseDto                       │
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
  return 409 Conflict - Already processed;
}

// 3. Transakcja: Approve offer
const { data: updated, error: updateError } = await supabase
  .from('offers')
  .update({
    status: 'published',
    published_at: offer.published_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq('id', offerId)
  .select(`
    *,
    categories:offer_categories(id, name),
    schedules:offer_schedules(id, day_of_week, start_time, end_time)
  `)
  .single();

if (updateError || updated.rowCount === 0) {
  return 500 Database Error;
}

// 4. Logowanie w historii
const { error: historyError } = await supabase
  .from('offer_history')
  .insert({
    offer_id: offerId,
    action: 'approved',
    actor_id: adminUserId,
    actor_type: 'admin',
    metadata: { approved_by_admin: adminUserId },
    created_at: new Date().toISOString(),
  });

if (historyError) {
  logger.error('Failed to log offer approval', { historyError, offerId });
  // Nie blokuj response na logging failure
}

// 5. Wysłanie emaila (async)
await emailQueue.add('offer_approved', {
  offerId,
  organizerId: offer.organizer_id,
  organizerEmail: offer.organizer?.email, // fetch separately
  offerTitle: offer.title,
});

// 6. Return
return {
  offer: mapToPublicOfferDetailsDto(updated),
  approved_at: offer.updated_at,
  approved_by: adminUserId,
};
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i Autoryzacja

- **JWT Required**: Musi mieć valid access token
- **Admin Role Required**: Tylko admini mogą zatwierdzać (checked w JWT claims)
- **RLS Policy**: Database RLS policy enforcement
  ```sql
  CREATE POLICY "Admins can approve offers"
    ON offers
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
  ```
- **Audit Trail**: Każda akcja logowana z admin ID

### 6.2 Walidacja danych wejściowych

**Path Parameter Validation:**

```typescript
const offerIdSchema = z.string().uuid('Invalid offer ID format');
```

**No request body** - Upraszcza walidację

### 6.3 Ochrona przed atakami

**Authorization checks:**

```typescript
// Middleware: Verify JWT + role
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

**IDEMPOTENCY (optional but good practice):**

```typescript
// Accept Idempotency-Key header
// If same key within 24h, return cached result
const idempotencyKey = req.headers['idempotency-key'];
if (idempotencyKey) {
  const cached = await redis.get(`approve_${idempotencyKey}`);
  if (cached) return JSON.parse(cached);
}
```

**Rate limiting (optional for admin):**

- Admins might not need rate limiting (trust them)
- But could limit for detection of compromised admin accounts
- E.g., max 100 approvals per hour per admin

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
- **Audit logging**: Admin ID recorded w historii
- **JWT tokens**: Secure, short-lived

### 6.5 Logging i Monitoring

- **Success logging**: Admin approval actions
- **Audit trail**: Complete history w offer_history tabeli
- **Suspicious activity**: Alert na wiele fast approvals
- **Sentry**: Error tracking für database/service failures

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz              | Status | Error Code         | Message                                      | Przyczyna         |
| ----------------------- | ------ | ------------------ | -------------------------------------------- | ----------------- |
| Zatwierdzenie pomyślne  | 200    | -                  | -                                            | Success           |
| Brak JWT token          | 401    | `AUTH_ERROR`       | "Unauthorized"                               | Missing token     |
| Invalid JWT token       | 401    | `AUTH_ERROR`       | "Invalid token"                              | Token malformed   |
| Rola nie admin          | 403    | `AUTH_ERROR`       | "Forbidden - Admin access required"          | Not admin         |
| Invalid offerId format  | 400    | `VALIDATION_ERROR` | "Invalid offer ID format"                    | Not UUID          |
| Oferta nie znaleziona   | 404    | `NOT_FOUND`        | "Offer not found"                            | ID doesn't exist  |
| Oferta już opublikowana | 409    | `CONFLICT`         | "Offer is already published"                 | Status != pending |
| Oferta odrzucona        | 409    | `CONFLICT`         | "Cannot approve rejected offer"              | Status = rejected |
| Database error          | 500    | `DATABASE_ERROR`   | "Internal server error"                      | DB failure        |
| Email sending failed    | 500    | `EMAIL_ERROR`      | "Approval succeeded but notification failed" | Email service     |

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

**401 Unauthorized:**

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Unauthorized - Valid JWT token required",
    "details": []
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
        "message": "Only administrators can approve offers"
      }
    ]
  }
}
```

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Offer not found",
    "details": [
      {
        "field": "offerId",
        "message": "No offer found with the specified ID"
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
    "message": "Cannot approve this offer",
    "details": [
      {
        "field": "status",
        "message": "Offer is already published. Only pending_review offers can be approved."
      }
    ]
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Failed to approve offer",
    "details": []
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Database UPDATE**: Update offers table
   - **Rozwiązanie**: Indexed on id (primary key), indexed on status

2. **History INSERT**: Logging action
   - **Rozwiązanie**: Async insert (enqueue if needed)

3. **Email sending**: Async queue
   - **Rozwiązanie**: Background job, don't block response

### 8.2 Strategie optymalizacji

**Database indexing:**

```sql
-- Primary key index (default)
CREATE UNIQUE INDEX idx_offers_id ON offers(id);

-- Status index for filtering
CREATE INDEX idx_offers_status ON offers(status);

-- Timestamp index for sorting/range queries
CREATE INDEX idx_offers_updated_at ON offers(updated_at DESC);
```

**Query optimization:**

```typescript
// Select only needed fields initially (if fullcopy not needed)
// But for admin, return full details for transparency
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
  // history logging could be slow, queue separately
]).catch(err => logger.error('Async tasks failed', err));
```

**Caching (optional):**

```typescript
// Cache offer details for short period
const cacheKey = `offer_${offerId}`;
await redis.setex(cacheKey, 60, JSON.stringify(offer)); // 1 minute
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 300ms (SELECT + UPDATE + SELECT)
- **P95**: < 600ms
- **P99**: < 1000ms

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Utwórz strukturę folderów:
   - `src/services/admin.service.ts` - logika admin operacji
   - `src/controllers/admin.controller.ts` - handler HTTP
   - `src/middleware/admin-role.middleware.ts` - admin authorization
   - `src/validators/admin.validator.ts` - walidacja

2. Zainstaluj/zweryfikuj dependencies:
   - `@supabase/supabase-js` client
   - `jsonwebtoken` для JWT verification
   - `zod` dla walidacji

3. Skonfiguruj Supabase:
   - RLS policies dla admin operations
   - offer_history table
   - offer_categories, offer_schedules relations

**Deliverables:**

- Folder struktura
- Dependencies installed
- RLS policies configured

---

### Faza 2: Admin Role Middleware

**Kroki:**

1. Stwórz `AdminRoleMiddleware`:

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
     } catch {
       return res.status(401).json(unauthorizedError);
     }
   };
   ```

2. Testy:
   - Valid admin token → next()
   - Non-admin token → 403
   - Missing token → 401
   - Invalid token → 401

**Deliverables:**

- Admin middleware
- Middleware tests

---

### Faza 3: Walidacja Parametrów

**Kroki:**

1. Stwórz `AdminValidator`:

   ```typescript
   const approveOfferSchema = z.object({
     offerId: z.string().uuid('Invalid offer ID format'),
   });
   ```

2. Implementuj:
   - UUID format validation
   - Parse path parameters

3. Testy:
   - Valid UUID → pass
   - Invalid UUID → throw
   - Missing parameter → throw

**Deliverables:**

- `validators/admin.validator.ts`
- Unit tests

---

### Faza 4: Implementacja Service Layer

**Kroki:**

1. Stwórz `AdminService.approveOffer()`:

   ```typescript
   async approveOffer(
     offerId: string,
     adminUserId: string
   ): Promise<AdminApproveOfferResponseDto> {
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
   - Status validation
   - Transactional update
   - History logging
   - Email queuing
   - Error handling

3. Testy integracyjne:
   - Approve pending offer → 200 with published status
   - Approve already published → 409
   - Approve rejected → 409
   - Offer not found → 404
   - History logged → verify in DB
   - Email queued → verify in Redis

**Deliverables:**

- `admin.service.ts` with approveOffer()
- Integration tests

---

### Faza 5: Implementacja Controller/Handler

**Kroki:**

1. Stwórz `AdminController.approveOffer()`:

   ```typescript
   async approveOffer(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const { offerId } = validateAdminParams(req.params);
       const result = await adminService.approveOffer(offerId, req.user.id);
       res.status(200).json(result);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Route:

   ```typescript
   router.post(
     '/admin/offers/:offerId/approve',
     adminRoleRequired,
     adminController.approveOffer.bind(adminController),
   );
   ```

3. Testy:
   - Valid approve → 200
   - Not admin → 403
   - No token → 401
   - Invalid offerId → 400
   - Offer not found → 404

**Deliverables:**

- `admin.controller.ts`
- Route registered
- Controller tests

---

### Faza 6: Email Notifications Setup

**Kroki:**

1. Setup email template (Mailjet):

   ```
   Subject: Your offer has been approved!

   Hi [Organizer Name],

   Great news! Your offer "[Offer Title]" has been approved and is now live.

   [View Offer Button]

   Best regards,
   Kidosy Admin Team
   ```

2. Queue implementation:
   - Use Bull/RabbitMQ untuk background jobs
   - Job handler sends email via Mailjet
   - Retry logic dla failed sends

3. Test:
   - Email sent after approval
   - Email contains correct details
   - Retry on failure

**Deliverables:**

- Email template
- Queue job handler
- Email tests

---

### Faza 7: Logging i Audit Trail

**Kroki:**

1. Implementuj audit logging:

   ```typescript
   // In offer_history table
   const { error: historyError } = await supabase.from('offer_history').insert({
     offer_id: offerId,
     action: 'approved',
     actor_id: adminUserId,
     actor_type: 'admin',
     metadata: {
       approved_by_admin: adminUserId,
       timestamp: new Date().toISOString(),
     },
   });
   ```

2. Setup logging:
   - Success logging
   - Error logging (with details)
   - Suspicious activity alerts

3. Monitoring:
   - Approval rate per admin
   - Average approval time
   - Error rate

**Deliverables:**

- Audit logging implemented
- Sentry configured
- Monitoring dashboards

---

### Faza 8: E2E Testing

**Kroki:**

1. Setup test environment:
   - Test Supabase instance
   - Test admin user với admin role
   - Test pending offers
   - Email queue mock

2. E2E tests:

   ```typescript
   // Successful approval
   const response = await request(app)
     .post(`/admin/offers/${pendingOffer.id}/approve`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({})
     .expect(200);
   expect(response.body.offer.status).toBe('published');
   expect(response.body.approved_by).toBe(adminUserId);

   // Not admin - should fail
   await request(app)
     .post(`/admin/offers/${pendingOffer.id}/approve`)
     .set('Authorization', `Bearer ${organizerToken}`)
     .send({})
     .expect(403);

   // Already published - should fail
   const publishedOffer = { ...pendingOffer, status: 'published' };
   await request(app)
     .post(`/admin/offers/${publishedOffer.id}/approve`)
     .set('Authorization', `Bearer ${adminToken}`)
     .send({})
     .expect(409);

   // Email queued
   const emailJobs = await emailQueue.getJobs(['pending']);
   expect(emailJobs.length).toBeGreaterThan(0);
   ```

3. Load testing:
   - 50 concurrent approvals
   - Verify no race conditions
   - Verify all emails queued

**Deliverables:**

- E2E tests passing
- Load tests passing

---

### Faza 9: Deployment

**Kroki:**

1. Code review
   - Security review (authorization, audit logging)
   - Storage efficiency за историю

2. Staging deployment
   - Test met real Supabase staging
   - Verify RLS policies working
   - Test email sending

3. Production deployment
   - Blue-green strategy
   - Smoke tests
   - Monitor error rates

4. Monitoring:
   - Approval rate
   - Error distribution
   - Email delivery rate
   - P50/P95/P99 latencies

**Deliverables:**

- Production deployed
- Monitoring active

---

## Checklist implementacji

- [ ] **Setup**:
  - [ ] Service/Controller/Middleware folders created
  - [ ] Dependencies installed
  - [ ] RLS policies configured

- [ ] **Admin Authorization**:
  - [ ] JWT verification
  - [ ] Admin role check middleware
  - [ ] Route protected
  - [ ] Tests passing

- [ ] **Walidacja**:
  - [ ] UUID format validation
  - [ ] Path parameter parsing
  - [ ] Unit tests

- [ ] **Service Layer**:
  - [ ] approveOffer() implemented
  - [ ] Offer fetching with relations
  - [ ] Status validation (pending_review only)
  - [ ] Transactional update
  - [ ] History logging
  - [ ] Email queuing
  - [ ] Error handling
  - [ ] Integration tests

- [ ] **Controller/Route**:
  - [ ] POST /admin/offers/{offerId}/approve registered
  - [ ] Admin middleware integrated
  - [ ] All status codes (200/400/401/403/404/409/500)

- [ ] **Email Setup**:
  - [ ] Template configured
  - [ ] Queue job handler
  - [ ] Retry logic
  - [ ] Tests passing

- [ ] **Audit Logging**:
  - [ ] History INSERT logged
  - [ ] Admin ID tracked
  - [ ] Timestamp recorded

- [ ] **Monitoring**:
  - [ ] Sentry configured
  - [ ] Approval rate metrics
  - [ ] Error rate tracking
  - [ ] Alert rules

- [ ] **Testing**:
  - [ ] Unit tests middleware/validator
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
  - [ ] Admin flow documented

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

---

## Zasoby i referencje

- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Supabase Realtime**: https://supabase.com/docs/guides/realtime
- **Bull Queue**: https://github.com/OptimalBits/bull
- **JWT Best Practices**: https://tools.ietf.org/html/rfc7519
- **Express.js**: https://expressjs.com/

---

## Notes

- **Admin only**: Zawsze wymagać admin role w middleware
- **No overwriting**: Jeśli status != pending_review, zwróć 409 (nie blind overwrite)
- **Transactional safety**: Update + history insert in transaction
- **Idempotency**: Czy endpoint powinien być idempotent? (admin approves twice = fail or success?)
  - Current: Fail with 409 (safer)
  - Alternative: Add Idempotency-Key header support
- **Email async**: Nie blokuj response na email, queue job
- **Audit trail**: MUSI być, dla compliance i debugging
- **Role verification**: JWT zawiera role claim (trusted source)
- **Published_at**: Set once na first approval (nie overwrite jeśli republish)
- **Updated_at**: ZAWSZE update with current timestamp
- **Offer relations**: Return full offer details dla transparency
- **History metadata**: Store all relevant info (who, when, why jeśli reject)
