-- =====================================================
-- Migration: Create Triggers and Functions
-- =====================================================
-- Purpose:
--   - Create utility functions for automation
--   - Set up triggers for:
--     * Automatic updated_at timestamp updates
--     * Offer status history tracking
--     * Expired offer archival
--
-- Author: Database Migration System
-- Date: 2026-01-28
-- =====================================================

-- =====================================================
-- SECTION 1: Updated At Trigger Function
-- =====================================================

-- Function: update_updated_at_column
-- Purpose: Automatically updates the updated_at column to current timestamp
-- Usage: Called by BEFORE UPDATE triggers on tables with updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

-- Comment on function
comment on function update_updated_at_column is 'Automatically sets updated_at to current timestamp on row update';

-- =====================================================
-- SECTION 2: Offer Status History Trigger Function
-- =====================================================

-- Function: record_offer_status_change
-- Purpose: Automatically logs status changes to offer_status_history table
-- Security: SECURITY DEFINER allows inserting into history table regardless of RLS
-- Note: Uses auth.uid() to track which user made the change
create or replace function record_offer_status_change()
returns trigger as $$
begin
  -- Only log if status actually changed
  if old.status is distinct from new.status then
    insert into offer_status_history (
      offer_id,
      old_status,
      new_status,
      changed_by,
      reason
    ) values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      null  -- Reason can be added manually later if needed
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Comment on function
comment on function record_offer_status_change is 'Automatically logs offer status changes to offer_status_history table';

-- =====================================================
-- SECTION 3: Archive Expired Offers Function
-- =====================================================

-- Function: archive_expired_offers
-- Purpose: Archives offers that have passed their end_date
-- Usage: Should be called periodically (e.g., daily via cron job)
-- Note: Only archives offers in active statuses (draft, pending_review, published)
--       Skips already archived or deleted offers
create or replace function archive_expired_offers()
returns void as $$
begin
  -- Update expired offers to archived status
  update offers
  set
    status = 'archived',
    updated_at = current_timestamp
  where
    status in ('draft', 'pending_review', 'published')
    and end_date < current_date
    and deleted_at is null;
end;
$$ language plpgsql;

-- Comment on function
comment on function archive_expired_offers is 'Archives offers that have passed their end_date. Should be run daily via cron.';

-- =====================================================
-- SECTION 4: Apply Triggers to Tables
-- =====================================================

-- -----------------------------------------------------
-- Updated At Triggers
-- -----------------------------------------------------

-- Trigger: Update updated_at on offers table
create trigger offers_updated_at_trigger
  before update on offers
  for each row
  execute function update_updated_at_column();

-- Comment on trigger
comment on trigger offers_updated_at_trigger on offers is 'Automatically updates updated_at timestamp when offer is modified';

-- Trigger: Update updated_at on organizer_profiles table
create trigger organizer_profiles_updated_at_trigger
  before update on organizer_profiles
  for each row
  execute function update_updated_at_column();

-- Comment on trigger
comment on trigger organizer_profiles_updated_at_trigger on organizer_profiles is 'Automatically updates updated_at timestamp when organizer profile is modified';

-- -----------------------------------------------------
-- Offer Status History Trigger
-- -----------------------------------------------------

-- Trigger: Record status changes in offers table
-- Note: Uses AFTER UPDATE to ensure the new status is committed
create trigger offer_status_change_trigger
  after update on offers
  for each row
  execute function record_offer_status_change();

-- Comment on trigger
comment on trigger offer_status_change_trigger on offers is 'Automatically logs status changes to offer_status_history table';

-- =====================================================
-- SECTION 5: Usage Notes for Archive Function
-- =====================================================

-- The archive_expired_offers() function should be scheduled to run daily.
--
-- Option 1: Using pg_cron extension (if available):
-- SELECT cron.schedule('archive_expired_offers', '0 2 * * *', 'SELECT archive_expired_offers()');
--
-- Option 2: Using Supabase Edge Functions or external cron service:
-- Call the function via a scheduled webhook or API endpoint
--
-- Option 3: Manual execution (for testing):
-- SELECT archive_expired_offers();

-- =====================================================
-- Migration Complete
-- =====================================================
