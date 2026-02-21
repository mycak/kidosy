-- =====================================================
-- Migration: Add Flagship Offers for Platform Promotion
-- =====================================================
-- Purpose:
--   - Add 7 high-quality flagship offers across major Polish cities
--   - Serve as default content for the initial platform view
--   - Represent diverse categories and offer types
--   - All offers are published and visible immediately
--
-- Cities Covered:
--   1. Warsaw - Piano Mastery at Home
--   2. Kraków - Summer Football Academy
--   3. Wrocław - Creative Digital Art Workshop
--   4. Poznań - Young Scientists Lab
--   5. Gdańsk - Seaside Adventure Camp
--   6. Szczecin - Dance & Movement Studio
--   7. Łódź - English Conversation Club
--
-- Author: Database Migration System
-- Date: 2026-02-15
-- =====================================================

-- =====================================================
-- STEP 1: Create system organizer for flagship offers
-- =====================================================
INSERT INTO users (id, email, created_at)
VALUES ('550e8400-e29b-41d4-a716-500000000001'::uuid, 'flagship@kidosy.pl', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizer_profiles (
  id, user_id, company_name, phone, email_public, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  'Kidosy Flagship Programs',
  '+48722000000',
  'flagship@kidosy.pl',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- STEP 2: Insert 7 Flagship Offers
-- =====================================================

-- Offer 1: Warsaw - Piano Mastery at Home
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000101'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '🎹 Piano Mastery at Home',
  'Unlock musical talent with our professional piano lessons designed for young learners. From your first note to advanced classical pieces, our certified instructors create personalized learning paths. Indoor studio with modern grand piano. Perfect for beginners through intermediate players!',
  '{5,6,7,8,9,10,11,12}',
  'Centrum Warszawy, Warszawa',
  'SRID=4326;POINT(21.0122 52.2297)',
  '2026-03-01',
  '2026-12-31',
  15,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Offer 2: Kraków - Summer Football Academy
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000102'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '⚽ Summer Football Academy - Kraków',
  'Score big this summer! Join our intensive football camp with professional coaches trained at European clubs. Daily matches, tactical training, and fitness conditioning. Perfect for aspiring young athletes who dream big. Includes trophy ceremony and team photos!',
  '{7,8,9,10,11,12,13}',
  'Stadion przy ul. Reformackiej, Kraków',
  'SRID=4326;POINT(19.9450 50.0647)',
  '2026-06-15',
  '2026-08-30',
  40,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Offer 3: Wrocław - Creative Digital Art Workshop
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000103'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440002'::uuid,
  '🎨 Creative Digital Art Workshop - Wrocław',
  'Bring imagination to life with cutting-edge digital art tools! Learn 3D modeling, digital painting, and animation basics. Small group classes ensure personalized attention. Create your own digital portfolio and showcase at our annual exhibition!',
  '{10,11,12,13,14,15,16}',
  'ul. Tadeusza Kościuszki 21, Wrocław',
  'SRID=4326;POINT(17.0385 51.1079)',
  '2026-03-15',
  '2026-11-30',
  12,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Offer 4: Poznań - Young Scientists Lab
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000104'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '🔬 Young Scientists Lab - Poznań',
  'Discover the wonders of science through hands-on experiments! Explore chemistry, physics, biology, and environmental science. State-of-the-art laboratory with safety equipment. Flexible scheduling - join weekly sessions or intensive workshops!',
  '{6,7,8,9,10,11,12}',
  'ul. Fredry 8, Poznań',
  'SRID=4326;POINT(16.9241 52.4064)',
  '2026-02-20',
  '2026-12-31',
  20,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Offer 5: Gdańsk - Seaside Adventure Camp
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000105'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440003'::uuid,
  '🏖️ Seaside Adventure Camp - Gdańsk',
  'Experience unforgettable summer moments by the Baltic Sea! Beach activities, kayaking, windsurfing, bonfire gatherings, and team-building challenges. Accommodation in eco-friendly resort. Ideal for kids seeking adventure and new friendships!',
  '{8,9,10,11,12,13,14}',
  'ul. Brzegowa 4, Gdańsk',
  'SRID=4326;POINT(18.6466 54.3520)',
  '2026-07-01',
  '2026-08-31',
  50,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Offer 6: Szczecin - Dance & Movement Studio
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000106'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '💃 Dance & Movement Studio - Szczecin',
  'Express yourself through dance! Contemporary, hip-hop, ballet, and jazz styles for all levels. Professional choreographers lead engaging classes. Participate in end-of-term showcase performances. Build confidence and coordination in a supportive community!',
  '{5,6,7,8,9,10,11,12,13}',
  'ul. Książąt Pomorskich 47, Szczecin',
  'SRID=4326;POINT(14.5528 53.4289)',
  '2026-03-01',
  '2026-12-31',
  25,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Offer 7: Łódź - English Conversation Club
INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-500000000107'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-500000000001'::uuid,
  '550e8400-e29b-41d4-a716-446655440001'::uuid,
  '🌍 English Conversation Club - Łódź',
  'Master English through natural conversation with native speakers! Interactive games, cultural discussions, and practical speaking practice. Fun, pressure-free environment. Flexible levels from beginner to advanced. Join weekly or enroll for intensive courses!',
  '{8,9,10,11,12,13,14,15,16}',
  'ul. Piotrkowska 104, Łódź',
  'SRID=4326;POINT(19.4557 51.7694)',
  '2026-02-15',
  '2026-12-31',
  18,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Associate Categories with Each Offer
-- =====================================================

-- Offer 1 (Piano): Music category
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000101'::uuid,
  '650e8400-e29b-41d4-a716-446655440014'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Offer 2 (Football): Football category
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000102'::uuid,
  '650e8400-e29b-41d4-a716-446655440001'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Offer 3 (Digital Art): Programming & Painting categories
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000103'::uuid,
  '650e8400-e29b-41d4-a716-446655440011'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000103'::uuid,
  '650e8400-e29b-41d4-a716-446655440019'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Offer 4 (Science): Science category
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000104'::uuid,
  '650e8400-e29b-41d4-a716-446655440021'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Offer 5 (Seaside Camp): Camping category
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000105'::uuid,
  '650e8400-e29b-41d4-a716-446655440029'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Offer 6 (Dance): Dancing category
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000106'::uuid,
  '650e8400-e29b-41d4-a716-446655440007'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- Offer 7 (English): English category
INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-500000000107'::uuid,
  '650e8400-e29b-41d4-a716-446655440024'::uuid,
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;

-- =====================================================
-- Migration Complete
-- =====================================================
-- Summary:
-- - Created 1 system organizer account for flagship offers
-- - Added 7 published flagship offers across major Polish cities
-- - Each offer targets specific age groups and includes compelling descriptions
-- - Offers cover diverse categories (music, sports, arts, science, adventure, dance, languages)
-- - All offers are immediately visible on the platform's initial view
-- =====================================================
