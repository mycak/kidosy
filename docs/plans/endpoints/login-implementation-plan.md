# API Endpoint Implementation Plan: POST /auth/login

## 1. Przegląd punktu końcowego

Endpoint **POST /auth/login** uwierzytelnia użytkownika (organizatora) używając email i hasła, zwracając JWT access token i refresh token. Endpoint integruje się z Supabase Auth do walidacji poświadczeń i zarządzania sesją.

Proces logowania:

1. Walidacja danych wejściowych
2. Rzeczywista autentykacja w Supabase Auth (email/password)
3. Pobieranie danych profilu organizatora (jeśli potrzebne)
4. Generowanie sesji JWT (Supabase obsługuje)
5. Zwrócenie tokenów i danych użytkownika

Endpoint obsługuje:

- Email/password autentykację
- JWT token generation (access + refresh)
- Pobieranie profilu organizatora po logowaniu
- Rate limiting na failed attempts (brute force protection)
- Weryfikację emaila (wymóg przed dostępem)

Odpowiedź zawiera access token (1h), refresh token (30d), role użytkownika, i podstawowe dane profilu.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/auth/login
```

### Parametry

**Brak Path/Query Parameters**

### Request Headers

```
Content-Type: application/json
```

**Uwaga:** Nie wymaga Authorization - endpoint publiczny

### Request Body (LoginRequestDto)

```json
{
  "email": "organizer@example.com",
  "password": "SecurePassword123!@#"
}
```

### Wymagane pola

- `email` (string) - Adres email do logowania
- `password` (string) - Hasło

### Opcjonalne pola

- Brak

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "SecurePass123!"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Główny typ żądania
LoginRequestDto = {
  email: string;
  password: string;
};
```

### DTO Types (Response)

```typescript
// Odpowiedź przy logowaniu
AuthResponseDto = {
  user: AuthUserDto;
  session: SessionDto;
  profile: OrganizerProfileDto;
};

AuthUserDto = Pick<DbUser, 'id' | 'email' | 'created_at'> & {
  role?: 'admin' | 'organizer';
  email_confirmed_at?: string; // nullable
};

SessionDto = {
  access_token: string;
  refresh_token: string;
  expires_in: number;  // w sekundach, standardowo 3600 (1 godzina)
};

OrganizerProfileDto = {
  user_id: string;
  company_name: string;
  phone: string;
  email_public: string;
  created_at: string;
  updated_at: string;
};
```

### Typy pomocnicze

```typescript
MessageResponseDto = {
  message: string;
};

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
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "organizer@example.com",
    "created_at": "2026-01-15T10:30:00Z",
    "email_confirmed_at": "2026-01-15T10:45:00Z",
    "role": "organizer"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "sbr_1a2b3c4d5e6f7g8h9i0j...",
    "expires_in": 3600
  },
  "profile": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "company_name": "TechKids Sp. z o.o.",
    "phone": "+48123456789",
    "email_public": "kontakt@techkids.pl",
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-15T10:30:00Z"
  }
}
```

### Kody statusu odpowiedzi

- **200 OK** - Użytkownik pomyślnie zalogowany
- **400 Bad Request** - Nieprawidłowe dane wejściowe (brakujące pole, błędny format)
- **401 Unauthorized** - Nieprawidłowe poświadczenia (email lub hasło)
- **403 Forbidden** - Email nie potwierdzony (verification pending)
- **429 Too Many Requests** - Zbyt wiele failed login attempts z tego IP
- **500 Internal Server Error** - Błąd serwera (błąd Supabase, błąd bazy)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /auth/login                           │
│    Headers: Content-Type: application/json                  │
│    Body: LoginRequestDto JSON                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Rate Limiting Check (Failed Attempts)                    │
│    - Sprawdzenie IP: max 10 failed attempts per 15 minut    │
│    - Return 429 jeśli limit przekroczony                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja schematu (Zod)                                 │
│    - Parse request body jako LoginRequestDto                │
│    - Sprawdzenie wymaganych pól (email, password)           │
│    - Sprawdzenie typów                                       │
│    - Return 400 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Walidacja biznesowa                                       │
│    - Email format validation (RFC 5322)                      │
│    - Return 400 jeśli validation fails                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Przywołaj AuthService.login()                            │
│    - Przekaż: LoginRequestDto                               │
│    - Sprawdzenie poświadczeń w Supabase Auth                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. AuthService Logic                                         │
│                                                               │
│    a) Autentykacja Supabase Auth:                           │
│       - supabase.auth.signInWithPassword({email, password}) │
│       - Jeśli error (wrong credentials) → increment failed   │
│       - Return 401 Unauthorized                              │
│       - Jeśli error (email not confirmed) → check status    │
│       - Return 403 Forbidden                                 │
│                                                               │
│    b) Pobieranie profilu organizatora:                      │
│       - SELECT from organizer_profiles                      │
│       - WHERE user_id = authUser.id                         │
│       - Jeśli nie ma profilu → Log warning (data mismatch)  │
│       - Continue z available fields                          │
│                                                               │
│    c) Mapowanie danych:                                     │
│       - Mapuj Supabase user na AuthUserDto                  │
│       - Mapuj profile na OrganizerProfileDto                │
│       - Mapuj session na SessionDto                         │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. Logging                                                    │
│    - Zarejestruj successful login (email, timestamp, IP)     │
│    - Wyczyszcz failed attempts counter dla tego IP          │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Zwróć odpowiedź JSON                                      │
│     Status: 200 OK                                           │
│     Body: AuthResponseDto                                    │
│     Headers: Set-Cookie (optional, dla refresh token)      │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z Supabase Auth i Database

```typescript
// 1. Supabase Auth: Sign in
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: loginDto.email,
  password: loginDto.password,
});

// Jeśli error (wrong credentials):
if (authError?.status === 401) {
  // Increment failed attempts
  await redis.incr(`login_failed_${req.ip}`);
  await redis.expire(`login_failed_${req.ip}`, 900); // 15 minutes
  return 401 Unauthorized;
}

// Jeśli email not confirmed:
if (authData.user && !authData.user.email_confirmed_at) {
  return 403 Forbidden - Email not verified;
}

// 2. Database: Fetch organizer profile
const { data: profile, error: profileError } = await supabase
  .from('organizer_profiles')
  .select('*')
  .eq('user_id', authData.user.id)
  .single();

// Jeśli profile missing (should not happen if DB is consistent):
if (profileError && profileError.code === 'PGRST116') {
  // No row returned - log warning, continue without profile
  logger.warn(`User ${authData.user.id} has no profile`);
}

// 3. Wyczyszcz failed attempts
await redis.del(`login_failed_${req.ip}`);

// 4. Zwróć response
return {
  user: {
    id: authData.user.id,
    email: authData.user.email,
    created_at: authData.user.created_at,
    email_confirmed_at: authData.user.email_confirmed_at,
    role: authData.user.user_metadata?.role || 'organizer',
  },
  session: {
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
    expires_in: authData.session.expires_in,
  },
  profile: profile ? mapProfileDto(profile) : null,
};
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i Autoryzacja

- **Public endpoint**: Login dostępny dla wszystkich
- **Credential validation**: Supabase Auth handlel email/password verification
- **Email verification requirement**: Musi być potwierdzone email_confirmed_at
- **JWT tokens**: Supabase generuje, short-lived (1h access, 30d refresh)
- **Role-based access**: Role zawarty w JWT claims dla authorization w następnych requestach

### 6.2 Walidacja danych wejściowych

**Schema walidacja (Zod):**

```typescript
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});
```

**Walidacja biznesowa:**

- Email format musi być RFC 5322 compliant
- Hasło nie powinno być puste (Supabase zwróci 401)
- No additional business rules - authentication jest prostą
- Nie validuj siłę hasła (przy logowaniu check only w auth)

### 6.3 Ochrona przed atakami

**Brute force protection (rate limiting failed attempts):**

```typescript
// Max 10 failed login attempts per 15 minutes per IP
const failedKey = `login_failed_${req.ip}`;
const failedCount = await redis.get(failedKey);
if (failedCount && parseInt(failedCount) > 10) {
  return 429 Too Many Requests;
}

// On failed auth attempt:
if (authError?.status === 401) {
  const count = await redis.incr(failedKey);
  if (count === 1) {
    await redis.expire(failedKey, 900); // 15 minutes
  }
  return 401 Unauthorized;
}

// On successful auth:
await redis.del(failedKey); // Clear failed attempts
```

**Password security:**

- Supabase obsługuje hashing (bcrypt)
- Nie transmituj hasła w plain text (HTTPS required)
- Hasło zawsze send over encrypted connection

**Email verification:**

- Email musi być potwierdzony (email_confirmed_at is NOT null)
- Zapobiega fake email accounts

**CORS i ograniczenia**

```
Access-Control-Allow-Origin: https://kidosy.pl
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 6.4 Ochrona danych

- **Parametryzowane zapytania**: Supabase handluje
- **No password hashing in app**: Supabase obsługuje
- **SSL/TLS**: Cała komunikacja encrypted (HTTPS only)
- **Session tokens**: Secure, short-lived (1h), refresh tokens dla przedłużenia
- **Token storage**: Nie loguj tokenów, use masked values w logs

### 6.5 Logging i Monitoring

- **Logowanie loginów**: Zarejestruj każdy attempt (email, timestamp, IP) - tylko successful
- **Failed login tracking**: Track failed attempts per IP dla anomaly detection
- **Successful login logging**: Log z hashed email (GDPR compliance)
- **Brute force detection**: Alert na 3+ failed attempts
- **Sentry**: Error tracking dla auth failures

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                 | Status | Error Code         | Message                                        | Przyczyna                  |
| -------------------------- | ------ | ------------------ | ---------------------------------------------- | -------------------------- |
| Login pomyślny             | 200    | -                  | -                                              | Success                    |
| Brakuje emaila             | 400    | `VALIDATION_ERROR` | "email is required"                            | Missing field              |
| Brakuje hasła              | 400    | `VALIDATION_ERROR` | "password is required"                         | Missing field              |
| Email nieprawidłowy format | 400    | `VALIDATION_ERROR` | "Invalid email format"                         | Bad format                 |
| Email nie znaleziony       | 401    | `AUTH_ERROR`       | "Invalid email or password"                    | User doesn't exist         |
| Hasło nieprawidłowe        | 401    | `AUTH_ERROR`       | "Invalid email or password"                    | Wrong password             |
| Email nie potwierdzony     | 403    | `AUTH_ERROR`       | "Email not verified. Please check your inbox." | email_confirmed_at is null |
| Zbyt wiele failed attempts | 429    | `RATE_LIMIT`       | "Too many login attempts. Try again later."    | Brute force attempt        |
| Błąd Supabase Auth         | 500    | `AUTH_ERROR`       | "Authentication failed"                        | Auth service error         |
| Błąd pobierania profilu    | 500    | `DATABASE_ERROR`   | "Internal server error"                        | DB error                   |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'DATABASE_ERROR';
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

**401 Unauthorized (Invalid credentials):**

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid email or password",
    "details": []
  }
}
```

**403 Forbidden (Email not verified):**

```json
{
  "error": {
    "code": "AUTH_ERROR",
    "message": "Email not verified. Please check your inbox for verification link.",
    "details": [
      {
        "field": "email",
        "message": "Email verification is required before login"
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
    "message": "Too many login attempts from this address",
    "details": [
      {
        "field": "request",
        "message": "Maximum 10 failed attempts per 15 minutes allowed. Please try again later."
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
    "message": "Authentication failed. Please try again later."
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Supabase Auth signin**: Network call do Supabase
   - **Rozwiązanie**: Caching disabled (security-sensitive), optimize network

2. **Database query**: Pobieranie profilu organizatora
   - **Rozwiązanie**: Indexed query on user_id, maybe cache profile

3. **Redis operations**: Failed attempt tracking
   - **Rozwiązanie**: Use Redis efficiently, short TTL

### 8.2 Strategie optymalizacji

**Query optimization:**

```sql
-- Indeks na user_id dla szybkiego lookup
CREATE INDEX idx_organizer_profiles_user_id ON organizer_profiles(user_id);
```

**Redis caching login data (optional):**

```typescript
// Cache authenticated user profile dla 1h
const cacheKey = `auth_profile_${authData.user.id}`;
const cached = await redis.get(cacheKey);
if (!cached) {
  // Fetch from DB
  const profile = await fetchOrganizerProfile(authData.user.id);
  await redis.setex(cacheKey, 3600, JSON.stringify(profile)); // 1 hour
}
```

**Parallel operations:**

```typescript
// Fetch profile while preparing response
const [profileData] = await Promise.all([
  supabase
    .from('organizer_profiles')
    .select('*')
    .eq('user_id', authData.user.id)
    .single(),
]);
```

**Indeksowanie:**

```sql
-- Ensure quick user lookups in Supabase Auth (managed by Supabase)
-- Ensure profile lookup is indexed
CREATE INDEX idx_organizer_profiles_lookup ON organizer_profiles(user_id);
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 300ms (Supabase Auth call + DB query)
- **P95**: < 600ms
- **P99**: < 1s

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Utwórz strukturę folderów (jeśli jeszcze nie istnieje):
   - `src/services/auth.service.ts` - logika autentykacji
   - `src/controllers/auth.controller.ts` - handler HTTP
   - `src/validators/auth.validator.ts` - walidacja
   - `src/middleware/rate-limit.middleware.ts` - rate limiting

2. Zainstaluj/zweryfikuj dependencies:
   - `@supabase/supabase-js` client
   - `redis` dla rate limiting
   - `zod` dla walidacji

3. Skonfiguruj Redis:
   - Connection string
   - TTL dla failed attempts (900s = 15 minut)

**Deliverables:**

- Folder struktura
- Dependencies zainstalowane
- Redis configured

---

### Faza 2: Walidacja schematu

**Kroki:**

1. Stwórz/rozbuduj `LoginValidator`:
   - `validateLoginDto(data: unknown): LoginRequestDto`
   - `validateEmailFormat(email: string): void`

2. Implementuj Zod schema:

   ```typescript
   const loginSchema = z.object({
     email: z.string().email('Invalid email format'),
     password: z.string().min(1, 'Password is required'),
   });
   ```

3. Testy jednostkowe:
   - Valid data - pass
   - Missing email - throw
   - Missing password - throw
   - Invalid email format - throw
   - Extra fields - strip

**Deliverables:**

- `validators/auth.validator.ts` with login validation
- Unit tests

---

### Faza 3: Implementacja warstwa serwisu (Login)

**Kroki:**

1. Rozbuduj `AuthService.login()`:

   ```typescript
   async login(dto: LoginRequestDto): Promise<AuthResponseDto> {
     // 1. Auth with Supabase
     // 2. Check email verification
     // 3. Fetch profile
     // 4. Map and return
   }
   ```

2. Implementuj:
   - Supabase auth.signInWithPassword()
   - Email verification check (email_confirmed_at)
   - Profile fetching
   - Proper error mapping (401, 403, 500)
   - Data mapping to AuthResponseDto

3. Testy integracyjne:
   - Login success - 200 with profile
   - Wrong email - 401
   - Wrong password - 401
   - Email not verified - 403
   - Profile missing - handle gracefully

**Deliverables:**

- `auth.service.ts` with login() method
- Integration tests with Supabase

---

### Faza 4: Implementacja Rate Limiting (Failed Attempts)

**Kroki:**

1. Stwórz `LoginRateLimitMiddleware`:

   ```typescript
   export const loginFailedRateLimit = async (req, res, next) => {
     const key = `login_failed_${req.ip}`;
     const count = await redis.get(key);
     if (count && parseInt(count) > 10) {
       return res.status(429).json(rateLimitError);
     }
     next();
   };
   ```

2. Integruj w Service:
   - On failed auth (401): increment counter
   - On successful auth: clear counter
   - On rate limit hit: return 429

3. Test:
   - 1-10 failed attempts OK
   - 11th attempt → 429
   - Successful login clears counter
   - After 15 minutes → counter resets

**Deliverables:**

- Rate limit check
- Counter management
- Tests

---

### Faza 5: Implementacja controller/handler

**Kroki:**

1. Stwórz `AuthController.login()`:

   ```typescript
   async login(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const dto = await validateLoginDto(req.body);
       const result = await authService.login(dto);
       res.status(200).json(result);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Route:

   ```typescript
   router.post(
     '/auth/login',
     loginFailedRateLimit,
     authController.login.bind(authController),
   );
   ```

3. Testy:
   - Valid login → 200
   - Invalid data → 400
   - Wrong credentials → 401
   - Email not verified → 403
   - Rate limit → 429

**Deliverables:**

- `auth.controller.ts` with login() method
- Route registered in routes/
- Controller tests

---

### Faza 6: Logging i Monitoring

**Kroki:**

1. Implementuj logging:

   ```typescript
   // Successful login
   logger.info(`Login successful`, {
     userId: user.id,
     email: maskEmail(user.email),
     ip: req.ip,
     timestamp: new Date(),
   });

   // Failed login
   logger.warn(`Login failed - invalid credentials`, {
     email: maskEmail(dto.email),
     ip: req.ip,
   });
   ```

2. Setup Sentry:
   - Error tracking dla Supabase failures
   - Rate limit alerts

3. Monitoring:
   - Login success rate
   - Failed login rate
   - Brute force attempts

**Deliverables:**

- Logging implementation
- Sentry configured
- Monitoring dashboards

---

### Faza 7: E2E testing

**Kroki:**

1. Setup test environment:
   - Test Supabase instance (registered user)
   - Redis for rate limiting
   - Test user account (verified email)

2. E2E tests:

   ```typescript
   // Successful login
   const response = await request(app)
     .post('/auth/login')
     .send({ email: testUser.email, password: testUser.password })
     .expect(200);
   expect(response.body.user.email).toBe(testUser.email);
   expect(response.body.session.access_token).toBeDefined();
   expect(response.body.profile.company_name).toBeDefined();

   // Wrong password
   await request(app)
     .post('/auth/login')
     .send({ email: testUser.email, password: 'wrongpassword' })
     .expect(401);

   // Email not verified (unconfirmed user)
   await request(app)
     .post('/auth/login')
     .send({ email: unverifiedUser.email, password: unverifiedUser.password })
     .expect(403);

   // Rate limit
   for (let i = 0; i < 12; i++) {
     const res = await request(app)
       .post('/auth/login')
       .send({ email: testUser.email, password: 'wrongpassword' });
     if (i < 10) expect(res.status).toBe(401);
     if (i === 10) expect(res.status).toBe(429);
   }
   ```

3. Load testing:
   - 50 concurrent login attempts
   - Verify no race conditions
   - Verify rate limiting works under load

**Deliverables:**

- E2E tests passing
- Load tests passing
- Test data (verified test users)

---

### Faza 8: Deployment

**Kroki:**

1. Code review
   - Security review (rate limiting, logging)
   - Performance review

2. Staging deployment
   - Test with real Supabase staging environment
   - Verify email verification flow
   - Smoke tests

3. Production deployment
   - Blue-green deployment
   - Smoke tests
   - Monitor error rates

4. Monitoring:
   - Login success rate
   - Failed login rate
   - Authentication error distribution
   - P50/P95/P99 response times

**Deliverables:**

- Production deployed
- Monitoring active
- Alert rules configured

---

## Checklist implementacji

- [ ] **Schema Walidacja**:
  - [ ] Zod schema created
  - [ ] Email format validation
  - [ ] Password required validation
  - [ ] Unit tests

- [ ] **Rate Limiting**:
  - [ ] Redis configured
  - [ ] Max 10 failed attempts per 15 min per IP
  - [ ] Counter increments on failed auth
  - [ ] Counter clears on success
  - [ ] Tests passing

- [ ] **Service Layer**:
  - [ ] login() implemented
  - [ ] Supabase auth.signInWithPassword()
  - [ ] Email verification check (403)
  - [ ] Profile fetching
  - [ ] Error mapping (401/403/500)
  - [ ] Session mapping
  - [ ] Integration tests

- [ ] **Controller/Route**:
  - [ ] POST /auth/login registered
  - [ ] Rate limit middleware integrated
  - [ ] All status codes (200/400/401/403/429/500)

- [ ] **Logging**:
  - [ ] Successful logins logged
  - [ ] Failed logins logged
  - [ ] Email masked in logs (GDPR)
  - [ ] IP captured

- [ ] **Monitoring**:
  - [ ] Sentry configured
  - [ ] Success/failure metrics
  - [ ] Alert rules for brute force

- [ ] **Testing**:
  - [ ] Unit tests validator
  - [ ] Integration tests service
  - [ ] E2E tests all scenarios
  - [ ] Load tests

- [ ] **Security**:
  - [ ] Rate limiting brute force
  - [ ] Email verification required
  - [ ] JWT tokens secure
  - [ ] HTTPS enforced
  - [ ] No password logging
  - [ ] Proper error messages (no user enumeration)

- [ ] **Documentation**:
  - [ ] OpenAPI spec updated
  - [ ] Error codes documented
  - [ ] Rate limiting documented

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

---

## Zasoby i referencje

- **Supabase Auth Documentation**: https://supabase.com/docs/guides/auth
- **RFC 5322 (Email)**: https://tools.ietf.org/html/rfc5322
- **OWASP Authentication Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Redis Documentation**: https://redis.io/
- **Express.js**: https://expressjs.com/

---

## Notes

- **Supabase Auth**: Supabase obsługuje complete auth (hashing, JWT generation, email verification)
- **JWT tokens**: Access token (1h), refresh token (30 days) - Supabase generuje
- **Email verification**: MANDATORY - musi być email_confirmed_at set
- **Rate limiting**: Per IP, per 15 minutes na failed attempts - brute force protection
- **Brute force**: Track per IP, clear on success - simple and effective
- **Profile integration**: Optional (jeśli nie ma profilu, continue bez niej) - consistency check
- **Error messages**: Nie ujawniaj czy email istnieje (user enumeration prevention)
- **Logging**: Log successful logins, mask email w logs
- **HTTPS**: Wymóg dla security (password in plaintext over HTTP = disaster)
- **Refresh tokens**: Supabase manages, frontend stores securely (httpOnly cookies)
- **Session validation**: Next requests use access token, backend validates JWT claims
