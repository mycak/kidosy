# Implementation Plan: POST /auth/password-reset/confirm - Confirm Password Reset

**Endpoint**: `POST /auth/password-reset/confirm`
**HTTP Method**: POST
**Access Level**: Public (with reset token from email)
**MVP Priority**: CRITICAL - Complete password reset flow
**Estimated Effort**: 3 story points

---

## 1. Overview

Completes the password reset flow by accepting a reset token (from email link) and new password. Updates the user's password in Supabase Auth.

**Key Features**:

- Reset token validation (sent via email link)
- New password validation and strength checking
- Supabase Auth password update
- Audit logging
- Token expiration enforcement (1 hour valid)
- Response time target: P50 < 200ms, P99 < 800ms

---

## 2. Database Schema

### 2.1 Auth Logs (Optional)

**`auth_logs` table** (for audit trail):

```sql
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event VARCHAR(100),  -- 'password_reset_confirmed'
  ip_address INET,
  user_agent VARCHAR(500),
  status VARCHAR(50),  -- 'success', 'failed'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_logs_user_event ON auth_logs (user_id, event, created_at DESC);
```

### 2.2 Password Reset Attempts (Optional Tracking)

```sql
-- Track failed reset attempts (for security monitoring)
CREATE TABLE password_reset_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255),
  ip_address INET,
  status VARCHAR(50),  -- 'success', 'invalid_token', 'expired', 'failed'
  attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reset_attempts_email_ip ON password_reset_attempts (email, ip_address, attempt_at DESC);
```

---

## 3. API Contract

### 3.1 Request

```typescript
interface ConfirmPasswordResetRequest {
  token: string;           // Reset token from email link
  new_password: string;    // New password
  confirm_password: string;  // Password confirmation (optional client-side)
}

// Example:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}
```

### 3.2 Response

```typescript
interface ConfirmPasswordResetResponse {
  message: string;           // "Password reset successfully"
  reset_at: string;         // ISO 8601 timestamp
  can_login: boolean;       // true (user can now login with new password)
}

// Example:
{
  "message": "Password reset successfully",
  "reset_at": "2025-01-31T12:30:00Z",
  "can_login": true
}
```

### 3.3 Validation

```typescript
const ConfirmPasswordResetSchema = z
  .object({
    token: z.string().min(10).max(1000), // JWT token
    new_password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase letter')
      .regex(/[a-z]/, 'Must contain lowercase letter')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[!@#$%^&*]/, 'Must contain special character'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

function validateConfirmPasswordReset(
  body: unknown,
): ConfirmPasswordResetRequest {
  const result = ConfirmPasswordResetSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }
  return result.data;
}
```

---

## 4. Business Logic

### 4.1 Password Reset Confirmation Process

```typescript
interface ConfirmPasswordResetRequest {
  token: string;
  newPassword: string;
  ipAddress: string; // From request
  userAgent: string; // From request
}

async function confirmPasswordReset(
  request: ConfirmPasswordResetRequest,
): Promise<ConfirmPasswordResetResponse> {
  // 1. Validate token format
  if (!request.token || request.token.length < 10) {
    throw new ValidationError({
      fieldErrors: { token: ['Invalid reset token format'] },
    });
  }

  // 2. Exchange token with Supabase Auth
  // Supabase validates token expiration, format, and user
  const { data, error } = await supabase.auth.resetPasswordForEmail(
    undefined, // Email will be extracted from token by Supabase
    {
      redirectTo: `${process.env.FRONTEND_URL}/auth/password-reset-success`,
    },
  );

  // Alternative: Use updateUser() if token is in a way Supabase handles internally
  // const { data, error } = await supabase.auth.updateUser(
  //   { password: request.newPassword },
  //   { authorization: `Bearer ${request.token}` }
  // );

  // 3. Handle Supabase response
  if (error) {
    const errorCode = error.status;
    let errorMessage = 'Password reset failed';

    if (errorCode === 401 || error.message.includes('invalid')) {
      errorMessage = 'Invalid or expired reset token';
      // Track failed attempt
      await trackPasswordResetAttempt({
        status: 'invalid_token',
        ipAddress: request.ipAddress,
      });
      throw new UnauthorizedError(errorMessage);
    }

    if (errorCode === 410 || error.message.includes('expired')) {
      errorMessage =
        'Reset token has expired. Please request a new password reset.';
      await trackPasswordResetAttempt({
        status: 'expired',
        ipAddress: request.ipAddress,
      });
      throw new ValidationError({
        fieldErrors: { token: [errorMessage] },
      });
    }

    // Generic error
    logger.error('Supabase password reset failed', { error });
    throw new InternalError('Password reset failed. Please try again.');
  }

  // 4. Extract user_id from token or Supabase response
  const userId = extractUserIdFromToken(request.token);

  // 5. Audit logging
  await db.query(
    `INSERT INTO auth_logs (id, user_id, event, ip_address, user_agent, status)
     VALUES ($1, $2, 'password_reset_confirmed', $3, $4, 'success')`,
    [uuidv4(), userId, request.ipAddress, request.userAgent],
  );

  // 6. Track successful reset attempt
  await trackPasswordResetAttempt({
    status: 'success',
    ipAddress: request.ipAddress,
  });

  return {
    message: 'Password reset successfully',
    reset_at: new Date().toISOString(),
    can_login: true,
  };
}

// Utility: Extract user_id from JWT token
function extractUserIdFromToken(token: string): UUID {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8'),
    );

    // Supabase token should have 'sub' claim (user ID)
    if (!payload.sub) {
      throw new Error('No user ID in token');
    }

    return payload.sub as UUID;
  } catch (error) {
    logger.error('Failed to extract user ID from token', { error });
    return null; // Will use null in logging
  }
}

// Track password reset attempts
async function trackPasswordResetAttempt(options: {
  email?: string;
  status: 'success' | 'invalid_token' | 'expired' | 'failed';
  ipAddress: string;
}): Promise<void> {
  try {
    await db.query(
      `INSERT INTO password_reset_attempts (id, email, ip_address, status)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), options.email || null, options.ipAddress, options.status],
    );
  } catch (error) {
    // Non-blocking: don't fail password reset due to tracking error
    logger.warn('Failed to track password reset attempt', { error });
  }
}
```

### 4.2 Token Validation Details

```typescript
// Supabase Auth Flow Details:
// 1. User initiates password reset via POST /auth/password-reset with email
// 2. Supabase sends email with link: /auth/reset-password?token=XXX&type=recovery
// 3. Token is valid for 1 hour (configurable in Supabase)
// 4. User enters new password and calls POST /auth/password-reset/confirm with token
// 5. Supabase validates token:
//    - Format correct
//    - Signature valid (signed with Supabase secret)
//    - Not expired (created_at + 1 hour > now)
//    - Not already used
// 6. If valid, Supabase updates user password
// 7. If invalid/expired, return appropriate error
```

### 4.3 Rate Limiting Consideration

```typescript
// Implement rate limiting on failed reset attempts
async function checkResetAttemptLimit(ipAddress: string): Promise<void> {
  const recentFailures = await db.query(
    `SELECT COUNT(*) as count FROM password_reset_attempts
     WHERE ip_address = $1
     AND status IN ('invalid_token', 'expired', 'failed')
     AND attempt_at > NOW() - INTERVAL '15 minutes'`,
    [ipAddress],
  );

  if (recentFailures.rows[0].count > 5) {
    throw new TooManyRequestsError(
      'Too many failed password reset attempts. Please try again later.',
    );
  }
}

// Usage in confirmPasswordReset():
// await checkResetAttemptLimit(request.ipAddress);
```

---

## 5. Implementation Phases

### Phase 1: Setup & Configuration (Time: 1 hour)

- [ ] Understand Supabase password reset flow
- [ ] Configure email template in Supabase
- [ ] Setup environment variables (reset token expiration)
- [ ] Configure frontend redirect URLs

### Phase 2: Backend Route & Validation (Time: 1.5 hours)

- [ ] Create Express route: `POST /auth/password-reset/confirm`
- [ ] Implement Zod validation schema
- [ ] Password strength requirements
- [ ] Test validation with weak passwords
- [ ] Test validation with mismatched passwords

### Phase 3: Token Extraction & Parsing (Time: 1 hour)

- [ ] Implement JWT parsing
- [ ] Extract user_id from token
- [ ] Handle malformed tokens
- [ ] Test with valid/invalid tokens

### Phase 4: Supabase Integration (Time: 1.5 hours)

- [ ] Setup Supabase Auth client
- [ ] Implement token validation with Supabase
- [ ] Handle Supabase error responses
- [ ] Test with valid/expired/invalid tokens
- [ ] Test password update in Supabase

### Phase 5: Error Handling (Time: 1 hour)

- [ ] Handle 400 (validation failed)
- [ ] Handle 401 (invalid token)
- [ ] Handle 410 (expired token)
- [ ] Handle 429 (rate limit)
- [ ] Handle 500 (server error)
- [ ] Specific error messages for each case

### Phase 6: Audit Logging & Tracking (Time: 1 hour)

- [ ] Implement auth_logs insertion
- [ ] Implement password_reset_attempts tracking
- [ ] Capture IP address (X-Forwarded-For)
- [ ] Capture user-agent
- [ ] Test audit trail creation

### Phase 7: Rate Limiting (Optional) (Time: 45 min)

- [ ] Implement failed attempt tracking
- [ ] Implement rate limit check (5 failures per 15min)
- [ ] Return 429 on rate limit exceeded
- [ ] Test rate limiting

### Phase 8: Testing & Integration (Time: 2 hours)

- [ ] Unit tests: validation, token parsing, audit logging
- [ ] Integration tests: full flow with Supabase
- [ ] Test with valid token → password updated
- [ ] Test with expired token → 410 error
- [ ] Test with invalid token → 401 error
- [ ] Test rate limiting
- [ ] Performance test: < 200ms P50, < 800ms P99
- [ ] E2E test: email link → form submission → success

---

## 6. Error Handling & Status Codes

### 6.1 Success Response

| Status | Scenario                    | Response                                               |
| ------ | --------------------------- | ------------------------------------------------------ |
| 200 OK | Password reset successfully | `{ message: "...", reset_at: "...", can_login: true }` |

### 6.2 Error Responses

| Status | Code                | Scenario                                | Body                                                                             |
| ------ | ------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR    | Password weak, mismatch, invalid format | `{ error: { code: 'VALIDATION_ERROR', details: [...] } }`                        |
| 401    | UNAUTHORIZED        | Invalid reset token                     | `{ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired reset token' } }` |
| 410    | RESOURCE_EXPIRED    | Reset token expired (> 1 hour)          | `{ error: { code: 'RESOURCE_EXPIRED', message: 'Reset token has expired...' } }` |
| 429    | RATE_LIMIT_EXCEEDED | Too many failed attempts                | `{ error: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: 900 } }`                    |
| 500    | INTERNAL_ERROR      | Server error                            | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`                          |

---

## 7. Performance & Optimization

### 7.1 Response Time Targets

- **Database hit**: P50 < 200ms, P99 < 800ms
- **Supabase Auth**: ~100-200ms (network dependent)

### 7.2 Optimization

1. **Async logging**: Non-blocking audit log insertion
2. **Rate limit caching**: Use Redis for recent failures
3. **Token parsing**: Lightweight JWT decode (no crypto needed)

---

## 8. Security Considerations

### 8.1 Token Security

- ✅ Token validation by Supabase (signature, expiration)
- ✅ Token expiration: 1 hour
- ✅ Token can only be used once
- ✅ Token bound to specific email/user

### 8.2 Password Security

- ✅ Password strength requirements enforced
- ✅ Minimum 8 chars, uppercase, lowercase, number, special char
- ✅ Hashed by Supabase Auth (bcrypt)
- ✅ No plaintext in logs

### 8.3 Attack Prevention

- ✅ Rate limiting (5 failed attempts per 15min)
- ✅ IP-based rate limiting
- ✅ Token cannot be reused
- ✅ No user enumeration (even if token generation fails)

---

## 9. Monitoring & Logging

### 9.1 Application Logging

```typescript
logger.info('POST /auth/password-reset/confirm', {
  user_id: userId,
  ip_address: ipAddress,
  user_agent: userAgent,
  status: 'success' | 'failed',
  error_code: error?.code,
  responseTime: `${Date.now() - startTime}ms`,
});
```

### 9.2 GA4 Events (Optional)

```typescript
gtag.event('password_reset_confirmed', {
  success: true | false,
  error_code: error?.code,
});
```

### 9.3 Security Alerts

```typescript
// Alert on suspicious patterns
if (recentFailures > 5) {
  sendSecurityAlert({
    event: 'brute_force_attempt',
    ipAddress,
    attempts: recentFailures,
  });
}
```

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface UseConfirmPasswordResetProps {
  token?: string;  // From URL query ?token=XXX
}

export function useConfirmPasswordReset(props?: UseConfirmPasswordResetProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = props?.token || searchParams.get('token') || '';

  return useMutation({
    mutationFn: async (newPassword: string) => {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      return response.json() as Promise<ConfirmPasswordResetResponse>;
    },
    onSuccess: () => {
      toast.success('Password reset successfully! You can now login.');
      setTimeout(() => navigate('/login'), 2000);
    },
  });
}

// Usage in component
function PasswordResetForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const resetPassword = useConfirmPasswordReset();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    if (password !== confirmPassword) {
      setErrors({ confirm_password: 'Passwords do not match' });
      return;
    }

    if (!password || password.length < 8) {
      setErrors({ new_password: 'Password must be at least 8 characters' });
      return;
    }

    try {
      await resetPassword.mutateAsync(password);
    } catch (error) {
      setErrors({ submit: error.message });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="password-reset-form">
      <h2>Reset Your Password</h2>

      {errors.submit && <AlertError message={errors.submit} />}

      <div className="form-group">
        <label htmlFor="password">New Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.new_password}
          placeholder="At least 8 chars, uppercase, number, special"
        />
        {errors.new_password && <ErrorMessage text={errors.new_password} />}
      </div>

      <div className="form-group">
        <label htmlFor="confirm_password">Confirm Password</label>
        <input
          id="confirm_password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirm_password}
        />
        {errors.confirm_password && <ErrorMessage text={errors.confirm_password} />}
      </div>

      <button
        type="submit"
        disabled={resetPassword.isPending || !password || !confirmPassword}
      >
        {resetPassword.isPending ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}
```

### 10.2 Email Link Integration

```typescript
// Email template from Supabase should include:
// <a href="https://app.kidosy.pl/auth/reset-password?token={{ .ConfirmationURL }}">
//   Reset Password
// </a>

// Or with explicit token parameter:
// <a href="https://app.kidosy.pl/auth/reset?token={{ .Token }}">
//   Reset Password
// </a>

// Frontend route handler
function ResetPasswordRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      // No token - redirect to request password reset
      navigate('/auth/password-reset-request');
    }
  }, [token, navigate]);

  return <PasswordResetForm />;
}
```

---

## 11. Deployment Checklist

- [ ] Supabase password reset email template configured
- [ ] Frontend redirect URL configured in Supabase Auth settings
- [ ] Backend route created and tested
- [ ] Validation schema implemented
- [ ] Token extraction working
- [ ] Supabase integration tested
- [ ] Error handling implemented for all scenarios
- [ ] Audit logging implemented
- [ ] Rate limiting implemented (optional)
- [ ] Frontend reset form component created
- [ ] Email link routing configured
- [ ] E2E password reset flow tested
- [ ] Logging enabled

---

## 12. Success Criteria

✅ User can reset password via email token
✅ Token validation enforced (format, signature, expiration)
✅ Password strength requirements enforced
✅ Password mismatch detected (client + server)
✅ Supabase Auth password updated successfully
✅ User can login with new password immediately after reset
✅ Reset token expires after 1 hour
✅ Reset token cannot be reused
✅ Rate limiting prevents brute force (5 failures/15min)
✅ Audit trail created for password reset
✅ Response time < 200ms P50, < 800ms P99
✅ Appropriate error messages for different failure scenarios
✅ Frontend redirects to login after successful reset
