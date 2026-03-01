import type { CategoryDto, OfferTypeDto } from '@/types';
import { supabaseClient } from '@/db/supabase.client';

export async function fetchCategories(): Promise<CategoryDto[]> {
  const { data, error } = await supabaseClient
    .from('categories')
    .select('id, name, slug, description')
    .order('name', { ascending: true });

  if (error) {
    throw new Error('Nie udało się pobrać kategorii');
  }

  return data ?? [];
}

export async function fetchOfferTypes(): Promise<OfferTypeDto[]> {
  const { data, error } = await supabaseClient
    .from('offer_types')
    .select('id, name, slug')
    .order('name', { ascending: true });

  if (error) {
    throw new Error('Nie udało się pobrać typów ofert');
  }

  return data ?? [];
}
