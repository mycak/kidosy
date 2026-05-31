import { z } from 'zod';

export interface OfferDetailsResponse {
  id: string;
  title: string;
  description: string;
  ages: number[];
  address: string;
  start_date: string;
  end_date: string;
  available_spots: number;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
  offer_type: OfferTypeDto;
  categories: CategoryDto[];
  location: GeoPointDto;
  organizer: PublicOrganizerDto;
  images: OfferImageDto[];
  schedules: OfferScheduleDto[];
}

export interface OfferTypeDto {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface GeoPointDto {
  type: 'Point';
  coordinates: [number, number];
}

export interface PublicOrganizerDto {
  id: string;
  company_name: string;
  phone: string;
  email_public: string;
}

export interface OfferImageDto {
  id: string;
  storage_path: string;
  display_order: number;
}

export interface OfferScheduleDto {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export type OfferStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';

export interface CreateLeadRequest {
  email: string;
  phone: string;
  name: string;
  children: ChildInput[];
  contact_preference: ContactPreference;
  additional_message?: string;
  consent_communication: boolean;
  consent_marketing: boolean;
}

export interface ChildInput {
  name: string;
  age: number;
  interests?: string[];
}

export type ContactPreference = 'email' | 'phone' | 'sms';

export interface CreateLeadResponse {
  lead: LeadDto;
  leadIds: string[];
  message: string;
}

export interface LeadDto {
  id: string;
  offer_id: string;
  parent_email: string;
  parent_name: string;
  parent_phone: string;
  children_count: number;
  status: LeadStatus;
  contact_preference: ContactPreference;
  created_at: string;
  updated_at: string;
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'converted'
  | 'rejected'
  | 'archived';

const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

export const childInputSchema = z.object({
  name: z
    .string()
    .min(2, 'Imię dziecka musi mieć min. 2 znaki')
    .max(100, 'Imię dziecka musi mieć max. 100 znaków'),
  age: z
    .number()
    .int('Wiek musi być liczbą całkowitą')
    .min(1, 'Wiek musi być większy niż 0')
    .max(100, 'Wiek musi być mniejszy niż 100'),
  interests: z.array(z.string()).optional(),
});

export const createLeadSchema = z.object({
  email: z
    .string()
    .email('Nieprawidłowy format adresu e-mail')
    .max(255, 'E-mail może mieć max. 255 znaków'),
  phone: z
    .string()
    .regex(PHONE_REGEX, 'Nieprawidłowy format numeru telefonu (+48123456789)'),
  name: z
    .string()
    .min(2, 'Imię i nazwisko musi mieć min. 2 znaki')
    .max(100, 'Imię i nazwisko musi mieć max. 100 znaków'),
  children: z
    .array(childInputSchema)
    .min(1, 'Musisz dodać przynajmniej jedno dziecko')
    .max(10, 'Maksymalnie 10 dzieci'),
  contact_preference: z.enum(['email', 'phone', 'sms'], {
    message: 'Wybierz sposób kontaktu',
  }),
  additional_message: z
    .string()
    .max(500, 'Wiadomość może mieć max. 500 znaków')
    .optional(),
  consent_communication: z.boolean().refine((val) => val === true, {
    message: 'Zgoda na komunikację jest wymagana',
  }),
  consent_marketing: z.boolean(),
});

export type CreateLeadFormData = z.infer<typeof createLeadSchema>;
