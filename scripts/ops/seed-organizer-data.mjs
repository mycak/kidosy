import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const TARGETS = ['local', 'prod'];
const DEFAULT_TARGET = 'local';
const ENV_FILE_BY_TARGET = {
  local: '.env.local',
  prod: '.env',
};
const TARGET_EMAIL = 'mycak@wp.pl';
const DEFAULT_SEED_PASSWORD = 'MycakProdSeed!2026';
const SEED_TITLE_PREFIX = 'TEST MYCAK %';
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function removeWrappingQuotes(rawValue) {
  if (!rawValue) {
    return rawValue;
  }

  const hasDoubleQuotes =
    rawValue.startsWith('"') && rawValue.endsWith('"') && rawValue.length >= 2;
  const hasSingleQuotes =
    rawValue.startsWith("'") && rawValue.endsWith("'") && rawValue.length >= 2;

  if (hasDoubleQuotes || hasSingleQuotes) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function parseEnvFileContent(envContent) {
  const parsed = {};
  const lines = envContent.split(/\r?\n/u);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const envKey = trimmedLine.slice(0, separatorIndex).trim();
    const envValue = removeWrappingQuotes(
      trimmedLine.slice(separatorIndex + 1).trim(),
    );

    if (envKey) {
      parsed[envKey] = envValue;
    }
  }

  return parsed;
}

function loadEnvFromFile(filePath) {
  if (!existsSync(filePath)) {
    throw new Error(`Brak pliku env: ${filePath}`);
  }

  const fileContent = readFileSync(filePath, 'utf8');
  const parsedEnv = parseEnvFileContent(fileContent);

  for (const [envKey, envValue] of Object.entries(parsedEnv)) {
    process.env[envKey] = envValue;
  }

  return parsedEnv;
}

function resolveLocalSupabaseCliEnv() {
  try {
    const statusOutput = execSync('npx supabase status -o env', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return parseEnvFileContent(statusOutput);
  } catch {
    return {};
  }
}

function getTargetArg() {
  const targetFlag = process.argv.find((argument) =>
    argument.startsWith('--target='),
  );
  const parsedTarget = targetFlag?.split('=')[1] ?? DEFAULT_TARGET;

  if (!TARGETS.includes(parsedTarget)) {
    throw new Error(
      `Nieobsługiwany target "${parsedTarget}". Użyj: ${TARGETS.join(', ')}`,
    );
  }

  return parsedTarget;
}

function buildDateFromOffset(offsetDays) {
  return new Date(Date.now() + offsetDays * DAY_IN_MILLISECONDS)
    .toISOString()
    .slice(0, 10);
}

async function ensureRequiredTablesExist(supabaseClient) {
  const requiredTables = [
    'organizer_profiles',
    'offer_types',
    'categories',
    'offers',
    'offer_categories',
    'leads',
  ];

  for (const tableName of requiredTables) {
    const { error } = await supabaseClient
      .from(tableName)
      .select('id')
      .limit(1);

    if (error?.code === 'PGRST205') {
      throw new Error(
        `Brak tabeli public.${tableName}. Najpierw wdroż migracje na tym środowisku, potem uruchom seed.`,
      );
    }

    if (error) {
      const detailedError =
        error.message || JSON.stringify(error, null, 2) || 'unknown error';
      throw new Error(
        `Nie udało się sprawdzić tabeli public.${tableName}: ${detailedError}`,
      );
    }
  }
}

async function hasOrganizerIdColumn(supabaseClient) {
  const { error } = await supabaseClient
    .from('offers')
    .select('organizer_id')
    .limit(1);

  if (!error) {
    return true;
  }

  if (error.code === '42703' || error.code === 'PGRST204') {
    return false;
  }

  throw new Error(
    `Nie udało się sprawdzić kolumny organizer_id w offers: ${error.message || JSON.stringify(error, null, 2)}`,
  );
}

async function hasPublicUsersTable(supabaseClient) {
  const { error } = await supabaseClient.from('users').select('id').limit(1);

  if (!error) {
    return true;
  }

  if (error.code === 'PGRST205') {
    return false;
  }

  throw new Error(
    `Nie udało się sprawdzić tabeli public.users: ${error.message || JSON.stringify(error, null, 2)}`,
  );
}

async function resolveOrCreateAuthUser(supabaseClient) {
  const listUsersResult = await supabaseClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listUsersResult.error) {
    throw listUsersResult.error;
  }

  let targetUser = listUsersResult.data.users.find(
    (authUser) => authUser.email?.toLowerCase() === TARGET_EMAIL,
  );

  if (!targetUser) {
    const createUserResult = await supabaseClient.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: process.env.SEED_TEMP_PASSWORD || DEFAULT_SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { role: 'organizer' },
    });

    if (createUserResult.error) {
      throw createUserResult.error;
    }

    targetUser = createUserResult.data.user;
  }

  if (!targetUser?.id) {
    throw new Error(`Nie udało się ustalić auth user ID dla: ${TARGET_EMAIL}`);
  }

  return targetUser.id;
}

async function seedOrganizerData() {
  const target = getTargetArg();
  const envFileName = ENV_FILE_BY_TARGET[target];
  const envFilePath = path.resolve(process.cwd(), envFileName);
  const loadedEnv = loadEnvFromFile(envFilePath);
  const localSupabaseEnv =
    target === 'local' ? resolveLocalSupabaseCliEnv() : {};

  const resolvedSupabaseUrl =
    target === 'local'
      ? localSupabaseEnv.API_URL || loadedEnv.VITE_SUPABASE_URL
      : loadedEnv.VITE_SUPABASE_URL;
  const resolvedServiceRoleKey =
    target === 'local'
      ? localSupabaseEnv.SERVICE_ROLE_KEY || loadedEnv.SUPABASE_SERVICE_ROLE_KEY
      : loadedEnv.SUPABASE_SERVICE_ROLE_KEY;

  const missingKeys = [];
  if (!resolvedSupabaseUrl) {
    missingKeys.push('VITE_SUPABASE_URL/API_URL');
  }
  if (!resolvedServiceRoleKey) {
    missingKeys.push('SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY');
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Brakuje konfiguracji env dla: ${missingKeys.join(', ')} (target: ${target})`,
    );
  }

  const supabaseClient = createClient(
    resolvedSupabaseUrl,
    resolvedServiceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );

  await ensureRequiredTablesExist(supabaseClient);

  const targetUserId = await resolveOrCreateAuthUser(supabaseClient);

  const shouldSyncPublicUsersTable = await hasPublicUsersTable(supabaseClient);
  if (shouldSyncPublicUsersTable) {
    const { error: usersUpsertError } = await supabaseClient
      .from('users')
      .upsert({ id: targetUserId, email: TARGET_EMAIL }, { onConflict: 'id' });

    if (usersUpsertError) {
      throw usersUpsertError;
    }
  }

  const { data: organizerProfile, error: organizerUpsertError } =
    await supabaseClient
      .from('organizer_profiles')
      .upsert(
        {
          user_id: targetUserId,
          company_name: 'TEST MYCAK Organizator',
          phone: '+48111222333',
          email_public: TARGET_EMAIL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select('id')
      .single();

  if (organizerUpsertError) {
    throw organizerUpsertError;
  }

  const shouldIncludeOrganizerId = await hasOrganizerIdColumn(supabaseClient);

  const { data: offerTypes, error: offerTypesError } = await supabaseClient
    .from('offer_types')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (offerTypesError) {
    throw offerTypesError;
  }

  if (!offerTypes?.[0]?.id) {
    throw new Error('Brak rekordów w tabeli public.offer_types');
  }

  const defaultOfferTypeId = offerTypes[0].id;

  const { data: categories, error: categoriesError } = await supabaseClient
    .from('categories')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(2);

  if (categoriesError) {
    throw categoriesError;
  }

  if (!categories || categories.length < 2) {
    throw new Error('Potrzebne są minimum 2 rekordy w public.categories');
  }

  const [firstCategoryId, secondCategoryId] = categories.map(
    (category) => category.id,
  );

  const { data: existingOffers, error: existingOffersError } =
    await supabaseClient
      .from('offers')
      .select('id')
      .eq('user_id', targetUserId)
      .like('title', SEED_TITLE_PREFIX);

  if (existingOffersError) {
    throw existingOffersError;
  }

  const existingOfferIds = (existingOffers ?? []).map((offer) => offer.id);

  if (existingOfferIds.length > 0) {
    const { error: leadsDeleteError } = await supabaseClient
      .from('leads')
      .delete()
      .in('offer_id', existingOfferIds);

    if (leadsDeleteError) {
      throw leadsDeleteError;
    }

    const { error: offersDeleteError } = await supabaseClient
      .from('offers')
      .delete()
      .in('id', existingOfferIds);

    if (offersDeleteError) {
      throw offersDeleteError;
    }
  }

  const offersPayload = [
    {
      user_id: targetUserId,
      ...(shouldIncludeOrganizerId
        ? { organizer_id: organizerProfile.id }
        : {}),
      offer_type_id: defaultOfferTypeId,
      title: 'TEST MYCAK Oferta Opublikowana',
      description: 'Oferta testowa opublikowana dla dashboardu organizatora.',
      ages: [7, 8, 9, 10],
      address: 'Warszawa, ul. Testowa 1',
      location: 'SRID=4326;POINT(21.0122 52.2297)',
      start_date: buildDateFromOffset(7),
      end_date: buildDateFromOffset(37),
      available_spots: 12,
      status: 'published',
    },
    {
      user_id: targetUserId,
      ...(shouldIncludeOrganizerId
        ? { organizer_id: organizerProfile.id }
        : {}),
      offer_type_id: defaultOfferTypeId,
      title: 'TEST MYCAK Oferta Oczekująca na Moderację',
      description: 'Oferta testowa oczekująca na moderację.',
      ages: [10, 11, 12],
      address: 'Warszawa, ul. Testowa 2',
      location: 'SRID=4326;POINT(21.0222 52.2397)',
      start_date: buildDateFromOffset(14),
      end_date: buildDateFromOffset(44),
      available_spots: 20,
      status: 'pending_review',
    },
    {
      user_id: targetUserId,
      ...(shouldIncludeOrganizerId
        ? { organizer_id: organizerProfile.id }
        : {}),
      offer_type_id: defaultOfferTypeId,
      title: 'TEST MYCAK Oferta Szkic',
      description: 'Oferta testowa w statusie szkic.',
      ages: [6, 7, 8],
      address: 'Warszawa, ul. Testowa 3',
      location: 'SRID=4326;POINT(21.0322 52.2497)',
      start_date: buildDateFromOffset(21),
      end_date: buildDateFromOffset(51),
      available_spots: 16,
      status: 'draft',
    },
    {
      user_id: targetUserId,
      ...(shouldIncludeOrganizerId
        ? { organizer_id: organizerProfile.id }
        : {}),
      offer_type_id: defaultOfferTypeId,
      title: 'TEST MYCAK Oferta Odrzucona',
      description: 'Oferta testowa odrzucona przez moderację.',
      ages: [9, 10, 11],
      address: 'Warszawa, ul. Testowa 4',
      location: 'SRID=4326;POINT(21.0422 52.2597)',
      start_date: buildDateFromOffset(28),
      end_date: buildDateFromOffset(58),
      available_spots: 10,
      status: 'rejected',
      rejection_reason:
        'Przykładowy powód odrzucenia do testów widoku organizera.',
    },
    {
      user_id: targetUserId,
      ...(shouldIncludeOrganizerId
        ? { organizer_id: organizerProfile.id }
        : {}),
      offer_type_id: defaultOfferTypeId,
      title: 'TEST MYCAK Oferta Archiwalna',
      description: 'Oferta testowa archiwalna.',
      ages: [12, 13, 14],
      address: 'Warszawa, ul. Testowa 5',
      location: 'SRID=4326;POINT(21.0522 52.2697)',
      start_date: buildDateFromOffset(-30),
      end_date: buildDateFromOffset(-1),
      available_spots: 0,
      status: 'archived',
    },
  ];

  const { data: insertedOffers, error: offersInsertError } =
    await supabaseClient
      .from('offers')
      .insert(offersPayload)
      .select('id, title, status');

  if (offersInsertError) {
    throw offersInsertError;
  }

  const publishedOffer = insertedOffers.find(
    (offer) => offer.status === 'published',
  );
  const pendingOffer = insertedOffers.find(
    (offer) => offer.status === 'pending_review',
  );

  if (!publishedOffer || !pendingOffer) {
    throw new Error('Nie udało się znaleźć utworzonych ofert testowych');
  }

  const { error: offerCategoriesError } = await supabaseClient
    .from('offer_categories')
    .insert([
      { offer_id: publishedOffer.id, category_id: firstCategoryId },
      { offer_id: publishedOffer.id, category_id: secondCategoryId },
      { offer_id: pendingOffer.id, category_id: firstCategoryId },
    ]);

  if (offerCategoriesError) {
    throw offerCategoriesError;
  }

  const { error: leadsInsertError } = await supabaseClient
    .from('leads')
    .insert([
      {
        offer_id: publishedOffer.id,
        child_name: 'Anna Test',
        child_age: 9,
        parent_name: 'Jan Kowalski',
        parent_email: 'rodzic1@example.com',
        parent_phone: '+48500100100',
        message: 'Chciałbym zapisać dziecko od przyszłego tygodnia.',
        offer_snapshot: { id: publishedOffer.id, title: publishedOffer.title },
        status: 'submitted',
      },
      {
        offer_id: publishedOffer.id,
        child_name: 'Marek Test',
        child_age: 10,
        parent_name: 'Ewa Nowak',
        parent_email: 'rodzic2@example.com',
        parent_phone: '+48500100200',
        message: 'Proszę o kontakt telefoniczny po 16:00.',
        offer_snapshot: { id: publishedOffer.id, title: publishedOffer.title },
        status: 'contacted',
      },
    ]);

  if (leadsInsertError) {
    throw leadsInsertError;
  }

  console.log('✅ Seed completed successfully');
  console.log(`Target: ${target}`);
  console.log(`Env file: ${envFileName}`);
  console.log(`User ID: ${targetUserId}`);
  console.log(`Organizer profile ID: ${organizerProfile?.id ?? 'n/a'}`);
  console.log(`Inserted offers: ${insertedOffers.length}`);
  console.log(`Published offer ID: ${publishedOffer.id}`);
}

seedOrganizerData().catch((error) => {
  console.error('❌ Seed failed');
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(JSON.stringify(error, null, 2));
  }
  process.exit(1);
});
