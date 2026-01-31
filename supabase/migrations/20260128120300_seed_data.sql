-- =====================================================
-- Migration: Seed Data for Dictionary Tables
-- =====================================================
-- Purpose:
--   - Populate offer_types table with default values
--   - Populate categories table with default values
--
-- Note: Uses ON CONFLICT to make migration idempotent
--       (safe to run multiple times)
--
-- Author: Database Migration System
-- Date: 2026-01-28
-- =====================================================

-- =====================================================
-- SECTION 1: Seed Offer Types
-- =====================================================

-- Insert default offer types
-- These represent the main types of activities/offers available
insert into offer_types (id, name, slug) values
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Zajęcia cykliczne', 'cyclic-classes'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Kolonie letnie', 'summer-camps'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Półkolonie', 'day-camps'),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Obozy', 'camps')
on conflict (slug) do nothing;

-- Comment:
-- Zajęcia cykliczne = Recurring weekly classes
-- Kolonie letnie = Summer camps (residential)
-- Półkolonie = Day camps (non-residential)
-- Obozy = Camps (various types)

-- =====================================================
-- SECTION 2: Seed Categories
-- =====================================================

-- Insert default categories
-- These represent the main activity categories for classification
insert into categories (id, name, slug, description) values
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'Sport', 'sport', 'Zajęcia sportowe i rekreacyjne'),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'Artystyczne', 'artistic', 'Zajęcia artystyczne i twórcze'),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'Edukacyjne', 'educational', 'Zajęcia edukacyjne i naukowe'),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, 'Inne', 'other', 'Inne zajęcia')
on conflict (slug) do nothing;

-- Comment:
-- Sport = Sports and recreational activities
-- Artystyczne = Artistic and creative activities
-- Edukacyjne = Educational and scientific activities
-- Inne = Other activities

-- =====================================================
-- Migration Complete
-- =====================================================
