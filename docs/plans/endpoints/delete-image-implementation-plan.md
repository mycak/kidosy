# Implementation Plan: DELETE /images/{imageId} - Delete Offer Image

**Endpoint**: `DELETE /images/{imageId}`
**HTTP Method**: DELETE
**Access Level**: Authenticated (Organizer - owner of offer) + Admin
**MVP Priority**: HIGH - Essential for image management
**Estimated Effort**: 2.5 story points

---

## 1. Overview

Removes an image from an offer. Deletes both the file from Supabase Storage and the database record. Automatically reorders remaining images to fill gaps.

**Key Features**:

- Remove image file from Supabase Storage
- Delete database record
- Auto-reorder images (display_order)
- Atomic transaction (all-or-nothing)
- Response time target: P50 < 100ms, P99 < 300ms

---

## 2. Database Schema

### 2.1 Core Table (Existing)

**`offer_images` table**:

```sql
CREATE TABLE offer_images (
  id UUID PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,
  display_order INTEGER NOT NULL CHECK (display_order BETWEEN 0 AND 9),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 Required Indexes

```sql
-- Fast lookup
CREATE INDEX idx_offer_images_id ON offer_images (id);

-- Reordering after deletion
CREATE INDEX idx_offer_images_display_order ON offer_images (offer_id, display_order);
```

### 2.3 RLS Policy

```sql
-- Organizers can only delete images from their own offers
CREATE POLICY "organizer_can_delete_own_images" ON offer_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = offer_images.offer_id
      AND offers.user_id = auth.uid()
    )
  );

-- Admin can delete any image
CREATE POLICY "admin_can_delete_any_image" ON offer_images
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 3. API Contract

### 3.1 Request

```typescript
interface DeleteImageRequest {
  // Path parameter
  imageId: string; // UUID
}
```

### 3.2 Response

```typescript
// Success: 204 No Content (no body)
// Or 200 OK with confirmation:
interface DeleteImageResponse {
  message: string; // "Image deleted successfully"
  image_id: UUID;
  deleted_at: string; // ISO 8601
}
```

### 3.3 Validation

```typescript
const DeleteImageSchema = z
  .object({
    imageId: z.string().uuid(),
  })
  .strict();

function validateDeleteImageParams(params: unknown): { imageId: UUID } {
  const result = DeleteImageSchema.safeParse(params);
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
interface DeleteImageRequest {
  imageId: UUID;
  userId: UUID; // From JWT
  userRole: 'authenticated' | 'admin';
}

async function deleteImage(request: DeleteImageRequest): Promise<void> {
  // 1. Fetch image details
  const imageQuery = await db.query(
    `SELECT oi.id, oi.offer_id, oi.storage_path, oi.display_order,
            o.user_id as organizer_id
     FROM offer_images oi
     JOIN offers o ON oi.offer_id = o.id
     WHERE oi.id = $1`,
    [request.imageId],
  );

  if (!imageQuery.rows.length) {
    throw new NotFoundError('Image not found');
  }

  const imageRow = imageQuery.rows[0];

  // 2. Authorization check
  if (
    request.userRole === 'authenticated' &&
    imageRow.organizer_id !== request.userId
  ) {
    throw new ForbiddenError('You can only delete images from your own offers');
  }

  // 3. Begin transaction
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 4. Delete file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('offers')
      .remove([imageRow.storage_path]);

    if (storageError) {
      // Non-blocking: log but continue with database cleanup
      logger.warn('Failed to delete storage file', {
        storagePath: imageRow.storage_path,
        error: storageError.message,
      });
    }

    // 5. Delete database record
    await client.query('DELETE FROM offer_images WHERE id = $1', [
      request.imageId,
    ]);

    // 6. Reorder remaining images (compact display_order)
    const remainingImages = await client.query(
      'SELECT id FROM offer_images WHERE offer_id = $1 ORDER BY display_order ASC',
      [imageRow.offer_id],
    );

    // Update display_order for all remaining images
    for (let newOrder = 0; newOrder < remainingImages.rows.length; newOrder++) {
      await client.query(
        'UPDATE offer_images SET display_order = $1 WHERE id = $2',
        [newOrder, remainingImages.rows[newOrder].id],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 4.2 Reordering Logic (Detailed)

```typescript
// Example: Delete image at display_order=1 from 5-image gallery
// Before: [0, 1, 2, 3, 4]
// Delete 1
// After rebound: [0, 1, 2, 3]     // Images shift down

async function reorderImagesAfterDeletion(
  offerId: UUID,
  deletedDisplayOrder: number,
  client: PoolClient,
): Promise<void> {
  // Get all images for this offer, ordered by display_order
  const images = await client.query(
    `SELECT id, display_order
     FROM offer_images
     WHERE offer_id = $1
     ORDER BY display_order ASC`,
    [offerId],
  );

  // Reassign display_order sequentially (0, 1, 2, ...)
  for (let i = 0; i < images.rows.length; i++) {
    if (images.rows[i].display_order !== i) {
      await client.query(
        'UPDATE offer_images SET display_order = $1 WHERE id = $2',
        [i, images.rows[i].id],
      );
    }
  }
}
```

### 4.3 Atomic Constraints

```typescript
// Before deletion:
// offer_images (offer_id='X'): [
//   { id: 'img1', display_order: 0 },
//   { id: 'img2', display_order: 1 },
//   { id: 'img3', display_order: 2 }
// ]

// User deletes img2 (display_order=1)

// After deletion & reordering:
// offer_images (offer_id='X'): [
//   { id: 'img1', display_order: 0 },
//   { id: 'img3', display_order: 1 }  ← Shifted from 2 to 1
// ]

// UNIQUE(offer_id, display_order) constraint preserved
```

---

## 5. Implementation Phases

### Phase 1: Authentication & Setup (Time: 30 min)

- [ ] Verify JWT extraction
- [ ] Setup Supabase Storage client
- [ ] Setup transaction management

### Phase 2: Database Verification (Time: 30 min)

- [ ] Verify offer_images table exists
- [ ] Create indexes if missing
- [ ] Setup RLS policies

### Phase 3: Backend Route (Time: 1 hour)

- [ ] Create Express route: `DELETE /images/:imageId`
- [ ] Implement authentication middleware
- [ ] Implement UUID validation
- [ ] Route integration

### Phase 4: Image Lookup & Authorization (Time: 1 hour)

- [ ] Implement image lookup query
- [ ] Join with offers table for ownership verification
- [ ] Handle 404 (image not found)
- [ ] Handle 403 (not authorized)

### Phase 5: Storage & Database Deletion (Time: 1 hour)

- [ ] Implement Supabase Storage deletion
- [ ] Implement database record deletion
- [ ] Setup transaction management
- [ ] Test atomicity (rollback on error)

### Phase 6: Image Reordering (Time: 1 hour)

- [ ] Implement reorder logic
- [ ] Test with various scenarios (delete first, middle, last)
- [ ] Verify UNIQUE constraint preservation
- [ ] Test with single/multiple remaining images

### Phase 7: Error Handling (Time: 1 hour)

- [ ] Handle 400 (invalid UUID)
- [ ] Handle 401 (unauthorized)
- [ ] Handle 403 (not owner)
- [ ] Handle 404 (image not found)
- [ ] Handle 500 (storage/db errors)

### Phase 8: Testing & Integration (Time: 1.5 hours)

- [ ] Unit tests: authorization, reorder logic
- [ ] Integration tests: full delete flow
- [ ] Test edge cases (last image, multiple deletes)
- [ ] Test storage failure handling
- [ ] Performance test: < 100ms P50

---

## 6. Error Handling & Status Codes

### 6.1 Success Response

| Status         | Scenario                         | Response                                |
| -------------- | -------------------------------- | --------------------------------------- |
| 204 No Content | Successful deletion              | Empty body                              |
| 200 OK         | Success (alt. with confirmation) | `{ message: "...", deleted_at: "..." }` |

### 6.2 Error Responses

| Status | Code             | Scenario              | Body                                         |
| ------ | ---------------- | --------------------- | -------------------------------------------- |
| 400    | VALIDATION_ERROR | Invalid UUID format   | `{ error: { code: '...', message: '...' } }` |
| 401    | UNAUTHORIZED     | Missing/invalid token | `{ error: { code: '...', message: '...' } }` |
| 403    | FORBIDDEN        | Not owner of offer    | `{ error: { code: '...', message: '...' } }` |
| 404    | NOT_FOUND        | Image not found       | `{ error: { code: '...', message: '...' } }` |
| 500    | INTERNAL_ERROR   | Storage/DB error      | `{ error: { code: '...', message: '...' } }` |

---

## 7. Performance & Optimization

### 7.1 Response Time Targets

- **Database hit**: P50 < 100ms, P99 < 300ms
- **Storage deletion async**: No blocking

### 7.2 Optimization

1. **Indexes**: On (offer_id, display_order) for reordering
2. **Async Storage**: Non-blocking Supabase Storage deletion
3. **Single Transaction**: All-or-nothing atomicity
4. **Batch Reorder**: Single query vs. loop if possible

---

## 8. Security Considerations

### 8.1 Authorization

- ✅ RLS policy ensures only offer owner can delete
- ✅ Admins can delete any image
- ✅ Verify ownership via join query

### 8.2 Data Integrity

- ✅ Atomic transaction (storage + database)
- ✅ UNIQUE constraint maintained after reorder
- ✅ No orphaned storage files

---

## 9. Monitoring & Logging

### 9.1 Logging

```typescript
logger.info('DELETE /images/${imageId}', {
  organizer_id: userId,
  image_id: imageId,
  offer_id: imageRow.offer_id,
  storage_path: imageRow.storage_path,
  deleted_display_order: imageRow.display_order,
  remaining_images_count: remainingCount,
  responseTime: `${Date.now() - startTime}ms`,
});
```

### 9.2 GA4 Events

```typescript
gtag.event('delete_image', {
  offer_id: imageRow.offer_id,
  organizer_id: userId,
});
```

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth.context';

export function useDeleteImage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }
    },
    onSuccess: (_, imageId) => {
      // Invalidate offer images list
      queryClient.invalidateQueries({ queryKey: ['offer-images'] });
    },
  });
}

// Usage
function ImageCard({ image }: { image: UploadImageResponse }) {
  const deleteImage = useDeleteImage();

  return (
    <div className="image-card">
      <img src={image.cdn_url} alt="Offer" />
      <button
        onClick={async () => {
          if (confirm('Delete this image?')) {
            await deleteImage.mutateAsync(image.id);
          }
        }}
        disabled={deleteImage.isPending}
      >
        Delete
      </button>
    </div>
  );
}
```

### 10.2 Optimistic Update

```typescript
onMutate: async (imageId: string) => {
  await queryClient.cancelQueries({ queryKey: ['offer-images'] });
  const previous = queryClient.getQueryData(['offer-images']);

  // Remove image immediately from UI
  queryClient.setQueryData(['offer-images'], (old: UploadImageResponse[]) =>
    old.filter((img) => img.id !== imageId)
  );

  return { previous };
},
onError: (err, imageId, context) => {
  if (context?.previous) {
    queryClient.setQueryData(['offer-images'], context.previous);
  }
},
```

---

## 11. Deployment Checklist

- [ ] Supabase Storage bucket access configured
- [ ] offer_images table and indexes verified
- [ ] RLS policies configured
- [ ] Authentication middleware working
- [ ] Storage deletion logic tested
- [ ] Reorder logic tested (multiple scenarios)
- [ ] Transaction management working
- [ ] Error handling implemented
- [ ] Frontend mutation hook tested
- [ ] Logging enabled

---

## 12. Success Criteria

✅ Organizers can delete only their own offer images
✅ Admins can delete any image
✅ Image file deleted from Supabase Storage
✅ Database record deleted
✅ Remaining images reordered correctly
✅ UNIQUE(offer_id, display_order) constraint maintained
✅ Response time < 100ms P50, < 300ms P99
✅ Atomic transaction (all-or-nothing)
✅ Proper error handling (400, 403, 404, 500)
✅ No orphaned storage files
