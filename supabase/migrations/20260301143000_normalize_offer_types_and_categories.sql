-- =====================================================
-- Migration: Normalize offer types and categories
-- =====================================================
-- Purpose:
--   - Standardize dictionary data to canonical slugs required by UI
--   - Remap all existing offers to the new offer type values
--   - Remap all existing offer categories to the new top-level categories
--   - Keep schema consistent across environments
-- =====================================================

-- -----------------------------------------------------
-- SECTION 1: Ensure canonical offer types exist
-- -----------------------------------------------------
insert into offer_types (id, name, slug)
values
  ('770e8400-e29b-41d4-a716-446655440001'::uuid, 'Zajęcia grupowe', 'group-classes'),
  ('770e8400-e29b-41d4-a716-446655440002'::uuid, 'Lekcje prywatne', 'private-lessons'),
  ('770e8400-e29b-41d4-a716-446655440003'::uuid, 'Półkolonie', 'day-camps'),
  ('770e8400-e29b-41d4-a716-446655440004'::uuid, 'Obozy', 'training-camps')
on conflict (slug) do update
set name = excluded.name;

-- -----------------------------------------------------
-- SECTION 2: Remap existing offers to canonical types
-- -----------------------------------------------------
with offer_type_slug_map as (
  select *
  from (
    values
      ('class', 'group-classes'),
      ('workshop', 'group-classes'),
      ('course', 'group-classes'),
      ('group-session', 'group-classes'),
      ('coaching', 'group-classes'),
      ('seminar', 'group-classes'),
      ('private-lesson', 'private-lessons'),
      ('camp', 'day-camps')
  ) as mapped_slugs(source_slug, target_slug)
), remapped_offer_types as (
  select
    source_types.id as source_offer_type_id,
    target_types.id as target_offer_type_id
  from offer_type_slug_map
  inner join offer_types as source_types
    on source_types.slug = offer_type_slug_map.source_slug
  inner join offer_types as target_types
    on target_types.slug = offer_type_slug_map.target_slug
)
update offers
set offer_type_id = remapped_offer_types.target_offer_type_id
from remapped_offer_types
where offers.offer_type_id = remapped_offer_types.source_offer_type_id;

-- -----------------------------------------------------
-- SECTION 3: Ensure canonical categories exist
-- -----------------------------------------------------
insert into categories (id, name, slug, description)
values
  ('880e8400-e29b-41d4-a716-446655440001'::uuid, 'Edukacyjne', 'educational', 'Zajęcia edukacyjne i naukowe'),
  ('880e8400-e29b-41d4-a716-446655440002'::uuid, 'Sport', 'sport', 'Zajęcia sportowe i ruchowe'),
  ('880e8400-e29b-41d4-a716-446655440003'::uuid, 'Artystyczne', 'artistic', 'Zajęcia artystyczne i kreatywne'),
  ('880e8400-e29b-41d4-a716-446655440004'::uuid, 'Języki obce', 'languages', 'Nauka języków obcych')
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description;

-- -----------------------------------------------------
-- SECTION 4: Remap offer-category links
-- -----------------------------------------------------
with category_slug_map as (
  select *
  from (
    values
      ('educational', 'educational'),
      ('programming', 'educational'),
      ('robotics', 'educational'),
      ('science', 'educational'),
      ('mathematics', 'educational'),
      ('engineering', 'educational'),
      ('tutoring', 'educational'),
      ('test-preparation', 'educational'),
      ('board-games', 'educational'),
      ('chess', 'educational'),
      ('sport', 'sport'),
      ('football', 'sport'),
      ('basketball', 'sport'),
      ('volleyball', 'sport'),
      ('tennis', 'sport'),
      ('swimming', 'sport'),
      ('martial-arts', 'sport'),
      ('cycling', 'sport'),
      ('yoga', 'sport'),
      ('fitness', 'sport'),
      ('artistic', 'artistic'),
      ('painting', 'artistic'),
      ('drawing', 'artistic'),
      ('photography', 'artistic'),
      ('music', 'artistic'),
      ('singing', 'artistic'),
      ('theater', 'artistic'),
      ('crafts', 'artistic'),
      ('pottery', 'artistic'),
      ('dancing', 'artistic'),
      ('languages', 'languages'),
      ('english', 'languages'),
      ('french', 'languages'),
      ('spanish', 'languages'),
      ('german', 'languages')
  ) as mapped_categories(source_slug, target_slug)
), canonical_category_ids as (
  select slug, id
  from categories
  where slug in ('educational', 'sport', 'artistic', 'languages')
), mapped_offer_categories as (
  select distinct
    offer_categories.offer_id,
    target_categories.id as category_id
  from offer_categories
  inner join categories as source_categories
    on source_categories.id = offer_categories.category_id
  inner join category_slug_map
    on category_slug_map.source_slug = source_categories.slug
  inner join canonical_category_ids as target_categories
    on target_categories.slug = category_slug_map.target_slug
), offers_without_mapped_categories as (
  select offers.id as offer_id
  from offers
  where not exists (
    select 1
    from mapped_offer_categories
    where mapped_offer_categories.offer_id = offers.id
  )
), default_educational_category as (
  select id
  from categories
  where slug = 'educational'
  limit 1
), final_offer_categories as (
  select offer_id, category_id
  from mapped_offer_categories

  union

  select
    offers_without_mapped_categories.offer_id,
    default_educational_category.id as category_id
  from offers_without_mapped_categories
  cross join default_educational_category
) , cleared_offer_categories as (
  delete from offer_categories
  returning id
)
insert into offer_categories (offer_id, category_id)
select
  final_offer_categories.offer_id,
  final_offer_categories.category_id
from final_offer_categories;

-- -----------------------------------------------------
-- SECTION 5: Remove non-canonical dictionary rows
-- -----------------------------------------------------
delete from categories
where slug not in ('educational', 'sport', 'artistic', 'languages');

delete from offer_types
where slug not in ('group-classes', 'private-lessons', 'day-camps', 'training-camps');

-- =====================================================
-- Migration Complete
-- =====================================================
