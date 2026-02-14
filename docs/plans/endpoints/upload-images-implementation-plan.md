# Implementation Plan: POST /offers/{offerId}/images - Upload Offer Image

**Endpoint**: `POST /offers/{offerId}/images`
**HTTP Method**: POST
**Access Level**: Authenticated (Organizer - owner only) + Admin
**MVP Priority**: CRITICAL - Essential for offer presentation (no cover image = poor UX)
**Estimated Effort**: 5 story points

---

## 1. Overview

Enables organizers to upload images to their offers. Images stored in Supabase Storage with database references. Supports up to 10 images per offer with configurable display order.

**Key Features**:

- Multipart/form-data file upload
- File validation (size, format: jpg/png/webp)
- Supabase Storage integration
- Database record creation
- Display order management (0-9)
- CDN URL generation for responses
- Response time target: P50 < 500ms (excluding file upload time), P99 < 2000ms

---

## 2. Database Schema

### 2.1 Core Table

**`offer_images` table**:

```sql
CREATE TABLE offer_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,  -- Path in Supabase Storage
  display_order INTEGER NOT NULL CHECK (display_order BETWEEN 0 AND 9),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(offer_id, display_order)  -- One image per display order per offer
);
```

### 2.2 Required Indexes

```sql
-- Fast lookup for image counts and reordering
CREATE INDEX idx_offer_images_offer_id_display_order ON offer_images (offer_id, display_order);

-- Cleanup old images
CREATE INDEX idx_offer_images_created_at ON offer_images (created_at);
```

### 2.3 RLS Policies

```sql
-- Organizers can only upload to their own offers
CREATE POLICY "organizer_can_upload_to_own_offer" ON offer_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = offer_images.offer_id
      AND offers.user_id = auth.uid()
    )
  );

-- Organizers can view/delete their own offer images
CREATE POLICY "organizer_can_manage_own_images" ON offer_images
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = offer_images.offer_id
      AND offers.user_id = auth.uid()
    )
  );

-- Admin can manage any images
CREATE POLICY "admin_can_manage_images" ON offer_images
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 3. API Contract

### 3.1 Request (Multipart/Form-Data)

```typescript
interface UploadImageRequest {
  // Path parameter
  offerId: string; // UUID

  // Form data
  file: File; // Binary file data
  display_order?: number; // 0-9, default: next available
}

// Example curl:
// curl -X POST /api/offers/uuid/images \
//   -H "Authorization: Bearer token" \
//   -F "file=@image.jpg" \
//   -F "display_order=0"
```

### 3.2 Response

```typescript
interface UploadImageResponse {
  id: UUID;
  offer_id: UUID;
  storage_path: string;                 // Relative path: offers/{offerId}/{filename}
  display_order: number;
  cdn_url: string;                      // Signed CDN URL (valid for 30 days)
  created_at: string;                   // ISO 8601
}

// Example response:
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "offer_id": "offer-uuid",
  "storage_path": "offers/offer-uuid/image-1234567890.jpg",
  "display_order": 0,
  "cdn_url": "https://cdn.supabase.co/offers/offer-uuid/image-1234567890.jpg?token=...",
  "created_at": "2025-01-31T12:00:00Z"
}
```

### 3.3 Validation

```typescript
const UploadImageSchema = z.object({
  offerId: z.string().uuid(),
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File too large (max 5MB)')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Invalid file format (jpg, png, webp only)',
    ),
  display_order: z.number().int().min(0).max(9).optional(),
});

interface ValidationErrors {
  fieldErrors: {
    file?: string[];
    display_order?: string[];
  };
}
```

---

## 4. Business Logic

### 4.1 Upload Process

```typescript
interface UploadImageRequest {
  offerId: UUID;
  userId: UUID; // From JWT
  userRole: 'authenticated' | 'admin';
  file: File;
  displayOrder?: number;
}

async function uploadOfferImage(
  request: UploadImageRequest,
): Promise<UploadImageResponse> {
  // 1. Verify offer exists and is owned by user
  const offer = await db.query(
    'SELECT id, user_id FROM offers WHERE id = $1 AND deleted_at IS NULL',
    [request.offerId],
  );

  if (!offer.rows.length) {
    throw new NotFoundError('Offer not found');
  }

  // 2. Authorization check
  if (
    request.userRole === 'authenticated' &&
    offer.rows[0].user_id !== request.userId
  ) {
    throw new ForbiddenError('You can only upload images to your own offers');
  }

  // 3. Check image count (max 10 per offer)
  const imageCount = await db.query(
    'SELECT COUNT(*) as count FROM offer_images WHERE offer_id = $1',
    [request.offerId],
  );

  if (imageCount.rows[0].count >= 10) {
    throw new ConflictError('Maximum 10 images per offer');
  }

  // 4. Determine display_order if not provided
  let displayOrder = request.displayOrder;
  if (displayOrder === undefined) {
    const nextOrder = await db.query(
      'SELECT COALESCE(MAX(display_order) + 1, 0) as next_order FROM offer_images WHERE offer_id = $1',
      [request.offerId],
    );
    displayOrder = nextOrder.rows[0].next_order;
  } else {
    // Check if display_order already taken
    const existing = await db.query(
      'SELECT id FROM offer_images WHERE offer_id = $1 AND display_order = $2',
      [request.offerId, displayOrder],
    );
    if (existing.rows.length) {
      throw new ConflictError(
        `Image display order ${displayOrder} already taken`,
      );
    }
  }

  // 5. Upload file to Supabase Storage
  const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const storagePath = `offers/${request.offerId}/${filename}.jpg`;

  const buffer = await request.file.arrayBuffer();
  const { data, error } = await supabase.storage
    .from('offers')
    .upload(storagePath, buffer, {
      contentType: request.file.type,
      cacheControl: '31536000', // 1 year
    });

  if (error) {
    throw new InternalError(`Upload failed: ${error.message}`);
  }

  // 6. Create database record
  const imageRecord = await db.query(
    `INSERT INTO offer_images (id, offer_id, storage_path, display_order)
     VALUES ($1, $2, $3, $4)
     RETURNING id, offer_id, storage_path, display_order, created_at`,
    [uuidv4(), request.offerId, storagePath, displayOrder],
  );

  // 7. Generate CDN URL (signed or public)
  const cdnUrl = generateCdnUrl(storagePath);

  return {
    id: imageRecord.rows[0].id,
    offer_id: imageRecord.rows[0].offer_id,
    storage_path: imageRecord.rows[0].storage_path,
    display_order: imageRecord.rows[0].display_order,
    cdn_url: cdnUrl,
    created_at: imageRecord.rows[0].created_at,
  };
}

function generateCdnUrl(storagePath: string): string {
  // Option 1: Public URL (if bucket is public)
  return `${SUPABASE_URL}/storage/v1/object/public/offers/${storagePath}`;

  // Option 2: Signed URL (if bucket is private, valid for 30 days)
  // const signedUrl = await supabase.storage
  //   .from('offers')
  //   .createSignedUrl(storagePath, 30 * 24 * 60 * 60);  // 30 days
  // return signedUrl.data.signedURL;
}
```

### 4.2 Image Validation & Constraints

```typescript
// File size validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGES_PER_OFFER = 10;

function validateImageFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError({
      fieldErrors: {
        file: [`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`],
      },
    });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ValidationError({
      fieldErrors: { file: ['Only JPG, PNG, and WebP images allowed'] },
    });
  }
}
```

### 4.3 Image Processing (Optional)

```typescript
// Optional: Image resizing/optimization before storage
import sharp from 'sharp';

async function optimizeImage(file: File): Promise<Buffer> {
  const buffer = await file.arrayBuffer();

  return sharp(buffer)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}

// Usage in upload process:
// const optimizedBuffer = await optimizeImage(request.file);
// const { data, error } = await supabase.storage
//   .from('offers')
//   .upload(storagePath, optimizedBuffer, { contentType: 'image/jpeg' });
```

---

## 5. Implementation Phases

### Phase 1: Authentication & Setup (Time: 1 hour)

- [ ] Verify JWT extraction and user_id validation
- [ ] Setup Supabase Storage client
- [ ] Configure bucket permissions (public or private)
- [ ] Setup error handling (ValidationError, ConflictError, etc.)

### Phase 2: Database Verification (Time: 1 hour)

- [ ] Verify offer_images table exists
- [ ] Verify UNIQUE constraint on (offer_id, display_order)
- [ ] Create indexes if missing
- [ ] Setup RLS policies for image operations
- [ ] Test RLS policies with different roles

### Phase 3: Backend Route & Middleware (Time: 1.5 hours)

- [ ] Create Express route: `POST /offers/:offerId/images`
- [ ] Implement multer middleware for file upload
- [ ] Implement UUID validation for offerId
- [ ] Setup file size limits (5MB max)
- [ ] Test file upload handling

### Phase 4: File Validation (Time: 1.5 hours)

- [ ] Implement file type validation (jpg/png/webp)
- [ ] Implement file size validation
- [ ] Implement MIME type checking
- [ ] Test validation with invalid files
- [ ] Return appropriate 400 errors

### Phase 5: Offer & Authorization (Time: 1 hour)

- [ ] Implement offer lookup
- [ ] Implement ownership verification
- [ ] Check max image count (10 per offer)
- [ ] Handle 404 (offer not found)
- [ ] Handle 403 (not authorized)

### Phase 6: Supabase Storage Upload (Time: 1.5 hours)

- [ ] Setup Supabase Storage client
- [ ] Implement file upload logic
- [ ] Generate unique storage paths
- [ ] Setup caching headers (1 year)
- [ ] Test with actual file uploads
- [ ] Generate CDN URLs

### Phase 7: Database Record Creation (Time: 1 hour)

- [ ] Implement image record insertion
- [ ] Handle display_order assignment
- [ ] Test with multiple images
- [ ] Verify unique constraint enforcement
- [ ] Return complete response DTO

### Phase 8: Error Handling & Edge Cases (Time: 1.5 hours)

- [ ] Handle 400 (invalid file format/size)
- [ ] Handle 401 (missing/invalid token)
- [ ] Handle 403 (not owner)
- [ ] Handle 404 (offer not found)
- [ ] Handle 409 (max images exceeded, display_order taken)
- [ ] Handle storage errors (upload failure)
- [ ] Handle 500 (server errors)

### Phase 9: Testing & Integration (Time: 2 hours)

- [ ] Unit tests: validation logic, authorization
- [ ] Integration tests: full upload flow
- [ ] Test with various file types/sizes
- [ ] Test max image limit enforcement
- [ ] Test CDN URL generation
- [ ] Performance test: response time < 500ms
- [ ] Load test: concurrent uploads

---

## 6. Error Handling & Status Codes

### 6.1 Success Response

| Status      | Scenario          | Response                                                             |
| ----------- | ----------------- | -------------------------------------------------------------------- |
| 201 Created | Successful upload | `{ id, offer_id, storage_path, display_order, cdn_url, created_at }` |

### 6.2 Error Responses

| Status | Code             | Scenario                                   | Body                                                      |
| ------ | ---------------- | ------------------------------------------ | --------------------------------------------------------- |
| 400    | VALIDATION_ERROR | Invalid file type/size                     | `{ error: { code: 'VALIDATION_ERROR', details: [...] } }` |
| 401    | UNAUTHORIZED     | Missing/invalid token                      | `{ error: { code: 'UNAUTHORIZED', message: '...' } }`     |
| 403    | FORBIDDEN        | Not owner                                  | `{ error: { code: 'FORBIDDEN', message: '...' } }`        |
| 404    | NOT_FOUND        | Offer not found                            | `{ error: { code: 'NOT_FOUND', message: '...' } }`        |
| 409    | CONFLICT         | Max images exceeded or display_order taken | `{ error: { code: 'CONFLICT', message: '...' } }`         |
| 500    | INTERNAL_ERROR   | Upload failure                             | `{ error: { code: 'INTERNAL_ERROR', message: '...' } }`   |

---

## 7. Performance & Optimization

### 7.1 Response Time Targets

- **Excluding file transfer**: P50 < 500ms, P99 < 2000ms
- **Network-dependent**: File size affects upload time (5MB at 1Mbps ≈ 40s)

### 7.2 Optimization Strategies

1. **Client-side**: Compress images before upload (reduce size)
2. **Server-side**: Async processing (don't block response)
3. **Storage**: CDN caching (1-year cache header)
4. **Database**: Index on offer_id for fast count check

### 7.3 Image Optimization (Optional)

```typescript
// Resize large images to reduce storage
// Use sharp library for fast image processing
// Example: max 1200x1200 px, 85% JPEG quality → ~200KB per image
```

---

## 8. Security Considerations

### 8.1 File Upload Security

- ✅ File type validation (MIME type matching extension)
- ✅ File size limit (5MB max)
- ✅ Filename sanitization (remove user-provided names, generate random)
- ✅ Virus scanning (optional: CloudScan, VirusTotal API)
- ✅ Storage path isolated per offer

### 8.2 Authorization

- ✅ RLS policy ensures organizers upload to own offers only
- ✅ Verify ownership before allowing upload
- ✅ Admins can manage any images

### 8.3 Data Privacy

- ✅ Images stored in isolated bucket
- ✅ Access control via RLS policies
- ✅ Secure URLs (signed or public depending on bucket setting)

---

## 9. Monitoring & Logging

### 9.1 Logging

```typescript
logger.info('POST /offers/${offerId}/images', {
  organizer_id: userId,
  offer_id: offerId,
  file_size: file.size,
  file_type: file.type,
  display_order: displayOrder,
  storage_path: storagePath,
  responseTime: `${Date.now() - startTime}ms`,
});
```

### 9.2 GA4 Events

```typescript
gtag.event('upload_image', {
  offer_id: offerId,
  file_size: file.size,
  organizer_id: userId,
});
```

---

## 10. Frontend Integration

### 10.1 Example React Hook

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth.context';

interface UseUploadImageProps {
  offerId: string;
}

export function useUploadImage({ offerId }: UseUploadImageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/offers/${offerId}/images`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message);
      }

      return response.json() as Promise<UploadImageResponse>;
    },
    onSuccess: () => {
      // Invalidate offer details to refresh images list
      queryClient.invalidateQueries({ queryKey: ['offer', offerId] });
    },
  });
}

// Usage in component
function OfferImageUpload({ offerId }: { offerId: string }) {
  const uploadImage = useUploadImage({ offerId });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.currentTarget.files;
    if (!files) return;

    try {
      await uploadImage.mutateAsync(files[0]);
      toast.success('Image uploaded successfully');
      fileInputRef.current!.value = '';  // Reset input
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={uploadImage.isPending}
      />
      {uploadImage.isPending && <Spinner />}
    </div>
  );
}

// With preview and drag-drop
function AdvancedImageUpload({ offerId }: { offerId: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const uploadImage = useUploadImage({ offerId });

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setPreview(URL.createObjectURL(file));
      await uploadImage.mutateAsync(file);
    }
  };

  return (
    <div
      onDragOver={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
    >
      {preview && <img src={preview} alt="Preview" />}
      <p>Drag and drop or click to upload</p>
    </div>
  );
}
```

### 10.2 Image Gallery Component

```typescript
function OfferImageGallery({ images }: { images: UploadImageResponse[] }) {
  return (
    <div className="image-gallery">
      {images
        .sort((a, b) => a.display_order - b.display_order)
        .map((image) => (
          <div key={image.id} className="image-card">
            <img src={image.cdn_url} alt={`Image ${image.display_order}`} />
            <div className="order-badge">{image.display_order + 1}</div>
            <DeleteImageButton imageId={image.id} />
          </div>
        ))}
    </div>
  );
}
```

---

## 11. Deployment Checklist

- [ ] Supabase Storage bucket created and configured
- [ ] Bucket permissions set (public or private + RLS)
- [ ] offer_images table created with indexes
- [ ] RLS policies configured
- [ ] Multer middleware configured
- [ ] File validation implemented
- [ ] Storage upload logic tested
- [ ] CDN URL generation working
- [ ] Error handling implemented
- [ ] Frontend upload component tested
- [ ] Drag-and-drop functionality working
- [ ] Image preview functionality working
- [ ] Logging enabled

---

## 12. Success Criteria

✅ Organizers can upload up to 10 images per offer
✅ File type validation (jpg, png, webp only)
✅ File size limit enforced (5MB max)
✅ Images stored in Supabase Storage
✅ Database records created with correct display_order
✅ CDN URLs generated for image serving
✅ Unique constraint on (offer_id, display_order) enforced
✅ Response time < 500ms (excluding transfer)
✅ Proper error handling (400, 403, 404, 409, 500)
✅ No cross-offer image access
✅ Upload progress tracking (optional)
✅ Image preview before upload (optional)
