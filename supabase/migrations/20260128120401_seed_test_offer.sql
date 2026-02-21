-- Test data for offer details query verification
INSERT INTO users (id, email, created_at)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'test@example.com', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizer_profiles (id, user_id, company_name, phone, email_public, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'Test School',
  '+48123456789',
  'contact@testschool.pl',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (
  id, user_id, organizer_id, offer_type_id, title, description,
  ages, address, location, start_date, end_date, available_spots,
  status, created_at, updated_at
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440001',
  'Piano Lessons for Kids',
  'Learn piano from a professional teacher',
  '{6,7,8,9}',
  'ul. Test 123, Warsaw',
  'SRID=4326;POINT(21.0122 52.2297)',
  '2026-02-01',
  '2026-06-30',
  10,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

INSERT INTO offer_categories (offer_id, category_id, created_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  '650e8400-e29b-41d4-a716-446655440001',
  NOW()
)
ON CONFLICT (offer_id, category_id) DO NOTHING;
