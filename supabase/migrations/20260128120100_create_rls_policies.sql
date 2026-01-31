-- =====================================================
-- Migration: Create Row Level Security Policies
-- =====================================================
-- Purpose:
--   - Define RLS policies for all tables
--   - Implement security rules for three user roles:
--     * anon: Anonymous users (parents)
--     * authenticated: Logged-in users (organizers)
--     * admin: Administrators (custom role in JWT)
--
-- Security Approach:
--   - Granular policies (separate for select, insert, update, delete)
--   - Role-specific access control
--   - Data isolation between organizers
--
-- Author: Database Migration System
-- Date: 2026-01-28
-- =====================================================

-- =====================================================
-- SECTION 1: Users Table Policies
-- =====================================================

-- Policy: Users can view only their own record
-- Applies to: authenticated role
-- Operations: SELECT
create policy users_select_own on users
  for select
  to authenticated
  using (auth.uid() = id);

-- Policy: Admins can view all users
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
create policy users_select_admin on users
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: Users can update only their own record
-- Applies to: authenticated role
-- Operations: UPDATE
create policy users_update_own on users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- =====================================================
-- SECTION 2: Organizer Profiles Table Policies
-- =====================================================

-- Policy: Organizers can view only their own profile
-- Applies to: authenticated role
-- Operations: SELECT
create policy organizer_profiles_select_own on organizer_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Admins can view all profiles
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
create policy organizer_profiles_select_admin on organizer_profiles
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: Organizers can update only their own profile
-- Applies to: authenticated role
-- Operations: UPDATE
create policy organizer_profiles_update_own on organizer_profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =====================================================
-- SECTION 3: Offer Types Table Policies (Dictionary)
-- =====================================================

-- Policy: Anonymous users can view all offer types
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Public dictionary data needed for search filters
create policy offer_types_select_anon on offer_types
  for select
  to anon
  using (true);

-- Policy: Authenticated users can view all offer types
-- Applies to: authenticated role
-- Operations: SELECT
-- Rationale: Needed for creating and filtering offers
create policy offer_types_select_authenticated on offer_types
  for select
  to authenticated
  using (true);

-- =====================================================
-- SECTION 4: Categories Table Policies (Dictionary)
-- =====================================================

-- Policy: Anonymous users can view all categories
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Public dictionary data needed for search filters
create policy categories_select_anon on categories
  for select
  to anon
  using (true);

-- Policy: Authenticated users can view all categories
-- Applies to: authenticated role
-- Operations: SELECT
-- Rationale: Needed for creating and filtering offers
create policy categories_select_authenticated on categories
  for select
  to authenticated
  using (true);

-- =====================================================
-- SECTION 5: Offers Table Policies
-- =====================================================

-- Policy: Anonymous users can view only published offers
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Parents should only see active, published offers
create policy offers_select_published on offers
  for select
  to anon
  using (status = 'published' and deleted_at is null);

-- Policy: Organizers can view their own offers and published offers
-- Applies to: authenticated role
-- Operations: SELECT
-- Rationale: Organizers need to see all their offers + browse published offers from others
create policy offers_select_organizer on offers
  for select
  to authenticated
  using (
    (auth.uid() = user_id) or
    (status = 'published' and deleted_at is null)
  );

-- Policy: Admins can view all offers
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
-- Rationale: Admins need full visibility for moderation
create policy offers_select_admin on offers
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: Organizers can create new offers
-- Applies to: authenticated role
-- Operations: INSERT
-- Rationale: Only logged-in organizers can create offers
create policy offers_insert_organizer on offers
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Organizers can update only their own offers
-- Applies to: authenticated role
-- Operations: UPDATE
-- Rationale: Data isolation - organizers can only modify their own content
create policy offers_update_organizer on offers
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Admins can update any offer (for moderation)
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: UPDATE
-- Rationale: Admins need to moderate offers (approve/reject)
create policy offers_update_admin on offers
  for update
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin')
  with check ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: Organizers can delete only their own offers
-- Applies to: authenticated role
-- Operations: DELETE
-- Rationale: Soft delete - organizers can remove their offers
create policy offers_delete_organizer on offers
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- =====================================================
-- SECTION 6: Offer Categories Table Policies
-- =====================================================

-- Policy: Anonymous users can view categories of published offers
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Parents need to see categories when browsing offers
create policy offer_categories_select_public on offer_categories
  for select
  to anon
  using (
    offer_id in (
      select id from offers
      where status = 'published' and deleted_at is null
    )
  );

-- Policy: Organizers can manage categories of their own offers
-- Applies to: authenticated role
-- Operations: ALL (SELECT, INSERT, UPDATE, DELETE)
-- Rationale: Organizers need full control over their offer categories
create policy offer_categories_organizer on offer_categories
  for all
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  )
  with check (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Admins can manage all offer categories
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: ALL (SELECT, INSERT, UPDATE, DELETE)
-- Rationale: Admins need full control for moderation purposes
create policy offer_categories_admin on offer_categories
  for all
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin')
  with check ((auth.jwt() ->> 'role')::text = 'admin');

-- =====================================================
-- SECTION 7: Offer Schedules Table Policies
-- =====================================================

-- Policy: Anonymous users can view schedules of published offers
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Parents need to see schedules when browsing offers
create policy offer_schedules_select_public on offer_schedules
  for select
  to anon
  using (
    offer_id in (
      select id from offers
      where status = 'published' and deleted_at is null
    )
  );

-- Policy: Organizers can manage schedules of their own offers
-- Applies to: authenticated role
-- Operations: ALL (SELECT, INSERT, UPDATE, DELETE)
-- Rationale: Organizers need full control over their offer schedules
create policy offer_schedules_organizer on offer_schedules
  for all
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  )
  with check (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Admins can manage all schedules
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: ALL (SELECT, INSERT, UPDATE, DELETE)
-- Rationale: Admins need full control for moderation purposes
create policy offer_schedules_admin on offer_schedules
  for all
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin')
  with check ((auth.jwt() ->> 'role')::text = 'admin');

-- =====================================================
-- SECTION 8: Offer Images Table Policies
-- =====================================================

-- Policy: Anonymous users can view images of published offers
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Parents need to see images when browsing offers
create policy offer_images_select_public on offer_images
  for select
  to anon
  using (
    offer_id in (
      select id from offers
      where status = 'published' and deleted_at is null
    )
  );

-- Policy: Organizers can view images of their own offers
-- Applies to: authenticated role
-- Operations: SELECT
-- Rationale: Organizers need to see their offer images
create policy offer_images_select_organizer on offer_images
  for select
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Organizers can add images to their own offers
-- Applies to: authenticated role
-- Operations: INSERT
-- Rationale: Organizers need to upload images to their offers
create policy offer_images_insert_organizer on offer_images
  for insert
  to authenticated
  with check (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Organizers can delete images from their own offers
-- Applies to: authenticated role
-- Operations: DELETE
-- Rationale: Organizers need to remove images from their offers
create policy offer_images_delete_organizer on offer_images
  for delete
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- =====================================================
-- SECTION 9: Offer Status History Table Policies
-- =====================================================

-- Policy: Organizers can view history of their own offers
-- Applies to: authenticated role
-- Operations: SELECT
-- Rationale: Organizers should see status changes for their offers
create policy offer_status_history_select_organizer on offer_status_history
  for select
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Admins can view all status history
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
-- Rationale: Admins need full audit trail visibility
create policy offer_status_history_select_admin on offer_status_history
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: System can insert status history records
-- Applies to: authenticated role
-- Operations: INSERT
-- Rationale: Trigger needs to insert records on status changes
create policy offer_status_history_insert_system on offer_status_history
  for insert
  to authenticated
  with check (true);

-- =====================================================
-- SECTION 10: Offer Duplicates Table Policies
-- =====================================================

-- Policy: Admins can view all duplicate flags
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
-- Rationale: Only admins review duplicates
create policy offer_duplicates_select_admin on offer_duplicates
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: Admins can manage duplicate flags
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: INSERT, UPDATE
-- Rationale: Admins need to flag and review duplicates
create policy offer_duplicates_manage_admin on offer_duplicates
  for all
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin')
  with check ((auth.jwt() ->> 'role')::text = 'admin');

-- =====================================================
-- SECTION 11: Leads Table Policies
-- =====================================================

-- Policy: Organizers can view leads for their own offers
-- Applies to: authenticated role
-- Operations: SELECT
-- Rationale: Organizers should only see leads submitted to their offers
create policy leads_select_organizer on leads
  for select
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Admins can view all leads
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
-- Rationale: Admins may need to review leads for support/moderation
create policy leads_select_admin on leads
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: Anonymous users can submit leads
-- Applies to: anon role
-- Operations: INSERT
-- Rationale: Parents (not logged in) need to submit inquiries
create policy leads_insert_anon on leads
  for insert
  to anon
  with check (true);

-- Policy: Authenticated users can submit leads
-- Applies to: authenticated role
-- Operations: INSERT
-- Rationale: Logged-in users may also submit inquiries
create policy leads_insert_authenticated on leads
  for insert
  to authenticated
  with check (true);

-- Policy: Organizers can update status of leads for their offers
-- Applies to: authenticated role
-- Operations: UPDATE
-- Rationale: Organizers need to track lead status (contacted, completed, etc.)
create policy leads_update_organizer on leads
  for update
  to authenticated
  using (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  )
  with check (
    offer_id in (
      select id from offers where user_id = auth.uid()
    )
  );

-- Policy: Admins can update all leads
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: UPDATE
-- Rationale: Admins may need to manage leads for support purposes
create policy leads_update_admin on leads
  for update
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin')
  with check ((auth.jwt() ->> 'role')::text = 'admin');

-- =====================================================
-- SECTION 12: Email Logs Table Policies
-- =====================================================

-- Policy: Admins can view all email logs
-- Applies to: authenticated role (with admin JWT claim)
-- Operations: SELECT
-- Rationale: Only admins need visibility into email sending status
create policy email_logs_select_admin on email_logs
  for select
  to authenticated
  using ((auth.jwt() ->> 'role')::text = 'admin');

-- Policy: System can insert email logs
-- Applies to: authenticated role
-- Operations: INSERT
-- Rationale: Application/triggers need to log email sending
create policy email_logs_insert on email_logs
  for insert
  to authenticated
  with check (true);

-- =====================================================
-- Migration Complete
-- =====================================================
