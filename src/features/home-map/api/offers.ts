import type {
  CategoryDto,
  OfferListQueryDto,
  OfferScheduleInputDto,
  OfferTypeDto,
  PaginatedResponseDto,
  PublicOfferListItemDto,
  PublicOrganizerDto,
} from '@/types';
import { supabaseClient } from '@/db/supabase.client';

type MaybeArray<T> = T | T[];

type RawLocationData = {
  coordinates?: [number, number];
};

type RawCategoryLink = {
  category?: MaybeArray<CategoryDto> | null;
};

type RawOfferImage = {
  id: string;
  storage_path: string;
  display_order: number;
};

type RawOfferSchedule = OfferScheduleInputDto;

type RawOfferRecord = {
  id: string;
  title: string;
  description: string;
  ages: number[] | null;
  address: string;
  start_date: string;
  end_date: string;
  available_spots: number;
  created_at: string;
  updated_at: string;
  offer_type?: MaybeArray<OfferTypeDto> | null;
  categories?: RawCategoryLink[] | null;
  location?: RawLocationData | null;
  organizer?: MaybeArray<PublicOrganizerDto> | null;
  images?: RawOfferImage[] | null;
  schedules?: RawOfferSchedule[] | null;
};

function normalizeRelationalValue<T>(
  value: MaybeArray<T> | null | undefined,
): T | undefined {
  if (!value) {
    return undefined;
  }

  return Array.isArray(value) ? value[0] : value;
}

export async function fetchOffers(
  filters: OfferListQueryDto,
): Promise<PaginatedResponseDto<PublicOfferListItemDto>> {
  const page = filters.page || 1;
  const perPage = filters.per_page || 20;
  const offset = (page - 1) * perPage;

  let query = supabaseClient
    .from('offers')
    .select(
      `
      id,
      title,
      description,
      ages,
      address,
      start_date,
      end_date,
      available_spots,
      created_at,
      updated_at,
      location,
      offer_type:offer_types(id, name, slug),
      categories:offer_categories(
        category:categories(id, name, slug, description)
      ),
      organizer:organizer_profiles!organizer_id(
        id,
        company_name,
        phone,
        email_public
      ),
      images:offer_images(id, storage_path, display_order),
      schedules:offer_schedules(
        day_of_week,
        start_time,
        end_time
      )
    `,
      { count: 'exact' },
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (filters.min_age !== undefined || filters.max_age !== undefined) {
    const minAge = filters.min_age ?? 0;
    const maxAge = filters.max_age ?? 100;
    query = query.filter(
      'ages',
      'cs',
      JSON.stringify(
        Array.from({ length: maxAge - minAge + 1 }, (_, i) => minAge + i),
      ),
    );
  }

  if (filters.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    );
  }

  const {
    data: offers,
    count,
    error,
  } = await query.range(offset, offset + perPage - 1);

  if (error) {
    console.error('Error fetching offers:', error);
    return {
      data: [],
      pagination: { total: 0, page, per_page: perPage, total_pages: 0 },
    };
  }

  const rawOffers = (offers ?? []) as unknown as RawOfferRecord[];

  const transformedOffers: PublicOfferListItemDto[] = rawOffers.map((offer) => {
    const normalizedOfferType = normalizeRelationalValue(offer.offer_type);
    const normalizedOrganizer = normalizeRelationalValue(offer.organizer);
    const normalizedCategories: CategoryDto[] =
      offer.categories
        ?.map((categoryLink) => normalizeRelationalValue(categoryLink.category))
        .filter(
          (category): category is CategoryDto => category !== undefined,
        ) ?? [];

    return {
      id: offer.id,
      title: offer.title,
      description: offer.description,
      ages: offer.ages || [],
      address: offer.address,
      start_date: offer.start_date,
      end_date: offer.end_date,
      available_spots: offer.available_spots,
      created_at: offer.created_at,
      updated_at: offer.updated_at,
      offer_type: normalizedOfferType || {
        id: '',
        name: 'Nieznany typ',
        slug: 'unknown',
      },
      categories: normalizedCategories,
      location: {
        type: 'Point' as const,
        coordinates: offer.location?.coordinates ?? [0, 0],
      },
      organizer: normalizedOrganizer || {
        id: '',
        company_name: 'Organizator',
        phone: '',
        email_public: '',
      },
      images: (offer.images ?? []).map((image) => ({
        id: image.id,
        storage_path: image.storage_path,
        display_order: image.display_order,
      })),
      schedules: (offer.schedules ?? []).map((schedule) => ({
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
      })),
    };
  });

  const total = count || 0;
  const totalPages = Math.ceil(total / perPage);

  return {
    data: transformedOffers,
    pagination: { total, page, per_page: perPage, total_pages: totalPages },
  };
}
