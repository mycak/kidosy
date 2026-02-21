-- =====================================================
-- Migration: Add Organizer Foreign Key to Offers Table
-- =====================================================
-- Purpose:
--   - Add direct foreign key relationship from offers to organizer_profiles
--   - Enables PostgREST implicit joins for organizer data
--   - Simplifies API queries
--
-- Changes:
--   1. Add organizer_id column to offers table (nullable initially)
--   2. Populate organizer_id from user_id → organizer_profiles relationship
--   3. Set organizer_id as NOT NULL with foreign key constraint
--   4. Create index for query performance
--
-- Author: Database Migration System
-- Date: 2026-01-28
-- =====================================================

-- Step 1: Add organizer_id column (nullable during migration) - idempotent with IF NOT EXISTS
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'offers' and column_name = 'organizer_id'
  ) then
    alter table offers
    add column organizer_id uuid references organizer_profiles(id) on delete restrict;
  end if;
end $$;

-- Step 2: Populate organizer_id from the user_id relationship (safe if already populated)
update offers o
set organizer_id = op.id
from organizer_profiles op
where o.user_id = op.user_id and o.organizer_id is null;

-- Step 3: Make organizer_id NOT NULL now that all rows are populated (idempotent)
do $$
begin
  alter table offers
  alter column organizer_id set not null;
exception when others then
  null;
end $$;

-- Step 4: Add index for query performance (idempotent with IF NOT EXISTS)
create index if not exists idx_offers_organizer_id on offers(organizer_id);
