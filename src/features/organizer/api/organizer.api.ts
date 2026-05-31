import { supabaseClient } from '@/db/supabase.client';
import type { Tables, TablesInsert, TablesUpdate } from '@/db/database.types';
import type {
  CategoryDto,
  LeadStatus,
  OfferStatus,
  OfferTypeDto,
} from '@/types';
import {
  fetchCategories,
  fetchOfferTypes,
} from '@/features/home-map/api/dictionaries';
import type {
  OrganizerDashboardData,
  OrganizerLeadsQueryOptions,
  OrganizerLeadListItem,
  OrganizerOfferFormValues,
  OrganizerOfferSubmitValues,
  OrganizerOffersQueryOptions,
  OrganizerOfferListItem,
  OrganizerPaginatedResult,
  OrganizerProfileData,
} from './organizer.types';

const FALLBACK_OFFER_TYPE_NAME = 'Nieznany typ';
const DEFAULT_LATITUDE = 52.2297;
const DEFAULT_LONGITUDE = 21.0122;
const DEFAULT_MIN_AGE = 6;
const DEFAULT_MAX_AGE = 12;
const DEFAULT_AVAILABLE_SPOTS = 10;
const MAX_AGE_RANGE_LIMIT = 18;
const RECENT_OFFERS_LIMIT = 5;
const DASHBOARD_SUMMARY_MAX_OFFERS = 500;
const MAIN_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const STORAGE_IMAGES_BUCKET = 'images';
const MAIN_IMAGE_DISPLAY_ORDER = 0;

const DEFAULT_ORGANIZER_OFFERS_QUERY_OPTIONS: OrganizerOffersQueryOptions = {
  status: 'all',
  sortBy: 'updated_at',
  sortOrder: 'desc',
  page: 1,
  perPage: 10,
};

const DEFAULT_ORGANIZER_LEADS_QUERY_OPTIONS: OrganizerLeadsQueryOptions = {
  status: 'all',
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  perPage: 10,
};

const OFFER_STATUSES: readonly OfferStatus[] = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'archived',
] as const;

const LEAD_STATUSES: readonly LeadStatus[] = [
  'submitted',
  'contacted',
  'completed',
  'cancelled',
] as const;

type OfferRow = Tables<'offers'>;
type LeadRow = Tables<'leads'>;
type OfferImageRow = Tables<'offer_images'>;

type OfferTypeRelation =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type OfferWithType = Pick<
  OfferRow,
  | 'id'
  | 'title'
  | 'status'
  | 'available_spots'
  | 'start_date'
  | 'end_date'
  | 'updated_at'
  | 'rejection_reason'
> & {
  offer_type: OfferTypeRelation;
};

function isOfferStatus(value: string): value is OfferStatus {
  return OFFER_STATUSES.includes(value as OfferStatus);
}

function normalizeOfferStatus(value: string): OfferStatus {
  if (isOfferStatus(value)) {
    return value;
  }

  return 'draft';
}

function isLeadStatus(value: string): value is LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus);
}

function normalizeLeadStatus(value: string): LeadStatus {
  if (isLeadStatus(value)) {
    return value;
  }

  return 'submitted';
}

function normalizeOfferTypeName(value: OfferTypeRelation): string {
  if (!value) {
    return FALLBACK_OFFER_TYPE_NAME;
  }

  if (Array.isArray(value)) {
    return value[0]?.name ?? FALLBACK_OFFER_TYPE_NAME;
  }

  return value.name;
}

function buildOfferIdCounterMap(
  offerIds: string[],
  leads: Pick<LeadRow, 'offer_id'>[],
): Record<string, number> {
  const initialCounterMap = offerIds.reduce<Record<string, number>>(
    (accumulator, offerId) => {
      accumulator[offerId] = 0;
      return accumulator;
    },
    {},
  );

  return leads.reduce<Record<string, number>>((accumulator, leadRow) => {
    const currentLeadCount = accumulator[leadRow.offer_id] ?? 0;
    accumulator[leadRow.offer_id] = currentLeadCount + 1;
    return accumulator;
  }, initialCounterMap);
}

function buildAgeRange(minAge: number, maxAge: number): number[] {
  const boundedMinAge = Math.max(1, Math.min(minAge, MAX_AGE_RANGE_LIMIT));
  const boundedMaxAge = Math.max(
    boundedMinAge,
    Math.min(maxAge, MAX_AGE_RANGE_LIMIT),
  );

  return Array.from(
    { length: boundedMaxAge - boundedMinAge + 1 },
    (_, index) => boundedMinAge + index,
  );
}

function parseOfferLocation(locationValue: unknown): {
  latitude: number;
  longitude: number;
} {
  if (
    typeof locationValue === 'object' &&
    locationValue !== null &&
    'coordinates' in locationValue
  ) {
    const coordinates = (locationValue as { coordinates?: unknown })
      .coordinates;

    if (
      Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      return {
        longitude: coordinates[0],
        latitude: coordinates[1],
      };
    }
  }

  return {
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
  };
}

function toOfferListItem(
  offer: OfferWithType,
  leadsCountByOfferId: Record<string, number>,
): OrganizerOfferListItem {
  return {
    id: offer.id,
    title: offer.title,
    status: normalizeOfferStatus(offer.status),
    availableSpots: offer.available_spots,
    startDate: offer.start_date,
    endDate: offer.end_date,
    updatedAt: offer.updated_at,
    rejectionReason: offer.rejection_reason,
    offerTypeName: normalizeOfferTypeName(offer.offer_type),
    leadsCount: leadsCountByOfferId[offer.id] ?? 0,
  };
}

export async function fetchOrganizerOfferTypes(): Promise<OfferTypeDto[]> {
  return fetchOfferTypes();
}

export async function fetchOrganizerCategories(): Promise<CategoryDto[]> {
  return fetchCategories();
}

export async function fetchOrganizerOffers(
  userId: string,
  queryOptions: OrganizerOffersQueryOptions = DEFAULT_ORGANIZER_OFFERS_QUERY_OPTIONS,
): Promise<OrganizerPaginatedResult<OrganizerOfferListItem>> {
  const normalizedPage = Math.max(1, queryOptions.page);
  const normalizedPerPage = Math.max(1, queryOptions.perPage);
  const rangeStart = (normalizedPage - 1) * normalizedPerPage;
  const rangeEnd = rangeStart + normalizedPerPage - 1;

  let offersQuery = supabaseClient
    .from('offers')
    .select(
      'id, title, status, available_spots, start_date, end_date, updated_at, rejection_reason, offer_type:offer_types(name)',
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (queryOptions.status !== 'all') {
    offersQuery = offersQuery.eq('status', queryOptions.status);
  }

  if (queryOptions.sortBy === 'leads_count') {
    offersQuery = offersQuery.order('updated_at', {
      ascending: queryOptions.sortOrder === 'asc',
    });
  } else {
    offersQuery = offersQuery.order(queryOptions.sortBy, {
      ascending: queryOptions.sortOrder === 'asc',
    });
  }

  const {
    data: offers,
    error: offersError,
    count,
  } = await offersQuery.range(rangeStart, rangeEnd);

  if (offersError) {
    throw new Error('Nie udało się pobrać ofert organizatora.');
  }

  const organizerOffers = (offers ?? []) as OfferWithType[];
  const total = count ?? 0;

  if (organizerOffers.length === 0) {
    return {
      data: [],
      pagination: {
        total,
        page: normalizedPage,
        perPage: normalizedPerPage,
        totalPages: Math.ceil(total / normalizedPerPage),
      },
    };
  }

  const offerIds = organizerOffers.map((offer) => offer.id);

  const { data: leadRows, error: leadsError } = await supabaseClient
    .from('leads')
    .select('offer_id')
    .in('offer_id', offerIds);

  if (leadsError) {
    throw new Error('Nie udało się pobrać statystyk zgłoszeń.');
  }

  const leadsCountByOfferId = buildOfferIdCounterMap(offerIds, leadRows ?? []);
  const offersWithLeadCounts = organizerOffers.map((offer) =>
    toOfferListItem(offer, leadsCountByOfferId),
  );

  if (queryOptions.sortBy === 'leads_count') {
    offersWithLeadCounts.sort((leftOffer, rightOffer) => {
      const comparedLeadCount = leftOffer.leadsCount - rightOffer.leadsCount;

      if (queryOptions.sortOrder === 'asc') {
        return comparedLeadCount;
      }

      return comparedLeadCount * -1;
    });
  }

  return {
    data: offersWithLeadCounts,
    pagination: {
      total,
      page: normalizedPage,
      perPage: normalizedPerPage,
      totalPages: Math.ceil(total / normalizedPerPage),
    },
  };
}

export async function fetchOrganizerDashboard(
  userId: string,
): Promise<OrganizerDashboardData> {
  const organizerOffersResponse = await fetchOrganizerOffers(userId, {
    ...DEFAULT_ORGANIZER_OFFERS_QUERY_OPTIONS,
    perPage: DASHBOARD_SUMMARY_MAX_OFFERS,
  });

  const organizerOffers = organizerOffersResponse.data;

  const summary = organizerOffers.reduce(
    (accumulator, organizerOffer) => {
      if (organizerOffer.status === 'draft') {
        accumulator.draftCount += 1;
      }

      if (organizerOffer.status === 'pending_review') {
        accumulator.pendingReviewCount += 1;
      }

      if (organizerOffer.status === 'published') {
        accumulator.publishedCount += 1;
      }

      if (organizerOffer.status === 'rejected') {
        accumulator.rejectedCount += 1;
      }

      if (organizerOffer.status === 'archived') {
        accumulator.archivedCount += 1;
      }

      accumulator.totalLeads += organizerOffer.leadsCount;
      accumulator.totalOffers += 1;

      return accumulator;
    },
    {
      draftCount: 0,
      pendingReviewCount: 0,
      publishedCount: 0,
      rejectedCount: 0,
      archivedCount: 0,
      totalOffers: 0,
      totalLeads: 0,
    },
  );

  return {
    summary,
    recentOffers: organizerOffers.slice(0, RECENT_OFFERS_LIMIT),
  };
}

export async function fetchOrganizerLeads(
  userId: string,
  queryOptions: OrganizerLeadsQueryOptions = DEFAULT_ORGANIZER_LEADS_QUERY_OPTIONS,
): Promise<OrganizerPaginatedResult<OrganizerLeadListItem>> {
  const normalizedPage = Math.max(1, queryOptions.page);
  const normalizedPerPage = Math.max(1, queryOptions.perPage);

  const { data: offers, error: offersError } = await supabaseClient
    .from('offers')
    .select('id, title')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (offersError) {
    throw new Error('Nie udało się pobrać ofert do widoku zgłoszeń.');
  }

  const offerRows = offers ?? [];

  if (offerRows.length === 0) {
    return {
      data: [],
      pagination: {
        total: 0,
        page: normalizedPage,
        perPage: normalizedPerPage,
        totalPages: 0,
      },
    };
  }

  const offerIds = offerRows.map((offer) => offer.id);
  const offerTitleById = offerRows.reduce<Record<string, string>>(
    (accumulator, offerRow) => {
      accumulator[offerRow.id] = offerRow.title;
      return accumulator;
    },
    {},
  );

  const rangeStart = (normalizedPage - 1) * normalizedPerPage;
  const rangeEnd = rangeStart + normalizedPerPage - 1;

  let leadsQuery = supabaseClient
    .from('leads')
    .select(
      'id, offer_id, child_name, child_age, parent_name, parent_email, parent_phone, message, status, created_at',
    )
    .in('offer_id', offerIds);

  if (queryOptions.status !== 'all') {
    leadsQuery = leadsQuery.eq('status', queryOptions.status);
  }

  const sortColumn =
    queryOptions.sortBy === 'child_name' ||
    queryOptions.sortBy === 'parent_name'
      ? queryOptions.sortBy
      : 'created_at';

  leadsQuery = leadsQuery.order(sortColumn, {
    ascending: queryOptions.sortOrder === 'asc',
  });

  const { data: leads, error: leadsError } = await leadsQuery.range(
    rangeStart,
    rangeEnd,
  );

  if (leadsError) {
    throw new Error('Nie udało się pobrać zgłoszeń organizatora.');
  }

  const mappedLeads = (leads ?? []).map((leadRow) => ({
    id: leadRow.id,
    offerId: leadRow.offer_id,
    offerTitle: offerTitleById[leadRow.offer_id] ?? 'Oferta',
    childName: leadRow.child_name,
    childAge: leadRow.child_age,
    parentName: leadRow.parent_name,
    parentEmail: leadRow.parent_email,
    parentPhone: leadRow.parent_phone,
    message: leadRow.message,
    status: normalizeLeadStatus(leadRow.status),
    createdAt: leadRow.created_at,
  }));

  const { count: totalCount, error: countError } = await supabaseClient
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .in('offer_id', offerIds)
    .then((countResponse) => countResponse);

  if (countError) {
    throw new Error('Nie udało się pobrać liczby zgłoszeń.');
  }

  const total = totalCount ?? mappedLeads.length;

  return {
    data: mappedLeads,
    pagination: {
      total,
      page: normalizedPage,
      perPage: normalizedPerPage,
      totalPages: Math.ceil(total / normalizedPerPage),
    },
  };
}

export async function updateOrganizerLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<void> {
  const { error } = await supabaseClient
    .from('leads')
    .update({ status })
    .eq('id', leadId);

  if (error) {
    throw new Error('Nie udało się zaktualizować statusu zgłoszenia.');
  }
}

export async function fetchOrganizerProfile(
  userId: string,
): Promise<OrganizerProfileData | null> {
  const { data, error } = await supabaseClient
    .from('organizer_profiles')
    .select('company_name, phone, email_public')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error('Nie udało się pobrać profilu organizatora.');
  }

  if (!data) {
    return null;
  }

  return {
    companyName: data.company_name,
    phone: data.phone,
    emailPublic: data.email_public,
  };
}

export async function upsertOrganizerProfile(
  userId: string,
  profile: OrganizerProfileData,
): Promise<OrganizerProfileData> {
  const profileInsert: TablesInsert<'organizer_profiles'> = {
    user_id: userId,
    company_name: profile.companyName,
    phone: profile.phone,
    email_public: profile.emailPublic,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseClient
    .from('organizer_profiles')
    .upsert(profileInsert, {
      onConflict: 'user_id',
    })
    .select('company_name, phone, email_public')
    .single();

  if (error) {
    throw new Error('Nie udało się zapisać profilu organizatora.');
  }

  return {
    companyName: data.company_name,
    phone: data.phone,
    emailPublic: data.email_public,
  };
}

export async function fetchOrganizerOfferFormValues(
  userId: string,
  offerId: string,
): Promise<OrganizerOfferFormValues | null> {
  const { data: offer, error: offerError } = await supabaseClient
    .from('offers')
    .select(
      'id, title, description, offer_type_id, ages, address, location, start_date, end_date, available_spots, status',
    )
    .eq('id', offerId)
    .eq('user_id', userId)
    .maybeSingle();

  if (offerError) {
    throw new Error('Nie udało się pobrać oferty do edycji.');
  }

  if (!offer) {
    return null;
  }

  const { data: categoryRows, error: categoriesError } = await supabaseClient
    .from('offer_categories')
    .select('category_id')
    .eq('offer_id', offerId);

  if (categoriesError) {
    throw new Error('Nie udało się pobrać kategorii oferty.');
  }

  const ageValues =
    offer.ages.length > 0 ? offer.ages : [DEFAULT_MIN_AGE, DEFAULT_MAX_AGE];
  const minAge = Math.min(...ageValues);
  const maxAge = Math.max(...ageValues);
  const location = parseOfferLocation(offer.location);

  return {
    title: offer.title,
    description: offer.description,
    offerTypeId: offer.offer_type_id,
    categoryIds: (categoryRows ?? []).map(
      (categoryRow) => categoryRow.category_id,
    ),
    minAge,
    maxAge,
    address: offer.address,
    latitude: location.latitude,
    longitude: location.longitude,
    startDate: offer.start_date,
    endDate: offer.end_date,
    availableSpots: offer.available_spots,
    status: normalizeOfferStatus(offer.status),
  };
}

function toOfferInsertPayload(
  userId: string,
  values: OrganizerOfferFormValues,
): TablesInsert<'offers'> {
  return {
    user_id: userId,
    title: values.title,
    description: values.description,
    offer_type_id: values.offerTypeId,
    ages: buildAgeRange(values.minAge, values.maxAge),
    address: values.address,
    location: `SRID=4326;POINT(${values.longitude} ${values.latitude})`,
    start_date: values.startDate,
    end_date: values.endDate,
    available_spots: values.availableSpots,
    status: values.status,
  };
}

function toOfferUpdatePayload(
  values: OrganizerOfferFormValues,
): TablesUpdate<'offers'> {
  return {
    title: values.title,
    description: values.description,
    offer_type_id: values.offerTypeId,
    ages: buildAgeRange(values.minAge, values.maxAge),
    address: values.address,
    location: `SRID=4326;POINT(${values.longitude} ${values.latitude})`,
    start_date: values.startDate,
    end_date: values.endDate,
    available_spots: values.availableSpots,
    status: values.status,
    updated_at: new Date().toISOString(),
  };
}

type MainOfferImageRecord = Pick<OfferImageRow, 'id' | 'storage_path'>;

function normalizeFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (!extension || extension.length > 10) {
    return 'jpg';
  }

  return extension;
}

function buildMainOfferImageObjectPath(
  offerId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const extension = normalizeFileExtension(fileName);
  return `offers/${offerId}/main-${timestamp}.${extension}`;
}

function toStoredImagePath(objectPath: string): string {
  return `${STORAGE_IMAGES_BUCKET}/${objectPath}`;
}

function toBucketObjectPath(storagePath: string): string {
  const storageBucketPrefix = `${STORAGE_IMAGES_BUCKET}/`;
  if (storagePath.startsWith(storageBucketPrefix)) {
    return storagePath.slice(storageBucketPrefix.length);
  }

  return storagePath;
}

async function fetchOfferMainImages(
  offerId: string,
): Promise<MainOfferImageRecord[]> {
  const { data, error } = await supabaseClient
    .from('offer_images')
    .select('id, storage_path')
    .eq('offer_id', offerId)
    .eq('display_order', MAIN_IMAGE_DISPLAY_ORDER)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error('Nie udało się pobrać głównego zdjęcia oferty.');
  }

  return (data ?? []) as MainOfferImageRecord[];
}

async function upsertMainOfferImage(
  offerId: string,
  storagePath: string,
): Promise<void> {
  const existingMainImages = await fetchOfferMainImages(offerId);
  if (existingMainImages.length > 0) {
    const existingMainImageIds = existingMainImages.map((image) => image.id);
    const { error: deleteMainImageRowsError } = await supabaseClient
      .from('offer_images')
      .delete()
      .in('id', existingMainImageIds);

    if (deleteMainImageRowsError) {
      throw new Error(
        'Nie udało się odświeżyć danych głównego zdjęcia oferty.',
      );
    }
  }

  const { error: insertMainImageError } = await supabaseClient
    .from('offer_images')
    .insert({
      offer_id: offerId,
      storage_path: storagePath,
      display_order: MAIN_IMAGE_DISPLAY_ORDER,
    });

  if (insertMainImageError) {
    throw new Error('Nie udało się zapisać głównego zdjęcia oferty.');
  }
}

async function replaceMainOfferImage(
  offerId: string,
  mainImageFile: File | undefined,
): Promise<void> {
  if (!mainImageFile) {
    return;
  }

  if (mainImageFile.size > MAIN_IMAGE_MAX_SIZE_BYTES) {
    throw new Error('Zdjęcie główne nie może przekraczać 5 MB.');
  }

  const existingMainImages = await fetchOfferMainImages(offerId);
  const existingPaths = existingMainImages.map((image) => image.storage_path);
  const mainImageObjectPath = buildMainOfferImageObjectPath(
    offerId,
    mainImageFile.name,
  );

  const { error: uploadError } = await supabaseClient.storage
    .from(STORAGE_IMAGES_BUCKET)
    .upload(mainImageObjectPath, mainImageFile, {
      upsert: false,
      contentType: mainImageFile.type || undefined,
    });

  if (uploadError) {
    throw new Error('Nie udało się wysłać głównego zdjęcia do magazynu.');
  }

  const nextStoragePath = toStoredImagePath(mainImageObjectPath);

  try {
    await upsertMainOfferImage(offerId, nextStoragePath);
  } catch (error) {
    await supabaseClient.storage
      .from(STORAGE_IMAGES_BUCKET)
      .remove([mainImageObjectPath]);
    throw error;
  }

  const objectPathsToDelete = existingPaths
    .map((existingPath) => toBucketObjectPath(existingPath))
    .filter((existingPath) => existingPath !== mainImageObjectPath);

  if (objectPathsToDelete.length > 0) {
    await supabaseClient.storage
      .from(STORAGE_IMAGES_BUCKET)
      .remove(objectPathsToDelete);
  }
}

async function replaceOfferCategories(
  offerId: string,
  categoryIds: string[],
): Promise<void> {
  const { error: deleteError } = await supabaseClient
    .from('offer_categories')
    .delete()
    .eq('offer_id', offerId);

  if (deleteError) {
    throw new Error('Nie udało się odświeżyć kategorii oferty.');
  }

  if (categoryIds.length === 0) {
    return;
  }

  const categoryRows: TablesInsert<'offer_categories'>[] = categoryIds.map(
    (categoryId) => ({
      offer_id: offerId,
      category_id: categoryId,
    }),
  );

  const { error: insertError } = await supabaseClient
    .from('offer_categories')
    .insert(categoryRows);

  if (insertError) {
    throw new Error('Nie udało się zapisać kategorii oferty.');
  }
}

export async function createOrganizerOffer(
  userId: string,
  values: OrganizerOfferSubmitValues,
): Promise<string> {
  const { mainImageFile, ...offerFormValues } = values;
  const offerInsertPayload = toOfferInsertPayload(userId, offerFormValues);

  const { data: offer, error: offerError } = await supabaseClient
    .from('offers')
    .insert(offerInsertPayload)
    .select('id')
    .single();

  if (offerError) {
    throw new Error('Nie udało się utworzyć oferty.');
  }

  await replaceOfferCategories(offer.id, offerFormValues.categoryIds);
  await replaceMainOfferImage(offer.id, mainImageFile);

  return offer.id;
}

export async function updateOrganizerOffer(
  userId: string,
  offerId: string,
  values: OrganizerOfferSubmitValues,
): Promise<void> {
  const { mainImageFile, ...offerFormValues } = values;
  const offerUpdatePayload = toOfferUpdatePayload(offerFormValues);

  const { error: offerError } = await supabaseClient
    .from('offers')
    .update(offerUpdatePayload)
    .eq('id', offerId)
    .eq('user_id', userId);

  if (offerError) {
    throw new Error('Nie udało się zaktualizować oferty.');
  }

  await replaceOfferCategories(offerId, offerFormValues.categoryIds);
  await replaceMainOfferImage(offerId, mainImageFile);
}

export function buildDefaultOfferFormValues(
  offerTypes: OfferTypeDto[],
): OrganizerOfferFormValues {
  return {
    title: '',
    description: '',
    offerTypeId: offerTypes[0]?.id ?? '',
    categoryIds: [],
    minAge: DEFAULT_MIN_AGE,
    maxAge: DEFAULT_MAX_AGE,
    address: '',
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    startDate: '',
    endDate: '',
    availableSpots: DEFAULT_AVAILABLE_SPOTS,
    status: 'draft',
  };
}
