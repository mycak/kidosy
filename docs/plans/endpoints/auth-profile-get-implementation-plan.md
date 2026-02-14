# API Endpoint Implementation Plan: GET /auth/profile

## 1. Przegląd punktu końcowego

Endpoint **GET /auth/profile** zwraca profil zalogowanego użytkownika. Zawiera podstawowe informacje o koncie, dane organizatora (jeśli applicable), preferencje, i metadane konta.

Proces pobierania:

1. Walidacja autentykacji (JWT token required)
2. Pobranie user_id z tokenu
3. Pobranie profilu z bazy
4. Zwrócenie kompletnych danych profilu

Endpoint obsługuje:

- JWT-based authentication
- Parent/Guardian profiles
- Organizer profiles (with additional fields)
- Account metadata (creation date, last login, etc.)

Odpowiedź zawiera wszystkie dane profilu zalogowanego użytkownika.

---

## 2. Szczegóły żądania

### Metoda HTTP

**GET**

### Struktura URL

```
GET /api/v1/auth/profile
```

### Request Headers

```
Authorization: Bearer <access_token>
```

### Przykład żądania

```bash
curl -X GET "https://api.kidosy.pl/auth/profile" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 3. Wykorzystywane typy

### DTO Types (Response)

```typescript
// Response
AuthProfileResponseDto = {
  profile: ProfileDto;
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
  // Parent/Guardian specific (if applicable)
  parent?: ParentProfileDto;
  // Organizer specific (if applicable)
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

NotificationSettingsDto = {
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
  digest_frequency: 'daily' | 'weekly' | 'none';
};

SocialMediaDto = {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
};

type UserRole = 'parent' | 'organizer' | 'admin';
type VerificationStatus = 'unverified' | 'pending' | 'verified';
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK) - Parent

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
      "bio": "Rodzic trójki dzieci, zainteresowany wszelkim kształceniem",
      "avatar_url": "https://cdn.kidosy.pl/avatars/parent-123.jpg",
      "notification_settings": {
        "email_notifications": true,
        "sms_notifications": false,
        "marketing_emails": false,
        "digest_frequency": "weekly"
      },
      "children_count": 3
    }
  }
}
```

### Odpowiedź sukcesu (200 OK) - Organizer

```json
{
  "profile": {
    "id": "user-550e8400-e29b-41d4-a716-446655440001",
    "email": "organizer@example.com",
    "name": "Maria Nowak",
    "phone": "+48987654321",
    "role": "organizer",
    "email_verified": true,
    "created_at": "2025-01-10T08:00:00Z",
    "last_login": "2026-02-07T14:15:00Z",
    "organizer": {
      "id": "org-456",
      "organization_name": "Tech Academy Poland",
      "bio": "Nowoczesne warsztaty programowania dla dzieci",
      "avatar_url": "https://cdn.kidosy.pl/avatars/org-456.jpg",
      "website": "https://techacademy.pl",
      "social_media": {
        "facebook": "https://facebook.com/techacademy",
        "instagram": "https://instagram.com/techacademy",
        "linkedin": "https://linkedin.com/company/techacademy",
        "twitter": "https://twitter.com/techacademy"
      },
      "verification_status": "verified",
      "total_offers": 15,
      "upcoming_offers": 3,
      "active_leads": 42,
      "notification_settings": {
        "email_notifications": true,
        "sms_notifications": true,
        "marketing_emails": true,
        "digest_frequency": "daily"
      }
    }
  }
}
```

### Kody statusu odpowiedzi

- **200 OK** - Profil pomyślnie pobrany
- **401 Unauthorized** - Brak autoryzacji / Invalid token
- **404 Not Found** - Profil nie znaleziony (edge case)
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: GET /auth/profile                          │
│    Headers: Authorization: Bearer <token>                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Walidacja JWT Token                                       │
│    - Extract token z Authorization header                    │
│    - Verify signature                                        │
│    - Check expiration                                        │
│    - Extract user_id z payload                              │
│    - Return 401 jeśli invalid/expired                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Pobranie profilu z bazy                                   │
│    - SELECT * FROM users WHERE id = user_id                 │
│    - Include role information                                │
│    - Return 404 jeśli not found                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie rolę-specific data                               │
│    - IF role = 'parent':                                     │
│      - SELECT * FROM parent_profiles WHERE user_id          │
│      - SELECT COUNT(*) FROM children WHERE parent_id        │
│    - IF role = 'organizer':                                 │
│      - SELECT * FROM organizer_profiles WHERE user_id       │
│      - SELECT COUNT(*) FROM offers WHERE organizer_id       │
│      - SELECT COUNT(*) upcoming offers                       │
│      - SELECT COUNT(*) active leads                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Pobranie notification settings                            │
│    - SELECT * FROM notification_settings WHERE user_id      │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Update last_login timestamp                               │
│    - UPDATE users SET last_login = NOW() WHERE id           │
│    - Async (don't block response)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Mapowanie na ProfileDto                                   │
│    - Combine user data + role-specific data                  │
│    - Include notification settings                           │
│    - Format timestamps as ISO 8601                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: AuthProfileResponseDto                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Required**: Must have valid token
- **Token Validation**: Verify signature + expiration

### 6.2 Autoryzacja

- **User can only access own profile**
- Return 401 if trying to access different user's profile

### 6.3 Data Handling

- **Sensitive data**: never expose password hashes
- **PII Protection**: Follow GDPR guidelines
- **Verifiable data**: email_verified flag only

---

## 7. Obsługa błędów

| Scenariusz       | Status | Error Code       | Message             |
| ---------------- | ------ | ---------------- | ------------------- |
| Profil pobrany   | 200    | -                | Success             |
| Brak JWT         | 401    | `AUTH_ERROR`     | "Unauthorized"      |
| JWT expired      | 401    | `AUTH_ERROR`     | "Token expired"     |
| Invalid JWT      | 401    | `AUTH_ERROR`     | "Invalid token"     |
| Profil not found | 404    | `NOT_FOUND`      | "Profile not found" |
| Database error   | 500    | `DATABASE_ERROR` | "Internal error"    |

---

## 8. Wydajność

### 8.1 Caching

- **Response caching**: Cache for 1 minute per user
- **Cache key**: `profile:${userId}`
- **Invalidate on**: profile update, notification settings change

### 8.2 Response Time

- **P50**: < 150ms
- **P95**: < 300ms
- **P99**: < 500ms

### 8.3 Database Queries

```sql
-- Main query
SELECT u.*, p.* FROM users u
LEFT JOIN parent_profiles p ON u.id = p.user_id
LEFT JOIN organizer_profiles o ON u.id = o.user_id
WHERE u.id = $1;

-- Counts (separate for performance)
SELECT COUNT(*) FROM children WHERE parent_id = $1;
SELECT COUNT(*) FROM offers WHERE organizer_id = $1 AND status = 'published';
```

---

## 9. Etapy wdrażania

### Faza 1: Schema & Data Model

- Verify users table structure
- Verify parent_profiles table
- Verify organizer_profiles table
- Verify notification_settings table

### Faza 2: Service Layer

- profileService.getProfile(userId)
- Aggregating role-specific data
- Unit tests

### Faza 3: Last Login Update

- Async job to update last_login
- No blocking

### Faza 4: Controller/Route

- GET /auth/profile
- JWT middleware

### Faza 5: Response Formatting

- Map domain models to DTO
- ISO 8601 timestamps

### Faza 6: Caching

- Redis setup
- Cache invalidation strategy

### Faza 7: E2E Testing

- Parent profile retrieval
- Organizer profile retrieval
- Auth validation
- Cache working

### Faza 8: Deployment

- Staging
- Production

---

## Checklist

- [ ] Schema verified
- [ ] Service layer implemented
- [ ] JWT middleware
- [ ] Role-specific data queries
- [ ] Notification settings
- [ ] Controller/route
- [ ] Caching strategy
- [ ] Response formatting
- [ ] E2E tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **No authentication required**: This endpoint requires JWT
- **Caching**: Can cache for short duration (1 min)
- **Last login**: Update asynchronously to not block response
- **Role-specific data**: Efficiently query based on role
- **Data completeness**: Include both user + role-specific fields
