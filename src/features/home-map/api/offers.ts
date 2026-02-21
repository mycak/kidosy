import type {
  OfferListQueryDto,
  PaginatedResponseDto,
  PublicOfferListItemDto,
} from '@/types';
import { supabaseClient } from '@/db/supabase.client';

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

  const transformedOffers: PublicOfferListItemDto[] = (offers || []).map(
    (offer: any) => ({
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
      offer_type: Array.isArray(offer.offer_type)
        ? offer.offer_type[0]
        : offer.offer_type,
      categories:
        offer.categories?.map((c: any) =>
          Array.isArray(c.category) ? c.category[0] : c.category,
        ) || [],
      location: {
        type: 'Point' as const,
        coordinates: offer.location?.coordinates || [0, 0],
      },
      organizer: Array.isArray(offer.organizer)
        ? offer.organizer[0]
        : offer.organizer,
      images:
        offer.images?.map((img: any) => ({
          id: img.id,
          storage_path: img.storage_path,
          display_order: img.display_order,
        })) || [],
      schedules:
        offer.schedules?.map((s: any) => ({
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        })) || [],
    }),
  );

  const total = count || 0;
  const totalPages = Math.ceil(total / perPage);

  return {
    data: transformedOffers,
    pagination: { total, page, per_page: perPage, total_pages: totalPages },
  };
}
