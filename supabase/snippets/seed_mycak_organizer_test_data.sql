-- Seed test data for organizer dashboard pages
-- Target user: mycak@wp.pl
-- Safe to run multiple times (idempotent for test titles)

DO $$
DECLARE
  target_email text := 'mycak@wp.pl';
  target_user_id uuid;
  target_organizer_profile_id uuid;
  default_offer_type_id uuid;
  first_category_id uuid;
  second_category_id uuid;
  has_organizer_id_column boolean;
  offer_published_id uuid;
  offer_pending_id uuid;
  offer_draft_id uuid;
  offer_rejected_id uuid;
  offer_archived_id uuid;
BEGIN
  SELECT id
  INTO target_user_id
  FROM auth.users
  WHERE email = target_email
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Nie znaleziono użytkownika auth.users o emailu: %', target_email;
  END IF;

  INSERT INTO public.users (id, email)
  VALUES (target_user_id, target_email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  INSERT INTO public.organizer_profiles (
    user_id,
    company_name,
    phone,
    email_public
  )
  VALUES (
    target_user_id,
    'TEST MYCAK Organizator',
    '+48111222333',
    target_email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    company_name = EXCLUDED.company_name,
    phone = EXCLUDED.phone,
    email_public = EXCLUDED.email_public,
    updated_at = now()
  RETURNING id INTO target_organizer_profile_id;

  SELECT id
  INTO default_offer_type_id
  FROM public.offer_types
  ORDER BY created_at ASC
  LIMIT 1;

  IF default_offer_type_id IS NULL THEN
    RAISE EXCEPTION 'Brak danych w tabeli public.offer_types';
  END IF;

  SELECT id INTO first_category_id
  FROM public.categories
  ORDER BY created_at ASC
  LIMIT 1;

  SELECT id INTO second_category_id
  FROM public.categories
  ORDER BY created_at ASC
  OFFSET 1
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'offers'
      AND column_name = 'organizer_id'
  )
  INTO has_organizer_id_column;

  DELETE FROM public.leads
  WHERE offer_id IN (
    SELECT id
    FROM public.offers
    WHERE user_id = target_user_id
      AND title LIKE 'TEST MYCAK %'
  );

  DELETE FROM public.offers
  WHERE user_id = target_user_id
    AND title LIKE 'TEST MYCAK %';

  IF has_organizer_id_column THEN
    INSERT INTO public.offers (
      user_id,
      organizer_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      target_organizer_profile_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Opublikowana',
      'Oferta testowa opublikowana dla dashboardu organizatora.',
      ARRAY[7,8,9,10],
      'Warszawa, ul. Testowa 1',
      ST_SetSRID(ST_MakePoint(21.0122, 52.2297), 4326),
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '37 days',
      12,
      'published'
    )
    RETURNING id INTO offer_published_id;

    INSERT INTO public.offers (
      user_id,
      organizer_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      target_organizer_profile_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Oczekująca na Moderację',
      'Oferta testowa oczekująca na moderację.',
      ARRAY[10,11,12],
      'Warszawa, ul. Testowa 2',
      ST_SetSRID(ST_MakePoint(21.0222, 52.2397), 4326),
      CURRENT_DATE + INTERVAL '14 days',
      CURRENT_DATE + INTERVAL '44 days',
      20,
      'pending_review'
    )
    RETURNING id INTO offer_pending_id;

    INSERT INTO public.offers (
      user_id,
      organizer_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      target_organizer_profile_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Szkic',
      'Oferta testowa w statusie szkic.',
      ARRAY[6,7,8],
      'Warszawa, ul. Testowa 3',
      ST_SetSRID(ST_MakePoint(21.0322, 52.2497), 4326),
      CURRENT_DATE + INTERVAL '21 days',
      CURRENT_DATE + INTERVAL '51 days',
      16,
      'draft'
    )
    RETURNING id INTO offer_draft_id;

    INSERT INTO public.offers (
      user_id,
      organizer_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status,
      rejection_reason
    )
    VALUES (
      target_user_id,
      target_organizer_profile_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Odrzucona',
      'Oferta testowa odrzucona przez moderację.',
      ARRAY[9,10,11],
      'Warszawa, ul. Testowa 4',
      ST_SetSRID(ST_MakePoint(21.0422, 52.2597), 4326),
      CURRENT_DATE + INTERVAL '28 days',
      CURRENT_DATE + INTERVAL '58 days',
      10,
      'rejected',
      'Przykładowy powód odrzucenia do testów widoku organizera.'
    )
    RETURNING id INTO offer_rejected_id;

    INSERT INTO public.offers (
      user_id,
      organizer_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      target_organizer_profile_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Archiwalna',
      'Oferta testowa archiwalna.',
      ARRAY[12,13,14],
      'Warszawa, ul. Testowa 5',
      ST_SetSRID(ST_MakePoint(21.0522, 52.2697), 4326),
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE - INTERVAL '1 day',
      0,
      'archived'
    )
    RETURNING id INTO offer_archived_id;
  ELSE
    INSERT INTO public.offers (
      user_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Opublikowana',
      'Oferta testowa opublikowana dla dashboardu organizatora.',
      ARRAY[7,8,9,10],
      'Warszawa, ul. Testowa 1',
      ST_SetSRID(ST_MakePoint(21.0122, 52.2297), 4326),
      CURRENT_DATE + INTERVAL '7 days',
      CURRENT_DATE + INTERVAL '37 days',
      12,
      'published'
    )
    RETURNING id INTO offer_published_id;

    INSERT INTO public.offers (
      user_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Oczekująca na Moderację',
      'Oferta testowa oczekująca na moderację.',
      ARRAY[10,11,12],
      'Warszawa, ul. Testowa 2',
      ST_SetSRID(ST_MakePoint(21.0222, 52.2397), 4326),
      CURRENT_DATE + INTERVAL '14 days',
      CURRENT_DATE + INTERVAL '44 days',
      20,
      'pending_review'
    )
    RETURNING id INTO offer_pending_id;

    INSERT INTO public.offers (
      user_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Szkic',
      'Oferta testowa w statusie szkic.',
      ARRAY[6,7,8],
      'Warszawa, ul. Testowa 3',
      ST_SetSRID(ST_MakePoint(21.0322, 52.2497), 4326),
      CURRENT_DATE + INTERVAL '21 days',
      CURRENT_DATE + INTERVAL '51 days',
      16,
      'draft'
    )
    RETURNING id INTO offer_draft_id;

    INSERT INTO public.offers (
      user_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status,
      rejection_reason
    )
    VALUES (
      target_user_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Odrzucona',
      'Oferta testowa odrzucona przez moderację.',
      ARRAY[9,10,11],
      'Warszawa, ul. Testowa 4',
      ST_SetSRID(ST_MakePoint(21.0422, 52.2597), 4326),
      CURRENT_DATE + INTERVAL '28 days',
      CURRENT_DATE + INTERVAL '58 days',
      10,
      'rejected',
      'Przykładowy powód odrzucenia do testów widoku organizera.'
    )
    RETURNING id INTO offer_rejected_id;

    INSERT INTO public.offers (
      user_id,
      offer_type_id,
      title,
      description,
      ages,
      address,
      location,
      start_date,
      end_date,
      available_spots,
      status
    )
    VALUES (
      target_user_id,
      default_offer_type_id,
      'TEST MYCAK Oferta Archiwalna',
      'Oferta testowa archiwalna.',
      ARRAY[12,13,14],
      'Warszawa, ul. Testowa 5',
      ST_SetSRID(ST_MakePoint(21.0522, 52.2697), 4326),
      CURRENT_DATE - INTERVAL '30 days',
      CURRENT_DATE - INTERVAL '1 day',
      0,
      'archived'
    )
    RETURNING id INTO offer_archived_id;
  END IF;

  IF first_category_id IS NOT NULL THEN
    INSERT INTO public.offer_categories (offer_id, category_id)
    VALUES
      (offer_published_id, first_category_id),
      (offer_pending_id, first_category_id),
        (offer_draft_id, first_category_id),
        (offer_rejected_id, first_category_id),
        (offer_archived_id, first_category_id);
  END IF;

  IF second_category_id IS NOT NULL THEN
    INSERT INTO public.offer_categories (offer_id, category_id)
    VALUES
      (offer_published_id, second_category_id),
      (offer_pending_id, second_category_id),
      (offer_rejected_id, second_category_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.leads (
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
  VALUES
    (
      offer_published_id,
      'Adam',
      8,
      'Anna Kowalska',
      'anna.kowalska@example.com',
      '+48500111222',
      'Chcielibyśmy zapisać dziecko od przyszłego tygodnia.',
      jsonb_build_object('title', 'TEST MYCAK Oferta Opublikowana', 'status', 'published'),
      'submitted'
    ),
    (
      offer_pending_id,
      'Ola',
      11,
      'Karolina Wiśniewska',
      'karolina.wisniewska@example.com',
      '+48666111222',
      'Czy zajęcia będą też online?',
      jsonb_build_object('title', 'TEST MYCAK Oferta Oczekująca na Moderację', 'status', 'pending_review'),
      'contacted'
    );

  RAISE NOTICE 'Dodano testowe dane organizatora dla % (user_id=%)', target_email, target_user_id;
END $$;
