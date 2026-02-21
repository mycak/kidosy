# Offer Details Query - Database Schema Fix

## Issue

When fetching offer details, users encountered this Supabase/PostgREST error:

```json
{
  "code": "PGRST200",
  "details": "Searched for a foreign key relationship between 'offers' and 'organizer_profiles' using the hint 'organizer_id' in the schema 'public', but no matches were found.",
  "hint": "Perhaps you meant 'offer_schedules' instead of 'organizer_profiles'.",
  "message": "Could not find a relationship between 'offers' and 'organizer_profiles' in the schema cache"
}
```

## Root Cause

The `offers` table only had a `user_id` foreign key pointing to `users(id)`. There was no direct relationship to `organizer_profiles`. PostgREST couldn't find the `organizer_id` foreign key relationship that the query was trying to use.

### Schema Before Fix

```
offers
├── user_id → users (has indirect path to organizer_profiles)
└── (no direct organizer_id FK)

organizer_profiles
├── user_id → users
└── (no incoming FK from offers)
```

## Solution

Created migration `20260128120400_add_organizer_fk_to_offers.sql` that:

1. **Added `organizer_id` column** to `offers` table as a direct foreign key
   - Foreign key: `organizer_id` → `organizer_profiles(id)`
   - Constraint: `ON DELETE RESTRICT` (prevents deleting organizer if they have offers)
   - Populated from existing `user_id` → `organizer_profiles` relationships

2. **Created performance index**: `idx_offers_organizer_id`
   - Optimizes queries filtering by organizer

### Schema After Fix

```
offers
├── user_id → users
└── organizer_id → organizer_profiles (NEW)

organizer_profiles
├── user_id → users
└── ← organizer_id (from offers) - NEW INCOMING REFERENCE
```

## PostgREST Query Syntax

With the foreign key in place, PostgREST can now resolve this query:

```sql
SELECT * FROM offers
WHERE id = {offerId}
  AND status = 'published'
  AND organizer:organizer_profiles(id, company_name, phone, email_public)
```

The `!organizer_id` hint tells PostgREST to use the `organizer_id` foreign key column for the join.

## Migration Details

**File**: `supabase/migrations/20260128120400_add_organizer_fk_to_offers.sql`

**Steps**:

1. Add `organizer_id` as nullable column
2. Populate from `organizer_profiles` via `user_id` relationship
3. Make column `NOT NULL`
4. Create index

**Status**: ✅ Applied successfully to local database

## Why This Design?

- **Direct relationships faster**: Instead of joining through 3 tables (`offers → users → organizer_profiles`), we now have a direct 1-to-1 join
- **PostgREST compatibility**: PostgREST's implicit join feature works with explicit foreign keys only
- **Data integrity**: `ON DELETE RESTRICT` ensures data consistency (can't delete organizer if they have offers)
- **Performance**: Index on `organizer_id` speeds up queries filtering by organizer

## Impact on Queries

The fix enables PostgREST to correctly resolve queries like:

```typescript
supabaseClient
  .from('offers')
  .select(
    `
    id,
    title,
    organizer:organizer_profiles(
      id,
      company_name,
      phone,
      email_public
    )
  `,
  )
  .eq('id', offerId)
  .eq('status', 'published')
  .single();
```

Previously the query would fail with PGRST200 error. Now it works correctly.

## Related Code Files

- Query: [src/features/offers/queries/useOfferDetails.ts](../../src/features/offers/queries/useOfferDetails.ts)
- Component: [src/features/offers/components/OfferDetailsPage.tsx](../../src/features/offers/components/OfferDetailsPage.tsx)
- Types: [src/features/offers/types.ts](../../src/features/offers/types.ts)

## Verification

After migration, test that fetching offer details works:

```bash
# From console in browser
await fetch('http://localhost:54321/rest/v1/offers?id=eq.{offerId}&select=id,title,organizer:organizer_profiles(id,company_name)')
```

Should return offer data with embedded organizer information.

## Future Considerations

1. Consider if `user_id` is still needed (yes - for RLS policies, lead relationships)
2. Update any documentation that references the data model
3. Ensure seed data properly populates `organizer_id` for all test offers
