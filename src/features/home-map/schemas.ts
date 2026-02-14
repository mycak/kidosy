import { z } from 'zod';

export const locationDataSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  placeName: z.string().min(1),
});

export const homeMapFiltersSchema = z
  .object({
    min_age: z.number().int().min(0).optional(),
    max_age: z.number().int().min(0).optional(),
    categories: z.array(z.string().uuid()),
    offer_types: z.array(z.string().uuid()),
    location: locationDataSchema.optional(),
    radius_km: z.number().positive().optional(),
    search: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.min_age !== undefined && data.max_age !== undefined) {
        return data.max_age >= data.min_age;
      }
      return true;
    },
    {
      message: 'Maksymalny wiek musi być większy lub równy minimalnemu',
      path: ['max_age'],
    },
  );

export const homeMapSearchParamsSchema = z
  .object({
    min_age: z.coerce.number().int().min(0).optional(),
    max_age: z.coerce.number().int().min(0).optional(),
    categories: z.string().optional(),
    offer_types: z.string().optional(),
    location_lat: z.coerce.number().min(-90).max(90).optional(),
    location_lon: z.coerce.number().min(-180).max(180).optional(),
    radius_km: z.coerce.number().positive().optional(),
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    sort_by: z
      .enum(['distance', 'relevance', 'date_created', 'date_updated'])
      .default('date_created'),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  })
  .refine(
    (data) => {
      if (data.min_age !== undefined && data.max_age !== undefined) {
        return data.max_age >= data.min_age;
      }
      return true;
    },
    {
      message: 'max_age musi być >= min_age',
      path: ['max_age'],
    },
  );

export type HomeMapSearchParams = z.infer<typeof homeMapSearchParamsSchema>;
