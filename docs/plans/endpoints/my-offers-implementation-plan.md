# Implementation Plan: GET /my-offers - Organizer's Offers Dashboard

**Endpoint**: `GET /my-offers`
**HTTP Method**: GET
**Access Level**: Authenticated (Organizers only)
**MVP Priority**: CRITICAL - Core organizer dashboard feature
**Estimated Effort**: 6 story points

---

## 1. Overview

This endpoint provides organizers with a view of all their offers across all statuses (draft, pending_review, published, rejected, archived). Enables dashboard management and status tracking.

**Key Features**:

- Status filtering (draft, pending_review, published, rejected, archived, all)
- Flexible sorting (created_at, updated_at, title, start_date)
- Pagination (20-100 items/page)
- Show rejection_reason and leads_count per offer
- Quick action indicators (ready to publish, pending review, etc.)
- Response time target: P50 < 200ms, P99 < 500ms

---

## 2. Database Schema & Indexes

### 2.1 Core Tables Required

**`offers` table** (existing):

```sql
-- All organizer offers, regardless of status
CREATE TABLE offers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  offer_type_id UUID REFERENCES offer_types(id),
  status VARCHAR(50) CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  rejection_reason VARCHAR(100),  -- reason category: incomplete_description, missing_required_fields, spam, duplicate, other
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`leads` table** (for leads count):

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  offer_id UUID REFERENCES offers(id),
  status VARCHAR(50),
  created_at TIMESTAMP
);
```

### 2.2 Required Indexes

```sql
-- Organizer's offers lookup with status filtering
CREATE INDEX idx_offers_user_status_date ON offers (user_id, status, created_at DESC)
  WHERE deleted_at IS NULL;

-- Fast status lookups per organizer
CREATE INDEX idx_offers_user_status ON offers (user_id, status)
  WHERE deleted_at IS NULL;

-- Date range sorting (most common sorting for dashboard)
CREATE INDEX idx_offers_user_date ON offers (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- For rejection reason filtering
CREATE INDEX idx_offers_rejection_reason ON offers (user_id, rejection_reason)
  WHERE status = 'rejected' AND deleted_at IS NULL;
```

### 2.3 RLS Policy for Organizer Access

```sql
-- Organizers can see only their own offers (all statuses)
CREATE POLICY "organizer_can_view_own_offers" ON offers
  FOR SELECT
  USING (user_id = auth.uid());

-- Admin can see all offers for any organizer
CREATE POLICY "admin_can_view_all_offers" ON offers
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');
```

### 2.4 Denormalization Option (Optional Performance)

```sql
-- Optional: Materialized view to cache leads count
CREATE MATERIALIZED VIEW offers_with_leads_count AS
SELECT
  o.id,
  o.user_id,
  COUNT(l.id) FILTER (WHERE l.status = 'submitted') as leads_submitted_count,
  COUNT(l.id) FILTER (WHERE l.status = 'contacted') as leads_contacted_count,
  COUNT(l.id) FILTER (WHERE l.status = 'completed') as leads_completed_count,
  COUNT(l.id) FILTER (WHERE l.status = 'cancelled') as leads_cancelled_count,
  COUNT(l.id) as leads_total_count
FROM offers o
LEFT JOIN leads l ON o.id = l.offer_id
GROUP BY o.id;

-- Refresh daily or on lead status change
CREATE INDEX idx_offers_leads_user ON offers_with_leads_count (user_id);
```

---

## 3. API Contract & Data Types

### 3.1 Request Query Parameters

```typescript
interface GetMyOffersQueryParams {
  // Pagination
  page?: number; // Default: 1, Min: 1
  per_page?: number; // Default: 20, Min: 1, Max: 100

  // Status filtering
  status?:
    | 'draft'
    | 'pending_review'
    | 'published'
    | 'rejected'
    | 'archived'
    | 'all';
  // Default: 'all'

  // Optional offer filter
  offer_id?: UUID; // Single offer lookup

  // Sorting options
  sort_by?:
    | 'created_at'
    | 'updated_at'
    | 'title'
    | 'start_date'
    | 'leads_count';
  // Default: 'updated_at'
  sort_order?: 'asc' | 'desc'; // Default: 'desc'
}
```

### 3.2 Response DTO

```typescript
interface GetMyOffersResponse {
  data: MyOfferDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
  summary?: {
    draft_count: number;
    pending_review_count: number;
    published_count: number;
    rejected_count: number;
    archived_count: number;
    total_leads: number;
  };
}

interface MyOfferDTO {
  id: UUID;
  title: string;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

  // Status indicators
  available_spots: number;
  leads_count: number; // Total leads submitted
  leads_contacted_count?: number; // Optional: breakdown by status
  leads_completed_count?: number;
  leads_cancelled_count?: number;

  // Dates & ranges
  start_date: string; // ISO 8601
  end_date: string;

  // Status-specific info
  rejection_reason?: string; // Only if status='rejected'
  rejection_message?: string; // Admin feedback

  // Metadata
  offer_type: {
    name: string;
  };
  created_at: string;
  updated_at: string;

  // Quick action flags
  isPublished: boolean;
  isPendingReview: boolean;
  isRejected: boolean;
  isExpired: boolean; // end_date < today
  isArchived: boolean;
  canSubmitForReview: boolean; // draft || rejected
  canPublish: boolean; // pending_review
  canEditBasics: boolean; // draft (all fields) || published (limited fields)
}
```

### 3.3 Validation Rules

```typescript
const GetMyOffersQuerySchema = z
  .object({
    page: z.number().int().min(1).optional().default(1),
    per_page: z.number().int().min(1).max(100).optional().default(20),
    status: z
      .enum([
        'draft',
        'pending_review',
        'published',
        'rejected',
        'archived',
        'all',
      ])
      .optional()
      .default('all'),
    offer_id: z.string().uuid().optional(),
    sort_by: z
      .enum(['created_at', 'updated_at', 'title', 'start_date', 'leads_count'])
      .optional()
      .default('updated_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  })
  .strict();

function validateGetMyOffersParams(query: unknown): GetMyOffersQueryParams {
  const result = GetMyOffersQuerySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }
  return result.data;
}
```

---

## 4. Core Business Logic

### 4.1 Query Building

```typescript
interface DashboardFilters {
  status?:
    | 'draft'
    | 'pending_review'
    | 'published'
    | 'rejected'
    | 'archived'
    | 'all';
  offerId?: UUID;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'start_date' | 'leads_count';
  sortOrder?: 'asc' | 'desc';
}

function buildGetMyOffersQuery(
  userId: UUID,
  filters: DashboardFilters,
): {
  sql: string;
  countSql: string;
  params: object;
} {
  let conditions: string[] = [
    'offers.user_id = $userId',
    'offers.deleted_at IS NULL',
  ];

  const params: Record<string, unknown> = { userId };

  // Status filtering
  if (filters.status && filters.status !== 'all') {
    conditions.push('offers.status = $status');
    params.status = filters.status;
  }

  // Specific offer lookup
  if (filters.offerId) {
    conditions.push('offers.id = $offerId');
    params.offerId = filters.offerId;
  }

  const whereClause = conditions.join(' AND ');

  // Sort clause
  let sortClause = 'offers.updated_at DESC';
  if (filters.sortBy === 'created_at') {
    sortClause = `offers.created_at ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  } else if (filters.sortBy === 'title') {
    sortClause = `offers.title ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  } else if (filters.sortBy === 'start_date') {
    sortClause = `offers.start_date ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  } else if (filters.sortBy === 'leads_count') {
    // Join with leads count
    sortClause = `leads_count ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  }

  const sql = `
    SELECT
      offers.id,
      offers.title,
      offers.status,
      offers.available_spots,
      offers.start_date,
      offers.end_date,
      offers.offer_type_id,
      offers.rejection_reason,
      offers.rejection_message,
      offers.created_at,
      offers.updated_at,
      COALESCE(COUNT(l.id), 0) as leads_count,
      COUNT(l.id) FILTER (WHERE l.status = 'contacted') as leads_contacted_count,
      COUNT(l.id) FILTER (WHERE l.status = 'completed') as leads_completed_count,
      COUNT(l.id) FILTER (WHERE l.status = 'cancelled') as leads_cancelled_count,
      ot.name as offer_type_name
    FROM offers
    LEFT JOIN leads l ON offers.id = l.offer_id
    LEFT JOIN offer_types ot ON offers.offer_type_id = ot.id
    WHERE ${whereClause}
    GROUP BY offers.id, ot.name
    ORDER BY ${sortClause}
  `;

  const countSql = `
    SELECT COUNT(DISTINCT offers.id) as total
    FROM offers
    WHERE ${whereClause}
  `;

  return { sql, countSql, params };
}

async function getMyOffers(
  userId: UUID,
  filters: DashboardFilters,
  page: number,
  perPage: number,
): Promise<GetMyOffersResponse> {
  // Check authentication
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }

  const { sql, countSql, params } = buildGetMyOffersQuery(userId, filters);
  const offset = (page - 1) * perPage;

  // Get count
  const countResult = await db.query(countSql, params);
  const total = countResult.rows[0].total;

  // Get paginated data
  const dataResult = await db.query(`${sql} LIMIT $limit OFFSET $offset`, {
    ...params,
    limit: perPage,
    offset,
  });

  // Calculate summary stats (if requested)
  let summary: GetMyOffersResponse['summary'] | undefined;
  if (filters.status === 'all') {
    const summaryResult = await db.query(
      `
      SELECT
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'pending_review' THEN 1 END) as pending_review_count,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
        COALESCE(SUM(leads_count), 0) as total_leads
      FROM (${sql}) t
    `,
      params,
    );
    summary = summaryResult.rows[0];
  }

  return {
    data: mapToDTOs(dataResult.rows),
    pagination: {
      total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage),
    },
    summary,
  };
}
```

### 4.2 DTO Mapping with Status Indicators

```typescript
function mapOfferToDTO(row: any): MyOfferDTO {
  const today = new Date().toDateString();
  const endDate = new Date(row.end_date).toDateString();
  const isExpired = endDate < today && row.status === 'published';

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    available_spots: row.available_spots,
    leads_count: row.leads_count,
    leads_contacted_count: row.leads_contacted_count,
    leads_completed_count: row.leads_completed_count,
    leads_cancelled_count: row.leads_cancelled_count,
    start_date: row.start_date,
    end_date: row.end_date,
    rejection_reason: row.rejection_reason || null,
    rejection_message: row.rejection_message || null,
    offer_type: {
      name: row.offer_type_name,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,

    // Computed flags
    isPublished: row.status === 'published' && !isExpired,
    isPendingReview: row.status === 'pending_review',
    isRejected: row.status === 'rejected',
    isExpired,
    isArchived: row.status === 'archived',
    canSubmitForReview: row.status === 'draft' || row.status === 'rejected',
    canPublish: row.status === 'pending_review',
    canEditBasics: row.status === 'draft',
  };
}
```

### 4.3 No Caching for Authenticated Dashboard

```typescript
// Dashboard data must be fresh - no Redis caching
// RLS policy ensures only organizer's own data is visible
// Lightweight query due to indexed lookups

async function getMyOffersNoCaching(
  userId: UUID,
  filters: DashboardFilters,
  page: number,
  perPage: number,
): Promise<GetMyOffersResponse> {
  // Always hit database for fresh organizer data
  return getMyOffers(userId, filters, page, perPage);
}
```

---

## 5. Implementation Phases

### Phase 1: Authentication Middleware (Time: 1 hour)

- [ ] Verify JWT token extraction from Authorization header
- [ ] Extract user_id from JWT token
- [ ] Verify 'authenticated' role (not 'anon')
- [ ] Create authentication middleware for protected routes
- [ ] Test with valid/invalid tokens

### Phase 2: Database Verification & Indexes (Time: 1.5 hours)

- [ ] Verify offers table structure with all status values
- [ ] Create composite index on (user_id, status, created_at)
- [ ] Create index on (user_id, status) for filtering
- [ ] Create RLS policies for organizer access
- [ ] Test RLS policies with different users

### Phase 3: Backend Route & Validation (Time: 2 hours)

- [ ] Create Express.js route: `GET /my-offers`
- [ ] Implement authentication middleware check
- [ ] Implement Zod validation schema
- [ ] Test validation with invalid parameters
- [ ] Test authorization (can only see own offers)

### Phase 4: Query Building & Database Integration (Time: 2.5 hours)

- [ ] Implement `buildGetMyOffersQuery()` function
- [ ] Test status filtering (draft, published, rejected, etc.)
- [ ] Test sorting by all fields (created_at, updated_at, title, start_date, leads_count)
- [ ] Verify pagination works correctly
- [ ] Test leads count aggregation with group by
- [ ] Verify query performance with EXPLAIN ANALYZE

### Phase 5: Response Mapping & DTOs (Time: 1.5 hours)

- [ ] Implement `mapOfferToDTO()` with computed flags
- [ ] Calculate derived fields (isExpired, canSubmitForReview, etc.)
- [ ] Format rejection_reason and rejection_message
- [ ] Test DTO mapping with various offer statuses
- [ ] Verify leads count breakdown accuracy

### Phase 6: Summary Statistics (Time: 1 hour)

- [ ] Implement summary calculation for status='all' queries
- [ ] Count offers per status (draft, pending_review, published, rejected, archived)
- [ ] Sum total leads across all offers
- [ ] Return summary only when status filter is 'all'
- [ ] Test summary with various offer distributions

### Phase 7: Error Handling (Time: 1.5 hours)

- [ ] Handle 401 Unauthorized (invalid/missing token)
- [ ] Handle 400 Bad Request (invalid query parameters)
- [ ] Handle 404 Not Found (specific offer_id doesn't exist or not owned by user)
- [ ] Handle database connection failures → 500
- [ ] Test all error scenarios with appropriate HTTP status codes

### Phase 8: Testing & Integration (Time: 2 hours)

- [ ] Unit tests: validation, DTO mapping, computed flags
- [ ] Integration tests: end-to-end with database
- [ ] Test with multiple offers in various statuses
- [ ] Test pagination edge cases
- [ ] Test filtering combinations
- [ ] Performance test: response time < 200ms P50, < 500ms P99

---

## 6. Error Handling & Status Codes

### 6.1 Success Responses

| Status | Scenario                    | Response                                             |
| ------ | --------------------------- | ---------------------------------------------------- |
| 200 OK | Valid authenticated request | `{ data: [...], pagination: {...}, summary: {...} }` |
| 200 OK | No offers found             | `{ data: [], pagination: { total: 0, ... } }`        |

### 6.2 Error Responses

| Status | Code             | Scenario                                 | Body                                                                      |
| ------ | ---------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR | Invalid query parameters                 | `{ error: { code: 'VALIDATION_ERROR', message: '...', details: [...] } }` |
| 401    | UNAUTHORIZED     | Missing or invalid JWT token             | `{ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }` |
| 404    | NOT_FOUND        | Specific offer_id not found or not owned | `{ error: { code: 'NOT_FOUND', message: 'Offer not found' } }`            |
| 500    | INTERNAL_ERROR   | Server error                             | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`                   |

---

## 7. Performance & Optimization

### 7.1 Response Time Targets

- **With indexed lookups**: P50 < 200ms, P99 < 500ms
- **With 1000+ offers per organizer**: P50 < 300ms, P99 < 800ms

### 7.2 Optimization Strategies

1. **Indexes**: Composite on (user_id, status, created_at DESC)
2. **Pagination**: LIMIT/OFFSET optimization
3. **Aggregation**: Use COUNT(l.id) FILTER for status breakdown (vs. separate queries)
4. **No caching**: Dashboard data must be fresh (real-time updates)
5. **Denormalization**: Optional materialized view for leads_count if performance degrades

### 7.3 Query Optimization

```sql
-- Analyze query plan
EXPLAIN ANALYZE
SELECT offers.id, offers.title, COUNT(l.id) as leads_count
FROM offers
LEFT JOIN leads l ON offers.id = l.offer_id
WHERE offers.user_id = '...'
GROUP BY offers.id
ORDER BY offers.updated_at DESC
LIMIT 20 OFFSET 0;

-- Expected: Index Scan on idx_offers_user_status_date
```

---

## 8. Security Considerations

### 8.1 Authentication

- ✅ JWT token required in Authorization header
- ✅ Verify token not expired
- ✅ Extract user_id from JWT claims
- ✅ Return 401 if token missing or invalid

### 8.2 Authorization

- ✅ RLS policy ensures organizers see only their own offers
- ✅ Parameterized queries prevent SQL injection
- ✅ No cross-organizer data leakage

### 8.3 Input Validation

- ✅ Query parameters validated with Zod
- ✅ Status enum validation
- ✅ UUID format validation for offer_id
- ✅ Page number validation (>= 1)

---

## 9. Monitoring & Analytics

### 9.1 Logging

```typescript
logger.info('GET /my-offers', {
  organizer_id: userId,
  status_filter: filters.status,
  page,
  per_page: perPage,
  results_count: response.data.length,
  total: response.pagination.total,
  responseTime: `${Date.now() - startTime}ms`,
});
```

### 9.2 GA4 Events

```typescript
gtag.event('view_dashboard', {
  organizer_id: userId,
  status_filter: filters.status || 'all',
  sort_by: filters.sortBy,
});
```

### 9.3 Performance Monitoring

- Response time percentiles (P50, P95, P99)
- Slow query logging (threshold: 500ms)
- Database connection pool utilization

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/auth.context';

interface UseDashboardOffersProps {
  page: number;
  status?: string;
  sortBy?: string;
  perPage?: number;
}

export function useDashboardOffers({
  page,
  status = 'all',
  sortBy = 'updated_at',
  perPage = 20,
}: UseDashboardOffersProps) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-offers', { page, status, sortBy, perPage }],
    queryFn: async () => {
      const response = await fetch(
        `/api/my-offers?page=${page}&per_page=${perPage}&status=${status}&sort_by=${sortBy}`,
        {
          headers: {
            Authorization: `Bearer ${user.session.access_token}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch offers');
      return response.json() as Promise<GetMyOffersResponse>;
    },
    staleTime: 30 * 1000,  // 30 seconds (dashboard needs fresher data)
    gcTime: 2 * 60 * 1000,  // 2 minutes
    enabled: !!user,
  });
}

// Usage
function OrganizerDashboard() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  const { data, isLoading, error } = useDashboardOffers({
    page,
    status,
    perPage: 20,
  });

  return (
    <div>
      <h1>My Offers</h1>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-5 gap-4">
          <SummaryCard label="Draft" count={data.summary.draft_count} />
          <SummaryCard label="Pending" count={data.summary.pending_review_count} />
          <SummaryCard label="Published" count={data.summary.published_count} />
          <SummaryCard label="Rejected" count={data.summary.rejected_count} />
          <SummaryCard label="Total Leads" count={data.summary.total_leads} />
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2 my-4">
        {['all', 'draft', 'published', 'pending_review', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={status === s ? 'bg-blue-500 text-white' : 'bg-gray-200'}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Offers table */}
      {isLoading && <Spinner />}
      {error && <ErrorAlert error={error} />}
      {data?.data.length === 0 && <EmptyState />}

      <table className="w-full">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Leads</th>
            <th>Start Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((offer) => (
            <tr key={offer.id}>
              <td>{offer.title}</td>
              <td>
                <StatusBadge status={offer.status} isExpired={offer.isExpired} />
              </td>
              <td>{offer.leads_count}</td>
              <td>{new Date(offer.start_date).toLocaleDateString()}</td>
              <td>
                <ActionMenu offer={offer} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <Pagination
        current={page}
        total={data?.pagination.total_pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
```

---

## 11. Deployment Checklist

- [ ] Database indexes created and tested
- [ ] RLS policies configured for organizer access
- [ ] JWT authentication middleware implemented
- [ ] Validation schemas implemented
- [ ] Query building tested with various filters
- [ ] DTO mapping includes all computed flags
- [ ] Summary statistics accurate
- [ ] Error handling implemented for all cases
- [ ] Frontend integration tested
- [ ] Performance metrics baselined (< 200ms P50)
- [ ] Load test: 50 concurrent authenticated requests
- [ ] Documentation updated

---

## 12. Success Criteria

✅ Authenticated organizers can view their own offers only
✅ Status filtering works correctly (all statuses correctly categorized)
✅ Sorting works by all fields (created_at, updated_at, title, start_date, leads_count)
✅ Leads count is accurate and updated in real-time
✅ Computed flags (isExpired, canSubmitForReview, etc.) are correct
✅ Rejection reason visible for rejected offers
✅ Summary statistics accurate when status='all'
✅ Pagination works with large offer counts (1000+)
✅ Response time < 200ms P50, < 500ms P99
✅ No cross-organizer data leakage
✅ Proper error handling and logging
