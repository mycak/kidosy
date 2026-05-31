import { z } from 'zod';

const MIN_AGE_LIMIT = 1;
const MAX_AGE_LIMIT = 18;
const MIN_AVAILABLE_SPOTS = 0;

export const organizerOfferFormSchema = z
  .object({
    title: z.string().min(3, 'Tytuł musi mieć minimum 3 znaki.'),
    description: z.string().min(20, 'Opis musi mieć minimum 20 znaków.'),
    offerTypeId: z.string().min(1, 'Wybierz poprawny typ oferty.'),
    categoryIds: z
      .array(z.string().min(1, 'Wybierz poprawną kategorię.'))
      .min(1, 'Wybierz co najmniej jedną kategorię.'),
    minAge: z
      .number()
      .int('Minimalny wiek musi być liczbą całkowitą.')
      .min(MIN_AGE_LIMIT)
      .max(MAX_AGE_LIMIT),
    maxAge: z
      .number()
      .int('Maksymalny wiek musi być liczbą całkowitą.')
      .min(MIN_AGE_LIMIT)
      .max(MAX_AGE_LIMIT),
    address: z.string().min(5, 'Podaj poprawny adres.'),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    startDate: z.string().min(1, 'Wybierz datę rozpoczęcia.'),
    endDate: z.string().min(1, 'Wybierz datę zakończenia.'),
    availableSpots: z.number().int().min(MIN_AVAILABLE_SPOTS),
    status: z.enum([
      'draft',
      'pending_review',
      'published',
      'rejected',
      'archived',
    ]),
  })
  .superRefine((values, context) => {
    if (values.minAge > values.maxAge) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxAge'],
        message: 'Maksymalny wiek nie może być mniejszy niż minimalny.',
      });
    }

    if (values.startDate > values.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message:
          'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.',
      });
    }
  });

export type OrganizerOfferFormSchema = z.infer<typeof organizerOfferFormSchema>;
