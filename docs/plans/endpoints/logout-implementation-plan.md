# Implementation Plan: POST /auth/logout - End User Session

**Endpoint**: `POST /auth/logout`
**HTTP Method**: POST
**Access Level**: Authenticated (Organizers only)
**MVP Priority**: CRITICAL - Essential security feature
**Estimated Effort**: 2 story points

---

## 1. Overview

Logs out the currently authenticated user by invalidating their session. Works with Supabase Auth to clear the session token.

**Key Features**:

- JWT token invalidation / session clearing
- Audit trail via logs
- Immediate effect (token no longer valid)
- Response time target: P50 < 50ms, P99 < 100ms

---

## 2. Database Schema

### 2.1 Session/Auth Logs (Optional)

**`auth_logs` table** (for audit trail):

```sql
CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event VARCHAR(100),  -- 'login', 'logout', 'password_change'
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Index

```sql
CREATE INDEX idx_auth_logs_user_id_created_at ON auth_logs (user_id, created_at DESC);
```

---

## 3. API Contract

### 3.1 Request

```typescript
interface LogoutRequest {
  // No body required
  // Path parameter: none
}

// Example:
// POST /auth/logout
// Authorization: Bearer<token>
// Content-Type: application/json
// {}
```

### 3.2 Response

```typescript
interface LogoutResponse {
  message: string;           // "Logged out successfully"
  logged_out_at: string;    // ISO 8601 timestamp
}

// Example:
{
  "message": "Logged out successfully",
  "logged_out_at": "2025-01-31T12:00:00Z"
}
```

### 3.3 Validation

```typescript
// No input validation needed (no request body)
// Only verify authentication token exists and is valid
```

---

## 4. Business Logic

### 4.1 Logout Process

```typescript
interface LogoutRequest {
  userId: UUID; // From JWT token
  token: string; // JWT token string (for blacklisting)
  ipAddress: string; // From request
  userAgent: string; // From request
}

async function logout(request: LogoutRequest): Promise<LogoutResponse> {
  // 1. Verify user is authenticated
  if (!request.userId) {
    throw new UnauthorizedError('Authentication required');
  }

  // 2. Option A: Supabase Auth - Sign out (clears session)
  const { error } = await supabase.auth.signOut();

  if (error) {
    logger.error('Supabase signOut failed', { error });
    // Note: Proceed anyway - we'll invalidate token client-side
  }

  // 3. Option B: JWT Token Blacklist (for added security)
  // Store token in Redis blacklist to prevent reuse
  const tokenExp = parseJwtExp(request.token);
  const ttlSeconds = Math.max(
    0,
    Math.floor((tokenExp.getTime() - Date.now()) / 1000),
  );

  if (ttlSeconds > 0) {
    await redis.setex(`logout:${request.token}`, ttlSeconds, 'blacklisted');
  }

  // 4. Audit logging
  await db.query(
    `INSERT INTO auth_logs (id, user_id, event, ip_address, user_agent)
     VALUES ($1, $2, 'logout', $3, $4)`,
    [uuidv4(), request.userId, request.ipAddress, request.userAgent],
  );

  return {
    message: 'Logged out successfully',
    logged_out_at: new Date().toISOString(),
  };
}

// Parse JWT exp claim
function parseJwtExp(token: string): Date {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

  return new Date(payload.exp * 1000);
}
```

### 4.2 Token Verification (Optional Middleware)

```typescript
// Middleware to check if token is blacklisted
async function checkTokenBlacklist(token: string, next: (err?: Error) => void) {
  const isBlacklisted = await redis.exists(`logout:${token}`);

  if (isBlacklisted) {
    return next(new UnauthorizedError('Token has been revoked'));
  }

  next();
}
```

### 4.3 Client-side Session Clearing

```typescript
// Frontend should also clear local storage/session storage
// This happens automatically when Supabase.signOut() completes
```

---

## 5. Implementation Phases

### Phase 1: Authentication Middleware (Time: 30 min)

- [ ] Verify JWT token extraction
- [ ] Verify user_id extraction
- [ ] Return 401 if not authenticated

### Phase 2: Database Setup (Optional) (Time: 30 min)

- [ ] Create auth_logs table if using audit trail
- [ ] Create indexes
- [ ] Setup necessary permissions

### Phase 3: Backend Route (Time: 1 hour)

- [ ] Create Express route: `POST /auth/logout`
- [ ] Implement authentication middleware
- [ ] Route integration with logout() function
- [ ] Capture IP address and user-agent from request

### Phase 4: Supabase Integration (Time: 1 hour)

- [ ] Setup Supabase Auth client
- [ ] Implement supabase.auth.signOut() call
- [ ] Handle any errors gracefully
- [ ] Test with valid tokens

### Phase 5: Token Blacklisting (Optional) (Time: 1 hour)

- [ ] Setup Redis client
- [ ] Implement JWT exp parsing
- [ ] Implement token blacklist storage
- [ ] Implement blacklist check middleware
- [ ] Test with expired tokens

### Phase 6: Audit Logging (Time: 1 hour)

- [ ] Implement auth_logs insertion
- [ ] Capture IP address (X-Forwarded-For, req.ip)
- [ ] Capture user-agent
- [ ] Test audit trail creation

### Phase 7: Error Handling (Time: 30 min)

- [ ] Handle 401 (not authenticated)
- [ ] Handle Supabase signOut errors
- [ ] Handle database errors
- [ ] Return appropriate error responses

### Phase 8: Testing (Time: 1 hour)

- [ ] Unit tests: JWT parsing, audit logging
- [ ] Integration tests: full logout flow
- [ ] Test token invalidation
- [ ] Test subsequent requests fail with invalid token
- [ ] Performance test: < 50ms P50

---

## 6. Error Handling & Status Codes

### 6.1 Success Response

| Status | Scenario          | Response                                   |
| ------ | ----------------- | ------------------------------------------ |
| 200 OK | Successful logout | `{ message: "...", logged_out_at: "..." }` |

### 6.2 Error Responses

| Status | Code           | Scenario              | Body                                                                      |
| ------ | -------------- | --------------------- | ------------------------------------------------------------------------- |
| 401    | UNAUTHORIZED   | Missing/invalid token | `{ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }` |
| 500    | INTERNAL_ERROR | Server error          | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`                   |

---

## 7. Performance & Optimization

### 7.1 Response Time Targets

- **With Supabase**: P50 < 50ms, P99 < 100ms
- **With Redis blacklist**: No additional latency (async)

### 7.2 Optimization

1. **Async logging**: Background insertion to auth_logs
2. **Redis operations**: Async (no blocking)
3. **No database query blocking**: Fail gracefully if logging fails

---

## 8. Security Considerations

### 8.1 Authentication

- ✅ JWT token required in Authorization header
- ✅ Verify token not expired
- ✅ Return 401 if not authenticated

### 8.2 Session Invalidation

- ✅ Supabase Auth signOut invalidates session
- ✅ Optional Redis blacklist for additional layer
- ✅ Tokens cannot be reused after logout

### 8.3 Audit Trail

- ✅ Logout event logged with user_id, IP, user-agent
- ✅ Helps detect suspicious activity

---

## 9. Monitoring & Logging

### 9.1 Application Logging

```typescript
logger.info('POST /auth/logout', {
  user_id: userId,
  ip_address: ipAddress,
  user_agent: userAgent,
  responseTime: `${Date.now() - startTime}ms`,
});
```

### 9.2 GA4 Events (Optional)

```typescript
gtag.event('logout', {
  user_id: userId,
});
```

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth.context';

export function useLogout() {
  const { clearAuth } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear local auth state
      clearAuth();

      // Clear all cached queries
      queryClient.clear();

      // Redirect to login/home
      navigate('/login');
    },
    onError: (error) => {
      // Even on error, clear local state (token might be invalid)
      clearAuth();
      navigate('/login');
    },
  });
}

// Usage
function UserMenu({ user }: { user: AuthUser }) {
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync(user.session.access_token);
  };

  return (
    <div className="user-menu">
      <span>{user.email}</span>
      <button onClick={handleLogout} disabled={logout.isPending}>
        {logout.isPending ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}
```

### 10.2 Context Integration

```typescript
// In auth context/store (Zustand)
interface AuthStore {
  user: AuthUser | null;
  logout: () => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  logout: () => {
    set({ user: null });
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_token');
  },
}));
```

---

## 11. Deployment Checklist

- [ ] Supabase Auth client configured
- [ ] Authentication middleware implemented
- [ ] IP address capture working (X-Forwarded-For for proxies)
- [ ] User-agent capture working
- [ ] Audit logging to database (optional)
- [ ] Redis blacklist setup (optional but recommended)
- [ ] Error handling implemented
- [ ] Frontend logout hook tested
- [ ] Local storage cleared on logout (frontend)
- [ ] Subsequent requests fail after logout
- [ ] Logging enabled

---

## 12. Success Criteria

✅ Authenticated users can logout
✅ Session invalidated after logout
✅ Token cannot be reused after logout
✅ Audit trail created for logout event
✅ Response time < 50ms P50, < 100ms P99
✅ Frontend redirects to login after logout
✅ Local auth state cleared
✅ All cached queries cleared
✅ Subsequent requests with old token return 401
✅ IP address and user-agent logged
