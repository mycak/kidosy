# API Endpoint Implementation Plan: POST /auth/register

## 1. Przegląd punktu końcowego

Endpoint **POST /auth/register** pozwala na utworzenie nowego konta organizatora w systemie. Endpoint integruje się z Supabase Auth dla bezpieczeństwa i zarządzania sesją, a następnie tworzy profil organizatora w tabeli `organizer_profiles`.

Proces rejestracji:

1. Walidacja danych wejściowych
2. Tworzenie użytkownika w Supabase Auth (email/password)
3. Tworzenie profilu organizatora w bazie danych
4. Wysłanie emaila weryfikacyjnego
5. Zwrócenie JWT tokenów i danych użytkownika

Endpoint obsługuje:

- Email/password autentykację
- Automatyczne tworzenie profilu organizatora
- Weryfikację adresu email
- Bezpieczne hashowanie hasła (Supabase obsługuje)
- Rate limiting na rejestracje

Odpowiedź zawiera access token, refresh token i dane nowego użytkownika.

---

## 2. Szczegóły żądania

### Metoda HTTP

**POST**

### Struktura URL

```
POST /api/v1/auth/register
```

### Parametry

**Brak Path/Query Parameters**

### Request Headers

```
Content-Type: application/json
```

**Uwaga:** Nie wymaga Authorization - endpoint publiczny

### Request Body (RegisterRequestDto)

```json
{
  "email": "organizer@example.com",
  "password": "SecurePassword123!@#",
  "company_name": "TechKids Sp. z o.o.",
  "phone": "+48123456789",
  "email_public": "kontakt@techkids.pl"
}
```

### Wymagane pola

- `email` (string) - Adres email do logowania
- `password` (string) - Hasło (min 8 znaków, muszą być: uppercase, lowercase, number, special char)
- `company_name` (string) - Nazwa firmy/osoby
- `phone` (string) - Numer telefonu do kontaktu
- `email_public` (string) - Publiczny email (widoczny dla rodziców)

### Opcjonalne pola

- Brak

### Walidacja formatu hasła

Hasło musi spełniać warunki:

- Min 8 znaków
- Min 1 wielka litera (A-Z)
- Min 1 mała litera (a-z)
- Min 1 cyfra (0-9)
- Min 1 znak specjalny (!@#$%^&\*)

### Przykład żądania

```bash
curl -X POST "https://api.kidosy.pl/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "organizer@example.com",
    "password": "SecurePass123!",
    "company_name": "TechKids Sp. z o.o.",
    "phone": "+48123456789",
    "email_public": "kontakt@techkids.pl"
  }'
```

---

## 3. Wykorzystywane typy

### DTO Types (Request)

```typescript
// Główny typ żądania
RegisterRequestDto = {
  email: string;
  password: string;
  company_name: string;
  phone: string;
  email_public: string;
};
```

### DTO Types (Response)

```typescript
// Odpowiedź przy rejestracji
AuthResponseDto = {
  user: AuthUserDto;
  session: SessionDto;
};

AuthUserDto = Pick<DbUser, 'id' | 'email' | 'created_at'> & {
  role?: 'admin' | 'organizer';
};

SessionDto = {
  access_token: string;
  refresh_token: string;
  expires_in: number;  // w sekundach, zwykle 3600 (1 godzina)
};
```

### Typy pomocnicze

```typescript
MessageResponseDto = {
  message: string;
};
```

---

## 4. Szczegóły odpowiedzi

### Odpowiedź sukcesu (201 Created)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "organizer@example.com",
    "created_at": "2026-02-07T16:45:30Z",
    "role": "organizer"
  },
  "session": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "sbr_1a2b3c4d5e6f7g8h9i0j...",
    "expires_in": 3600
  }
}
```

### Kody statusu odpowiedzi

- **201 Created** - Użytkownik pomyślnie zarejestrowany
- **400 Bad Request** - Nieprawidłowe dane wejściowe (brakujące pole, błędny format)
- **409 Conflict** - Email już zarejestrowany (użytkownik z takim emailem już istnieje)
- **422 Unprocessable Entity** - Dane nie spełniają wymogów biznesowych (nieważne hasło, zbyt krótka nazwa)
- **429 Too Many Requests** - Zbyt wiele prób rejestracji z tego IP
- **500 Internal Server Error** - Błąd serwera (błąd Supabase, błąd bazy)

---

## 5. Przepływ danych

### Architektura przepływu

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Żądanie HTTP: POST /auth/register                         │
│    Headers: Content-Type: application/json                  │
│    Body: RegisterRequestDto JSON                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 2. Rate Limiting Check                                       │
│    - Sprawdzenie IP: max 5 rejestracji per godzinę          │
│    - Return 429 jeśli limit przekroczony                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 3. Walidacja schematu (Zod)                                 │
│    - Parse request body jako RegisterRequestDto             │
│    - Sprawdzenie wymaganych pól                             │
│    - Sprawdzenie typów i formatów                           │
│    - Return 400 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 4. Walidacja biznesowa                                       │
│    - Email format validation (RFC 5322)                      │
│    - Password strength validation                            │
│    - Phone number format validation (opcjonalnie)           │
│    - Return 422 jeśli walidacja nie przejdzie              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 5. Sprawdzenie duplikatu email                              │
│    - Query Supabase: email już istnieje?                    │
│    - Return 409 jeśli email w użyciu                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 6. Przywołaj AuthService.register()                         │
│    - Przekaż: RegisterRequestDto                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 7. AuthService Logic - Transakcja                           │
│                                                               │
│    a) Tworzenie konta Supabase Auth:                        │
│       - supabase.auth.signUp({email, password})            │
│       - Supabase zwraca JWT tokens i user ID                │
│       - Если error (email duplicate) → 409                  │
│                                                               │
│    b) Tworzenie profilu organizatora:                       │
│       - INSERT INTO organizer_profiles                      │
│       - user_id, company_name, phone, email_public         │
│       - Jeśli error → DELETE user z Supabase Auth (rollback)│
│                                                               │
│    c) Obsługa błędów:                                       │
│       - Supabase error handling                              │
│       - Database error handling                              │
│       - Return appropriate error                             │
│                                                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 8. Wysłanie emaila weryfikacyjnego (async)                   │
│    - Supabase Auth wysyła automatycznie                     │
│    - Nie blokuj response                                    │
│    - Log failures                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 9. Mapowanie odpowiedzi                                      │
│    - Mapuj user + session do AuthResponseDto                │
│    - Ekstrakcja role z JWT claims                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│ 10. Zwróć odpowiedź JSON                                     │
│     Status: 201 Created                                      │
│     Body: AuthResponseDto                                    │
│     Headers: Set-Cookie (refresh token - optional)          │
└─────────────────────────────────────────────────────────────┘
```

### Sekwencja interakcji z Supabase Auth i Database

```typescript
// 1. Supabase Auth: Create user
const { data: authUser, error: authError } = await supabase.auth.signUp({
  email: registerDto.email,
  password: registerDto.password,
});

// Jeśli error (np. email duplicate):
if (authError?.status === 422) {
  // Email already registered
  return 409 Conflict;
}

// 2. Database: Create organizer profile
const { data: profile, error: profileError } = await supabase
  .from('organizer_profiles')
  .insert({
    user_id: authUser.user.id,
    company_name: registerDto.company_name,
    phone: registerDto.phone,
    email_public: registerDto.email_public,
  })
  .select()
  .single();

// Jeśli error w profilu:
if (profileError) {
  // Rollback: delete user z Supabase Auth
  await supabase.auth.admin.deleteUser(authUser.user.id);
  return 500 Database Error;
}

// 3. Zwróć session i user
return {
  user: {
    id: authUser.user.id,
    email: authUser.user.email,
    created_at: authUser.user.created_at,
    role: 'organizer', // default role
  },
  session: {
    access_token: authUser.session.access_token,
    refresh_token: authUser.session.refresh_token,
    expires_in: authUser.session.expires_in,
  },
};
```

---

## 6. Względy bezpieczeństwa

### 6.1 Autentykacja i Autoryzacja

- **Public endpoint**: Rejestracja jest dostępna dla wszystkich
- **Email verification**: Supabase wysyła confirmation link
- **Role assignment**: Nowi użytkownicy automatycznie otrzymują rolę `organizer`
- **Admin constraint**: Tylko admini mogą tworzyć konta admin

### 6.2 Walidacja danych wejściowych

**Schema walidacja (Zod):**

```typescript
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  company_name: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(255, 'Company name must be max 255 characters'),
  phone: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Invalid phone format'),
  email_public: z.string().email('Invalid email format'),
});
```

**Walidacja biznesowa:**

- Email nie może być już zarejestrowany (query Supabase)
- Hasło musi spełniać wymogi siły
- Telefon powinien być w prawidłowym formacie
- Nazwa firmy nie powinna zawierać znaków zakazanych

### 6.3 Ochrona przed atakami

**Rate limiting:**

```typescript
// Max 5 rejestracji per godzinę per IP
const key = `register_${req.ip}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 3600); // 1 hour
}
if (count > 5) {
  return 429 Too Many Requests;
}
```

**Hasło security:**

- Supabase automatycznie hashuje hasło (bcrypt)
- Nie transmituj hasła w plain text (HTTPS required)
- Minimum 8 znaków + complexity requirements

**Email verification:**

- Supabase wysyła verification link
- Email weryfikowany przed dostępem do aplikacji
- Zapobieganie fake emails

**CORS i ograniczenia**

```
Access-Control-Allow-Origin: https://kidosy.pl
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 6.4 Ochrona danych

- **Parametryzowane zapytania**: Supabase handluje
- **No password logging**: Nigdy nie logujesz hasła
- **SSL/TLS**: Cała komunikacja encrypted
- **Session tokens**: Secure, short-lived (1h), refresh tokens dla przedłużenia

### 6.5 Logging i Monitoring

- **Logowanie rejestracji**: Zarejestruj każdy attempt (email, timestamp, IP)
- **Anomalii detektowanie**: Wiele failed attempts z tego samego IP
- **Failed registrations**: Email duplicates, validation failures
- **Sentry**: Error tracking dla database/Supabase failures

---

## 7. Obsługa błędów

### 7.1 Tabela scenariuszy błędów

| Scenariusz                   | Status | Error Code         | Message                                            | Przyczyna          |
| ---------------------------- | ------ | ------------------ | -------------------------------------------------- | ------------------ |
| Rejestracja pomyślna         | 201    | -                  | -                                                  | Success            |
| Brakuje wymaganego pola      | 400    | `VALIDATION_ERROR` | "email is required"                                | Missing field      |
| Email nieprawidłowy format   | 400    | `VALIDATION_ERROR` | "Invalid email format"                             | Bad format         |
| Hasło < 8 znaków             | 400    | `VALIDATION_ERROR` | "Password must be at least 8 characters"           | Too short          |
| Hasło bez großbuchstaben     | 400    | `VALIDATION_ERROR` | "Password must contain uppercase letter"           | Missing uppercase  |
| Hasło bez cyfry              | 400    | `VALIDATION_ERROR` | "Password must contain number"                     | Missing digit      |
| Hasło bez znaku specjalnego  | 400    | `VALIDATION_ERROR` | "Password must contain special character"          | Missing special    |
| Telefon nieprawidłowy format | 400    | `VALIDATION_ERROR` | "Invalid phone format"                             | Bad format         |
| company_name < 2 znaki       | 400    | `VALIDATION_ERROR` | "Company name must be at least 2 characters"       | Too short          |
| Email już zarejestrowany     | 409    | `CONFLICT`         | "Email already registered"                         | Duplicate email    |
| Zbyt wiele prób              | 429    | `RATE_LIMIT`       | "Too many registration attempts. Try again later." | Rate limit         |
| Błąd Supabase Auth           | 500    | `AUTH_ERROR`       | "Registration failed"                              | Auth service error |
| Błąd tworzenia profilu       | 500    | `DATABASE_ERROR`   | "Internal server error"                            | DB error           |
| Email verification failed    | 500    | `EMAIL_ERROR`      | "Failed to send verification email"                | Email service      |

### 7.2 Struktura odpowiedzi błędu

```typescript
type ErrorResponseDto = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'CONFLICT'
      | 'RATE_LIMIT'
      | 'AUTH_ERROR'
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
        "field": "password",
        "message": "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character"
      },
      {
        "field": "company_name",
        "message": "Company name must be at least 2 characters"
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
    "message": "Email already registered",
    "details": [
      {
        "field": "email",
        "message": "This email is already associated with an account"
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
    "message": "Too many registration attempts from this address",
    "details": [
      {
        "field": "request",
        "message": "Maximum 5 registrations per hour allowed. Please try again later."
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
    "message": "Registration failed. Please try again later."
  }
}
```

---

## 8. Rozważania dotyczące wydajności

### 8.1 Wąskie gardła

1. **Supabase Auth signup**: Network call do Supabase
   - **Rozwiązanie**: Caching validation rules, parallel operations

2. **Email verification**: Wysyłanie emaila
   - **Rozwiązanie**: Asynchroniczne, nie blokuj response

3. **Database insert**: Organizer profile creation
   - **Rozwiązanie**: Single INSERT, indeksy na unique fields

### 8.2 Strategie optymalizacji

**Parallel operations:**

```typescript
// Zamiast sequential, parallel operations
const [authResult, profileResult] = await Promise.all([
  createAuthUser(),
  // Czekaj na auth, potem profile
]);
```

**Indeksowanie:**

```sql
-- Unikalne indeksy na email
CREATE UNIQUE INDEX idx_users_email ON auth.users(email);
CREATE UNIQUE INDEX idx_organizer_profiles_user_id ON organizer_profiles(user_id);

-- Indeks dla searchingu
CREATE INDEX idx_organizer_profiles_company_name ON organizer_profiles(company_name);
```

**Rate limiting Redis:**

```typescript
// Redis zamiast in-memory
const key = `register_${req.ip}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 3600);
}
```

**Async email:**

```typescript
// Queue email task, nie czekaj
await emailQueue.add('send_verification', {
  email,
  userId,
});
```

### 8.3 Request/Response Time Targets

- **P50 (mediana)**: < 500ms (Supabase calls + DB insert)
- **P95**: < 1s
- **P99**: < 2s

---

## 9. Etapy wdrażania

### Faza 1: Setup i przygotowanie

**Kroki:**

1. Utwórz strukturę folderów:
   - `src/services/auth.service.ts` - logika autentykacji
   - `src/controllers/auth.controller.ts` - handler HTTP
   - `src/validators/auth.validator.ts` - walidacja
   - `src/middleware/rate-limit.middleware.ts` - rate limiting

2. Zainstaluj/zweryfikuj dependencies:
   - `@supabase/supabase-js` client
   - `redis` dla rate limiting
   - `zod` dla walidacji
   - `bcrypt` (opcjonalnie, Supabase obsługuje)

3. Skonfiguruj Supabase:
   - Email provider (SMTP)
   - Email templates dla verification
   - JWT secrets

**Deliverables:**

- Folder struktura
- Dependencies zainstalowane
- Supabase configured
- Email templates ready

---

### Faza 2: Walidacja schematu

**Kroki:**

1. Stwórz `RegisterValidator`:
   - `validateRegisterDto(data: unknown): RegisterRequestDto`
   - `validateEmailFormat(email: string): void`
   - `validatePasswordStrength(password: string): void`
   - `validatePhoneFormat(phone: string): void`

2. Implementuj Zod schema:

   ```typescript
   const registerSchema = z.object({
     email: z.string().email(),
     password: z
       .string()
       .min(8)
       .regex(/[A-Z]/)
       .regex(/[a-z]/)
       .regex(/[0-9]/)
       .regex(/[!@#$%^&*]/),
     company_name: z.string().min(2).max(255),
     phone: z.string().regex(/^\+?[0-9\s\-()]+$/),
     email_public: z.string().email(),
   });
   ```

3. Testy jednostkowe:
   - Valid data - pass
   - Missing field - throw
   - Weak password - throw
   - Invalid email - throw
   - Invalid phone - throw

**Deliverables:**

- `auth.validator.ts`
- Unit tests

---

### Faza 3: Rate Limiting

**Kroki:**

1. Stwórz `RateLimitMiddleware`:

   ```typescript
   export const registerRateLimit = async (req, res, next) => {
     const key = `register_${req.ip}`;
     const count = await redis.incr(key);
     if (count === 1) {
       await redis.expire(key, 3600);
     }
     if (count > 5) {
       return res.status(429).json(rateLimitError);
     }
     next();
   };
   ```

2. Test:
   - 1-5 requests OK
   - 6th request → 429
   - After 1 hour → reset

**Deliverables:**

- Rate limit middleware
- Tests

---

### Faza 4: Implementacja warstwa serwisu

**Kroki:**

1. Stwórz `AuthService`:

   ```typescript
   async register(dto: RegisterRequestDto): Promise<AuthResponseDto> {
     // 1. Validate duplicates
     // 2. Auth signup
     // 3. Create profile
     // 4. Return session
   }
   ```

2. Implementuj:
   - Email duplicate check
   - Supabase auth.signUp()
   - Organizer profile creation
   - Error handling & rollback
   - Session mapping

3. Testy integracyjne:
   - Register successfully - 201
   - Email duplicate - 409
   - Auth error - 500
   - Profile error - 500

**Deliverables:**

- `auth.service.ts`
- Integration tests with Supabase

---

### Faza 5: Implementacja controller/handler

**Kroki:**

1. Stwórz `AuthController`:

   ```typescript
   async register(req: Request, res: Response, next: NextFunction): Promise<void> {
     try {
       const dto = await validateRegisterDto(req.body);
       const result = await authService.register(dto);
       res.status(201).json(result);
     } catch (error) {
       next(error);
     }
   }
   ```

2. Route:

   ```typescript
   router.post(
     '/auth/register',
     registerRateLimit,
     authController.register.bind(authController),
   );
   ```

3. Testy:
   - Valid register → 201
   - Invalid data → 400
   - Duplicate email → 409
   - Rate limit → 429

**Deliverables:**

- `auth.controller.ts`
- Route registered
- Controller tests

---

### Faza 6: Email Verification Setup

**Kroki:**

1. Supabase Email Templates:
   - Verify email template
   - Verify link format
   - Test sending

2. Email Queue (async):

   ```typescript
   // After auth signup, queue verification email
   await emailQueue.add('send_verification', {
     email: dto.email,
     userId: authUser.id,
   });
   ```

3. Test:
   - Email sending
   - Verification link valid
   - Email content

**Deliverables:**

- Email templates configured
- Async queue ready

---

### Faza 7: E2E testing

**Kroki:**

1. Setup test environment:
   - Test Supabase instance
   - Redis for rate limiting
   - Mock email service

2. E2E tests:

   ```typescript
   // Successful registration
   const response = await request(app)
     .post('/auth/register')
     .send(validRegisterData)
     .expect(201);
   expect(response.body.user.email).toBe(validRegisterData.email);
   expect(response.body.session.access_token).toBeDefined();

   // Duplicate email
   await request(app).post('/auth/register').send(validRegisterData);
   const response2 = await request(app)
     .post('/auth/register')
     .send(validRegisterData)
     .expect(409);

   // Weak password
   await request(app)
     .post('/auth/register')
     .send({ ...validRegisterData, password: 'weak' })
     .expect(400);

   // Rate limit
   for (let i = 0; i < 6; i++) {
     const res = await request(app)
       .post('/auth/register')
       .send({ ...validRegisterData, email: `test${i}@example.com` });
     if (i < 5) expect(res.status).toBe(201);
     if (i === 5) expect(res.status).toBe(429);
   }
   ```

3. Load testing:
   - 50 concurrent registrations
   - Verify no race conditions
   - Verify rate limiting works

**Deliverables:**

- E2E tests passing
- Load tests passing

---

### Faza 8: Deployment

**Kroki:**

1. Code review
2. Staging deployment
3. Smoke tests
4. Production deployment
5. Monitoring:
   - Registration rate
   - Error rate
   - Email delivery rate

**Deliverables:**

- Production deployed
- Monitoring active

---

## Checklist implementacji

- [ ] **Schema Walidacja**:
  - [ ] Zod schema created
  - [ ] Password strength rules
  - [ ] Email format
  - [ ] Phone format
  - [ ] Unit tests

- [ ] **Rate Limiting**:
  - [ ] Redis middleware
  - [ ] Max 5 per hour per IP
  - [ ] Tests passing

- [ ] **Service Layer**:
  - [ ] register() implemented
  - [ ] Duplicate check
  - [ ] Supabase integration
  - [ ] Profile creation
  - [ ] Error handling & rollback
  - [ ] Session mapping
  - [ ] Integration tests

- [ ] **Controller/Route**:
  - [ ] POST /auth/register registered
  - [ ] Rate limit middleware integrated
  - [ ] All status codes (201/400/409/429/500)

- [ ] **Email Verification**:
  - [ ] Templates configured
  - [ ] Async sending
  - [ ] Verification flow

- [ ] **Testing**:
  - [ ] Unit tests validator
  - [ ] Integration tests service
  - [ ] E2E tests all scenarios
  - [ ] Load tests

- [ ] **Security**:
  - [ ] Password validation strict
  - [ ] Rate limiting
  - [ ] No password logging
  - [ ] HTTPS enforced
  - [ ] Email verification required

- [ ] **Documentation**:
  - [ ] OpenAPI spec
  - [ ] Error codes documented

- [ ] **Deployment**:
  - [ ] Staging deployment
  - [ ] Production deployment
  - [ ] Monitoring active

---

## Zasoby i referencje

- **Supabase Auth Documentation**: https://supabase.com/docs/guides/auth
- **RFC 5322 (Email)**: https://tools.ietf.org/html/rfc5322
- **OWASP Password Guidelines**: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- **Zod Validation**: https://zod.dev/
- **Express.js**: https://expressjs.com/

---

## Notes

- **Supabase Auth**: Supabase obsługuje complete auth stack (hashing, tokens, verification)
- **JWT tokens**: Access token (1h), refresh token (30 days) - standardowe timing
- **Email verification**: Mandatory - Supabase wysyła automatically
- **Password strength**: Enforce all 4 kategorie: upper, lower, digit, special
- **Rate limiting**: Per IP, per hour - prevent brute force & spam
- **Role assignment**: New users = 'organizer' role by default
- **Profile creation**: Zawsze utwórz profile nawet jeśli auth OK, aby mieć dane organizatora
- **Rollback**: Jeśli profile creation fails, usuń user z auth (transactional safety)
- **Email async**: Nie czekaj na email verification w response, queue job
- **Password hashing**: Supabase obsługuje - nigdy nie hashuj w aplikacji
- **Error messages**: Nie ujawniaj czy email istnieje (dla privacy), general message
