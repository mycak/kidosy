# API Endpoint Implementation Plan: PATCH /organizer/leads/{leadId}

## 1. Przegląd punktu końcowego

Endpoint **PATCH /organizer/leads/{leadId}** umożliwia organizatorowi aktualizowanie statusu i notatek dla konkretnego leada. Organizator może zmienić status leada (new → contacted → converted lub rejected), dodać wewnętrzne notatki, oraz wysłać dla specifico actions jak zaproszenie do warsztatu.

Proces aktualizacji:

1. Walidacja autentykacji (organizer only)
2. Pobranie leada
3. Walidacja uprawnień (lead musi być do jego oferty)
4. Walidacja statusu przejścia (state machine)
5. Aktualizacja leada i logowanie zmian
6. Opcjonalnie wysłanie emaila/SMSa do rodzica
7. Zwrócenie zaktualizowanego leada

Endpoint obsługuje:

- Organizer authorization (lead musi być ze zmienialnej oferty)
- Status transitions (defined state machine)
- Internal notes (only visible to organizer)
- Email/SMS to parent (Optional)
- Audit logging (track all status changes)

Odpowiedź zawiera zaktualizowany lead ze wszystkimi detalami.

---

## 2. Szczegóły żądania

### Metoda HTTP

**PATCH**

### Struktura URL

```
PATCH /api/v1/organizer/leads/{leadId}
```

### Parametry

**Path Parameters:**

- `leadId` (string, UUID) - ID leada do aktualizacji

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Request Body (UpdateLeadRequestDto)

```json
{
  "status": "contacted",
  "notes": "Zadzwonił em, zainteresowani, czeka na odpowiedź",
  "send_message": true,
  "message_type": "email",
  "message_template": "invitation_welcome"
}
```

### Wymagane pola

- `status` (enum) - Nowy status leada

### Opcjonalne pola

- `notes` (string, max 1000) - Wewnętrzne notatki organizatora
- `send_message` (boolean) - Czy wysłać wiadomość do rodzica?
- `message_type` (enum) - Typ wiadomości: 'email' | 'sms' | 'phone_call'
- `message_template` (enum) - Szablon wiadomości

### Dostępne statusy i przejścia

```
new → contacted (parent contacted)
new → rejected (no interest)
contacted → converted (registered/paid)
contacted → rejected (lost interest)
any → archived (old/inactive)
```

### Dostępne szablony wiadomości

```typescript
type MessageTemplate =
  | 'invitation_welcome' // Zaproszenie, witamy
  | 'reminder_register' // Przypomnienie o rejestracji
  | 'reminder_spots_limited' // Ostrzeżenie: kończy się limit miejsc
  | 'payment_required' // Wysłanie linku do płatności
  | 'confirmation' // Potwierdzenie udziału
  | 'custom'; // Custom message (jeśli będzie)
```

### Przykład żądania

```bash
curl -X PATCH "https://api.kidosy.pl/organizer/leads/lead-550e8400" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "status": "contacted",
    "notes": "Zadzwonił em, zainteresowani",
    "send_message": true,
    "message_type": "email",
    "message_template": "invitation_welcome"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Request body
UpdateLeadRequestDto = {
  status: LeadStatus;
  notes?: string;
  send_message?: boolean;
  message_type?: 'email' | 'sms' | 'phone_call';
  message_template?: MessageTemplate;
};

type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected' | 'archived';
type MessageTemplate =
  | 'invitation_welcome'
  | 'reminder_register'
  | 'reminder_spots_limited'
  | 'payment_required'
  | 'confirmation'
  | 'custom';
```

### DTO Types (Response)

```typescript
// Response
UpdateLeadResponseDto = {
  lead: LeadDetailDto;
  status_changed: boolean;
  message_sent?: boolean;
  previous_status: LeadStatus;
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
  status: LeadStatus;
  status_updated_at: string;
  created_at: string;
  notes: string;
};

LeadChildDto = {
  id: string;
  name: string;
  age: number;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "lead": {
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
        "age": 10
      }
    ],
    "status": "contacted",
    "status_updated_at": "2026-02-07T17:45:00Z",
    "created_at": "2026-02-07T16:30:00Z",
    "notes": "Zadzwonił em, zainteresowani, czeka na odpowiedź"
  },
  "status_changed": true,
  "message_sent": true,
  "previous_status": "new"
}
```

### Kody statusu odpowiedzi

- **200 OK** - Lead pomyślnie zaktualizowany
- **400 Bad Request** - Nieprawidłowe dane lub status transition
- **401 Unauthorized** - Brak autoryzacji
- **403 Forbidden** - Nie ma dostępu do tego leada
- **404 Not Found** - Lead nie znaleziony
- **409 Conflict** - Nieprawidłowe przejście statusu
- **422 Unprocessable Entity** - Business logic error
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: PATCH /organizer/leads/{leadId}            │
│    Headers: Authorization: Bearer <token>                   │
│    Body: UpdateLeadRequestDto                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Extract JWT + Verify Organizer Role                      │
│    - Extract user_id (organizer_id)                          │
│    - Return 401/403 jeśli unauthorized                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja Request Body (Zod)                             │
│    - status: valid enum value                                │
│    - notes: max 1000 chars                                   │
│    - message fields (if provided)                            │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie leada z bazy                                     │
│    - SELECT * FROM leads WHERE id = leadId                  │
│    - Include relations (offer, children)                     │
│    - Return 404 jeśli not found                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Walidacja Uprawnień                                       │
│    - Sprawdzenie czy lead jest ze zmienialnej oferty        │
│    - Sprawdzenie czy lead.offer_id matches organizer        │
│    - Return 403 jeśli no access                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Walidacja Status Transition                              │
│    - Check if current_status → new_status is valid          │
│    - Valid paths:                                            │
│      - new → contacted                                       │
│      - new → rejected                                        │
│      - contacted → converted                                 │
│      - contacted → rejected                                  │
│      - any → archived                                        │
│    - Return 409 jeśli invalid transition                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Przywołaj LeadService.updateLead()                       │
│    - Przekaż: leadId, updates, organizerId                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. LeadService Logic - Transakcja                            │
│                                                               │
│    a) Aktualizacja leada:                                   │
│       - UPDATE leads                                         │
│       - SET status = new_status                              │
│       - SET notes = notes (jeśli provided)                  │
│       - SET status_updated_at = NOW()                       │
│       - WHERE id = leadId                                   │
│                                                               │
│    b) Logowanie w historii:                                 │
│       - INSERT INTO lead_history                            │
│       - action: 'status_change'                              │
│       - metadata: {from: old, to: new, notes}               │
│       - organizer_id: userId                                 │
│                                                               │
│    c) Optjonalnie wysłanie wiadomości:                      │
│       - jeśli send_message = true                            │
│       - Queue job (email/SMS) based na format                │
│       - Include template content                             │
│                                                               │
│    d) Obsługa błędów:                                       │
│       - Transaction rollback jeśli fails                     │
│       - Return 500 w razie problemu                         │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Wysłanie wiadomości do rodzica (async)                    │
│    - Queue job: send_lead_message                           │
│    - Choose template content                                 │
│    - Send via email/SMS chosen                               │
│    - Don't block response                                    │
│    - Log in history                                          │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Pobranie zaktualizowanego leada                          │
│     - SELECT * FROM leads WHERE id = leadId                 │
│     - Include all relations                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 11. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: UpdateLeadResponseDto                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja & Autoryzacja

- **JWT Required**: Must have token
- **Organizer Role**: Only organizer can update
- **Access Control**: Can only update leads for own offers (RLS)

### 6.2 Walidacja Danych

```typescript
const updateLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'rejected', 'archived']),
  notes: z.string().max(1000).optional(),
  send_message: z.boolean().optional(),
  message_type: z.enum(['email', 'sms', 'phone_call']).optional(),
  message_template: z.enum([...]).optional(),
});
```

### 6.3 State Machine Validation

```typescript
const validTransitions = {
  new: ['contacted', 'rejected', 'archived'],
  contacted: ['converted', 'rejected', 'archived'],
  converted: ['archived'],
  rejected: ['archived'],
  archived: [],
};

function isValidTransition(from: string, to: string): boolean {
  return validTransitions[from]?.includes(to) ?? false;
}
```

### 6.4 RLS Policy

```sql
CREATE POLICY "Organizers can update their own leads"
  ON leads
  FOR UPDATE
  USING (
    offer_id IN (
      SELECT id FROM offers
      WHERE organizer_id = auth.uid()
    )
  )
  WITH CHECK (
    offer_id IN (
      SELECT id FROM offers
      WHERE organizer_id = auth.uid()
    )
  );
```

---

## 7. Obsługa błędów

| Scenariusz         | Status | Error Code         | Message                     |
| ------------------ | ------ | ------------------ | --------------------------- |
| Zaktualizowano     | 200    | -                  | Success                     |
| Invalid status     | 400    | `VALIDATION_ERROR` | "Invalid status value"      |
| Brak JWT           | 401    | `AUTH_ERROR`       | "Unauthorized"              |
| Not organizer      | 403    | `AUTH_ERROR`       | "Forbidden"                 |
| Lead not found     | 404    | `NOT_FOUND`        | "Lead not found"            |
| Invalid transition | 409    | `CONFLICT`         | "Cannot change from X to Y" |
| Database error     | 500    | `DATABASE_ERROR`   | "Internal error"            |

---

## 8. Wydajność

### 8.1 Response Time

- **P50**: < 250ms
- **P95**: < 500ms
- **P99**: < 1000ms

---

## 9. Etapy wdrażania

### Faza 1: Status Machine

- Define valid transitions
- Unit tests

### Faza 2: Service Layer

- updateLead() method
- Transaction handling

### Faza 3: Message Templates

- Email templates
- SMS templates
- Queue job handling

### Faza 4: Controller/Route

- Route registered

### Faza 5: E2E Testing

- Status changes
- Invalid transitions
- Message sending

### Faza 6: Deployment

- Staging
- Production

---

## Checklist

- [ ] Status machine defined + tested
- [ ] Service layer implemented
- [ ] Email templates
- [ ] Message queuing
- [ ] Controller/route
- [ ] RLS policy
- [ ] Parameter validation
- [ ] E2E tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **State machine**: Essential for data consistency
- **RLS policy**: Critical for security
- **Transactional safety**: All or nothing
- **Async messaging**: Don't block response
- **Audit trail**: Track all status changes
