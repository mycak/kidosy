# Implementation Plan: DELETE /offers/{offerId} - Soft Delete Offer

**Endpoint**: `DELETE /offers/{offerId}`
**HTTP Method**: DELETE
**Access Level**: Authenticated (Organizer - owner only) + Admin
**MVP Priority**: CRITICAL - Offer lifecycle management
**Estimated Effort**: 3 story points

---

## 1. Overview

Soft delete endpoint allows organizers to remove their offers (draft, published, or any status). Deleted offers are marked with `deleted_at` timestamp and become invisible to parents in browsing/search.

**Key Features**:

- Soft delete (mark `deleted_at`, don't destroy data)
- Owner verification (only organizer can delete own offer)
- Audit trail via offer_status_history
- Email confirmation to organizer
- Associated leads data persists
- Response time target: P50 < 100ms, P99 < 300ms

---

## 2. Database Schema

### 2.1 Core Table

**`offers` table** (existing):

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50),
  deleted_at TIMESTAMP,  -- Soft delete marker (NULL = active)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`offer_status_history` table** (audit trail):

```sql
CREATE TABLE offer_status_history (
  id UUID PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES offers(id),
  user_id UUID REFERENCES auth.users(id),  -- NULL for system actions
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  action VARCHAR(50),  -- 'DELETE', 'RESTORE'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`email_logs` table** (audit):

```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  recipient_email VARCHAR(255),
  email_type VARCHAR(100),
  status VARCHAR(50),  -- 'sent', 'failed', 'pending'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Required Indexes

```sql
-- Soft delete filtering
CREATE INDEX idx_offers_deleted_at ON offers (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Audit trail lookups
CREATE INDEX idx_status_history_offer_id ON offer_status_history (offer_id, created_at DESC);

-- User's offers (exclude deleted)
CREATE INDEX idx_offers_user_active ON offers (user_id)
  WHERE deleted_at IS NULL;
```

### 2.3 RLS Policy

```sql
-- Organizers can only delete their own offers
CREATE POLICY "organizer_can_delete_own_offer" ON offers
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can delete any offer
CREATE POLICY "admin_can_delete_any_offer" ON offers
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 3. API Contract

### 3.1 Request

```typescript
interface DeleteOfferRequest {
  // Path parameter
  offerId: string; // UUID
}
```

### 3.2 Response

```typescript
// Success: 204 No Content (no body)
// Alternative 200 OK response with confirmation:
interface DeleteOfferResponse {
  message: string; // "Offer deleted successfully"
  offer_id: UUID;
  deleted_at: string; // ISO 8601 timestamp
}
```

### 3.3 Validation

```typescript
const DeleteOfferSchema = z
  .object({
    offerId: z.string().uuid(),
  })
  .strict();

function validateDeleteOfferParams(params: unknown): { offerId: UUID } {
  const result = DeleteOfferSchema.safeParse(params);
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }
  return result.data;
}
```

---

## 4. Business Logic

### 4.1 Delete Process

```typescript
interface DeleteOfferRequest {
  offerId: UUID;
  userId: UUID; // From JWT token
  userRole: 'authenticated' | 'admin';
}

async function deleteOffer(request: DeleteOfferRequest): Promise<{
  message: string;
  deleted_at: Date;
}> {
  // 1. Verify offer exists
  const offer = await db.query(
    'SELECT id, user_id, title, status FROM offers WHERE id = $1 AND deleted_at IS NULL',
    [request.offerId],
  );

  if (!offer.rows.length) {
    throw new NotFoundError('Offer not found or already deleted');
  }

  const offerRow = offer.rows[0];

  // 2. Authorization check
  if (
    request.userRole === 'authenticated' &&
    offerRow.user_id !== request.userId
  ) {
    throw new ForbiddenError('You can only delete your own offers');
  }

  // 3. Perform soft delete (begin transaction)
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Update offers table
    const deleteResult = await client.query(
      `UPDATE offers
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING deleted_at`,
      [request.offerId],
    );

    // 4. Record in status_history
    await client.query(
      `INSERT INTO offer_status_history (id, offer_id, user_id, previous_status, new_status, action, notes)
       VALUES ($1, $2, $3, $4, $5, 'DELETE', $6)`,
      [
        uuidv4(),
        request.offerId,
        request.userId,
        offerRow.status,
        'deleted',
        `Offer "${offerRow.title}" deleted by organizer`,
      ],
    );

    // 5. Log email intent (async, non-blocking)
    client
      .query(
        `INSERT INTO email_logs (id, recipient_email, email_type, status)
       VALUES ($1, (SELECT email FROM auth.users WHERE id = $2), 'offer_deleted', 'pending')`,
        [uuidv4(), offerRow.user_id],
      )
      .catch((err) => logger.error('Failed to log email', err));

    await client.query('COMMIT');

    return {
      message: 'Offer deleted successfully',
      deleted_at: deleteResult.rows[0].deleted_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 6. Send async email notification (fire-and-forget via queue)
async function sendOfferDeletedEmail(
  offerId: UUID,
  organizerId: UUID,
): Promise<void> {
  const offer = await db.query('SELECT title FROM offers WHERE id = $1', [
    offerId,
  ]);
  const organizer = await db.query(
    'SELECT email, company_name FROM organizer_profiles WHERE user_id = $1',
    [organizerId],
  );

  const emailData = {
    to: organizer.rows[0].email,
    template: 'offer_deleted',
    variables: {
      company_name: organizer.rows[0].company_name,
      offer_title: offer.rows[0].title,
      deleted_at: new Date().toLocaleString(),
    },
  };

  // Queue via Bull/RabbitMQ (non-blocking)
  await emailQueue.add(emailData);
}
```

### 4.2 Authorization Logic

```typescript
function canDeleteOffer(offer: OfferRow, user: AuthUser): boolean {
  // Case 1: Organizer can delete own offers
  if (user.role === 'authenticated' && offer.user_id === user.id) {
    return true;
  }

  // Case 2: Admin can delete any offer
  if (user.role === 'admin') {
    return true;
  }

  return false;
}
```

### 4.3 Cascading Behavior

```typescript
// What happens when offer is deleted:
// ✓ Offer marked deleted_at
// ✓ Offer not visible in: GET /offers, GET /my-offers, search
// ✓ Associated leads REMAIN (parent still has record of submission)
// ✓ Associated images REMAIN (data integrity)
// ✓ Status history entry CREATED (audit trail)
// ✓ Email sent to organizer (confirmation)
// ✗ Leads are NOT deleted (referential integrity)
// ✗ Images are NOT deleted (referential integrity)
```

---

## 5. Implementation Phases

### Phase 1: Authentication & Setup (Time: 1 hour)

- [ ] Verify JWT extraction and user_id validation
- [ ] Verify user role check (authenticated vs admin)
- [ ] Create database transaction setup
- [ ] Setup error handling (NotFoundError, ForbiddenError)

### Phase 2: Database Verification (Time: 1 hour)

- [ ] Verify offers table has deleted_at column
- [ ] Verify offer_status_history table exists
- [ ] Create soft delete indexes if missing
- [ ] Setup RLS policies for DELETE operation
- [ ] Test RLS policies with different roles

### Phase 3: Backend Route (Time: 1.5 hours)

- [ ] Create Express route: `DELETE /offers/:offerId`
- [ ] Implement authentication middleware
- [ ] Implement UUID validation for offerId
- [ ] Route integration with deleteOffer() function
- [ ] Test with valid/invalid offer IDs

### Phase 4: Offer Lookup & Authorization (Time: 1.5 hours)

- [ ] Implement offer lookup query
- [ ] Implement ownership verification
- [ ] Handle 404 (offer not found or already deleted)
- [ ] Handle 403 (not authorized to delete)
- [ ] Test authorization logic

### Phase 5: Delete Operation & Audit (Time: 1.5 hours)

- [ ] Implement transaction management (BEGIN/COMMIT/ROLLBACK)
- [ ] Implement UPDATE query to set deleted_at
- [ ] Implement status_history insertion
- [ ] Implement email_logs entry creation
- [ ] Test entire transaction atomicity

### Phase 6: Email Notification (Time: 1 hour)

- [ ] Queue email via Bull/RabbitMQ
- [ ] Email template setup (offer_deleted)
- [ ] Send to organizer's email
- [ ] Non-blocking (don't wait for email response)
- [ ] Test email delivery

### Phase 7: Error Handling (Time: 1 hour)

- [ ] Handle 400 (invalid UUID format)
- [ ] Handle 404 (offer not found or already deleted)
- [ ] Handle 403 (not owner/admin)
- [ ] Handle 500 (database error, rollback transaction)
- [ ] Appropriate HTTP status codes and messages

### Phase 8: Testing & Verification (Time: 1.5 hours)

- [ ] Unit tests: authorization logic, transaction handling
- [ ] Integration tests: full delete flow with database
- [ ] Test idempotency (deleting already-deleted offer → 404)
- [ ] Test that leads remain after offer deleted
- [ ] Test that images remain after offer deleted
- [ ] Performance test: response time < 100ms P50
- [ ] Verify email queue injection

---

## 6. Error Handling & Status Codes

### 6.1 Success Responses

| Status         | Scenario                                | Response                                |
| -------------- | --------------------------------------- | --------------------------------------- |
| 204 No Content | Successful deletion (preferred)         | Empty body                              |
| 200 OK         | Successful deletion (with confirmation) | `{ message: "...", deleted_at: "..." }` |

### 6.2 Error Responses

| Status | Code             | Scenario                           | Body                                                                               |
| ------ | ---------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR | Invalid UUID format                | `{ error: { code: 'VALIDATION_ERROR', message: '...' } }`                          |
| 401    | UNAUTHORIZED     | Missing/invalid token              | `{ error: { code: 'UNAUTHORIZED', message: '...' } }`                              |
| 403    | FORBIDDEN        | Not owner/admin                    | `{ error: { code: 'FORBIDDEN', message: 'You can only delete your own offers' } }` |
| 404    | NOT_FOUND        | Offer not found or already deleted | `{ error: { code: 'NOT_FOUND', message: 'Offer not found' } }`                     |
| 500    | INTERNAL_ERROR   | Database error                     | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`                            |

---

## 7. Performance & Optimization

### 7.1 Response Time Targets

- **Database hit**: P50 < 100ms, P99 < 300ms
- **With email queue**: No additional latency (async)

### 7.2 Optimization Strategies

1. **Indexes**: On user_id for fast ownership lookup
2. **Transactions**: Atomic update (single SQL query)
3. **Async email**: Via queue (no blocking)
4. **No caching**: Soft delete filters automatically

---

## 8. Security Considerations

### 8.1 Authentication

- ✅ JWT token required in Authorization header
- ✅ Extract user_id from token
- ✅ Verify not expired

### 8.2 Authorization

- ✅ RLS policy enforces ownership check
- ✅ Organizers can only delete own offers
- ✅ Admins can delete any offer
- ✅ Return 403 if not authorized

### 8.3 Data Integrity

- ✅ Soft delete preserves referential integrity
- ✅ Associated leads remain (audit trail)
- ✅ Associated images remain (data preservation)
- ✅ Transactional consistency (all-or-nothing)

---

## 9. Monitoring & Logging

### 9.1 Logging

```typescript
logger.info('DELETE /offers/${offerId}', {
  organizer_id: userId,
  offer_id: offerId,
  offer_title: offerRow.title,
  previous_status: offerRow.status,
  deleted_at: new Date().toISOString(),
  responseTime: `${Date.now() - startTime}ms`,
});
```

### 9.2 GA4 Events

```typescript
gtag.event('offer_deleted', {
  offer_id: offerId,
  offer_status: offerRow.status,
  organizer_id: userId,
});
```

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth.context';

export function useDeleteOffer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (offerId: string) => {
      const response = await fetch(`/api/offers/${offerId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      return offerId;
    },
    onSuccess: (offerId) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['my-offers'] });
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] });
    },
  });
}

// Usage in component
function OfferActions({ offerId, offerTitle }: { offerId: string; offerTitle: string }) {
  const deleteOffer = useDeleteOffer();

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${offerTitle}"?`)) {
      return;
    }

    try {
      await deleteOffer.mutateAsync(offerId);
      toast.success('Offer deleted successfully');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleteOffer.isPending}
      className="btn btn-danger"
    >
      {deleteOffer.isPending ? 'Deleting...' : 'Delete Offer'}
    </button>
  );
}
```

### 10.2 Optimistic Updates

```typescript
// Optional: Update UI immediately (optimistic)
onMutate: async (offerId: string) => {
  // Cancel any outgoing queries
  await queryClient.cancelQueries({ queryKey: ['my-offers'] });

  // Snapshot previous data
  const previousOffers = queryClient.getQueryData(['my-offers']);

  // Update immediately
  queryClient.setQueryData(['my-offers'], (old: GetMyOffersResponse) => ({
    ...old,
    data: old.data.filter((o) => o.id !== offerId),
  }));

  return { previousOffers };
},
onError: (err, offerId, context) => {
  // Rollback on error
  if (context?.previousOffers) {
    queryClient.setQueryData(['my-offers'], context.previousOffers);
  }
},
```

---

## 11. Deployment Checklist

- [ ] Database soft delete column exists (deleted_at)
- [ ] RLS policies configured for DELETE operation
- [ ] offer_status_history table exists
- [ ] Indexes created for performance
- [ ] Authentication middleware working
- [ ] Authorization logic implemented
- [ ] Transaction management tested
- [ ] Email queue integration working
- [ ] Error handling implemented
- [ ] Frontend mutation hook tested
- [ ] Confirmation dialog implemented in UI
- [ ] Logging enabled

---

## 12. Success Criteria

✅ Organizers can delete only their own offers
✅ Admins can delete any offer
✅ Soft delete (deleted_at set, not destroyed)
✅ Deleted offers not visible in search/listings
✅ Associated leads remain after deletion
✅ Status history entry created for audit
✅ Email confirmation sent to organizer
✅ Response time < 100ms P50, < 300ms P99
✅ Proper error handling (400, 403, 404, 500)
✅ No data leakage between organizers
✅ Transaction atomicity verified
