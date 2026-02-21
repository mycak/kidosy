-- =====================================================
-- Migration: Allow Anonymous Users to View Organizer Profiles
-- =====================================================
-- Purpose:
--   - Enable anonymous users (parents) to see organizer information
--   - Required for displaying organizer details on public offer pages
--   - Organizer profiles contain only public information
--
-- Author: Database Migration System
-- Date: 2026-02-15
-- =====================================================

-- Policy: Anonymous users can view organizer profiles
-- Applies to: anon role
-- Operations: SELECT
-- Rationale: Parents need to see organizer contact info on published offers
do $$
begin
  create policy organizer_profiles_select_anon on organizer_profiles
    for select
    to anon
    using (true);
exception when others then
  null;
end $$;

-- =====================================================
-- Migration Complete
-- =====================================================
