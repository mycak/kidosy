# Implementation Plan: GET /offers - Browse & Search Published Offers

**Endpoint**: `GET /offers`
**HTTP Method**: GET
**Access Level**: Public (Anonymous)
**MVP Priority**: CRITICAL - Core discovery feature
**Estimated Effort**: 8 story points

---

## 1. Overview

This endpoint enables public browsing and discovery of published offers with comprehensive filtering, pagination, sorting, and geospatial search capabilities. Parents use this interface to find activities for their children.

**Key Features**:

- Multi-criteria filtering (age, category, offer type, location, date range)
- Full-text search on title/description
- Geospatial radius-based search with PostGIS
- Flexible sorting (distance, relevance, date, alphabetical)
- Cursor or offset-based pagination (20-100 items/page)
- Redis caching (5-minute TTL)
- Response time target: P50 < 300ms, P99 < 1000ms

---

## 2. Database Schema & Indexes

### 2.1 Core Tables Required

**`offers` table** (existing):

```sql
CREATE TABLE offers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  offer_type_id UUID REFERENCES offer_types(id),
  address VARCHAR(500),
  location geometry(Point, 4326),  -- PostGIS: POINT(lon, lat)
  start_date DATE,
  end_date DATE,
  available_spots INTEGER CHECK (available_spots >= 0),
  status VARCHAR(50) CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**`offer_categories` junction table**:

```sql
CREATE TABLE offer_categories (
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id),
  PRIMARY KEY (offer_id, category_id)
);
```

**`categories` dictionary table**:

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);
```

**`offer_types` dictionary table**:

```sql
CREATE TABLE offer_types (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);
```

**`offer_ages` junction table**:

```sql
CREATE TABLE offer_ages (
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  age INTEGER NOT NULL,
  PRIMARY KEY (offer_id, age)
);
```

**`offer_schedules` table**:

```sql
CREATE TABLE offer_schedules (
  id UUID PRIMARY KEY,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_active BOOLEAN DEFAULT true
);
```

**`offer_images` table**:

```sql
CREATE TABLE offer_images (
  id UUID PRIMARY KEY,
  offer_id UUID REFERENCES offers(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,
  display_order INTEGER CHECK (display_order BETWEEN 0 AND 9)
);
```

**`organizer_profiles` table**:

```sql
CREATE TABLE organizer_profiles (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id),
  company_name VARCHAR(255),
  phone VARCHAR(20),
  email_public VARCHAR(255)
);
```

### 2.2 Required Indexes

```sql
-- Full-text search index (PostgreSQL tsvector)
CREATE INDEX idx_offers_search_tsvector ON offers USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(description, ''))
);

-- Geospatial index for radius queries
CREATE INDEX idx_offers_location_gist ON offers USING GIST (location);

-- Status and publish date filtering - composite
CREATE INDEX idx_offers_status_date ON offers (status, created_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Organizer lookup
CREATE INDEX idx_offers_user_id ON offers (user_id);

-- Date range queries
CREATE INDEX idx_offers_date_range ON offers (start_date, end_date)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Text pattern search for autocomplete optimization
CREATE INDEX idx_offers_title_pattern ON offers (title VARCHAR_PATTERN_OPS)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Age range queries - optimized with expression
CREATE INDEX idx_offer_ages_mapping ON offer_ages (age);
```

### 2.3 RLS Policy for Public Browse

```sql
CREATE POLICY "anon_can_view_published_offers" ON offers
  FOR SELECT
  USING (status = 'published' AND deleted_at IS NULL);

CREATE POLICY "offer_categories_public" ON offer_categories
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM offers
    WHERE offers.id = offer_categories.offer_id
    AND offers.status = 'published'
    AND offers.deleted_at IS NULL
  ));

CREATE POLICY "offer_ages_public" ON offer_ages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM offers
    WHERE offers.id = offer_ages.offer_id
    AND offers.status = 'published'
    AND offers.deleted_at IS NULL
  ));

CREATE POLICY "organizer_profiles_public" ON organizer_profiles
  FOR SELECT
  USING (true);  -- Public profile data
```

---

## 3. API Contract & Data Types

### 3.1 Request Query Parameters

```typescript
// Query string parameters
interface GetOffersQueryParams {
  // Pagination
  page?: number; // Default: 1, Min: 1
  per_page?: number; // Default: 20, Min: 1, Max: 100

  // Search & Text
  search?: string; // Full-text search on title + description

  // Filtering by age range
  min_age?: number; // Min: 0
  max_age?: number; // Max: 18+

  // Filtering by category/type
  categories?: string[]; // CSV or array of category UUIDs
  offer_types?: string[]; // CSV or array of offer type UUIDs

  // Geospatial (for radius search)
  location_lat?: number; // Latitude: -90 to 90
  location_lon?: number; // Longitude: -180 to 180
  radius_km?: number; // Radius in kilometers, Min: 0.5, Max: 50

  // Date range
  start_date_from?: string; // ISO 8601: YYYY-MM-DD
  start_date_to?: string; // ISO 8601: YYYY-MM-DD

  // Sorting
  sort_by?:
    | 'distance'
    | 'relevance'
    | 'date_created'
    | 'date_updated'
    | 'title'
    | 'available_spots';
  sort_order?: 'asc' | 'desc'; // Default: desc for distance/date, asc for alphabetical
}
```

### 3.2 Response DTO

```typescript
interface GetOffersResponse {
  data: OfferPublicDTO[];
  pagination: {
    total: number; // Total count across all pages
    page: number; // Current page
    per_page: number; // Items per page
    total_pages: number; // Calculated: ceil(total / per_page)
  };
  facets?: FacetsDTO; // Optional: for advanced UI with filter counts
}

interface OfferPublicDTO {
  id: UUID;
  title: string;
  description: string;
  ages: number[]; // [3, 4, 5, 6, 7, 8]
  offer_type: {
    id: UUID;
    name: string; // 'Cyclic Classes'
    slug: string; // 'cyclic-classes'
  };
  categories: CategoryDTO[]; // Array of categories
  address: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  start_date: string; // ISO 8601 date
  end_date: string;
  available_spots: number;
  organizer: {
    id: UUID;
    company_name: string;
    phone: string;
    email_public: string;
  };
  images: {
    id: UUID;
    storage_path: string; // Relative to Supabase bucket
    display_order: number;
    cdn_url?: string; // Pre-signed CDN URL (optional)
  }[];
  schedules: {
    day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
    start_time: string; // HH:MM format
    end_time: string;
  }[];
  created_at: string; // ISO 8601 timestamp
  updated_at: string;
  distance_km?: number; // Only if geospatial query used
}

interface CategoryDTO {
  id: UUID;
  name: string; // 'Sport'
  slug: string; // 'sport'
}

interface FacetsDTO {
  categories: { id: UUID; name: string; count: number }[];
  offer_types: { id: UUID; name: string; count: number }[];
  age_groups: { min: number; max: number; count: number }[];
  location_regions: { region: string; count: number }[];
}
```

### 3.3 Validation Rules

```typescript
// Zod schema
const GetOffersQuerySchema = z
  .object({
    page: z.number().int().min(1).optional().default(1),
    per_page: z.number().int().min(1).max(100).optional().default(20),
    search: z.string().max(100).optional(),
    min_age: z.number().int().min(0).optional(),
    max_age: z.number().int().min(0).optional(),
    categories: z.array(z.string().uuid()).optional(),
    offer_types: z.array(z.string().uuid()).optional(),
    location_lat: z.number().min(-90).max(90).optional(),
    location_lon: z.number().min(-180).max(180).optional(),
    radius_km: z.number().min(0.5).max(50).optional(),
    start_date_from: z.string().date().optional(),
    start_date_to: z.string().date().optional(),
    sort_by: z
      .enum([
        'distance',
        'relevance',
        'date_created',
        'date_updated',
        'title',
        'available_spots',
      ])
      .optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

// Validation logic
function validateGetOffersParams(query: unknown): GetOffersQueryParams {
  const result = GetOffersQuerySchema.safeParse(query);
  if (!result.success) {
    throw new ValidationError(result.error.flatten());
  }

  // Cross-field validation
  if (
    result.data.sort_by === 'distance' &&
    (!result.data.location_lat || !result.data.location_lon)
  ) {
    throw new ValidationError({
      fieldErrors: { location_lat: ['Required when sort_by=distance'] },
    });
  }

  if (
    result.data.min_age &&
    result.data.max_age &&
    result.data.min_age > result.data.max_age
  ) {
    throw new ValidationError({
      fieldErrors: { max_age: ['Must be >= min_age'] },
    });
  }

  return result.data;
}
```

---

## 4. Core Business Logic

### 4.1 Search & Filter Logic

```typescript
interface SearchFilters {
  ageRange?: { min: number; max: number };
  categoryIds?: UUID[];
  offerTypeIds?: UUID[];
  location?: { lat: number; lon: number; radiusKm: number };
  dateRange?: { from: Date; to: Date };
  searchTerm?: string;
  sortBy?: 'distance' | 'relevance' | 'date_created' | 'date_updated' | 'title';
  sortOrder?: 'asc' | 'desc';
}

function buildGetOffersQuery(filters: SearchFilters): {
  sql: string;
  params: object;
} {
  // Use PostgreSQL full-text search for relevance
  let sqlConditions: string[] = [
    "offers.status = 'published'",
    'offers.deleted_at IS NULL',
  ];

  const params: Record<string, unknown> = {};

  // Age range filter: overlap between offer.ages and [min_age, max_age]
  if (filters.ageRange) {
    sqlConditions.push(`
      EXISTS (
        SELECT 1 FROM offer_ages
        WHERE offer_ages.offer_id = offers.id
        AND offer_ages.age BETWEEN $minAge AND $maxAge
      )
    `);
    params.minAge = filters.ageRange.min;
    params.maxAge = filters.ageRange.max;
  }

  // Category filter (intersection)
  if (filters.categoryIds?.length) {
    sqlConditions.push(`
      (SELECT COUNT(DISTINCT oc.category_id)
       FROM offer_categories oc
       WHERE oc.offer_id = offers.id
       AND oc.category_id = ANY($categoryIds::uuid[])
      ) = $categoryCount
    `);
    params.categoryIds = filters.categoryIds;
    params.categoryCount = filters.categoryIds.length;
  }

  // Offer type filter
  if (filters.offerTypeIds?.length) {
    sqlConditions.push(`offers.offer_type_id = ANY($offerTypeIds::uuid[])`);
    params.offerTypeIds = filters.offerTypeIds;
  }

  // Geospatial radius search
  if (filters.location) {
    const radiusMeters = filters.location.radiusKm * 1000;
    sqlConditions.push(`
      ST_DWithin(
        offers.location,
        ST_GeomFromText('POINT($lon $lat)', 4326),
        $radiusMeters
      )
    `);
    params.lat = filters.location.lat;
    params.lon = filters.location.lon;
    params.radiusMeters = radiusMeters;
  }

  // Date range filter
  if (filters.dateRange) {
    sqlConditions.push(`
      offers.start_date <= $endDate
      AND offers.end_date >= $startDate
    `);
    params.startDate = filters.dateRange.from;
    params.endDate = filters.dateRange.to;
  }

  // Full-text search
  if (filters.searchTerm) {
    sqlConditions.push(`
      to_tsvector('english', offers.title || ' ' || COALESCE(offers.description, ''))
      @@ websearch_to_tsquery('english', $searchTerm)
    `);
    params.searchTerm = filters.searchTerm;
  }

  const whereClause = sqlConditions.join(' AND ');

  // Build sort clause
  let sortClause = 'offers.created_at DESC';
  if (filters.sortBy === 'distance' && filters.location) {
    const lon = filters.location.lon;
    const lat = filters.location.lat;
    sortClause = `ST_Distance(
      offers.location,
      ST_GeomFromText('POINT($lon $lat)', 4326)
    ) ${filters.sortOrder || 'ASC'}`;
  } else if (filters.sortBy === 'relevance' && filters.searchTerm) {
    sortClause = `ts_rank(
      to_tsvector('english', offers.title || ' ' || COALESCE(offers.description, '')),
      websearch_to_tsquery('english', $searchTerm)
    ) ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  } else if (filters.sortBy) {
    sortClause = `offers.${filters.sortBy} ${filters.sortOrder === 'asc' ? 'ASC' : 'DESC'}`;
  }

  const sql = `
    SELECT
      offers.id,
      offers.title,
      offers.description,
      offers.address,
      ST_AsGeoJSON(offers.location) as location,
      offers.start_date,
      offers.end_date,
      offers.available_spots,
      offers.offer_type_id,
      offers.created_at,
      offers.updated_at,
      json_agg(DISTINCT oa.age) FILTER (WHERE oa.age IS NOT NULL) as ages,
      json_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug))
        FILTER (WHERE c.id IS NOT NULL) as categories,
      json_agg(DISTINCT jsonb_build_object(
        'day_of_week', os.day_of_week,
        'start_time', os.start_time,
        'end_time', os.end_time
      )) FILTER (WHERE os.id IS NOT NULL) as schedules,
      json_agg(DISTINCT jsonb_build_object(
        'id', oi.id,
        'storage_path', oi.storage_path,
        'display_order', oi.display_order
      )) FILTER (WHERE oi.id IS NOT NULL) as images,
      row_to_json((SELECT q FROM (SELECT op.id, op.company_name, op.phone, op.email_public) q)) as organizer,
      CASE WHEN ${filters.location ? `ST_Distance(offers.location, ST_GeomFromText('POINT($lon $lat)', 4326)) / 1000` : 'NULL'} THEN distance_km END
    FROM offers
    LEFT JOIN offer_ages oa ON offers.id = oa.offer_id
    LEFT JOIN offer_categories oc ON offers.id = oc.offer_id
    LEFT JOIN categories c ON oc.category_id = c.id
    LEFT JOIN offer_types ot ON offers.offer_type_id = ot.id
    LEFT JOIN offer_schedules os ON offers.id = os.offer_id
    LEFT JOIN offer_images oi ON offers.id = oi.offer_id AND oi.display_order = 0
    LEFT JOIN organizer_profiles op ON offers.user_id = op.user_id
    WHERE ${whereClause}
    GROUP BY offers.id
    ORDER BY ${sortClause}
  `;

  return { sql, params };
}
```

### 4.2 Caching Strategy

```typescript
interface CacheConfig {
  ttlSeconds: 300; // 5 minutes
  keyPrefix: 'offers:search:';
  invalidateTriggers: ['OFFER_PUBLISHED', 'OFFER_UNPUBLISHED', 'OFFER_UPDATED'];
}

function getCacheKey(filters: SearchFilters, page: number): string {
  const filterHash = hashObject({
    ageRange: filters.ageRange,
    categoryIds: filters.categoryIds?.sort(),
    offerTypeIds: filters.offerTypeIds?.sort(),
    location: filters.location,
    dateRange: filters.dateRange,
    searchTerm: filters.searchTerm,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  return `offers:search:${filterHash}:page:${page}`;
}

async function getOffersWithCache(
  filters: SearchFilters,
  page: number,
  perPage: number,
): Promise<GetOffersResponse> {
  const cacheKey = getCacheKey(filters, page);

  // Try Redis cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Query database
  const { sql, params } = buildGetOffersQuery(filters);
  const offset = (page - 1) * perPage;

  const countResult = await db.query(
    `SELECT COUNT(*) as total FROM (${sql}) t`,
    params,
  );
  const dataResult = await db.query(`${sql} LIMIT $limit OFFSET $offset`, {
    ...params,
    limit: perPage,
    offset,
  });

  const response: GetOffersResponse = {
    data: mapToDTOs(dataResult.rows),
    pagination: {
      total: countResult.rows[0].total,
      page,
      per_page: perPage,
      total_pages: Math.ceil(countResult.rows[0].total / perPage),
    },
  };

  // Cache the response
  await redis.setex(cacheKey, 300, JSON.stringify(response));

  return response;
}
```

### 4.3 Distance Calculation (Optional Client-side)

```typescript
// Haversine formula for client-side reference distance
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

---

## 5. Implementation Phases

### Phase 1: Database Verification & Indexes (Time: 2 hours)

- [ ] Verify all required tables exist in Supabase PostgreSQL
- [ ] Create missing indexes (tsvector, GIST, composite)
- [ ] Enable PostGIS extension if not enabled
- [ ] Set up RLS policies for public access
- [ ] Load sample dictionary data (categories, offer_types)

### Phase 2: Backend Route & Validation (Time: 3 hours)

- [ ] Create Express/Node.js route: `GET /offers`
- [ ] Implement Zod schema validation for query parameters
- [ ] Create validation middleware with error handling
- [ ] Test validation with invalid/edge-case inputs
- [ ] Document validation error responses (400 codes)

### Phase 3: Query Building & Database Integration (Time: 4 hours)

- [ ] Implement `buildGetOffersQuery()` with filtering logic
- [ ] Test age range overlap queries
- [ ] Test category intersection queries
- [ ] Test PostGIS ST_DWithin radius queries
- [ ] Test full-text search with websearch_to_tsquery
- [ ] Test sorting variants (distance, relevance, date, title)
- [ ] Verify query performance with EXPLAIN ANALYZE

### Phase 4: Redis Caching Layer (Time: 2 hours)

- [ ] Set up Redis client connection
- [ ] Implement cache key generation with filter hashing
- [ ] Implement `getOffersWithCache()` function
- [ ] Set TTL to 5 minutes for public offers
- [ ] Create cache invalidation triggers (listen to OFFER events)
- [ ] Test cache hit/miss scenarios

### Phase 5: Response Mapping & DTOs (Time: 2 hours)

- [ ] Implement `mapToDTOs()` to transform DB results
- [ ] Handle GeoJSON conversion from PostGIS
- [ ] Aggregate related data (categories, schedules, images)
- [ ] Format organizer profile for public display (mask sensitive fields)
- [ ] Test image CDN URL generation
- [ ] Test distance calculation for sorted results

### Phase 6: Pagination Implementation (Time: 1.5 hours)

- [ ] Implement offset-based pagination with `page` and `per_page`
- [ ] Add count query for `total` and `total_pages`
- [ ] Implement pagination metadata in response
- [ ] Test pagination edge cases (page > total_pages, per_page=1, per_page=100)
- [ ] Verify query optimization for large datasets

### Phase 7: Error Handling & Edge Cases (Time: 2 hours)

- [ ] Handle 400 validation errors (invalid coordinates, query length)
- [ ] Handle 404 errors (if filters match no results → return empty data array with 0 total, not 404)
- [ ] Handle database connection failures → 500 errors
- [ ] Handle timeout errors for slow queries
- [ ] Test rate limiting for public endpoint (100/minute per IP)
- [ ] Add logging for slow queries (> 1s)

### Phase 8: Testing & Performance Optimization (Time: 3 hours)

- [ ] Unit tests: validation schemas, filter logic
- [ ] Integration tests: end-to-end queries with various filters
- [ ] Performance tests: response time with 10k+ offers
- [ ] Load test: 100 concurrent requests
- [ ] Test cache busting on offer updates
- [ ] Test with missing/null values in database
- [ ] Optimize queries based on EXPLAIN ANALYZE results
- [ ] Document expected response times: P50 < 300ms, P99 < 1000ms

---

## 6. Error Handling & Status Codes

### 6.1 Success Responses

| Status | Scenario                   | Response                                      |
| ------ | -------------------------- | --------------------------------------------- |
| 200 OK | Valid query with results   | `{ data: [...], pagination: {...} }`          |
| 200 OK | Valid query with 0 results | `{ data: [], pagination: { total: 0, ... } }` |

### 6.2 Error Responses

| Status | Code                | Scenario                        | Body                                                                      |
| ------ | ------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| 400    | VALIDATION_ERROR    | Invalid query parameters        | `{ error: { code: 'VALIDATION_ERROR', message: '...', details: [...] } }` |
| 400    | BAD_REQUEST         | Malformed JSON                  | `{ error: { code: 'BAD_REQUEST', message: '...' } }`                      |
| 429    | RATE_LIMIT_EXCEEDED | Rate limit hit (100/min per IP) | `{ error: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: 60 } }`              |
| 500    | INTERNAL_ERROR      | Database or server error        | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`                   |

### 6.3 Specific Validation Errors

```typescript
type ValidationErrorDetail = {
  field: string;
  message: string;
};

// Examples:
[
  { field: 'page', message: 'Must be >= 1' },
  { field: 'per_page', message: 'Must be <= 100' },
  { field: 'location_lat', message: 'Must be between -90 and 90' },
  { field: 'min_age', message: 'Must be <= max_age' },
  {
    field: 'sort_by',
    message: 'distance requires location_lat and location_lon',
  },
];
```

---

## 7. Performance & Optimization

### 7.1 Query Performance Targets

- **Cold Cache (Database Hit)**: P50 < 500ms, P99 < 2000ms
- **Warm Cache (Redis Hit)**: P50 < 50ms, P99 < 100ms
- **With 100k+ offers**: P50 < 300ms (with indexes)

### 7.2 Optimization Strategies

1. **Index Usage**:
   - GIST index on `location` for ST_DWithin queries
   - GIN index on tsvector for full-text search
   - Composite index on `(status, deleted_at)` for WHERE filtering
   - BRIN or partial indexes for hot data

2. **Query Optimization**:
   - Limit aggregated columns (don't fetch all images/schedules)
   - Use LIMIT clause early to reduce joins
   - Eager load foreign keys (organizer profiles)
   - Use EXPLAIN ANALYZE to verify index usage

3. **Caching**:
   - Redis 5-minute TTL for public browse
   - Browser cache headers (Cache-Control: public, max-age=300)
   - CDN for image serving (Supabase Storage CDN)

4. **Client-side Optimization**:
   - Lazy load images (IntersectionObserver)
   - Pagination: fetch next page on demand
   - Debounce search input (300ms)

---

## 8. Security Considerations

### 8.1 Authorization

- ✅ Anonymous users can view published offers only
- ✅ RLS policy enforces `status = 'published' AND deleted_at IS NULL`
- ✅ No authentication required
- ✅ No sensitive organizer data leaked (only company_name, phone, email_public)

### 8.2 Input Validation

- ✅ All query parameters validated with Zod
- ✅ Coordinate validation (lat -90..90, lon -180..180)
- ✅ String length limits (search max 100 chars)
- ✅ Enum validation (sort_by, sort_order)
- ✅ Prevent SQL injection via parameterized queries

### 8.3 Rate Limiting

- ✅ 100 requests/minute per IP for anonymous users
- ✅ Implemented in reverse proxy or middleware
- ✅ Return 429 with Retry-After header

### 8.4 Data Privacy

- ✅ Hide sensitive organizer data (email, password)
- ✅ Parent email/phone not exposed publicly
- ✅ No offer edit history visible to public
- ✅ Deleted offers not searchable

---

## 9. Monitoring & Analytics

### 9.1 Logging

```typescript
// Log all search queries for analytics
logger.info('GET /offers search', {
  filters: {
    categories: filters.categoryIds?.length,
    ageRange: filters.ageRange,
    location: filters.location ? 'yes' : 'no',
    searchTerm: filters.searchTerm ? 'yes' : 'no',
  },
  results: { total: response.pagination.total },
  responseTime: `${Date.now() - startTime}ms`,
  cacheHit: wasCached,
  userIP: req.ip,
});
```

### 9.2 GA4 Events

```typescript
// Track search events
gtag.event('search', {
  search_term: filters.searchTerm,
  filters_applied: {
    categories: filters.categoryIds?.length || 0,
    age_range: filters.ageRange ? 'yes' : 'no',
    location: filters.location ? 'yes' : 'no',
  },
  results_count: response.pagination.total,
  page: page,
});
```

### 9.3 Performance Monitoring

- Response time percentiles (P50, P95, P99)
- Cache hit rate (should be > 80%)
- Database query count (aim for 2 queries max)
- Slow query logging (threshold: 1 second)

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useQuery } from '@tanstack/react-query';

interface UseGetOffersProps {
  page: number;
  perPage: number;
  filters: SearchFilters;
}

export function useGetOffers({ page, perPage, filters }: UseGetOffersProps) {
  return useQuery({
    queryKey: ['offers', { page, perPage, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        ...buildQueryString(filters),
      });

      const response = await fetch(`/api/offers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch offers');
      return response.json() as Promise<GetOffersResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes (formerly cacheTime)
  });
}

// Usage in component
function BrowseOffers() {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useGetOffers({
    page,
    perPage: 20,
    filters,
  });

  return (
    <div>
      <SearchFilters onFilter={setFilters} />
      {isLoading && <Spinner />}
      {error && <ErrorAlert error={error} />}
      {data?.data.length === 0 && <EmptyState />}
      <OffersList offers={data?.data ?? []} />
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

- [ ] Database indexes created and tested for performance
- [ ] RLS policies enabled and verified
- [ ] Redis cache configured with 5-minute TTL
- [ ] Environment variables set: DATABASE_URL, REDIS_URL
- [ ] Route tested locally with 50+ offers in database
- [ ] Load test passed: 100 concurrent requests
- [ ] Error handling tested (validation, missing data, timeouts)
- [ ] Rate limiting middleware configured
- [ ] Logging and monitoring enabled
- [ ] Frontend integration tested
- [ ] Documentation updated (API docs, Swagger)
- [ ] Performance metrics baselined

---

## 12. Success Criteria

✅ Endpoint returns paginated list of published offers
✅ All filtering options work correctly (age, category, location, date, search)
✅ Geospatial queries return accurate results within specified radius
✅ Full-text search returns relevant results first
✅ Response time < 300ms P50, < 1000ms P99 (with cache)
✅ Caching reduces database load (> 80% cache hit rate)
✅ Proper error handling for invalid inputs (400 errors)
✅ No sensitive data exposed in public response
✅ Rate limiting prevents abuse
✅ Pagination works with large datasets (100k+ offers)
