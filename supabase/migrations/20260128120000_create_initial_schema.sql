-- =====================================================
-- Migration: Create Initial Schema for Kidosy MVP
-- =====================================================
-- Purpose:
--   - Enable required PostgreSQL extensions
--   - Create all core tables for the Kidosy platform
--   - Set up foreign key relationships
--   - Add constraints and validations
--
-- Tables Created:
--   - users (managed by Supabase Auth)
--   - organizer_profiles
--   - offer_types (dictionary)
--   - categories (dictionary)
--   - offers
--   - offer_categories (many-to-many)
--   - offer_schedules
--   - offer_images
--   - offer_status_history
--   - offer_duplicates
--   - leads
--   - email_logs
--
-- Author: Database Migration System
-- Date: 2026-01-28
-- =====================================================

-- =====================================================
-- SECTION 1: Enable Required Extensions
-- =====================================================

-- PostGIS extension for geographic data types (location coordinates)
create extension if not exists postgis;

-- pg_trgm extension for full-text search and fuzzy matching (duplicate detection)
create extension if not exists pg_trgm;

-- =====================================================
-- SECTION 2: Core Tables
-- =====================================================

-- -----------------------------------------------------
-- Table: users
-- -----------------------------------------------------
-- Purpose: User accounts (organizers and admins)
-- Note: This table is fully managed by Supabase Auth
--       User role (organizer/admin) is stored in JWT claims
--       Email verification is handled by Supabase Auth
-- -----------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone not null default current_timestamp,
  deleted_at timestamp with time zone
);

-- Enable RLS on users table
alter table users enable row level security;

-- Add comment to table
comment on table users is 'User accounts managed by Supabase Auth. Role stored in JWT claims.';

-- -----------------------------------------------------
-- Table: organizer_profiles
-- -----------------------------------------------------
-- Purpose: Organizer profile data (company information)
-- Relationship: 1:1 with users table
-- Note: Prepared for future extensions (NIP, certificates, etc.)
-- -----------------------------------------------------
create table organizer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  company_name text not null,
  phone text not null,
  email_public text not null,
  created_at timestamp with time zone not null default current_timestamp,
  updated_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on organizer_profiles table
alter table organizer_profiles enable row level security;

-- Add comment to table
comment on table organizer_profiles is 'Organizer profile information including company details and contact information.';
comment on column organizer_profiles.email_public is 'Public email address (may differ from users.email)';

-- -----------------------------------------------------
-- Table: offer_types (Dictionary)
-- -----------------------------------------------------
-- Purpose: Types of offers (cyclic classes, summer camps, day camps, camps)
-- Note: Pre-populated with seed data
-- -----------------------------------------------------
create table offer_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  created_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on offer_types table
alter table offer_types enable row level security;

-- Add comment to table
comment on table offer_types is 'Dictionary of offer types (e.g., cyclic classes, summer camps, day camps, camps).';
comment on column offer_types.slug is 'URL-friendly identifier';

-- -----------------------------------------------------
-- Table: categories (Dictionary)
-- -----------------------------------------------------
-- Purpose: Activity categories (sport, artistic, educational, other)
-- Note: Pre-populated with seed data
-- -----------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug text unique not null,
  description text,
  created_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on categories table
alter table categories enable row level security;

-- Add comment to table
comment on table categories is 'Dictionary of activity categories (e.g., sport, artistic, educational, other).';
comment on column categories.slug is 'URL-friendly identifier';

-- -----------------------------------------------------
-- Table: offers
-- -----------------------------------------------------
-- Purpose: Main offers table containing all basic information about offers
-- Note: Uses PostGIS geometry type for location coordinates
--       Supports soft delete via deleted_at column
--       Status workflow: draft -> pending_review -> published/rejected -> archived
-- -----------------------------------------------------
create table offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  offer_type_id uuid not null references offer_types(id) on delete restrict,
  title text not null,
  description text not null,
  ages integer[] not null,
  address text not null,
  location geometry(point, 4326) not null,
  start_date date not null,
  end_date date not null,
  available_spots integer not null check (available_spots >= 0),
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  rejection_reason text,
  moderated_by uuid references users(id),
  created_at timestamp with time zone not null default current_timestamp,
  updated_at timestamp with time zone not null default current_timestamp,
  deleted_at timestamp with time zone,

  -- Constraint: start_date must be before end_date
  constraint offers_date_range_check check (start_date < end_date)
);

-- Enable RLS on offers table
alter table offers enable row level security;

-- Add comments to table and columns
comment on table offers is 'Main offers table containing all activity and event information.';
comment on column offers.ages is 'Array of ages (e.g., {3,4,5} or {7,9} for non-continuous ranges)';
comment on column offers.location is 'Geographic coordinates (longitude, latitude) in SRID 4326';
comment on column offers.status is 'Offer status: draft, pending_review, published, rejected, archived';
comment on column offers.rejection_reason is 'Reason for rejection (filled when status=rejected)';
comment on column offers.deleted_at is 'Soft delete timestamp';

-- -----------------------------------------------------
-- Table: offer_categories (Many-to-Many)
-- -----------------------------------------------------
-- Purpose: Links offers with categories (one offer can have multiple categories)
-- Relationship: Many-to-Many between offers and categories
-- -----------------------------------------------------
create table offer_categories (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  category_id uuid not null references categories(id) on delete restrict,
  created_at timestamp with time zone not null default current_timestamp,

  -- Constraint: Unique combination of offer_id and category_id
  constraint offer_categories_unique unique (offer_id, category_id)
);

-- Enable RLS on offer_categories table
alter table offer_categories enable row level security;

-- Add comment to table
comment on table offer_categories is 'Many-to-many relationship between offers and categories.';

-- -----------------------------------------------------
-- Table: offer_schedules
-- -----------------------------------------------------
-- Purpose: Stores schedules for cyclic classes (days of week, hours)
-- Note: Only used for offer_type = "cyclic classes"
--       Can contain multiple entries per offer (e.g., Monday 16:00-17:30 and Wednesday 17:00-18:30)
-- -----------------------------------------------------
create table offer_schedules (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time without time zone not null,
  end_time time without time zone not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default current_timestamp,

  -- Constraint: start_time must be before end_time
  constraint offer_schedules_time_check check (start_time < end_time)
);

-- Enable RLS on offer_schedules table
alter table offer_schedules enable row level security;

-- Add comments to table and columns
comment on table offer_schedules is 'Schedules for cyclic classes (day of week and time slots).';
comment on column offer_schedules.day_of_week is 'Day of week (0=Monday, 6=Sunday)';

-- -----------------------------------------------------
-- Table: offer_images
-- -----------------------------------------------------
-- Purpose: Stores references to offer photos (stored in Supabase Storage)
-- Note: Maximum 10 photos per offer (enforced at application level)
--       storage_path format: offers/{offer_id}/{filename}
-- -----------------------------------------------------
create table offer_images (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on offer_images table
alter table offer_images enable row level security;

-- Add comments to table and columns
comment on table offer_images is 'References to offer photos stored in Supabase Storage.';
comment on column offer_images.storage_path is 'Path in Supabase Storage (format: offers/{offer_id}/{filename})';
comment on column offer_images.display_order is 'Display order (0 = first)';

-- -----------------------------------------------------
-- Table: offer_status_history
-- -----------------------------------------------------
-- Purpose: Stores history of offer status changes for audit purposes
-- Note: Populated automatically via trigger
-- -----------------------------------------------------
create table offer_status_history (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  old_status text not null,
  new_status text not null,
  changed_by uuid not null references users(id),
  reason text,
  changed_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on offer_status_history table
alter table offer_status_history enable row level security;

-- Add comments to table and columns
comment on table offer_status_history is 'Audit log of offer status changes.';
comment on column offer_status_history.reason is 'Optional reason for status change';

-- -----------------------------------------------------
-- Table: offer_duplicates
-- -----------------------------------------------------
-- Purpose: Flags potential duplicate offers for admin review
-- Note: Similarity score calculated by application logic
-- -----------------------------------------------------
create table offer_duplicates (
  id uuid primary key default gen_random_uuid(),
  offer_id_1 uuid not null references offers(id) on delete cascade,
  offer_id_2 uuid not null references offers(id) on delete cascade,
  similarity_score numeric(3,2) not null check (similarity_score between 0 and 1),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid references users(id),
  reviewed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default current_timestamp,

  -- Constraint: offer_id_1 cannot equal offer_id_2
  constraint offer_duplicates_different_offers check (offer_id_1 != offer_id_2)
);

-- Enable RLS on offer_duplicates table
alter table offer_duplicates enable row level security;

-- Add comments to table and columns
comment on table offer_duplicates is 'Potential duplicate offers flagged for admin review.';
comment on column offer_duplicates.similarity_score is 'Similarity score (0.0-1.0)';

-- -----------------------------------------------------
-- Table: leads
-- -----------------------------------------------------
-- Purpose: Stores parent submissions/inquiries for offers
-- Note: parent_email and parent_phone are encrypted at application level
--       offer_snapshot contains JSON snapshot of offer at submission time
--       Access restricted via RLS (organizer sees only their offer's leads)
-- -----------------------------------------------------
create table leads (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  child_name text not null,
  child_age integer not null check (child_age > 0),
  parent_name text not null,
  parent_email text not null,
  parent_phone text not null,
  message text,
  offer_snapshot jsonb not null,
  status text not null default 'submitted' check (status in ('submitted', 'contacted', 'completed', 'cancelled')),
  created_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on leads table
alter table leads enable row level security;

-- Add comments to table and columns
comment on table leads is 'Parent submissions and inquiries for offers.';
comment on column leads.parent_email is 'Parent email (encrypted at application level)';
comment on column leads.parent_phone is 'Parent phone (encrypted at application level)';
comment on column leads.offer_snapshot is 'JSON snapshot of offer at submission time';

-- -----------------------------------------------------
-- Table: email_logs
-- -----------------------------------------------------
-- Purpose: Tracks sent emails for debugging and future retry mechanisms
-- Note: Long-term storage for email history
-- -----------------------------------------------------
create table email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  email_type text not null check (email_type in ('welcome', 'verification', 'offer_published', 'offer_rejected', 'lead_submission_to_organizer', 'lead_submission_to_parent', 'password_reset')),
  lead_id uuid references leads(id) on delete set null,
  offer_id uuid references offers(id) on delete set null,
  user_id uuid references users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'bounced')),
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default current_timestamp
);

-- Enable RLS on email_logs table
alter table email_logs enable row level security;

-- Add comments to table and columns
comment on table email_logs is 'Email sending log for debugging and retry mechanisms.';
comment on column email_logs.error_message is 'Error message if sending failed';

-- =====================================================
-- SECTION 3: Indexes
-- =====================================================

-- -----------------------------------------------------
-- Basic Indexes (Performance)
-- -----------------------------------------------------

-- Indexes for offers table
create index idx_offers_user_id on offers(user_id);
create index idx_offers_status on offers(status);
create index idx_offers_offer_type_id on offers(offer_type_id);
create index idx_offers_created_at on offers(created_at desc);
create index idx_offers_start_date on offers(start_date);
create index idx_offers_end_date on offers(end_date);
create index idx_offers_deleted_at on offers(deleted_at);

-- Indexes for organizer_profiles table
create index idx_organizer_profiles_user_id on organizer_profiles(user_id);

-- Indexes for offer_categories table
create index idx_offer_categories_offer_id on offer_categories(offer_id);
create index idx_offer_categories_category_id on offer_categories(category_id);

-- Indexes for offer_schedules table
create index idx_offer_schedules_offer_id on offer_schedules(offer_id);

-- Indexes for offer_images table
create index idx_offer_images_offer_id on offer_images(offer_id);

-- Indexes for offer_status_history table
create index idx_offer_status_history_offer_id on offer_status_history(offer_id);
create index idx_offer_status_history_changed_at on offer_status_history(changed_at desc);

-- Indexes for leads table
create index idx_leads_offer_id on leads(offer_id);
create index idx_leads_created_at on leads(created_at desc);
create index idx_leads_status on leads(status);

-- Indexes for email_logs table
create index idx_email_logs_recipient_email on email_logs(recipient_email);
create index idx_email_logs_status on email_logs(status);
create index idx_email_logs_created_at on email_logs(created_at desc);
create index idx_email_logs_email_type on email_logs(email_type);

-- -----------------------------------------------------
-- Spatial Indexes (Geospatial Queries)
-- -----------------------------------------------------

-- GIST index for efficient proximity searches
-- Only for published, non-deleted offers
create index idx_offers_location_gist on offers using gist(location)
where deleted_at is null and status = 'published';

-- -----------------------------------------------------
-- Full-Text Search Indexes (Duplicate Detection)
-- -----------------------------------------------------

-- GIN index for full-text search on title and description
-- Used for duplicate detection with fuzzy matching
-- Note: Using 'simple' configuration for universal compatibility
--       Can be changed to 'polish' if Polish language support is installed
create index idx_offers_title_description_gin on offers
using gin(to_tsvector('simple', title || ' ' || description))
where deleted_at is null;

-- -----------------------------------------------------
-- Composite Indexes (Complex Queries)
-- -----------------------------------------------------

-- Composite index for filtering by status and dates
create index idx_offers_status_dates on offers(status, start_date, end_date)
where deleted_at is null;

-- Composite index for organizer's leads view
create index idx_leads_offer_created on leads(offer_id, created_at desc);

-- Composite index for offer status history tracking
create index idx_offer_status_history_offer_changed on offer_status_history(offer_id, changed_at desc);

-- =====================================================
-- Migration Complete
-- =====================================================
