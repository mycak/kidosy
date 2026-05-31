-- =====================================================
-- Migration: Add create_lead RPC function
-- =====================================================
-- Purpose:
--   - Add a PostgREST RPC endpoint for parent lead submissions
--   - Validate offer availability and request payload
--   - Persist one lead row per submitted child
--   - Return response payload expected by frontend
-- =====================================================

create or replace function public.create_lead(
  p_offer_id uuid,
  p_parent_email text,
  p_parent_phone text,
  p_parent_name text,
  p_children jsonb,
  p_contact_preference text,
  p_additional_message text,
  p_consent_communication boolean,
  p_consent_marketing boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  matched_offer offers%rowtype;
  child_payload jsonb;
  inserted_lead_id uuid;
  first_inserted_lead_id uuid;
  inserted_lead_ids jsonb := '[]'::jsonb;
  inserted_children_count integer := 0;
  normalized_parent_email text := lower(trim(p_parent_email));
  normalized_parent_phone text := trim(p_parent_phone);
  normalized_parent_name text := trim(p_parent_name);
  normalized_additional_message text := nullif(trim(coalesce(p_additional_message, '')), '');
  response_timestamp timestamp with time zone := current_timestamp;
begin
  if p_consent_communication is distinct from true then
    raise exception using
      message = 'consent_communication is required';
  end if;

  if normalized_parent_email = '' then
    raise exception using
      message = 'parent_email is required';
  end if;

  if normalized_parent_phone = '' then
    raise exception using
      message = 'parent_phone is required';
  end if;

  if normalized_parent_name = '' then
    raise exception using
      message = 'parent_name is required';
  end if;

  if jsonb_typeof(p_children) is distinct from 'array' or jsonb_array_length(p_children) = 0 then
    raise exception using
      message = 'children must be a non-empty array';
  end if;

  select *
  into matched_offer
  from offers
  where id = p_offer_id
    and status = 'published'
    and deleted_at is null
  limit 1;

  if matched_offer.id is null then
    raise exception using
      message = 'Offer not found or unavailable';
  end if;

  if matched_offer.available_spots <= 0 then
    raise exception using
      message = 'No spots available';
  end if;

  if exists (
    select 1
    from leads
    where offer_id = p_offer_id
      and lower(parent_email) = normalized_parent_email
      and status <> 'cancelled'
  ) then
    raise exception using
      message = 'You already expressed interest in this offer';
  end if;

  for child_payload in
    select value from jsonb_array_elements(p_children)
  loop
    if nullif(trim(coalesce(child_payload ->> 'name', '')), '') is null then
      raise exception using
        message = 'Each child must include a non-empty name';
    end if;

    if (child_payload ->> 'age') is null
      or (child_payload ->> 'age') !~ '^\d+$'
      or (child_payload ->> 'age')::integer < 1
      or (child_payload ->> 'age')::integer > 100 then
      raise exception using
        message = 'Each child must include age between 1 and 100';
    end if;

    insert into leads (
      offer_id,
      child_name,
      child_age,
      parent_name,
      parent_email,
      parent_phone,
      message,
      offer_snapshot,
      status
    )
    values (
      p_offer_id,
      trim(child_payload ->> 'name'),
      (child_payload ->> 'age')::integer,
      normalized_parent_name,
      normalized_parent_email,
      normalized_parent_phone,
      normalized_additional_message,
      jsonb_build_object(
        'id', matched_offer.id,
        'title', matched_offer.title,
        'user_id', matched_offer.user_id,
        'status', matched_offer.status,
        'start_date', matched_offer.start_date,
        'end_date', matched_offer.end_date,
        'available_spots', matched_offer.available_spots,
        'created_at', matched_offer.created_at,
        'updated_at', matched_offer.updated_at
      ),
      'submitted'
    )
    returning id into inserted_lead_id;

    inserted_lead_ids := inserted_lead_ids || to_jsonb(inserted_lead_id);

    if first_inserted_lead_id is null then
      first_inserted_lead_id := inserted_lead_id;
    end if;

    inserted_children_count := inserted_children_count + 1;
  end loop;

  return jsonb_build_object(
    'lead',
    jsonb_build_object(
      'id', first_inserted_lead_id,
      'offer_id', p_offer_id,
      'parent_email', normalized_parent_email,
      'parent_name', normalized_parent_name,
      'parent_phone', normalized_parent_phone,
      'children_count', inserted_children_count,
      'status', 'new',
      'contact_preference', p_contact_preference,
      'created_at', response_timestamp,
      'updated_at', response_timestamp
    ),
    'leadIds', inserted_lead_ids,
    'message',
    'Dziękujemy za zainteresowanie! Organizator odezwie się wkrótce.'
  );
end;
$$;

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

comment on function public.create_lead(
  uuid,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  boolean,
  boolean
) is 'Creates parent lead records for a published offer (one row per child), returns lead confirmation payload, and includes inserted lead IDs for notification workflows.';
