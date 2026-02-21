-- =====================================================
-- Migration: Seed Data for Dictionary Tables
-- =====================================================
-- Purpose:
--   - Populate offer_types table with default values
--   - Populate categories table with default values
--
-- Note: Uses ON CONFLICT to make migration idempotent
--       (safe to run multiple times)
--       All names are in ENGLISH and translated on client side
--
-- Author: Database Migration System
-- Date: 2026-01-28
-- =====================================================

-- =====================================================
-- SECTION 1: Seed Offer Types
-- =====================================================

-- Insert default offer types (in English)
-- These represent the main types of activities/offers available
insert into offer_types (id, name, slug) values
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Class', 'class'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Workshop', 'workshop'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Camp', 'camp'),
  ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Course', 'course'),
  ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'Private Lesson', 'private-lesson'),
  ('550e8400-e29b-41d4-a716-446655440006'::uuid, 'Group Session', 'group-session'),
  ('550e8400-e29b-41d4-a716-446655440007'::uuid, 'Coaching', 'coaching'),
  ('550e8400-e29b-41d4-a716-446655440008'::uuid, 'Seminar', 'seminar')
on conflict (slug) do nothing;

-- =====================================================
-- SECTION 2: Seed Categories
-- =====================================================

-- Insert default categories (in English)
-- These represent the main activity categories for classification
insert into categories (id, name, slug, description) values
  -- Sports
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'Football', 'football', 'Football activities and training'),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'Basketball', 'basketball', 'Basketball activities and training'),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'Volleyball', 'volleyball', 'Volleyball activities and training'),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, 'Tennis', 'tennis', 'Tennis activities and training'),
  ('650e8400-e29b-41d4-a716-446655440005'::uuid, 'Swimming', 'swimming', 'Swimming classes and activities'),
  ('650e8400-e29b-41d4-a716-446655440006'::uuid, 'Martial Arts', 'martial-arts', 'Martial arts and combat sports'),
  ('650e8400-e29b-41d4-a716-446655440007'::uuid, 'Dancing', 'dancing', 'Dance classes and performances'),
  ('650e8400-e29b-41d4-a716-446655440008'::uuid, 'Cycling', 'cycling', 'Cycling and biking activities'),
  ('650e8400-e29b-41d4-a716-446655440009'::uuid, 'Yoga', 'yoga', 'Yoga and wellness classes'),
  ('650e8400-e29b-41d4-a716-446655440010'::uuid, 'Fitness', 'fitness', 'Fitness and strength training'),

  -- Arts & Music
  ('650e8400-e29b-41d4-a716-446655440011'::uuid, 'Painting', 'painting', 'Painting and visual arts'),
  ('650e8400-e29b-41d4-a716-446655440012'::uuid, 'Drawing', 'drawing', 'Drawing and sketching'),
  ('650e8400-e29b-41d4-a716-446655440013'::uuid, 'Photography', 'photography', 'Photography classes'),
  ('650e8400-e29b-41d4-a716-446655440014'::uuid, 'Music', 'music', 'Music lessons and instruction'),
  ('650e8400-e29b-41d4-a716-446655440015'::uuid, 'Singing', 'singing', 'Singing and vocal training'),
  ('650e8400-e29b-41d4-a716-446655440016'::uuid, 'Theater', 'theater', 'Theater and dramatic arts'),
  ('650e8400-e29b-41d4-a716-446655440017'::uuid, 'Crafts', 'crafts', 'Crafts and DIY projects'),
  ('650e8400-e29b-41d4-a716-446655440018'::uuid, 'Pottery', 'pottery', 'Pottery and ceramic arts'),

  -- STEM
  ('650e8400-e29b-41d4-a716-446655440019'::uuid, 'Programming', 'programming', 'Programming and coding'),
  ('650e8400-e29b-41d4-a716-446655440020'::uuid, 'Robotics', 'robotics', 'Robotics and automation'),
  ('650e8400-e29b-41d4-a716-446655440021'::uuid, 'Science', 'science', 'Science experiments and learning'),
  ('650e8400-e29b-41d4-a716-446655440022'::uuid, 'Mathematics', 'mathematics', 'Mathematics tutoring and classes'),
  ('650e8400-e29b-41d4-a716-446655440023'::uuid, 'Engineering', 'engineering', 'Engineering and design projects'),

  -- Languages
  ('650e8400-e29b-41d4-a716-446655440024'::uuid, 'English', 'english', 'English language classes'),
  ('650e8400-e29b-41d4-a716-446655440025'::uuid, 'French', 'french', 'French language classes'),
  ('650e8400-e29b-41d4-a716-446655440026'::uuid, 'Spanish', 'spanish', 'Spanish language classes'),
  ('650e8400-e29b-41d4-a716-446655440027'::uuid, 'German', 'german', 'German language classes'),

  -- Outdoor & Nature
  ('650e8400-e29b-41d4-a716-446655440028'::uuid, 'Hiking', 'hiking', 'Hiking and outdoor adventures'),
  ('650e8400-e29b-41d4-a716-446655440029'::uuid, 'Camping', 'camping', 'Camping and outdoor survival'),
  ('650e8400-e29b-41d4-a716-446655440030'::uuid, 'Gardening', 'gardening', 'Gardening and environmental activities'),

  -- Games & Hobbies
  ('650e8400-e29b-41d4-a716-446655440031'::uuid, 'Board Games', 'board-games', 'Board games and strategy'),
  ('650e8400-e29b-41d4-a716-446655440032'::uuid, 'Chess', 'chess', 'Chess instruction and tournaments'),

  -- Academic
  ('650e8400-e29b-41d4-a716-446655440033'::uuid, 'Tutoring', 'tutoring', 'Academic tutoring and support'),
  ('650e8400-e29b-41d4-a716-446655440034'::uuid, 'Test Preparation', 'test-preparation', 'Test preparation and exam coaching')
on conflict (slug) do nothing;
-- Inne = Other activities

-- =====================================================
-- Migration Complete
-- =====================================================
