import type { CategoryDto, OfferTypeDto } from '@/types';

const MOCK_CATEGORIES: CategoryDto[] = [
  {
    id: 'cat-1',
    name: 'Edukacyjne',
    slug: 'educational',
    description: 'Zajęcia edukacyjne i naukowe',
  },
  {
    id: 'cat-2',
    name: 'Sport',
    slug: 'sport',
    description: 'Zajęcia sportowe i ruchowe',
  },
  {
    id: 'cat-3',
    name: 'Artystyczne',
    slug: 'artistic',
    description: 'Zajęcia artystyczne i kreatywne',
  },
  {
    id: 'cat-4',
    name: 'Języki obce',
    slug: 'languages',
    description: 'Nauka języków obcych',
  },
];

const MOCK_OFFER_TYPES: OfferTypeDto[] = [
  {
    id: 'type-1',
    name: 'Zajęcia cykliczne',
    slug: 'cyclic',
  },
  {
    id: 'type-2',
    name: 'Kolonie',
    slug: 'camps',
  },
  {
    id: 'type-3',
    name: 'Półkolonie',
    slug: 'day-camps',
  },
  {
    id: 'type-4',
    name: 'Obozy',
    slug: 'training-camps',
  },
];

export async function fetchCategories(): Promise<CategoryDto[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_CATEGORIES;
}

export async function fetchOfferTypes(): Promise<OfferTypeDto[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_OFFER_TYPES;
}
