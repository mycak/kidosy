# API Endpoint Implementation Plan: POST /auth/password-reset

## 1. Przegląd punktu końcowego

Endpoint **POST /auth/password-reset** inicjuje proces resetowania hasła dla użytkownika, który zapomniał swojego hasła. Endpoint wysyła email z linkiem resetującym do Supabase, a następnie Supabase wysyła email do użytkownika z instrukcjami resetowania hasła.

Proces resetowania hasła:

1. Walidacja danych wejściowych
2. Sprawdzenie czy email istnieje w systemie (bez ujawniania)
3. Przywołanie Supabase API do generacji reset linku
4. Wysłanie emaila resetującego (Supabase obsługuje)
5. Zwrócenie potwierdzenia dla frontendu

Endpoint obsługuje:

- "Forgot password" flow
- Email-based password reset
- Supabase-managed reset links
- Rate limiting na żądania resetowania (prevent spam)
- Bezpieczne linkowanie (linki ważne 24h)

Odpowiedź zwraca potwierdzenie że email został wysłany (bez ujawniania czy email istnieje).

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/auth/password-reset
```

### Parametry

**Brak Path/Query Parameters**

### Request Headers

```
Content-Type: application/json
```

**Uwaga:** Nie wymaga Authorization - endpoint publiczny

### Request Body (PasswordResetRequestDto)

```json
{
  "email": "organizer@example.com"
}
```

### Wymagane pola

- `email` (string) - Adres email do resetowania hasła

### Opcjonalne pola

- Brak

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Główny typ żądania
PasswordResetRequestDto = {
  email: string;
};
```

### DTO Types (Response)

```typescript
// Odpowiedź przyPassword Reset
PasswordResetResponseDto = {
  message: string;
  reset_sent: boolean;
};
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

**Ważne:** Endpoint zawsze zwraca 200 OK z `reset_sent: true` niezależnie czy email istnieje, aby zapobiec user enumeration. W rzeczywistości:

- Jeśli email istnieje → Supabase wysyła reset link
- Jeśli email nie istnieje → Nic się nie dzieje (no row updated)

```json
{
  "message": "If the email address exists in our system, you will receive a password reset link within minutes.",
  "reset_sent": true
}
```

### Kody statusu odpowiedzi

- **200 OK** - Żądanie resetowania hasła zostało przetworzone (zawsze dla security)
- **400 Bad Request** - Nieprawidłowe dane wejściowe (brakujące pole, błędny format email)
- **429 Too Many Requests** - Zbyt wiele prób resetowania hasła z tego IP
- **500 Internal Server Error** - Błąd serwera (błąd Supabase, błąd wysyłania emaila)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /auth/password-reset                  │
│    Headers: Content-Type: application/json                  │
│    Body: PasswordResetRequestDto JSON                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Rate Limiting Check                                       │
│    - Sprawdzenie IP: max 5 reset requests per godzinę       │
│    - Sprawdzenie email: max 3 reset requests per 24h        │
│    - Return 429 jeśli limit przekroczony                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja schematu (Zod)                                 │
│    - Parse request body jako PasswordResetRequestDto         │
│    - Sprawdzenie wymaganych pól (email)                     │
│    - Sprawdzenie formatu emaila                              │
│    - Return 400 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Normalizacja emaila                                        │
│    - Lowercase, trim whitespace                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Sprawdzenie Rate Limit per email                         │
│    - Track per email (3 resets per 24h)                     │
│    - Increment counter                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Przywołaj AuthService.requestPasswordReset()             │
│    - Przekaż: email                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. AuthService Logic                                         │
│                                                               │
│    a) Supabase resetPassword:                               │
│       - supabase.auth.resetPasswordForEmail(email)          │
│       - Supabase sends reset link (24h valid)               │
│       - No error even if email doesn't exist                │
│                                                               │
│    b) Logging:                                               │
│       - Log reset request (attempt-based, not outcome)       │
│       - Do not reveal if email exists                        │
│                                                               │
│    c) Return:                                               │
│       - Always return success message                        │
│       - Nie ujawniaj czy email istnieje                     │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Wysłanie emaila (async - Supabase obsługuje)             │
│    - Supabase wysyła reset link automatycznie               │
│    - Email ważny przez 24 godziny                           │
│    - Link zawiera reset token                                │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: PasswordResetResponseDto                           │
│     Message: Generic security message                        │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z Supabase Auth

```typescript
// 1. Supabase: Request password reset
const { data, error } = await supabase.auth.resetPasswordForEmail(
  normalizedEmail,
  {
    redirectTo: `https://kidosy.pl/auth/reset-password?token=change_me`, // Base URL
  },
);

// Supabase obsługuje wszystko:
// - Sprawdzenie czy email istnieje (ale nie ujawnia)
// - Generacja secure reset token
// - Wysyła email z resetPasswordForEmail subject
// - Token valid dla 24h

// 2. Return neutral message (zawsze success dla security)
if (error) {
  // Log error (nie ujawniaj)
  logger.error('Password reset error', { error, email: maskEmail(email) });
  // Ale zwróć neutral message
  return {
    message: 'If the email address exists...',
    reset_sent: true,
  };
}

// 3. Log success attempt
logger.info('Password reset requested', {
  email: maskEmail(email),
  ip: req.ip,
  timestamp: new Date(),
});

// 4. Return success
return {
  message:
    'If the email address exists in our system, you will receive a password reset link within minutes.',
  reset_sent: true,
};
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i Autoryzacja

- **Public endpoint**: Password reset dostępny dla wszystkich
- **No authentication**: Endpoint nie wymaga JWT (forgot password flow)
- **Email verification**: Nie wymagane (user może mieć unverified email i resetować hasło)
- **Reset token**: Supabase generuje secure tokens (24h expiry)
- **One-time tokens**: Token może być użyty tylko raz

### 6.2 Walidacja danych wejściowych

**Schema walidacja (Zod):**

```typescript
const passwordResetSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase().trim(),
});
```

**Walidacja biznesowa:**

- Email musi być RFC 5322 compliant
- Normalizacja emaila (lowercase, trim)
- No additional business rules - prosty flow

### 6.3 Ochrona przed atakami

**Rate limiting (prevent spam & enumeration):**

```typescript
// Max 5 reset requests per hour per IP
const ipKey = `password_reset_ip_${req.ip}`;
const ipCount = await redis.incr(ipKey);
if (ipCount === 1) {
  await redis.expire(ipKey, 3600); // 1 hour
}
if (ipCount > 5) {
  return 429 Too Many Requests;
}

// Max 3 reset requests per email per 24h (soft limit)
const emailKey = `password_reset_email_${normalizedEmail}`;
const emailCount = await redis.incr(emailKey);
if (emailCount === 1) {
  await redis.expire(emailKey, 86400); // 24 hours
}
// Track but allow (dla soft monitoring, nie hard block)
```

**User enumeration prevention:**

- Always return 200 OK with generic message
- Never reveal if email exists or doesn't exist
- No difference in response time (constant time operations)

**Email security:**

- Supabase sends reset links (HTTPS URLs)
- Token valid only 24 hours
- Token used for one-time reset only
- Old password remains valid until new one set

**CORS i ograniczenia**

```
Access-Control-Allow-Origin: https://kidosy.pl
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 6.4 Ochrona danych

- **Parametryzowane zapytania**: Supabase handlel
- **Email normalizacja**: Lowercase + trim (consistency)
- **SSL/TLS**: Cała komunikacja encrypted (HTTPS only)
- **Reset tokens**: Secure, short-lived (24h)
- **Token storage**: Nie loguj tokens w plain text

### 6.5 Logging i Monitoring

- **Logowanie żądań**: Log każdy attempt (nie outcome, bo chcemy privacy)
- **Email masking**: Nie loguj pełnych emaili (GDPR)
- **Anomalii detection**: Wiele reset requests z tego samego IP
- **Email sending monitoring**: Track email delivery rate
- **Sentry**: Error tracking dla Supabase failures

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                   | Status | Error Code         | Message                                     | Przyczyna           |
| ---------------------------- | ------ | ------------------ | ------------------------------------------- | ------------------- |
| Reset pomyślnie zainicjowany | 200    | -                  | -                                           | Success             |
| Brakuje emaila               | 400    | `VALIDATION_ERROR` | "email is required"                         | Missing field       |
| Email nieprawidłowy format   | 400    | `VALIDATION_ERROR` | "Invalid email format"                      | Bad format          |
| Zbyt wiele żądań na IP       | 429    | `RATE_LIMIT`       | "Too many reset attempts from this address" | Rate limit IP       |
| Błąd Supabase                | 500    | `AUTH_ERROR`       | "Password reset failed"                     | Auth service error  |
| Błąd wysyłania emaila        | 500    | `EMAIL_ERROR`      | "Internal server error"                     | Email service error |

**Uwaga:** Endpoint zawsze zwraca 200 OK niezależnie od tego czy email istnieje, aby zapobiec user enumeration!

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code: 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'AUTH_ERROR' | 'EMAIL_ERROR';
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
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

**429 Too Many Requests:**

```json
{
  "error": {
    "code": "RATE_LIMIT",
    "message": "Too many reset attempts from this address",
    "details": [
      {
        "field": "request",
        "message": "Maximum 5 reset requests per hour allowed. Please try again later."
      }
    ]
  }
}
```

**500 Internal Server Error:**

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Password reset failed. Please try again later."
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Supabase Auth resetPassword**: Network call do Supabase
   - **Rozwiązanie**: Async operation (nie blokuj response)

2. **Email sending**: Async przez Supabase
   - **Rozwiązanie**: Supabase obsługuje асинхронnie

3. **Redis rate limiting**: Rate limit checks
   - **Rozwiązanie**: Redis jest szybkie (< 5ms)

### 8.2 Strategie optymalizacji

**Async Supabase call:**

```typescript
// Don't wait for email sending
supabase.auth.resetPasswordForEmail(email).catch((error) => {
  logger.error('Reset password email failed', { error });
});

// Return immediately
return {
  message: 'If the email address exists...',
  reset_sent: true,
};
```

**Redis optimization:**

```typescript
// Use pipeline dla wielu operations
const pipeline = redis.pipeline();
pipeline.incr(`password_reset_ip_${req.ip}`);
pipeline.incr(`password_reset_email_${email}`);
// Execute both in one round trip
```

**Indeksowanie:**

```sql
-- Rate limiting optimize (niezbędne w Redis, nie w DB)
-- Ale jeśli auditingujemy w DB:
CREATE INDEX idx_password_reset_attempts_email ON audit_logs(email, created_at);
CREATE INDEX idx_password_reset_attempts_ip ON audit_logs(ip_address, created_at);
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 200ms (validation + rate limit check only, async Supabase)
- **P95**: < 400ms
- **P99**: < 800ms

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Zweryfikuj strukturę folderów z /auth/login:
   - `src/services/auth.service.ts` - logika autentykacji
   - `src/controllers/auth.controller.ts` - handler HTTP
   - `src/validators/auth.validator.ts` - walidacja

2. Zainstaluj/zweryfikuj dependencies:
   - `@supabase/supabase-js` client
   - `redis` dla rate limiting
   - `zod` dla walidacji

3. Skonfiguruj Supabase:
   - Email provider configured (SMTP)
   - Password reset email template
   - Redirect URL dla reset link

**Deliverables:**

- Supabase configured
- Email template ready
- Redirect URL working

---

### Faza 2: Walidacja schematu

**Kroki:**

1. Rozbuduj `PasswordResetValidator`:
   - `validatePasswordResetDto(data: unknown): PasswordResetRequestDto`
   - `validateEmailFormat(email: string): void`
   - `normalizeEmail(email: string): string` (lowercase + trim)

2. Implementuj Zod schema:

   ```typescript
   const passwordResetSchema = z.object({
     email: z.string().email('Invalid email format').toLowerCase().trim(),
   });
   ```

3. Testy jednostkowe:
   - Valid data - pass
   - Missing email - throw
   - Invalid format - throw
   - Email normalization (uppercase → lowercase)
   - Whitespace trimming

**Deliverables:**

- `validators/auth.validator.ts` with password reset validation
- Unit tests

---

### Faza 3: Implementacja Rate Limiting

**Kroki:**

1. Rozbuduj rate limiting middleware:

   ```typescript
   export const passwordResetRateLimit = async (req, res, next) => {
     const ipKey = `password_reset_ip_${req.ip}`;
     const ipCount = await redis.incr(ipKey);
     if (ipCount === 1) {
       await redis.expire(ipKey, 3600);
     }
     if (ipCount > 5) {
       return res.status(429).json(rateLimitError);
     }
     next();
   };
   ```

2. Email-based soft tracking:

   ```typescript
   // W service, nie w middleware (for logging purposes)
   const emailKey = `password_reset_email_${normalizedEmail}`;
   const count = await redis.incr(emailKey);
   if (count === 1) {
     await redis.expire(emailKey, 86400); // 24h
   }
   // Log if high (3+)
   if (count > 3) {
     logger.warn('Many password resets for email', {
       email: maskEmail(email),
       count,
     });
   }
   ```

3. Test:
   - 1-5 requests OK (per IP)
   - 6th request → 429
   - After 1 hour → reset

**Deliverables:**

- IP-based rate limit
- Email-based tracking (soft)
- Tests

---

### Faza 4: Implementacja warstwa serwisu

**Kroki:**

1. Stwórz/rozbuduj `AuthService.requestPasswordReset()`:

   ```typescript
   async requestPasswordReset(email: string): Promise<PasswordResetResponseDto> {
     // 1. Normalize email
     // 2. Call Supabase resetPasswordForEmail()
     // 3. Log attempt
     // 4. Return neutral message
   }
   ```

2. Implementuj:
   - Email normalizacja (lowercase + trim)
   - Supabase auth.resetPasswordForEmail()
   - Error handling (log but hide)
   - Generic response message
   - Email tracking (soft limit)

3. Testy integracyjne:
   - Valid email - 200 with message
   - Invalid email format - handled by validator
   - Supabase error - log but return 200
   - Email tracking

**Deliverables:**

- `auth.service.ts` with requestPasswordReset() method
- Integration tests

---

### Faza 5: Implementacja controller/handler

**Kroki:**

1. Stwórz `AuthController.requestPasswordReset()`:

   ```typescript
   async requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const dto = await validatePasswordResetDto(req.body);
       const result = await authService.requestPasswordReset(dto.email);
       res.status(200).json(result);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Route:

   ```typescript
   router.post(
     '/auth/password-reset',
     passwordResetRateLimit,
     authController.requestPasswordReset.bind(authController),
   );
   ```

3. Testy:
   - Valid email → 200
   - Invalid data → 400
   - Rate limit → 429

**Deliverables:**

- `auth.controller.ts` with requestPasswordReset() method
- Route registered
- Controller tests

---

### Faza 6: Email Template i Supabase Config

**Kroki:**

1. Supabase Email Template Setup:

   ```
   Temat: Reset your Kidosy password

   Content:
   Hello,

   Click the link below to reset your password.
   Link valid for 24 hours.

   [Reset Password Button → {{ .ConfirmationURL }}]

   If you didn't request this, ignore this email.
   ```

2. Redirect URL configuration:
   - Link format: `https://kidosy.pl/auth/reset-password?token={{ .TokenHash }}`
   - Frontend handles token extraction and password update

3. Test email sending:
   - Send to test email
   - Verify link format
   - Verify token in link
   - Verify 24h expiry

**Deliverables:**

- Email template configured
- Redirect URL working
- Test emails received

---

### Faza 7: Logging i Monitoring

**Kroki:**

1. Implementuj logging:

   ```typescript
   // Log reset request attempt
   logger.info(`Password reset requested`, {
     email: maskEmail(email),
     ip: req.ip,
     timestamp: new Date(),
   });

   // Log failures (soft)
   if (count > 3) {
     logger.warn('Multiple password resets', {
       email: maskEmail(email),
       count,
     });
   }
   ```

2. Setup Sentry:
   - Error tracking dla Supabase failures
   - Rate limit monitoring

3. Monitoring:
   - Reset requests per hour
   - Email delivery rate
   - Error rate

**Deliverables:**

- Logging implementation
- Sentry configured
- Monitoring dashboards

---

### Faza 8: E2E testing

**Kroki:**

1. Setup test environment:
   - Supabase instance
   - Redis for rate limiting
   - Test email account

2. E2E tests:

   ```typescript
   // Valid email - but don't check if email exists
   const response = await request(app)
     .post('/auth/password-reset')
     .send({ email: testUser.email })
     .expect(200);
   expect(response.body.reset_sent).toBe(true);

   // Invalid email format
   await request(app)
     .post('/auth/password-reset')
     .send({ email: 'invalid-email' })
     .expect(400);

   // Rate limit
   for (let i = 0; i < 7; i++) {
     const res = await request(app)
       .post('/auth/password-reset')
       .send({ email: testUser.email });
     if (i < 5) expect(res.status).toBe(200);
     if (i === 5) expect(res.status).toBe(429);
   }

   // Email verification (manual: check inbox, verify reset link)
   ```

3. Load testing:
   - 50 concurrent reset requests
   - Verify rate limiting works
   - Monitor email queue

**Deliverables:**

- E2E tests passing
- Load tests passing
- Manual email verification done

---

### Faza 9: Deployment

**Kroki:**

1. Code review
   - Security review (rate limiting, no user enumeration)
   - Email template review

2. Staging deployment
   - Test with real Supabase staging
   - Test email sending
   - Smoke tests

3. Production deployment
   - Blue-green deployment
   - Smoke tests
   - Monitor error rates

4. Monitoring:
   - Reset request rate
   - Email delivery rate
   - Fail rate

**Deliverables:**

- Production deployed
- Monitoring active

---

## Checklist implementacji

- [ ] **Schema Walidacja**:
  - [ ] Zod schema created
  - [ ] Email format validation
  - [ ] Email normalization (lowercase + trim)
  - [ ] Unit tests

- [ ] **Rate Limiting**:
  - [ ] Redis configured
  - [ ] Max 5 per hour per IP
  - [ ] Email tracking (soft, non-blocking)
  - [ ] Tests passing

- [ ] **Service Layer**:
  - [ ] requestPasswordReset() implemented
  - [ ] Email normalization
  - [ ] Supabase integration
  - [ ] Error handling (no revealing)
  - [ ] Generic response message
  - [ ] Integration tests

- [ ] **Controller/Route**:
  - [ ] POST /auth/password-reset registered
  - [ ] Rate limit middleware integrated
  - [ ] All status codes (200/400/429/500)

- [ ] **Email Setup**:
  - [ ] Template configured in Supabase
  - [ ] Redirect URL configured
  - [ ] Email sending tested
  - [ ] Reset link valid 24h

- [ ] **Logging**:
  - [ ] Reset requests logged
  - [ ] Email masked in logs
  - [ ] IP captured
  - [ ] Multiple resets flagged

- [ ] **Monitoring**:
  - [ ] Sentry configured
  - [ ] Request rate metrics
  - [ ] Email delivery monitoring
  - [ ] Alert rules

- [ ] **Testing**:
  - [ ] Unit tests validator
  - [ ] Integration tests service
  - [ ] E2E tests all scenarios
  - [ ] Load tests
  - [ ] Manual email verification

- [ ] **Security**:
  - [ ] No user enumeration
  - [ ] Rate limiting per IP
  - [ ] Email masking in logs
  - [ ] HTTPS enforced
  - [ ] Generic error messages
  - [ ] Reset tokens 24h expiry

- [ ] **Documentation**:
  - [ ] OpenAPI spec updated
  - [ ] Email template documented
  - [ ] Reset flow documented

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

---

## Zasoby i referencje

- **Supabase Auth Documentation**: https://supabase.com/docs/guides/auth
- **Supabase Password Reset**: https://supabase.com/docs/guides/auth/auth-password-reset
- **RFC 5322 (Email)**: https://tools.ietf.org/html/rfc5322
- **OWASP Authentication Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Redis Documentation**: https://redis.io/
- **Express.js**: https://expressjs.com/

---

## Notes

- **Supabase Auth**: Obsługuje complete password reset flow (token generation, email sending)
- **Reset token**: Ważny 24 godziny, one-time use only
- **User enumeration**: ZAWSZE zwróć 200 OK, nigdy nie ujawniaj czy email istnieje
- **Rate limiting**: Per IP (hard limit), per email (soft tracking)
- **Email async**: Supabase wysyła asynchronicznie, nie blokuj response
- **Generic message**: "If the email exists..." - zapobiega user enumeration
- **Email normalization**: Lowercase + trim - consistency dla tracking
- **Logging**: Log wszystko, ale bez ujawniania informacji
- **Redirect URL**: Frontend musi ekstrahować token z URL i użyć go do reset-password confirmation
- **Security headers**: HTTPS required, Content-Security-Policy good practice
- **Email template**: Bez HTML, czystą tekst lub HTML template (dla deliverability)
