import type {
  OfferListQueryDto,
  PaginatedResponseDto,
  PublicOfferListItemDto,
} from '@/types';

const MOCK_OFFERS: PublicOfferListItemDto[] = [
  {
    id: '1',
    title: 'Zajęcia z programowania dla dzieci',
    description: 'Nauka podstaw programowania w Scratch i Python',
    ages: [8, 9, 10, 11, 12],
    address: 'ul. Marszałkowska 123, Warszawa',
    start_date: '2026-03-01',
    end_date: '2026-06-30',
    available_spots: 10,
    created_at: '2026-02-01T10:00:00Z',
    updated_at: '2026-02-01T10:00:00Z',
    offer_type: {
      id: 'type-1',
      name: 'Zajęcia cykliczne',
      slug: 'cyclic',
    },
    categories: [
      {
        id: 'cat-1',
        name: 'Edukacyjne',
        slug: 'educational',
        description: 'Zajęcia edukacyjne',
      },
    ],
    location: {
      type: 'Point',
      coordinates: [21.0122, 52.2297],
    },
    organizer: {
      id: 'org-1',
      company_name: 'CodeKids Academy',
      phone: '+48123456789',
      email_public: 'contact@codekids.pl',
    },
    images: [],
    schedules: [
      {
        day_of_week: 1,
        start_time: '16:00',
        end_time: '17:30',
      },
    ],
  },
  {
    id: '2',
    title: 'Piłka nożna dla dzieci',
    description: 'Treningi piłkarskie dla młodzieży',
    ages: [6, 7, 8, 9, 10],
    address: 'ul. Sportowa 45, Warszawa',
    start_date: '2026-03-15',
    end_date: '2026-06-15',
    available_spots: 15,
    created_at: '2026-02-05T12:00:00Z',
    updated_at: '2026-02-05T12:00:00Z',
    offer_type: {
      id: 'type-1',
      name: 'Zajęcia cykliczne',
      slug: 'cyclic',
    },
    categories: [
      {
        id: 'cat-2',
        name: 'Sport',
        slug: 'sport',
        description: 'Zajęcia sportowe',
      },
    ],
    location: {
      type: 'Point',
      coordinates: [21.0422, 52.2397],
    },
    organizer: {
      id: 'org-2',
      company_name: 'Klub Sportowy Junior',
      phone: '+48987654321',
      email_public: 'info@ksjunior.pl',
    },
    images: [],
    schedules: [
      {
        day_of_week: 3,
        start_time: '17:00',
        end_time: '18:30',
      },
      {
        day_of_week: 5,
        start_time: '17:00',
        end_time: '18:30',
      },
    ],
  },
];

export async function fetchOffers(
  filters: OfferListQueryDto,
): Promise<PaginatedResponseDto<PublicOfferListItemDto>> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  let filteredOffers = [...MOCK_OFFERS];

  if (filters.min_age !== undefined || filters.max_age !== undefined) {
    filteredOffers = filteredOffers.filter((offer) => {
      const minAge = filters.min_age ?? 0;
      const maxAge = filters.max_age ?? 100;
      return offer.ages.some((age) => age >= minAge && age <= maxAge);
    });
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filteredOffers = filteredOffers.filter(
      (offer) =>
        offer.title.toLowerCase().includes(searchLower) ||
        offer.description.toLowerCase().includes(searchLower),
    );
  }

  const page = filters.page || 1;
  const perPage = filters.per_page || 20;
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedOffers = filteredOffers.slice(startIndex, endIndex);

  return {
    data: paginatedOffers,
    pagination: {
      total: filteredOffers.length,
      page,
      per_page: perPage,
      total_pages: Math.ceil(filteredOffers.length / perPage),
    },
  };
}
