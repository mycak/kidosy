# REST API Plan - Kidosy Platform

## 1. Resources

| Resource | Database Table | Purpose |
|----------|---|---|
| **Offers** | `offers` | Main activity listings with full lifecycle management |
| **Leads** | `leads` | Parent submissions registering children for activities |
| **Organizer Profiles** | `organizer_profiles` | Organizer company/personal information |
| **Offer Categories** | `offer_categories` | Category associations for offers |
| **Offer Schedules** | `offer_schedules` | Time schedules for recurring activities |
| **Offer Images** | `offer_images` | Image references for offers |
| **Offer Types** | `offer_types` | Dictionary: activity type (cyclic, camps, etc.) |
| **Categories** | `categories` | Dictionary: activity category (sport, artistic, etc.) |
| **Offer Status History** | `offer_status_history` | Audit trail for offer status changes |
| **Email Logs** | `email_logs` | Audit trail for all sent emails |
| **Offer Duplicates** | `offer_duplicates` | Flagged potential duplicate offers |

## 2. Authentication & Authorization

### 2.1 Authentication Mechanism

**Supabase Auth with JWT Tokens**

- Users authenticate via Supabase Auth endpoints (registration, login, password reset)
- All API requests require JWT token in `Authorization: Bearer <token>` header
- Token contains user ID (`auth.uid()`) and role in JWT claims (`role: 'admin' | null`)
- Session timeout: 30 minutes of inactivity (enforced by Supabase)

### 2.2 Authorization Strategy

Three user roles with Row Level Security (RLS):

1. **anon** (Anonymous Parent)
   - Can view only published offers
   - Can submit leads
   - Cannot access organizer panel

2. **authenticated** (Organizer)
   - Can view own offers (all statuses)
   - Can view published offers from others (for research)
   - Can manage own offers (CRUD)
   - Can view leads submitted to own offers
   - Cannot access admin panel

3. **admin** (Administrator)
   - Can view all offers (all statuses)
   - Can view all users and profiles
   - Can moderate offers (approve/reject)
   - Can view all leads
   - Can manage duplicates
   - Can access email logs

### 2.3 RLS Policies Implementation

All database tables have RLS enabled with policies enforcing:
- **offers**: anom sees published only; authenticated sees own + published; admin sees all
- **leads**: organized sees only leads to own offers; admin sees all
- **organizer_profiles**: users see own; admin sees all
- **offer_status_history**: organizers see own; admin sees all
- **offer_images**: served from public offers and own offers
- **email_logs**: admin only

### 2.4 Token Usage

```json
Authorization Header:
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

JWT Payload (via Supabase Auth):
{
  "sub": "user-uuid",
  "email": "organizer@example.com",
  "role": "admin",
  "aud": "authenticated",
  "iat": 1234567890,
  "exp": 1234568490
}
```

## 3. API Endpoints

### 3.1 Authentication Endpoints

#### POST /auth/register
**Register new organizer account**

- **Access**: Public (no token required)
- **Description**: Create new organizer account via Supabase Auth, create organizer_profile
- **Request Body**:
  ```json
  {
    "email": "organizer@example.com",
    "password": "SecurePass123",
    "company_name": "Little Explorers",
    "phone": "+48123456789",
    "email_public": "contact@littleexplorers.pl"
  }
  ```
- **Validation**:
  - Email format valid and unique
  - Password minimum 8 characters, contains uppercase and digit
  - company_name not empty
  - phone format valid
  - email_public format valid
- **Response (201 Created)**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "organizer@example.com",
      "created_at": "2025-01-31T12:00:00Z"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_in": 3600
    }
  }
  ```
- **Errors**:
  - 400: Validation error (invalid email, weak password, etc.)
  - 409: Email already registered

#### POST /auth/login
**Authenticate organizer**

- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "organizer@example.com",
    "password": "SecurePass123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "organizer@example.com",
      "role": "organizer"
    },
    "session": {
      "access_token": "jwt-token",
      "refresh_token": "refresh-token",
      "expires_in": 3600
    }
  }
  ```
- **Errors**:
  - 400: Invalid credentials
  - 401: Unauthorized

#### POST /auth/logout
**End user session**

- **Access**: Authenticated organizers only
- **Response (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

#### POST /auth/password-reset
**Initiate password reset**

- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "organizer@example.com"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset email sent"
  }
  ```
- **Behavior**: Supabase sends email with reset link valid for 1 hour

#### POST /auth/password-reset/confirm
**Confirm password reset**

- **Access**: Public (with reset token)
- **Request Body**:
  ```json
  {
    "token": "reset-token-from-email",
    "new_password": "NewSecurePass123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Password reset successfully"
  }
  ```
- **Errors**:
  - 400: Invalid or expired token
  - 422: Password validation failed

---

### 3.2 Offers Endpoints - Public Discovery

#### GET /offers
**Browse and filter published offers**

- **Access**: Public (anom role)
- **Description**: Search published offers with multi-criteria filtering, pagination, sorting, geospatial queries
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &sort_by=distance|relevance|date_created|date_updated
  &sort_order=asc|desc
  &min_age=3
  &max_age=12
  &categories=uuid,uuid
  &offer_types=uuid,uuid
  &location_lat=52.2297
  &location_lon=21.0122
  &radius_km=10
  &search=keyword
  ```
- **Validation**:
  - `page` >= 1
  - `per_page` >= 1, <= 100
  - `min_age`, `max_age` >= 0
  - `radius_km` > 0
  - Valid UUIDs for `categories` and `offer_types`
  - Valid lat/lon for geospatial search
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "title": "Piano Lessons for Kids",
        "description": "Professional piano instruction...",
        "ages": [7, 8, 9, 10],
        "offer_type": {
          "id": "uuid",
          "name": "Cyclic Classes"
        },
        "categories": [
          {
            "id": "uuid",
            "name": "Artistic"
          }
        ],
        "address": "ul. Łazienki 4, Warsaw",
        "location": {
          "type": "Point",
          "coordinates": [21.0122, 52.2297]
        },
        "start_date": "2025-02-01",
        "end_date": "2025-06-30",
        "available_spots": 5,
        "organizer": {
          "id": "uuid",
          "company_name": "Music Academy",
          "phone": "+48123456789",
          "email_public": "contact@musicacademy.pl"
        },
        "images": [
          {
            "id": "uuid",
            "storage_path": "offers/uuid/image1.jpg",
            "display_order": 0
          }
        ],
        "schedules": [
          {
            "day_of_week": 1,
            "start_time": "16:00",
            "end_time": "17:00"
          }
        ],
        "created_at": "2025-01-31T12:00:00Z",
        "updated_at": "2025-01-31T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 145,
      "page": 1,
      "per_page": 20,
      "total_pages": 8
    }
  }
  ```
- **Filtering Logic**:
  - Status filter: only `published` offers with `deleted_at IS NULL`
  - Age filter: offer.ages overlaps with [min_age, max_age] range
  - Category filter: offer is in all selected categories
  - Offer type filter: offer_type_id in selected types
  - Location filter: PostGIS ST_DWithin for radius-based search
  - Search: Full-text search on title and description
- **Sorting**:
  - `distance`: by distance from location (requires location_lat/lon)
  - `relevance`: by search keyword relevance (requires search parameter)
  - `date_created`: by created_at
  - `date_updated`: by updated_at
- **Pagination**: Default 20 per page, max 100 per page
- **Caching**: Cache public offers list for 5 minutes (invalidate on new offer published)
- **Errors**:
  - 400: Invalid query parameters (invalid page, per_page, lat/lon, etc.)
  - 422: Validation error

#### GET /offers/{offerId}
**View offer details**

- **Access**: Public for published offers; Authenticated for own/all offers; Admin for all
- **Description**: Get complete offer information including schedules, images, organizer details, and status history
- **Path Parameters**:
  - `offerId` (uuid): Offer ID
- **Query Parameters** (optional):
  ```
  ?include=schedules,images,history,status_history
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "title": "Piano Lessons for Kids",
    "description": "Professional piano instruction for beginners and intermediate students...",
    "ages": [7, 8, 9, 10],
    "offer_type": {
      "id": "uuid",
      "name": "Cyclic Classes",
      "slug": "cyclic-classes"
    },
    "categories": [
      {
        "id": "uuid",
        "name": "Artistic",
        "slug": "artistic"
      }
    ],
    "address": "ul. Łazienki 4, Warsaw",
    "location": {
      "type": "Point",
      "coordinates": [21.0122, 52.2297]
    },
    "start_date": "2025-02-01",
    "end_date": "2025-06-30",
    "available_spots": 5,
    "status": "published",
    "organizer": {
      "id": "uuid",
      "company_name": "Music Academy",
      "phone": "+48123456789",
      "email_public": "contact@musicacademy.pl"
    },
    "images": [
      {
        "id": "uuid",
        "storage_path": "offers/uuid/image1.jpg",
        "display_order": 0
      }
    ],
    "schedules": [
      {
        "id": "uuid",
        "day_of_week": 1,
        "start_time": "16:00",
        "end_time": "17:00",
        "is_active": true
      }
    ],
    "created_at": "2025-01-31T12:00:00Z",
    "updated_at": "2025-01-31T12:00:00Z"
  }
  ```
- **Authorization**: RLS policy filters data by user role and offer status
- **Errors**:
  - 404: Offer not found or not accessible
  - 403: Forbidden (published offers visible to anon, own offers to organizer, all to admin)

---

### 3.3 Offers Endpoints - Organizer Management

#### POST /offers
**Create new offer (draft)**

- **Access**: Authenticated organizers only
- **Description**: Create new offer in draft status. Offer not visible to parents until published.
- **Request Body**:
  ```json
  {
    "title": "Piano Lessons for Kids",
    "description": "Professional piano instruction for beginners...",
    "offer_type_id": "uuid",
    "category_ids": ["uuid", "uuid"],
    "ages": [7, 8, 9],
    "address": "ul. Łazienki 4, Warsaw",
    "location": {
      "latitude": 52.2297,
      "longitude": 21.0122
    },
    "start_date": "2025-02-01",
    "end_date": "2025-06-30",
    "available_spots": 10,
    "schedules": [
      {
        "day_of_week": 1,
        "start_time": "16:00",
        "end_time": "17:00"
      }
    ]
  }
  ```
- **Validation**:
  - `title` not empty, max 255 characters
  - `description` not empty, max 2000 characters
  - `offer_type_id` exists in offer_types
  - `category_ids` exist in categories
  - `ages` array not empty, values >= 0
  - `address` not empty
  - `location` valid lat/lon (lat -90 to 90, lon -180 to 180)
  - `start_date` <= `end_date`
  - `available_spots` >= 0
  - `schedules` (if provided): day_of_week 0-6, start_time < end_time
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "title": "Piano Lessons for Kids",
    "status": "draft",
    "created_at": "2025-01-31T12:00:00Z",
    "updated_at": "2025-01-31T12:00:00Z"
  }
  ```
- **Errors**:
  - 400: Validation failed
  - 401: Unauthorized (not authenticated)
  - 422: Invalid data (non-existent category, offer_type)

#### PATCH /offers/{offerId}
**Edit existing offer**

- **Access**: Authenticated organizer (owner only) or Admin
- **Description**: Update offer details. If offer is published, changes require re-moderation.
- **Path Parameters**:
  - `offerId` (uuid): Offer ID
- **Request Body** (all fields optional):
  ```json
  {
    "title": "Updated Title",
    "description": "Updated description",
    "offer_type_id": "uuid",
    "category_ids": ["uuid"],
    "ages": [8, 9, 10],
    "address": "New address",
    "location": {
      "latitude": 52.2297,
      "longitude": 21.0122
    },
    "start_date": "2025-02-01",
    "end_date": "2025-07-31",
    "available_spots": 8
  }
  ```
- **Validation**: Same as POST /offers
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "title": "Updated Title",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Side Effects**:
  - If published offer edited: Status remains published but changes recorded
  - History entry created in offer_status_history
- **Errors**:
  - 404: Offer not found
  - 403: Forbidden (not owner or admin)
  - 400: Validation failed
  - 422: Invalid data

#### DELETE /offers/{offerId}
**Delete offer (soft delete)**

- **Access**: Authenticated organizer (owner only) or Admin
- **Description**: Soft delete offer (mark as deleted_at, not visible to parents)
- **Response (204 No Content)**
- **Side Effects**:
  - `deleted_at` set to current timestamp
  - Offer no longer visible in search
  - Associated leads and images remain intact
  - Deletion recorded in offer_status_history
  - Email sent to organizer confirming deletion
- **Errors**:
  - 404: Offer not found
  - 403: Forbidden (not owner or admin)

#### POST /offers/{offerId}/submit
**Submit offer for moderation**

- **Access**: Authenticated organizer (owner only)
- **Description**: Change offer status from draft/rejected to pending_review
- **Request Body** (optional):
  ```json
  {
    "message": "Please review my offer for approval"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "status": "pending_review",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Side Effects**:
  - Status changed to pending_review
  - Entry added to offer_status_history
  - Email sent to organizer: "Your offer has been submitted for review"
- **Errors**:
  - 404: Offer not found
  - 403: Not owner
  - 409: Offer not in draft or rejected state
  - 400: Required fields missing (if offer incomplete)

#### POST /offers/{offerId}/archive
**Archive offer manually**

- **Access**: Authenticated organizer (owner only)
- **Description**: Change offer to archived status (manual archiving before end_date)
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "status": "archived",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Side Effects**:
  - Status changed to archived
  - Offer no longer visible to parents
  - History entry created

---

### 3.4 Offers Endpoints - Organizer Listing

#### GET /my-offers
**List organizer's offers**

- **Access**: Authenticated organizers only
- **Description**: Get all offers created by authenticated organizer with status filtering
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &status=draft|pending_review|published|rejected|archived|all
  &sort_by=created_at|updated_at|title|start_date
  &sort_order=asc|desc
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "title": "Piano Lessons",
        "status": "published",
        "available_spots": 5,
        "start_date": "2025-02-01",
        "end_date": "2025-06-30",
        "created_at": "2025-01-31T12:00:00Z",
        "rejection_reason": null,
        "leads_count": 3
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "per_page": 20,
      "total_pages": 1
    }
  }
  ```
- **Validation**:
  - `status` in allowed values
  - `page` >= 1
  - `per_page` 1-100
- **Errors**:
  - 401: Unauthorized
  - 400: Invalid parameters

---

### 3.5 Moderation Endpoints (Admin Only)

#### GET /admin/offers/pending
**Moderation queue**

- **Access**: Admin only
- **Description**: List offers pending review ordered by submission date
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &sort_by=created_at|organizer_name
  &sort_order=asc|desc
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "title": "Piano Lessons",
        "organizer": {
          "id": "uuid",
          "company_name": "Music Academy"
        },
        "submitted_at": "2025-01-31T12:00:00Z",
        "validation_errors": [],
        "duplicate_flags": [
          {
            "similarity_score": 0.87,
            "duplicate_offer_id": "uuid",
            "duplicate_offer_title": "Similar Piano Classes"
          }
        ]
      }
    ],
    "pagination": {
      "total": 8,
      "page": 1,
      "per_page": 20,
      "total_pages": 1
    }
  }
  ```

#### POST /offers/{offerId}/approve
**Approve offer for publication**

- **Access**: Admin only
- **Description**: Change status from pending_review to published
- **Request Body** (optional):
  ```json
  {
    "notes": "Approved - looks good"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "status": "published",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Side Effects**:
  - Status changed to published
  - History entry created with admin ID
  - Email sent to organizer: "Your offer has been approved and published"
  - Offer becomes visible in search
- **Errors**:
  - 404: Offer not found
  - 403: Not admin
  - 409: Offer not in pending_review state

#### POST /offers/{offerId}/reject
**Reject offer with reason**

- **Access**: Admin only
- **Description**: Change status to rejected with explanation
- **Request Body**:
  ```json
  {
    "reason": "incomplete_description|missing_required_fields|spam|duplicate|other",
    "message": "Please provide more details about the instructor's qualifications"
  }
  ```
- **Validation**:
  - `reason` in allowed list
  - `message` max 500 characters
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "status": "rejected",
    "rejection_reason": "incomplete_description",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Side Effects**:
  - Status changed to rejected
  - rejection_reason stored
  - History entry created
  - Email sent to organizer with reason and instructions to resubmit
- **Errors**:
  - 404: Offer not found
  - 403: Not admin
  - 400: Invalid reason or missing message
  - 409: Offer not in pending_review state

#### GET /admin/offers/duplicates
**List flagged duplicates**

- **Access**: Admin only
- **Description**: Get potentially duplicate offers for review
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &status=pending|reviewed|dismissed
  &min_similarity=0.8
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "offer_id_1": "uuid",
        "offer_title_1": "Piano Lessons",
        "offer_id_2": "uuid",
        "offer_title_2": "Piano Classes",
        "similarity_score": 0.87,
        "status": "pending",
        "created_at": "2025-01-31T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 3,
      "page": 1,
      "per_page": 20,
      "total_pages": 1
    }
  }
  ```

#### POST /admin/offers/duplicates/{duplicateId}/review
**Mark duplicate as reviewed**

- **Access**: Admin only
- **Request Body**:
  ```json
  {
    "decision": "dismissed|confirmed",
    "notes": "These are actually different programs"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "status": "reviewed",
    "decision": "dismissed"
  }
  ```

---

### 3.6 Leads Endpoints - Parent Submission

#### POST /leads
**Submit child registration (parent)**

- **Access**: Public (anonymous)
- **Description**: Register child for activity without authentication
- **Request Body**:
  ```json
  {
    "offer_id": "uuid",
    "child_name": "Emma",
    "child_age": 8,
    "parent_name": "Anna Smith",
    "parent_email": "anna@example.com",
    "parent_phone": "+48123456789",
    "message": "My daughter is very interested in piano"
  }
  ```
- **Validation**:
  - `offer_id` exists and is published
  - `child_name` not empty, max 100 characters
  - `child_age` > 0, typically < 20
  - `parent_name` not empty, max 100 characters
  - `parent_email` valid email format
  - `parent_phone` valid phone format
  - `message` max 1000 characters (optional)
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid",
    "offer_id": "uuid",
    "status": "submitted",
    "created_at": "2025-01-31T12:00:00Z",
    "message": "Thank you for your submission! The organizer will contact you shortly."
  }
  ```
- **Side Effects**:
  - Lead record created with status='submitted'
  - offer_snapshot stored (JSON of current offer data)
  - Email sent to organizer: "New registration for [offer_title]" with parent details
  - Email sent to parent: Confirmation with organizer contact info
  - Entry created in email_logs (2 emails)
  - GA4 event tracked: "lead_submit"
- **Errors**:
  - 404: Offer not found or not published
  - 400: Validation failed
  - 422: Invalid data (age out of offer range, etc.)

---

### 3.7 Leads Endpoints - Organizer Management

#### GET /leads
**List leads for organizer's offers**

- **Access**: Authenticated organizers only (see own leads); Admin (see all)
- **Description**: Get leads submitted to organizer's offers
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &status=submitted|contacted|completed|cancelled
  &offer_id=uuid
  &sort_by=created_at|child_name
  &sort_order=asc|desc
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "offer_id": "uuid",
        "offer_title": "Piano Lessons",
        "child_name": "Emma",
        "child_age": 8,
        "parent_name": "Anna Smith",
        "parent_email": "anna@example.com",
        "parent_phone": "+48123456789",
        "message": "My daughter is interested",
        "status": "submitted",
        "created_at": "2025-01-31T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 12,
      "page": 1,
      "per_page": 20,
      "total_pages": 1
    }
  }
  ```
- **Authorization**: RLS ensures organizers see only their leads
- **Errors**:
  - 401: Unauthorized

#### PATCH /leads/{leadId}/status
**Update lead status**

- **Access**: Authenticated organizer (owner) or Admin
- **Description**: Update lead workflow status
- **Request Body**:
  ```json
  {
    "status": "contacted|completed|cancelled",
    "notes": "Called parent, scheduled for Feb 5"
  }
  ```
- **Validation**:
  - `status` in allowed values
  - `notes` max 500 characters
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "status": "contacted",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Errors**:
  - 404: Lead not found
  - 403: Forbidden

---

### 3.8 Organizer Profile Endpoints

#### GET /profile
**Get organizer profile**

- **Access**: Authenticated organizer (own profile); Admin (all profiles)
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "user_id": "uuid",
    "company_name": "Little Explorers",
    "phone": "+48123456789",
    "email_public": "contact@littleexplorers.pl",
    "created_at": "2025-01-31T12:00:00Z",
    "updated_at": "2025-01-31T12:00:00Z"
  }
  ```
- **Errors**:
  - 404: Profile not found
  - 401: Unauthorized

#### PATCH /profile
**Update organizer profile**

- **Access**: Authenticated organizer (own only)
- **Request Body** (all optional):
  ```json
  {
    "company_name": "New Company Name",
    "phone": "+48987654321",
    "email_public": "new@littleexplorers.pl"
  }
  ```
- **Validation**:
  - `company_name` not empty if provided
  - `phone` valid format
  - `email_public` valid email format
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "company_name": "New Company Name",
    "updated_at": "2025-01-31T13:00:00Z"
  }
  ```
- **Errors**:
  - 401: Unauthorized
  - 400: Validation failed

---

### 3.9 Images Endpoints

#### POST /offers/{offerId}/images
**Upload image for offer**

- **Access**: Authenticated organizer (owner) or Admin
- **Description**: Create offer_image reference. File uploaded to Supabase Storage separately.
- **Request Body** (multipart/form-data):
  ```
  file: <binary file data>
  display_order: 0
  ```
- **Validation**:
  - File size <= 5MB
  - File format: jpg, jpeg, png, webp
  - display_order 0-9 (max 10 images per offer)
- **Response (201 Created)**:
  ```json
  {
    "id": "uuid",
    "offer_id": "uuid",
    "storage_path": "offers/uuid/image-1234.jpg",
    "display_order": 0,
    "created_at": "2025-01-31T12:00:00Z"
  }
  ```
- **Side Effects**:
  - File uploaded to Supabase Storage at `offers/{offerId}/{filename}`
  - Database record created in offer_images
- **Errors**:
  - 404: Offer not found
  - 403: Forbidden (not owner)
  - 400: Invalid file format or size
  - 409: Max 10 images per offer

#### DELETE /images/{imageId}
**Delete offer image**

- **Access**: Authenticated organizer (owner) or Admin
- **Description**: Delete image from storage and database
- **Response (204 No Content)**
- **Side Effects**:
  - File deleted from Supabase Storage
  - Database record deleted
- **Errors**:
  - 404: Image not found
  - 403: Forbidden

#### PUT /images/{imageId}/reorder
**Reorder images**

- **Access**: Authenticated organizer (owner) or Admin
- **Request Body**:
  ```json
  {
    "display_order": 2
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "uuid",
    "display_order": 2
  }
  ```

---

### 3.10 Dictionary Endpoints

#### GET /offer-types
**List offer types (dictionary)**

- **Access**: Public
- **Description**: Get all offer type dictionary entries
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Cyclic Classes",
        "slug": "cyclic-classes"
      },
      {
        "id": "uuid",
        "name": "Summer Camps",
        "slug": "summer-camps"
      }
    ]
  }
  ```
- **Caching**: Cache indefinitely (refresh on admin update)

#### GET /categories
**List activity categories (dictionary)**

- **Access**: Public
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "name": "Sport",
        "slug": "sport",
        "description": "Sports and recreational activities"
      },
      {
        "id": "uuid",
        "name": "Artistic",
        "slug": "artistic",
        "description": "Artistic and creative activities"
      }
    ]
  }
  ```
- **Caching**: Cache indefinitely

---

### 3.11 Admin Email Logs Endpoint

#### GET /admin/email-logs
**View email sending logs**

- **Access**: Admin only
- **Description**: Audit trail of all sent emails
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &status=pending|sent|failed|bounced
  &email_type=welcome|verification|offer_published|lead_submission_to_organizer|lead_submission_to_parent|password_reset
  &from_date=2025-01-01
  &to_date=2025-01-31
  &sort_by=created_at|sent_at
  &sort_order=asc|desc
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "recipient_email": "organizer@example.com",
        "email_type": "offer_published",
        "status": "sent",
        "sent_at": "2025-01-31T12:30:00Z",
        "created_at": "2025-01-31T12:00:00Z",
        "error_message": null
      }
    ],
    "pagination": {
      "total": 285,
      "page": 1,
      "per_page": 20,
      "total_pages": 15
    }
  }
  ```

---

### 3.12 Admin Users Endpoint

#### GET /admin/users
**List all users**

- **Access**: Admin only
- **Query Parameters**:
  ```
  ?page=1
  &per_page=20
  &search=email|company_name
  &created_from=2025-01-01
  &created_to=2025-01-31
  ```
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": "uuid",
        "email": "organizer@example.com",
        "company_name": "Music Academy",
        "offers_count": 5,
        "leads_count": 12,
        "created_at": "2025-01-20T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 42,
      "page": 1,
      "per_page": 20,
      "total_pages": 3
    }
  }
  ```

---

## 4. Validation & Business Logic

### 4.1 Offer Validation Rules

| Field | Rule | API Handling |
|---|---|---|
| title | Not empty, max 255 chars | Return 400 with field error |
| description | Not empty, max 2000 chars | Return 400 with field error |
| offer_type_id | Must exist in offer_types | Return 422 if not found |
| category_ids | Must exist in categories | Return 422 if not found |
| ages | Not empty array, all values >= 0 | Return 400 if empty or invalid |
| address | Not empty | Return 400 if empty |
| location | Valid lat/lon | Return 400 if invalid coordinates |
| start_date | Must be <= end_date | Return 400 with validation message |
| end_date | Must be >= start_date | Return 400 with validation message |
| available_spots | >= 0 (CHECK constraint) | Database enforces; return 422 if violated |
| status | Must be valid status | Enum validation, return 400 if invalid |

### 4.2 Lead Validation Rules

| Field | Rule | API Handling |
|---|---|---|
| offer_id | Must exist and be published | Return 404 if not found or unpublished |
| child_name | Not empty, max 100 chars | Return 400 if invalid |
| child_age | > 0, typically < 20 | Return 400 if invalid |
| parent_name | Not empty, max 100 chars | Return 400 if invalid |
| parent_email | Valid email format | Return 400 if invalid |
| parent_phone | Valid phone format | Return 400 if invalid |
| message | Max 1000 chars (optional) | Return 400 if too long |

### 4.3 Email Sending Logic

| Trigger | Recipients | Template | Delay |
|---|---|---|---|
| Registration/Email verification | Organizer | Verification link | Immediate |
| Password reset requested | User | Reset link (1h valid) | Immediate |
| Offer submitted for review | Admin | Moderation queue notification | Immediate |
| Offer approved | Organizer | Approval confirmation | Immediate |
| Offer rejected | Organizer | Rejection reason + resubmit instructions | Immediate |
| Lead submitted | Organizer + Parent | Organizer: lead details; Parent: confirmation | Immediate |
| Profile updated | Organizer | Confirmation (if email changed) | Immediate |

### 4.4 Automatic Processes

| Process | Trigger | Action | Frequency |
|---|---|---|---|
| Archive expired offers | `end_date < CURRENT_DATE` | Change status to archived | Daily at 02:00 UTC |
| Detect duplicates | New offer submitted | Calculate similarity, flag if > 0.8 | On offer submission |
| Duplicate cleanup | Admin reviews duplicate | Mark as reviewed/dismissed | Manual |
| Auto-expire sessions | Session > 30 minutes inactive | Invalidate JWT token | Per request |

### 4.5 Duplicate Detection Algorithm

- **Triggered on**: New offer submitted for moderation
- **Similarity criteria**:
  - Title similarity (fuzzy matching, pg_trgm)
  - Location proximity (< 1km)
  - Date overlap (start_date/end_date conflict)
  - Same organizer (exact match)
  - Age range overlap
- **Scoring**: Combined score 0.0-1.0
- **Threshold**: Flag if score > 0.8
- **Action**: Create offer_duplicates entry, include in admin queue

---

## 5. Error Handling

### 5.1 Standard Error Responses

All errors return appropriate HTTP status codes and JSON body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "title",
        "message": "Title cannot be empty"
      }
    ]
  }
}
```

### 5.2 HTTP Status Codes

| Code | Use Case |
|---|---|
| 200 OK | Successful GET, PATCH, POST with return data |
| 201 Created | Successful POST creating resource |
| 204 No Content | Successful DELETE |
| 400 Bad Request | Client validation error, malformed request |
| 401 Unauthorized | Missing or invalid authentication token |
| 403 Forbidden | Authenticated but not authorized for resource |
| 404 Not Found | Resource doesn't exist |
| 409 Conflict | Operation violates constraints (e.g., duplicate, state conflict) |
| 422 Unprocessable Entity | Request semantically invalid (business logic failure) |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Server error |
| 503 Service Unavailable | Service temporarily down |

### 5.3 Error Codes Reference

| Code | HTTP | Description |
|---|---|---|
| VALIDATION_ERROR | 400 | Input validation failed |
| UNAUTHORIZED | 401 | No valid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | State/constraint conflict |
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |
| INVALID_STATUS_TRANSITION | 409 | Cannot transition to requested status |
| DUPLICATE_RESOURCE | 409 | Resource already exists |
| INVALID_STATE | 422 | Offer in invalid state for operation |
| PROCESSING_ERROR | 500 | Server-side error |

---

## 6. Rate Limiting & Throttling

### 6.1 Rate Limit Strategy

- **Public endpoints** (search, lead submission): 100 requests/minute per IP
- **Authenticated endpoints** (organizer panel): 1000 requests/minute per user
- **Admin endpoints**: 500 requests/minute per admin

### 6.2 Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1612125600
```

---

## 7. Pagination

### 7.1 Pagination Strategy

All list endpoints use cursor-based or offset-based pagination:

```
GET /offers?page=1&per_page=20
```

- Default: 20 items per page
- Maximum: 100 items per page
- Returns: `pagination` object with `total`, `page`, `per_page`, `total_pages`

### 7.2 Pagination Response

```json
{
  "data": [...],
  "pagination": {
    "total": 145,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

---

## 8. Caching Strategy

### 8.1 Cache TTLs

| Resource | TTL | Invalidation |
|---|---|---|
| Published offers list | 5 minutes | On new offer published, status change |
| Offer details (published) | 10 minutes | On offer update |
| Dictionary (offer_types, categories) | Indefinite | Manual refresh (rare) |
| User's own offers | No cache | Real-time |
| User's leads | 1 minute | Real-time |
| Admin queues | No cache | Real-time |

### 8.2 Cache Invalidation

- Supabase cache headers or CDN cache busting
- Real-time subscriptions for live data (future enhancement)

---

## 9. Geospatial Queries

### 9.1 Implementation

- **Database**: PostGIS extension with `geometry(Point, 4326)` type
- **Index**: GIST index for fast spatial queries
- **Query**: `ST_DWithin(location, ST_GeomFromText('POINT(lon lat)', 4326), distance_meters)`

### 9.2 Radius Search

```
GET /offers?location_lat=52.2297&location_lon=21.0122&radius_km=10
```

- Converts lat/lon to point geometry
- Uses ST_DWithin with radius in meters
- Returns sorted by distance

---

## 10. Analytics & Event Tracking

### 10.1 GA4 Events

| Event | Triggers | Parameters |
|---|---|---|
| page_view | Page load | page_path, page_title |
| filter_apply | User applies filter | filter_type (age/category/type/location), filter_value |
| select_on_map | User clicks marker | offer_id, category, age_range |
| view_item | User opens offer details | offer_id, category, organizer_id |
| search | User searches location | search_term, results_count |
| lead_submit | Parent submits registration | offer_id, category, child_age, organizer_id |
| login | User logs in | user_type (organizer/admin) |
| offer_create | Organizer creates offer | offer_type, categories, location |
| offer_submit | Offer submitted for moderation | offer_id |
| offer_approve | Admin approves offer | offer_id, organizer_id |
| offer_reject | Admin rejects offer | offer_id, rejection_reason |

---

## 11. Webhooks & Real-time (Future Enhancement)

While not part of MVP, the API is designed to support:

- **Offer Updates**: Real-time subscriptions via Supabase Realtime
- **Lead Notifications**: WebSocket events when new leads submitted
- **Admin Alerts**: Real-time moderation queue updates

---

## 12. API Documentation

### 12.1 OpenAPI/Swagger Specification

API will be documented via OpenAPI 3.0 spec:

```yaml
openapi: 3.0.0
info:
  title: Kidosy API
  version: 1.0.0
servers:
  - url: https://api.kidosy.pl/v1
```

### 12.2 Developer Tools

- Postman collection for testing
- OpenAPI spec available at `/api/docs`
- Swagger UI at `/api/docs/ui`

---

## 13. Backward Compatibility & Versioning

### 13.1 API Versioning

- Current version: `v1`
- URLs include version: `/api/v1/offers`
- Major breaking changes trigger new version

### 13.2 Deprecation Policy

- Deprecated endpoints marked in responses
- 6-month deprecation window before removal
- Clients notified via email and changelog

---

## 14. Testing Strategy

### 14.1 API Testing

- **Unit tests**: Business logic, validation rules
- **Integration tests**: Database interactions, RLS policies
- **E2E tests**: Full user flows (organizer registration → offer → lead → moderation)
- **Performance tests**: Query optimization, load testing
- **Security tests**: SQL injection, XSS, CSRF, authentication

### 14.2 Test Coverage

- Target: 80% code coverage
- Critical paths: 100% coverage
- Tools: Jest (unit), Playwright (E2E)

---

## 15. Monitoring & Logging

### 15.1 Logging Strategy

- Request/response logging (non-sensitive data)
- Error logging with stack traces
- Database query logging (slow queries > 1s)
- Email sending logs (delivery status)
- Audit logs (user actions)

### 15.2 Monitoring

- API uptime monitoring (99.5% target)
- Response time monitoring
- Error rate tracking
- Database performance monitoring
- Email delivery metrics (open rate, bounce rate)

---

## 16. Implementation Notes

### 16.1 Technology Stack Integration

- **Supabase**: Database (PostgreSQL), Auth, Storage, Realtime
- **Zod**: Server-side validation
- **TanStack Query**: Frontend caching and state management
- **Mailjet**: Email service integration
- **Google Analytics 4**: Event tracking
- **Google Maps API**: Geolocation and autocomplete

### 16.2 Security Considerations

- All endpoints require HTTPS
- CORS configured for frontend domain only
- CSRF tokens for state-modifying operations
- Input sanitization and parameterized queries
- Row Level Security (RLS) enforced at database level
- Parent phone/email encrypted on application layer

### 16.3 Environment Configuration

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
MAILJET_API_KEY=
MAILJET_API_SECRET=
GOOGLE_MAPS_API_KEY=
GA4_MEASUREMENT_ID=
JWT_SECRET=
STRIPE_SECRET_KEY= (for future payment integration)
```

