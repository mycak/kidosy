# API Endpoint Implementation Plan: PATCH /auth/profile

## 1. Przegląd punktu końcowego

Endpoint **PATCH /auth/profile** umożliwia zalogowanemu użytkownikowi aktualizowanie informacji o profilu. Może to być zmiana imienia, numeru telefonu, awatara, biographii, czy preferencji powiadomień. Endpoint waliduje dane, aktualizuje bazę i zwraca zaktualizowany profil.

Proces aktualizacji:

1. Walidacja autentykacji (JWT token required)
2. Pobranie profilu z bazy
3. Walidacja danych wejściowych
4. Aktualizacja polów
5. Logowanie zmian (audit trail)
6. Zwrócenie zaktualizowanego profilu

Endpoint obsługuje:

- JWT-based authentication
- Parent/Guardian profile updates
- Organizer profile updates
- Notification settings changes
- Avatar upload validation
- Email change (with verification)

Odpowiedź zawiera zaktualizowany profil.

---

## 2. Szczegóły żądania

### Metoda HTTP

**PATCH**

### Struktura URL

```
PATCH /api/v1/auth/profile
```

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Request Body (UpdateProfileRequestDto)

```json
{
  "name": "Jan Kowalski",
  "phone": "+48123456789",
  "bio": "Nowa biografia",
  "avatar_url": "https://cdn.kidosy.pl/avatars/new-avatar.jpg",
  "notification_settings": {
    "email_notifications": true,
    "sms_notifications": false,
    "marketing_emails": false,
    "digest_frequency": "weekly"
  },
  "organizer_data": {
    "organization_name": "Tech Academy Poland",
    "website": "https://techacademy.pl",
    "social_media": {
      "facebook": "https://facebook.com/techacademy",
      "instagram": "https://instagram.com/techacademy"
    }
  }
}
```

### Wymagane pola

- Brak - wszystkie pola opcjonalne

### Opcjonalne pola

- `name` (string, 2-100) - Your full name
- `phone` (string) - Phone number
- `bio` (string, max 500) - Biography/description
- `avatar_url` (string, URL) - Avatar image URL
- `notification_settings` (object) - Notification preferences
  - `email_notifications` (boolean)
  - `sms_notifications` (boolean)
  - `marketing_emails` (boolean)
  - `digest_frequency` ('daily' | 'weekly' | 'none')
- `organizer_data` (object, only for organizers)
  - `organization_name` (string, 2-100)
  - `website` (string, URL)
  - `social_media` (object)
    - `facebook` (string, URL)
    - `instagram` (string, URL)
    - `linkedin` (string, URL)
    - `twitter` (string, URL)

### Przykład żądania

```bash
curl -X PATCH "https://api.kidosy.pl/auth/profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "name": "Jan Kowalski",
    "phone": "+48123456789",
    "notification_settings": {
      "email_notifications": true,
      "digest_frequency": "weekly"
    }
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Request body
UpdateProfileRequestDto = {
  name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  notification_settings?: Partial<NotificationSettingsDto>;
  organizer_data?: Partial<UpdateOrganizerDataDto>;
};

UpdateOrganizerDataDto = {
  organization_name?: string;
  website?: string;
  social_media?: Partial<SocialMediaDto>;
};

NotificationSettingsDto = {
  email_notifications?: boolean;
  sms_notifications?: boolean;
  marketing_emails?: boolean;
  digest_frequency?: 'daily' | 'weekly' | 'none';
};
```

### DTO Types (Response)

```typescript
// Response
UpdateProfileResponseDto = {
  profile: ProfileDto;
  updated_fields: Array<string>;
};

ProfileDto = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: UserRole;
  email_verified: boolean;
  created_at: string;
  last_login: string;
  parent?: ParentProfileDto;
  organizer?: OrganizerProfileDto;
};

ParentProfileDto = {
  id: string;
  bio: string;
  avatar_url: string;
  notification_settings: NotificationSettingsDto;
  children_count: number;
};

OrganizerProfileDto = {
  id: string;
  organization_name: string;
  bio: string;
  avatar_url: string;
  website: string;
  social_media: SocialMediaDto;
  verification_status: VerificationStatus;
  total_offers: number;
  upcoming_offers: number;
  active_leads: number;
  notification_settings: NotificationSettingsDto;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "profile": {
    "id": "user-550e8400-e29b-41d4-a716-446655440000",
    "email": "parent@example.com",
    "name": "Jan Kowalski",
    "phone": "+48123456789",
    "role": "parent",
    "email_verified": true,
    "created_at": "2025-06-15T10:00:00Z",
    "last_login": "2026-02-07T16:30:00Z",
    "parent": {
      "id": "parent-123",
      "bio": "Nowa biografia",
      "avatar_url": "https://cdn.kidosy.pl/avatars/new-avatar.jpg",
      "notification_settings": {
        "email_notifications": true,
        "sms_notifications": false,
        "marketing_emails": false,
        "digest_frequency": "weekly"
      },
      "children_count": 3
    }
  },
  "updated_fields": [
    "name",
    "phone",
    "bio",
    "avatar_url",
    "notification_settings"
  ]
}
```

### Kody statusu odpowiedzi

- **200 OK** - Profil pomyślnie zaktualizowany
- **400 Bad Request** - Nieprawidłowe dane wejściowe
- **401 Unauthorized** - Brak autoryzacji
- **409 Conflict** - Duplicate data (e.g., email already exists)
- **422 Unprocessable Entity** - Business logic error
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: PATCH /auth/profile                        │
│    Headers: Authorization: Bearer <token>                   │
│    Body: UpdateProfileRequestDto                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja JWT Token                                       │
│    - Extract user_id                                         │
│    - Verify token validity                                   │
│    - Return 401 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja Request Body (Zod)                             │
│    - name: optional, 2-100 chars                             │
│    - phone: optional, valid format                           │
│    - bio: optional, max 500 chars                            │
│    - avatar_url: optional, valid URL                         │
│    - notification settings: optional, valid enums            │
│    - organizer_data: optional, validate if provided          │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie bieżącego profilu z bazy                         │
│    - SELECT * FROM users WHERE id = user_id                 │
│    - Include current notification_settings                   │
│    - Return 404 jeśli not found                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Przywołaj ProfileService.updateProfile()                 │
│    - Przekaż: userId, updates                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. ProfileService Logic - Transakcja                         │
│                                                               │
│    a) Budowanie update query:                               │
│       - Iterate over provided fields                        │
│       - Use COALESCE to preserve unspecified values         │
│       - SET updated_at = NOW()                              │
│                                                               │
│    b) Update główny profil:                                 │
│       - UPDATE users SET ... WHERE id = user_id             │
│       - Update only non-null fields                          │
│                                                               │
│    c) Update notification settings:                          │
│       - IF notification_settings provided:                   │
│         - UPDATE notification_settings WHERE user_id         │
│       - MERGE with existing settings                        │
│                                                               │
│    d) Update role-specific data:                            │
│       - IF role = 'parent' AND parent_data:                 │
│         - UPDATE parent_profiles WHERE user_id              │
│       - IF role = 'organizer' AND organizer_data:           │
│         - UPDATE organizer_profiles WHERE user_id           │
│       - Validate organizer_data (only for organizers)       │
│                                                               │
│    e) Logowanie zmian:                                      │
│       - INSERT INTO profile_history                         │
│       - action: 'update'                                     │
│       - metadata: {old, new, changed_fields}                │
│                                                               │
│    f) Obsługa błędów:                                       │
│       - Transaction rollback jeśli fails                     │
│       - Return 500 w razie problemu                         │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Pobranie zaktualizowanego profilu                         │
│    - SELECT * FROM users WHERE id = user_id                 │
│    - Include all role-specific data                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Invalidate Cache                                          │
│    - DEL profile:${userId} z Redis                          │
│    - Async operation                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: UpdateProfileResponseDto                           │
│     Include updated_fields array                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja & Autoryzacja

- **JWT Required**: Must have valid token
- **Own profile only**: Can only update own profile

### 6.2 Walidacja Danych

```typescript
const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]+$/)
    .optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  notification_settings: z
    .object({
      email_notifications: z.boolean().optional(),
      sms_notifications: z.boolean().optional(),
      marketing_emails: z.boolean().optional(),
      digest_frequency: z.enum(['daily', 'weekly', 'none']).optional(),
    })
    .optional(),
  organizer_data: z
    .object({
      organization_name: z.string().min(2).max(100).optional(),
      website: z.string().url().optional(),
      social_media: z
        .object({
          facebook: z.string().url().optional(),
          instagram: z.string().url().optional(),
          linkedin: z.string().url().optional(),
          twitter: z.string().url().optional(),
        })
        .optional(),
    })
    .optional(),
});
```

### 6.3 Data Protection

- **Sensitive fields**: email cannot be changed via this endpoint
- **Organizer data**: Only accessible if user role = 'organizer'
- **GDPR compliance**: Track all changes in audit log

---

## 7. Obsługa błędów

| Scenariusz                | Status | Error Code         | Message                        |
| ------------------------- | ------ | ------------------ | ------------------------------ |
| Zaktualizowano            | 200    | -                  | Success                        |
| Invalid name              | 400    | `VALIDATION_ERROR` | "Name must be 2-100 chars"     |
| Invalid phone             | 400    | `VALIDATION_ERROR` | "Invalid phone format"         |
| Invalid URL               | 400    | `VALIDATION_ERROR` | "avatar_url must be valid URL" |
| Brak JWT                  | 401    | `AUTH_ERROR`       | "Unauthorized"                 |
| Organizer data for parent | 409    | `CONFLICT`         | "Cannot update organizer data" |
| Database error            | 500    | `DATABASE_ERROR`   | "Internal error"               |

---

## 8. Wydajność

### 8.1 Response Time

- **P50**: < 250ms
- **P95**: < 500ms
- **P99**: < 1000ms

---

## 9. Etapy wdrażania

### Faza 1: Schema & Validation

- Zod schemas
- Unit tests for validation

### Faza 2: Service Layer

- updateProfile() method
- Transaction handling
- COALESCE safety

### Faza 3: Audit Logging

- profile_history table
- Change tracking

### Faza 4: Controller/Route

- PATCH /auth/profile
- JWT middleware

### Faza 5: Cache Invalidation

- Redis cache cleanup on update

### Faza 6: E2E Testing

- Update name
- Update phone
- Update bio
- Update notification settings
- Update organizer data (for organizers)
- Validation errors

### Faza 7: Deployment

- Staging
- Production

---

## Checklist

- [ ] Zod schema validation
- [ ] Service layer implemented
- [ ] Transaction handling
- [ ] Audit logging
- [ ] Controller/route
- [ ] Cache invalidation
- [ ] JWT middleware
- [ ] Role-based access control
- [ ] E2E tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **COALESCE safety**: Use COALESCE to preserve unspecified fields
- **Own profile only**: Never allow updating other users
- **Audit trail**: Track all changes
- **Cache invalidation**: Must invalidate on update
- **Role-specific data**: Validate role before allowing organizer_data updates
