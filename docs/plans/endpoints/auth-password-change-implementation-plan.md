# API Endpoint Implementation Plan: POST /auth/password-change

## 1. Przegląd punktu końcowego

Endpoint **POST /auth/password-change** umożliwia zalogowanemu użytkownikowi zmianę hasła. Wymagane jest potwierdzenie starego hasła przed zmianą. Endpoint waliduje dane, zmienia hasło w Supabase Auth i bazie danych, oraz wysyła potwierdzenie emailem.

Proces zmiany hasła:

1. Walidacja autentykacji (JWT token required)
2. Pobranie użytkownika z bazy
3. Walidacja starego hasła
4. Walidacja nowego hasła (siła, requirements)
5. Zmiana hasła w Supabase Auth
6. Zmiana hasła w bazie danych (hashed backup)
7. Wysłanie potwierdzenia emailem
8. Logowanie zdarzenia bezpieczeństwa
9. Invalidate all other sessions (optional logout)
10. Zwrócenie potwierdzenia

Endpoint obsługuje:

- JWT-based authentication
- Old password verification
- Password strength validation
- Supabase Auth integration
- Email confirmation
- Security logging
- Session invalidation

Odpowiedź zawiera potwierdzenie zmiany hasła.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/auth/password-change
```

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Request Body (ChangePasswordRequestDto)

```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "new_password_confirm": "NewPassword456!"
}
```

### Wymagane pola

- `current_password` (string) - Obecne hasło
- `new_password` (string) - Nowe hasło
- `new_password_confirm` (string) - Potwierdzenie nowego hasła

### Wymagania dla hasła

- Minimum 12 znaków
- Muset zawierać: uppercase, lowercase, number, special character
- Nie może być takie samo jak poprzednie (check last 5 hashes)
- Nie może zawierać imię/email

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/auth/password-change" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "current_password": "OldPassword123!",
    "new_password": "NewPassword456!",
    "new_password_confirm": "NewPassword456!"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Request body
ChangePasswordRequestDto = {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
};
```

### DTO Types (Response)

```typescript
// Response
ChangePasswordResponseDto = {
  success: boolean;
  message: string;
  confirmation_sent: boolean;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (200 OK)

```json
{
  "success": true,
  "message": "Hasło zostało zmienione pomyślnie. Wysłaliśmy potwierdzenie na Twój email.",
  "confirmation_sent": true
}
```

### Kody statusu odpowiedzi

- **200 OK** - Hasło pomyślnie zmienione
- **400 Bad Request** - Nieprawidłowe dane wejściowe
- **401 Unauthorized** - Brak autoryzacji lub stare hasło nieprawidłowe
- **409 Conflict** - Nowe hasło jest takie samo jak stare
- **422 Unprocessable Entity** - Hasło nie spełnia wymagań
- **500 Internal Server Error** - Błąd serwera

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /auth/password-change                 │
│    Headers: Authorization: Bearer <token>                   │
│    Body: ChangePasswordRequestDto                           │
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
│    - current_password: required, non-empty                   │
│    - new_password: required, 12+ chars                       │
│    - Passwords musí pasować (confirm)                        │
│    - Return 400 jeśli invalid                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Pobranie danych użytkownika z bazy                        │
│    - SELECT * FROM users WHERE id = user_id                 │
│    - Include email, password_hash                            │
│    - Return 404 jeśli not found                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Walidacja starego hasła                                   │
│    - Verify current_password against password_hash          │
│    - Use bcrypt.compare()                                    │
│    - Return 401 jeśli mismatch                              │
│    - Log failed attempt (security)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Walidacja siły nowego hasła                               │
│    - Min 12 chars                                             │
│    - Must contain: uppercase, lowercase, number, special     │
│    - Cannot contain email or name                             │
│    - Return 422 jeśli too weak                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Sprawdzenie password history                              │
│    - SELECT last 5 password_hashes                           │
│    - Verify new_password not in history                      │
│    - Return 409 jeśli duplicate                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Update hasła w Supabase Auth                              │
│    - Call supabase.auth.updateUser()                         │
│    - Pass: user_id, new_password                             │
│    - Return 500 jeśli fails (retry logic)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Update hasła w bazie danych (backup)                      │
│    - Hash new_password with bcrypt (rounds: 12)              │
│    - UPDATE users SET password_hash = ...                    │
│    - Keep history: INSERT INTO password_history             │
│    - old_hash, new_hash, changed_at, ip_address             │
│    - Transakcja (all or nothing)                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Logowanie zdarzenia bezpieczeństwa                       │
│     - INSERT INTO security_log                              │
│     - event: 'password_changed'                              │
│     - user_id, ip_address, timestamp                         │
│     - Check for suspicious activity                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 11. Wysłanie potwierdzenia emailem (async)                   │
│     - Queue job: send_password_change_confirmation           │
│     - Template: password_change_confirmation.html            │
│     - Include warning about unusual activity                 │
│     - Include link to revert (if within 24h)                │
│     - Don't block response                                   │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 12. Invalidate inne sesje (optional)                         │
│     - DELETE FROM sessions WHERE user_id != current_session │
│     - Wyloguj z innych urządzeń                              │
│     - Rationale: Jeśli ktoś zmienia hasło z nieznanego      │
│                  urządzenia, może chcieć wylogować innych    │
│     - Async operation                                        │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 13. Zwróć odpowiedź JSON                                     │
│     Status: 200 OK                                           │
│     Body: ChangePasswordResponseDto                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja

- **JWT Required**: Must have valid token
- **Old password verification**: REQUIRED before allowing change

### 6.2 Password Policy

```typescript
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  allowedSpecialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

function validatePasswordStrength(
  password: string,
  email: string,
  name: string,
): boolean {
  // Check length
  if (password.length < 12) return false;

  // Check character types
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) return false;

  // Check for email/name
  if (password.toLowerCase().includes(email.toLowerCase())) return false;
  if (password.toLowerCase().includes(name.toLowerCase())) return false;

  return true;
}
```

### 6.3 Rate Limiting

```typescript
// Per user: max 5 password change attempts per 24h
const userKey = `password_change_${userId}`;
const userCount = await redis.incr(userKey);
if (userCount === 1) {
  await redis.expire(userKey, 86400); // 24h
}
if (userCount > 5) {
  return 429 Too Many Requests;
}

// Per IP: max 10 password change attempts per hour
const ipKey = `password_change_ip_${req.ip}`;
const ipCount = await redis.incr(ipKey);
if (ipCount === 1) {
  await redis.expire(ipKey, 3600);
}
if (ipCount > 10) {
  return 429 Too Many Requests;
}
```

### 6.4 Brute Force Protection

- Failed attempt logging with IP tracking
- Notify user of unusual activity via email
- Optional: Alert if attempt from new IP

### 6.5 Database Security

- Never log passwords (even hashed) in user-facing logs
- Use bcrypt with 12 rounds for hashing
- Keep password_history for audit trail

---

## 7. Obsługa błędów

| Scenariusz             | Status | Error Code         | Message                               |
| ---------------------- | ------ | ------------------ | ------------------------------------- |
| Zmieniono              | 200    | -                  | Success                               |
| Pola brakują           | 400    | `VALIDATION_ERROR` | "Missing required fields"             |
| Hasła się nie zgadzają | 400    | `VALIDATION_ERROR` | "Passwords do not match"              |
| Brak JWT               | 401    | `AUTH_ERROR`       | "Unauthorized"                        |
| Stare hasło błędne     | 401    | `AUTH_ERROR`       | "Current password is incorrect"       |
| Hasło zbyt słabe       | 422    | `WEAK_PASSWORD`    | "Password does not meet requirements" |
| Duplicate hasła        | 409    | `CONFLICT`         | "New password must be different"      |
| Zbyt wiele prób        | 429    | `RATE_LIMIT`       | "Too many attempts"                   |
| Database error         | 500    | `DATABASE_ERROR`   | "Internal error"                      |

---

## 8. Wydajność

### 8.1 Response Time

- **P50**: < 400ms (includes Supabase call)
- **P95**: < 800ms
- **P99**: < 2000ms

---

## 9. Etapy wdrażania

### Faza 1: Password Policy

- Define requirements
- Unit tests for validation

### Faza 2: Hashing & Security

- bcrypt configuration
- Password history table

### Faza 3: Service Layer

- changePassword() method
- Supabase Auth integration
- Transaction handling

### Faza 4: Rate Limiting

- Redis setup
- Per-user + per-IP limits

### Faza 5: Email Templates

- Password change confirmation
- Security alert template

### Faza 6: Security Logging

- Failed attempts logging
- Success logging with metrics

### Faza 7: Session Invalidation

- Logout other sessions (optional)
- Current session remains valid

### Faza 8: E2E Testing

- Successful change
- Old password verification
- Weak password rejection
- Duplicate password check
- Rate limiting
- Email confirmation

### Faza 9: Deployment

- Staging
- Production

---

## Checklist

- [ ] Password policy defined + tested
- [ ] Bcrypt configuration (12 rounds)
- [ ] Password history table
- [ ] Service layer implemented
- [ ] Supabase Auth integration
- [ ] Rate limiting (Redis)
- [ ] Email templates
- [ ] Security logging
- [ ] Session invalidation (optional)
- [ ] JWT middleware
- [ ] E2E tests
- [ ] Documentation
- [ ] Production deployed

---

## Notes

- **Old password verification**: CRITICAL - Never skip
- **Password strength**: Enforce strong requirements
- **Rate limiting**: Prevent brute force
- **Email confirmation**: Alert user of change
- **Security logging**: Track all attempts
- **Session invalidation**: Improves security posture
- **Supabase Auth**: Primary source of truth
- **Bcrypt rounds**: Use 12 for balance between security and performance
