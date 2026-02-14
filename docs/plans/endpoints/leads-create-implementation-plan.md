# API Endpoint Implementation Plan: POST /leads

## 1. Przegląd punktu końcowego

Endpoint **POST /leads** umożliwia rodzicom/opiekunom zgłaszanie zainteresowania daną ofertą. Parent/guardian zainteresowany może przesłać swoje dane kontaktowe i informacje o dziecku/dzieciach, aby wyrazić zainteresowanie udziałem w konkretnej ofercie. Endpoint automatycznie tworzy "lead" (potencjalny uczestnik) który trafia do organizatora.

Proces tworzenia leada:

1. Walidacja autentykacji (może być zalogowany parent lub anonimowy)
2. Walidacja danych wejściowych
3. Pobranie oferty i sprawdzenie czy jest dostępna
4. Sprawdzenie czy parent już zgłosił zainteresowanie tą ofertą
5. Utworzenie rekordu leada
6. Wysłanie emaila do organizatora o nowym leadzie
7. Wysłanie emaila do parenta/guardiana z potwierdzeniem
8. Zwrócenie potwierdzenia z lead ID

Endpoint obsługuje:

- Parent/guardian registration (email, name, phone)
- Dzieci/uczestniczki (names, ages)
- Contact preferences (email, phone, SMS)
- Existing offer validation
- Duplicate prevention (parent nie może zgłosić dwa razy tej samej oferty)
- Email notifications (organizer, parent)

Odpowiedź zawiera created lead ID, status, i potwierdzenie zainteresowania.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/offers/{offerId}/leads
```

### Parametry

**Path Parameters:**

- `offerId` (string, UUID) - ID oferty, w której parent jest zainteresowany

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token> (optional - parent nie musi być zalogowany)
```

### Request Body (CreateLeadRequestDto)

```json
{
  "email": "parent@example.com",
  "phone": "+48123456789",
  "name": "Jan Kowalski",
  "children": [
    {
      "name": "Anna Kowalska",
      "age": 10,
      "interests": ["programming", "technology"]
    },
    {
      "name": "Piotr Kowalski",
      "age": 8,
      "interests": ["sports"]
    }
  ],
  "contact_preference": "email",
  "additional_message": "Bardzo zainteresowani, proszę o informacje o wpisowym.",
  "consent_marketing": true,
  "consent_communication": true
}
```

### Wymagane pola

- `email` (string) - Email rodzica/opiekuna
- `phone` (string) - Numer telefonu
- `name` (string) - Imię i nazwisko rodzica/opiekuna
- `children` (array) - Min 1 dziecko
  - `name` (string) - Imię dziecka
  - `age` (number) - Wiek dziecka (1-100)
- `contact_preference` (enum) - Preferowany sposób kontaktu
- `consent_communication` (boolean) - Zgoda na komunikację
- `consent_marketing` (boolean) - Zgoda na marketing

### Opcjonalne pola

- `additional_message` (string, max 500) - Dodatkowa wiadomość od rodzica
- `interests` (array per child) - Zainteresowania dziecka

### Walidacja pól

```typescript
Walidacja emaila: RFC 5322 format
Walidacja telefonu: International format (+ country code)
Walidacja imienia: 2-100 znaków
Walidacja wiary dziecka: 1-100 lat
Contact preference: 'email' | 'phone' | 'sms'
```

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/offers/550e8400-e29b-41d4-a716-446655440000/leads" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "parent@example.com",
    "phone": "+48123456789",
    "name": "Jan Kowalski",
    "children": [
      {
        "name": "Anna Kowalska",
        "age": 10
      }
    ],
    "contact_preference": "email",
    "consent_communication": true,
    "consent_marketing": false
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Request body
CreateLeadRequestDto = {
  email: string;
  phone: string;
  name: string;
  children: Array<ChildInputDto>;
  contact_preference: ContactPreference;
  additional_message?: string;
  consent_communication: boolean;
  consent_marketing: boolean;
};

ChildInputDto = {
  name: string;
  age: number;
  interests?: Array<string>;
};

type ContactPreference = 'email' | 'phone' | 'sms';
```

### DTO Types (Response)

```typescript
// Response
CreateLeadResponseDto = {
  lead: LeadDto;
  message: string;
};

LeadDto = {
  id: string;
  offer_id: string;
  parent_email: string;
  parent_name: string;
  parent_phone: string;
  children_count: number;
  status: LeadStatus;
  contact_preference: ContactPreference;
  created_at: string;
  updated_at: string;
};

type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected' | 'archived';
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (201 Created)

```json
{
  "lead": {
    "id": "lead-550e8400-e29b-41d4-a716-446655440000",
    "offer_id": "550e8400-e29b-41d4-a716-446655440000",
    "parent_email": "parent@example.com",
    "parent_name": "Jan Kowalski",
    "parent_phone": "+48123456789",
    "children_count": 1,
    "status": "new",
    "contact_preference": "email",
    "created_at": "2026-02-07T16:30:00Z",
    "updated_at": "2026-02-07T16:30:00Z"
  },
  "message": "Dziękujemy za zainteresowanie! Organizator odezwie się wkrótce."
}
```

### Kody statusu odpowiedzi

- **201 Created** - Lead pomyślnie utworzony
- **400 Bad Request** - Nieprawidłowe dane wejściowe
- **404 Not Found** - Oferta nie znaleziona lub niedostępna
- **409 Conflict** - Parent już zgłosił zainteresowanie tą ofertą (duplicate)
- **422 Unprocessable Entity** - Business logic error (np. brak dostępnych miejsc)
- **429 Too Many Requests** - Zbyt wiele żądań z tego emaila
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /offers/{offerId}/leads               │
│    Body: CreateLeadRequestDto                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Rate Limiting Check                                       │
│    - Per email: max 10 leads per 24h                        │
│    - Per IP: max 50 leads per hour                          │
│    - Return 429 jeśli exceeded                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja schematu (Zod)                                 │
│    - Parse request body                                      │
│    - Validate all fields                                     │
│    - Validate children array                                │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie oferty z bazy                                    │
│    - SELECT * FROM offers WHERE id = offerId                │
│    - Check status = 'published'                              │
│    - Return 404 jeśli not found                             │
│    - Return 404 jeśli not published                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Sprawdzenie dostępności miejsc                            │
│    - available_spots > 0?                                    │
│    - Return 422 jeśli brak miejsc                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Sprawdzenie duplikatów                                    │
│    - SELECT * FROM leads                                     │
│    - WHERE offer_id = offerId                               │
│    - AND parent_email = email                               │
│    - AND status != 'rejected'                               │
│    - Return 409 jeśli już istnieje                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Przywołaj LeadService.createLead()                       │
│    - Przekaż: offerId, email, children, preferences         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. LeadService Logic - Transakcja                            │
│                                                               │
│    a) Tworzenie leada:                                      │
│       - INSERT INTO leads                                    │
│       - Fields: offer_id, parent_email, parent_name, etc.   │
│       - status = 'new'                                       │
│                                                               │
│    b) Tworzenie rekordu dzieci:                             │
│       - INSERT INTO lead_children (multiple)                │
│       - Fields: lead_id, name, age, interests               │
│                                                               │
│    c) Logowanie:                                             │
│       - INSERT INTO lead_history                            │
│       - action: 'created'                                    │
│                                                               │
│    d) Obsługa błędów:                                       │
│       - Transaction rollback jeśli fails                     │
│       - Return 500 w razie problemu                         │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Wysłanie emaili (async)                                   │
│    - Queue: send_lead_notification_to_organizer              │
│    - Queue: send_lead_confirmation_to_parent                 │
│    - Don't block response on email success                  │
│    - Log failures                                            │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Zwróć odpowiedź JSON                                     │
│     Status: 201 Created                                      │
│     Body: CreateLeadResponseDto                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Walidacja danych wejściowych

**Schema (Zod):**

```typescript
const createLeadSchema = z.object({
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone format'),
  name: z.string().min(2).max(100),
  children: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        age: z.number().int().min(1).max(100),
        interests: z.array(z.string()).optional(),
      }),
    )
    .min(1, 'At least one child required'),
  contact_preference: z.enum(['email', 'phone', 'sms']),
  additional_message: z.string().max(500).optional(),
  consent_communication: z.boolean(),
  consent_marketing: z.boolean(),
});
```

### 6.2 Rate Limiting

```typescript
// Per email: max 10 leads per 24h
const emailKey = `leads_email_${email}`;
const emailCount = await redis.incr(emailKey);
if (emailCount === 1) {
  await redis.expire(emailKey, 86400); // 24h
}
if (emailCount > 10) {
  return 429 Too Many Requests;
}

// Per IP: max 50 leads per hour
const ipKey = `leads_ip_${req.ip}`;
const ipCount = await redis.incr(ipKey);
if (ipCount === 1) {
  await redis.expire(ipKey, 3600);
}
if (ipCount > 50) {
  return 429 Too Many Requests;
}
```

### 6.3 Ochrona prywatności

- **GDPR compliance**: Consent flags required (communication, marketing)
- **Data retention**: Delete leads nach 1 Jahr inactivity
- **No password needed**: Parents don't need account
- **Email verification**: Optional (soft requirement)

### 6.4 CORS

```
Access-Control-Allow-Origin: https://kidosy.pl
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 7. Obsługa błędów

| Scenariusz             | Status | Error Code         | Message                                        |
| ---------------------- | ------ | ------------------ | ---------------------------------------------- |
| Lead utworzony         | 201    | -                  | Success                                        |
| Brakuje emaila         | 400    | `VALIDATION_ERROR` | "email is required"                            |
| Email nieprawidłowy    | 400    | `VALIDATION_ERROR` | "Invalid email format"                         |
| Brak dzieci            | 400    | `VALIDATION_ERROR` | "At least one child required"                  |
| Dziecko: wiek < 1      | 400    | `VALIDATION_ERROR` | "Age must be 1-100"                            |
| Oferta nie znaleziona  | 404    | `NOT_FOUND`        | "Offer not found"                              |
| Oferta nie published   | 404    | `NOT_FOUND`        | "Offer not available"                          |
| Brak dostępnych miejsc | 422    | `BUSINESS_ERROR`   | "No spots available"                           |
| Duplicate lead         | 409    | `CONFLICT`         | "You already expressed interest in this offer" |
| Zbyt wiele zgłoszeń    | 429    | `RATE_LIMIT`       | "Too many leads from this email"               |
| Database error         | 500    | `DATABASE_ERROR`   | "Internal server error"                        |

---

## 8. Wydajność

### 8.1 Indeksowanie

```sql
CREATE UNIQUE INDEX idx_leads_offer_email ON leads(offer_id, parent_email, status)
  WHERE status != 'rejected'; -- For duplicate prevention

CREATE INDEX idx_leads_parent_email ON leads(parent_email);
CREATE INDEX idx_leads_offer_id ON leads(offer_id);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
```

### 8.2 Response Time

- **P50**: < 300ms
- **P95**: < 600ms
- **P99**: < 1200ms

---

## 9. Etapy wdrażania

### Faza 1: Setup

- Database schema (leads, lead_children tables)
- Indexes created
- Service/Controller folders

### Faza 2: Walidacja

- Zod schemas
- Unit tests

### Faza 3: Service Layer

- createLead() logic
- Transaction handling
- Email queuing
- Integration tests

### Faza 4: Controller/Route

- Route registered
- Parameter validation

### Faza 5: Email Templates

- Parent confirmation email
- Organizer notification email

### Faza 6: Rate Limiting

- Redis implementation
- Testing

### Faza 7: E2E Testing

- Create lead success
- Validation errors
- Duplicates
- Rate limiting

### Faza 8: Deployment

- Staging
- Production

---

## Checklist

- [ ] Database schema created
- [ ] Indexes created
- [ ] Schema validation
- [ ] Rate limiting (email + IP)
- [ ] Offer validation
- [ ] Duplicate prevention
- [ ] Service layer
- [ ] Controller/route
- [ ] Email templates
- [ ] Email sending
- [ ] E2E tests
- [ ] Security review
- [ ] Performance tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **No authentication required**: Parent nie musi mieć konto
- **Rate limiting**: Essential to prevent spam
- **Consent required**: GDPR compliance (communication + marketing)
- **Duplicate prevention**: Unique index na (offer_id, parent_email, status)
- **Email async**: Queue jobs, don't block response
- **Transaction safety**: All or nothing
