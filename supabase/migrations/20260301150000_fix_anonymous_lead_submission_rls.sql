-- =====================================================
-- Migration: Fix anonymous lead submission RLS
-- =====================================================
-- Purpose:
--   - Ensure parent lead submission works for anonymous users
--   - Normalize insert RLS policy for leads table
--   - Execute create_lead RPC with SECURITY DEFINER
-- =====================================================

-- -----------------------------------------------------
-- SECTION 1: Normalize leads insert policy
-- -----------------------------------------------------
-- Replace role-specific insert policies with one public policy
-- so both anon and authenticated users can submit leads.
drop policy if exists leads_insert_anon on leads;
drop policy if exists leads_insert_authenticated on leads;

create policy leads_insert_public on leads
  for insert
  to public
  with check (true);

-- -----------------------------------------------------
-- SECTION 2: Ensure RPC can insert under RLS constraints
-- -----------------------------------------------------
-- Run RPC as definer to avoid caller-context RLS edge cases.
alter function public.create_lead(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  boolean,
  boolean
) security definer;

-- Keep execution available for frontend roles.
grant execute on function public.create_lead(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  boolean,
  boolean
) to anon, authenticated, service_role;

-- =====================================================
-- Migration Complete
-- =====================================================
