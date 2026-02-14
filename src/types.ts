/**
 * DTO (Data Transfer Object) and Command Model Type Definitions
 *
 * This file contains all DTO types used by the API endpoints.
 * DTOs are derived from database entity types (database.types.ts) and
 * represent the structure of data transferred between client and server.
 */

import type { Database } from './db/database.types';

// Database entity type aliases for convenience
type DbUser = Database['public']['Tables']['users']['Row'];
type DbOrganizerProfile =
  Database['public']['Tables']['organizer_profiles']['Row'];
type DbOffer = Database['public']['Tables']['offers']['Row'];
type DbOfferType = Database['public']['Tables']['offer_types']['Row'];
type DbCategory = Database['public']['Tables']['categories']['Row'];
type DbOfferSchedule = Database['public']['Tables']['offer_schedules']['Row'];
type DbOfferImage = Database['public']['Tables']['offer_images']['Row'];
type DbOfferStatusHistory =
  Database['public']['Tables']['offer_status_history']['Row'];
type DbOfferDuplicate = Database['public']['Tables']['offer_duplicates']['Row'];
type DbLead = Database['public']['Tables']['leads']['Row'];
type DbEmailLog = Database['public']['Tables']['email_logs']['Row'];

// =============================================================================
// AUTHENTICATION DTOs
// =============================================================================

/**
 * User registration request DTO
 * Used for POST /auth/register
 */
export type RegisterRequestDto = {
  email: string;
  password: string;
  company_name: string;
  phone: string;
  email_public: string;
};

/**
 * Login request DTO
 * Used for POST /auth/login
 */
export type LoginRequestDto = {
  email: string;
  password: string;
};

/**
 * User session DTO
 * Returned from authentication endpoints
 */
export type SessionDto = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

/**
 * Authenticated user DTO
 * Basic user information returned after authentication
 */
export type AuthUserDto = Pick<DbUser, 'id' | 'email' | 'created_at'> & {
  role?: 'admin' | 'organizer';
};

/**
 * Authentication response DTO
 * Returned from POST /auth/register and POST /auth/login
 */
export type AuthResponseDto = {
  user: AuthUserDto;
  session: SessionDto;
};

/**
 * Password reset request DTO
 * Used for POST /auth/password-reset
 */
export type PasswordResetRequestDto = {
  email: string;
};

/**
 * Password reset confirmation DTO
 * Used for POST /auth/password-reset/confirm
 */
export type PasswordResetConfirmDto = {
  token: string;
  new_password: string;
};

/**
 * Generic message response DTO
 */
export type MessageResponseDto = {
  message: string;
};

// =============================================================================
// OFFER TYPE & CATEGORY DTOs (Dictionary)
// =============================================================================

/**
 * Offer type DTO (dictionary)
 * Used in GET /offer-types
 */
export type OfferTypeDto = Pick<DbOfferType, 'id' | 'name' | 'slug'>;

/**
 * Category DTO (dictionary)
 * Used in GET /categories
 */
export type CategoryDto = Pick<
  DbCategory,
  'id' | 'name' | 'slug' | 'description'
>;

/**
 * Dictionary list response wrapper
 */
export type DictionaryListResponseDto<T> = {
  data: T[];
};

// =============================================================================
// ORGANIZER PROFILE DTOs
// =============================================================================

/**
 * Organizer profile DTO
 * Used in GET /profile
 * Includes all profile fields
 */
export type OrganizerProfileDto = Pick<
  DbOrganizerProfile,
  | 'id'
  | 'user_id'
  | 'company_name'
  | 'phone'
  | 'email_public'
  | 'created_at'
  | 'updated_at'
>;

/**
 * Organizer profile update DTO
 * Used in PATCH /profile
 * All fields optional for partial updates
 */
export type UpdateOrganizerProfileDto = Partial<
  Pick<DbOrganizerProfile, 'company_name' | 'phone' | 'email_public'>
>;

/**
 * Public organizer info DTO
 * Minimal organizer information exposed in public offer views
 */
export type PublicOrganizerDto = Pick<
  DbOrganizerProfile,
  'id' | 'company_name' | 'phone' | 'email_public'
>;

// =============================================================================
// OFFER SCHEDULE DTOs
// =============================================================================

/**
 * Offer schedule DTO
 * Represents recurring class schedule
 */
export type OfferScheduleDto = Pick<
  DbOfferSchedule,
  'id' | 'day_of_week' | 'start_time' | 'end_time' | 'is_active'
>;

/**
 * Offer schedule create/update DTO (without id)
 * Used when creating or updating schedules within offer
 */
export type OfferScheduleInputDto = Pick<
  DbOfferSchedule,
  'day_of_week' | 'start_time' | 'end_time'
>;

// =============================================================================
// OFFER IMAGE DTOs
// =============================================================================

/**
 * Offer image DTO
 * Represents image reference in storage
 */
export type OfferImageDto = Pick<
  DbOfferImage,
  'id' | 'storage_path' | 'display_order'
>;

/**
 * Offer image upload response DTO
 * Returned from POST /offers/{offerId}/images
 */
export type OfferImageUploadResponseDto = Pick<
  DbOfferImage,
  'id' | 'offer_id' | 'storage_path' | 'display_order' | 'created_at'
>;

/**
 * Image reorder DTO
 * Used in PUT /images/{imageId}/reorder
 */
export type ImageReorderDto = {
  display_order: number;
};

// =============================================================================
// LOCATION DTOs
// =============================================================================

/**
 * Geographic location input DTO
 * Used when creating/updating offers
 */
export type LocationInputDto = {
  latitude: number;
  longitude: number;
};

/**
 * GeoJSON Point DTO
 * Represents location in responses
 */
export type GeoPointDto = {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
};

export type LocationData = {
  lat: number;
  lon: number;
  name: string;
};

// =============================================================================
// OFFER DTOs - Public Discovery
// =============================================================================

/**
 * Public offer list item DTO
 * Used in GET /offers (public browse)
 * Optimized for listing view
 */
export type PublicOfferListItemDto = Pick<
  DbOffer,
  | 'id'
  | 'title'
  | 'description'
  | 'ages'
  | 'address'
  | 'start_date'
  | 'end_date'
  | 'available_spots'
  | 'created_at'
  | 'updated_at'
> & {
  offer_type: OfferTypeDto;
  categories: CategoryDto[];
  location: GeoPointDto;
  organizer: PublicOrganizerDto;
  images: OfferImageDto[];
  schedules: OfferScheduleInputDto[];
};

/**
 * Public offer details DTO
 * Used in GET /offers/{offerId}
 * Complete offer information for detail view
 */
export type PublicOfferDetailsDto = Pick<
  DbOffer,
  | 'id'
  | 'title'
  | 'description'
  | 'ages'
  | 'address'
  | 'start_date'
  | 'end_date'
  | 'available_spots'
  | 'status'
  | 'created_at'
  | 'updated_at'
> & {
  offer_type: OfferTypeDto;
  categories: CategoryDto[];
  location: GeoPointDto;
  organizer: PublicOrganizerDto;
  images: OfferImageDto[];
  schedules: OfferScheduleDto[];
};

/**
 * Offer list query parameters DTO
 * Used in GET /offers
 */
export type OfferListQueryDto = {
  page?: number;
  per_page?: number;
  sort_by?: 'distance' | 'relevance' | 'date_created' | 'date_updated';
  sort_order?: 'asc' | 'desc';
  min_age?: number;
  max_age?: number;
  categories?: string; // comma-separated UUIDs
  offer_types?: string; // comma-separated UUIDs
  location_lat?: number;
  location_lon?: number;
  radius_km?: number;
  search?: string;
};

/**
 * Paginated list response DTO
 */
export type PaginatedResponseDto<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
};

// =============================================================================
// OFFER DTOs - Organizer Management
// =============================================================================

/**
 * Create offer request DTO
 * Used in POST /offers
 */
export type CreateOfferDto = Pick<
  DbOffer,
  | 'title'
  | 'description'
  | 'offer_type_id'
  | 'ages'
  | 'address'
  | 'start_date'
  | 'end_date'
  | 'available_spots'
> & {
  category_ids: string[];
  location: LocationInputDto;
  schedules?: OfferScheduleInputDto[];
};

/**
 * Update offer request DTO
 * Used in PATCH /offers/{offerId}
 * All fields optional for partial updates
 */
export type UpdateOfferDto = Partial<
  Pick<
    DbOffer,
    | 'title'
    | 'description'
    | 'offer_type_id'
    | 'ages'
    | 'address'
    | 'start_date'
    | 'end_date'
    | 'available_spots'
  >
> & {
  category_ids?: string[];
  location?: LocationInputDto;
};

/**
 * Offer create/update response DTO
 * Minimal response after creating or updating offer
 */
export type OfferMutationResponseDto = Pick<
  DbOffer,
  'id' | 'title' | 'status' | 'created_at' | 'updated_at'
>;

/**
 * Submit offer for review request DTO
 * Used in POST /offers/{offerId}/submit
 */
export type SubmitOfferDto = {
  message?: string;
};

/**
 * Organizer's offer list item DTO
 * Used in GET /my-offers
 */
export type OrganizerOfferListItemDto = Pick<
  DbOffer,
  | 'id'
  | 'title'
  | 'status'
  | 'available_spots'
  | 'start_date'
  | 'end_date'
  | 'created_at'
  | 'rejection_reason'
> & {
  leads_count: number;
};

/**
 * Organizer offers query parameters DTO
 * Used in GET /my-offers
 */
export type OrganizerOffersQueryDto = {
  page?: number;
  per_page?: number;
  status?:
    | 'draft'
    | 'pending_review'
    | 'published'
    | 'rejected'
    | 'archived'
    | 'all';
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'start_date';
  sort_order?: 'asc' | 'desc';
};

// =============================================================================
// OFFER DTOs - Admin Moderation
// =============================================================================

/**
 * Duplicate flag DTO
 * Information about potential duplicate offer
 */
export type DuplicateFlagDto = {
  similarity_score: number;
  duplicate_offer_id: string;
  duplicate_offer_title: string;
};

/**
 * Admin moderation queue item DTO
 * Used in GET /admin/offers/pending
 */
export type ModerationQueueItemDto = Pick<DbOffer, 'id' | 'title'> & {
  organizer: Pick<DbOrganizerProfile, 'id' | 'company_name'>;
  submitted_at: string;
  validation_errors: string[];
  duplicate_flags: DuplicateFlagDto[];
};

/**
 * Approve offer request DTO
 * Used in POST /offers/{offerId}/approve
 */
export type ApproveOfferDto = {
  notes?: string;
};

/**
 * Reject offer request DTO
 * Used in POST /offers/{offerId}/reject
 */
export type RejectOfferDto = {
  reason:
    | 'incomplete_description'
    | 'missing_required_fields'
    | 'spam'
    | 'duplicate'
    | 'other';
  message: string;
};

/**
 * Offer duplicate list item DTO
 * Used in GET /admin/offers/duplicates
 */
export type OfferDuplicateListItemDto = Pick<
  DbOfferDuplicate,
  | 'id'
  | 'offer_id_1'
  | 'offer_id_2'
  | 'similarity_score'
  | 'status'
  | 'created_at'
> & {
  offer_title_1: string;
  offer_title_2: string;
};

/**
 * Duplicates query parameters DTO
 * Used in GET /admin/offers/duplicates
 */
export type DuplicatesQueryDto = {
  page?: number;
  per_page?: number;
  status?: 'pending' | 'reviewed' | 'dismissed';
  min_similarity?: number;
};

/**
 * Review duplicate request DTO
 * Used in POST /admin/offers/duplicates/{duplicateId}/review
 */
export type ReviewDuplicateDto = {
  decision: 'dismissed' | 'confirmed';
  notes?: string;
};

/**
 * Review duplicate response DTO
 */
export type ReviewDuplicateResponseDto = Pick<
  DbOfferDuplicate,
  'id' | 'status'
> & {
  decision: 'dismissed' | 'confirmed';
};

// =============================================================================
// LEAD DTOs
// =============================================================================

/**
 * Create lead request DTO (parent submission)
 * Used in POST /leads
 */
export type CreateLeadDto = Pick<
  DbLead,
  | 'offer_id'
  | 'child_name'
  | 'child_age'
  | 'parent_name'
  | 'parent_email'
  | 'parent_phone'
  | 'message'
>;

/**
 * Create lead response DTO
 */
export type CreateLeadResponseDto = Pick<
  DbLead,
  'id' | 'offer_id' | 'status' | 'created_at'
> & {
  message: string;
};

/**
 * Lead list item DTO
 * Used in GET /leads (organizer view)
 */
export type LeadListItemDto = Pick<
  DbLead,
  | 'id'
  | 'offer_id'
  | 'child_name'
  | 'child_age'
  | 'parent_name'
  | 'parent_email'
  | 'parent_phone'
  | 'message'
  | 'status'
  | 'created_at'
> & {
  offer_title: string;
};

/**
 * Lead query parameters DTO
 * Used in GET /leads
 */
export type LeadQueryDto = {
  page?: number;
  per_page?: number;
  status?: 'submitted' | 'contacted' | 'completed' | 'cancelled';
  offer_id?: string;
  sort_by?: 'created_at' | 'child_name';
  sort_order?: 'asc' | 'desc';
};

/**
 * Update lead status request DTO
 * Used in PATCH /leads/{leadId}/status
 */
export type UpdateLeadStatusDto = {
  status: 'contacted' | 'completed' | 'cancelled';
  notes?: string;
};

/**
 * Update lead status response DTO
 */
export type UpdateLeadStatusResponseDto = Pick<DbLead, 'id' | 'status'> & {
  updated_at: string;
};

// =============================================================================
// EMAIL LOG DTOs (Admin Only)
// =============================================================================

/**
 * Email log list item DTO
 * Used in GET /admin/email-logs
 */
export type EmailLogListItemDto = Pick<
  DbEmailLog,
  | 'id'
  | 'recipient_email'
  | 'email_type'
  | 'status'
  | 'sent_at'
  | 'created_at'
  | 'error_message'
>;

/**
 * Email logs query parameters DTO
 * Used in GET /admin/email-logs
 */
export type EmailLogsQueryDto = {
  page?: number;
  per_page?: number;
  status?: 'pending' | 'sent' | 'failed' | 'bounced';
  email_type?:
    | 'welcome'
    | 'verification'
    | 'offer_published'
    | 'offer_rejected'
    | 'lead_submission_to_organizer'
    | 'lead_submission_to_parent'
    | 'password_reset';
  from_date?: string;
  to_date?: string;
  sort_by?: 'created_at' | 'sent_at';
  sort_order?: 'asc' | 'desc';
};

// =============================================================================
// USER MANAGEMENT DTOs (Admin Only)
// =============================================================================

/**
 * Admin user list item DTO
 * Used in GET /admin/users
 */
export type AdminUserListItemDto = Pick<
  DbUser,
  'id' | 'email' | 'created_at'
> & {
  company_name: string;
  offers_count: number;
  leads_count: number;
};

/**
 * Admin users query parameters DTO
 * Used in GET /admin/users
 */
export type AdminUsersQueryDto = {
  page?: number;
  per_page?: number;
  search?: string;
  created_from?: string;
  created_to?: string;
};

// =============================================================================
// ERROR RESPONSE DTOs
// =============================================================================

/**
 * Field validation error detail DTO
 */
export type ValidationErrorDetail = {
  field: string;
  message: string;
};

/**
 * Error response DTO
 * Standard error response structure
 */
export type ErrorResponseDto = {
  error: {
    code:
      | 'VALIDATION_ERROR'
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'RATE_LIMIT_EXCEEDED'
      | 'INVALID_STATUS_TRANSITION'
      | 'DUPLICATE_RESOURCE'
      | 'INVALID_STATE'
      | 'PROCESSING_ERROR';
    message: string;
    details?: ValidationErrorDetail[];
  };
};

// =============================================================================
// OFFER STATUS HISTORY DTOs
// =============================================================================

/**
 * Offer status history DTO
 * Used when including status history in offer details
 */
export type OfferStatusHistoryDto = Pick<
  DbOfferStatusHistory,
  'id' | 'old_status' | 'new_status' | 'reason' | 'changed_at'
> & {
  changed_by: Pick<DbUser, 'id' | 'email'>;
};

// =============================================================================
// TYPE GUARDS & UTILITIES
// =============================================================================

/**
 * Check if user role is admin
 */
export function isAdmin(user: AuthUserDto): boolean {
  return user.role === 'admin';
}

/**
 * Check if user role is organizer
 */
export function isOrganizer(user: AuthUserDto): boolean {
  return user.role === 'organizer';
}

/**
 * Offer status enum type
 */
export type OfferStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

/**
 * Lead status enum type
 */
export type LeadStatus = 'submitted' | 'contacted' | 'completed' | 'cancelled';

/**
 * Email type enum
 */
export type EmailType =
  | 'welcome'
  | 'verification'
  | 'offer_published'
  | 'offer_rejected'
  | 'lead_submission_to_organizer'
  | 'lead_submission_to_parent'
  | 'password_reset';

/**
 * Email status enum
 */
export type EmailStatus = 'pending' | 'sent' | 'failed' | 'bounced';
