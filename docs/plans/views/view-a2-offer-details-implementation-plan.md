# View A2: Szczegóły Oferty - Plan Implementacji

## 1. Przegląd widoku

**Widok:** Szczegóły Oferty (Offer Details)
**Ścieżka:** `/offers/:id`
**Rola użytkownika:** Anonimowy rodzic/opiekun
**Główny cel:** Wyświetlenie pełnych informacji o ofercie zajęć i umożliwienie zgłoszenia dziecka

### Powiązane User Stories (PRD)

- **US-008:** Przeglądanie szczegółów oferty
- **US-009:** Zgłoszenie dziecka na zajęcia
- **US-010:** Potwierdzenie wysłania zgłoszenia

### Wykorzystywane endpointy

- **GET /api/v1/offers/:offerId** - Pobieranie szczegółów oferty
- **POST /api/v1/offers/:offerId/leads** - Tworzenie zgłoszenia (lead)

---

## 2. Routing i nawigacja

### TanStack Router Configuration

```typescript
// src/routes/offers/$offerId.tsx
import { createFileRoute } from '@tanstack/react-router';
import { offerDetailsQueryOptions } from '@/features/offers/queries';

export const Route = createFileRoute('/offers/$offerId')({
  loader: async ({ context, params }) => {
    // Prefetch offer details
    await context.queryClient.ensureQueryData(
      offerDetailsQueryOptions(params.offerId),
    );
  },
  component: OfferDetailsPage,
  pendingComponent: OfferDetailsLoadingSkeleton,
  errorComponent: OfferDetailsErrorBoundary,
  meta: () => [
    {
      title: 'Szczegóły oferty',
    },
  ],
});
```

### Nawigacja i breadcrumbs

```typescript
// Breadcrumbs structure
Home > Oferty > [Nazwa oferty]

// Navigation state preservation
// Zachowuje filtry przy powrocie do mapy
const navigate = useNavigate()
const { search } = useSearch()

// Powrót z zachowaniem filtrów
const handleBackToMap = () => {
  navigate({
    to: '/',
    search: (prev) => prev, // Preserve filters
  })
}
```

---

## 3. Typy TypeScript

### API Response Types

```typescript
// Based on view-implementation-plan.md

interface OfferDetailsResponse {
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

interface OfferTypeDto {
  id: string;
  name: string;
  slug: string;
}

interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string;
}

interface GeoPointDto {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

interface PublicOrganizerDto {
  id: string;
  company_name: string;
  phone: string;
  email_public: string;
}

interface OfferImageDto {
  id: string;
  storage_path: string;
  display_order: number;
}

interface OfferScheduleDto {
  id: string;
  day_of_week: number; // 0-6 (0=Sunday)
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  is_active: boolean;
}

type OfferStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'archived';
```

### Lead Form Types

```typescript
// Based on leads-create-implementation-plan.md

interface CreateLeadRequest {
  email: string;
  phone: string;
  name: string;
  children: ChildInput[];
  contact_preference: ContactPreference;
  additional_message?: string;
  consent_communication: boolean;
  consent_marketing: boolean;
}

interface ChildInput {
  name: string;
  age: number;
  interests?: string[];
}

type ContactPreference = 'email' | 'phone' | 'sms';

interface CreateLeadResponse {
  lead: LeadDto;
  message: string;
}

interface LeadDto {
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

type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected' | 'archived';
```

### Validation Schemas (Zod)

```typescript
import { z } from 'zod';

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
    errorMap: () => ({ message: 'Wybierz sposób kontaktu' }),
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
```

---

## 4. Komponenty UI

### Struktura komponentów

```
src/features/offers/
├── components/
│   ├── OfferDetailsPage.tsx           # Main page component
│   ├── OfferHeader.tsx                # Title, status badge, organizer
│   ├── OfferImageGallery.tsx          # Image slider with lightbox
│   ├── OfferDetails.tsx               # Details sections
│   ├── OfferLocationMap.tsx           # Google Maps with marker
│   ├── OfferScheduleTable.tsx         # Weekly schedule display
│   ├── OrganizerInfo.tsx              # Contact information
│   ├── LeadForm.tsx                   # Lead submission form
│   ├── LeadFormSuccess.tsx            # Success confirmation
│   ├── OfferStatusBadge.tsx           # Status indicator
│   ├── Breadcrumbs.tsx                # Navigation breadcrumbs
│   └── OfferDetailsLoadingSkeleton.tsx # Loading state
├── queries/
│   ├── useOfferDetails.ts             # Query hook for offer details
│   └── useCreateLead.ts               # Mutation hook for lead creation
└── utils/
    ├── formatters.ts                  # Date, time formatters
    └── validators.ts                  # Additional validation helpers
```

### 4.1 OfferDetailsPage (Main Component)

```typescript
// src/features/offers/components/OfferDetailsPage.tsx
import { useParams } from '@tanstack/react-router'
import { useOfferDetails } from '../queries/useOfferDetails'
import { useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'

export function OfferDetailsPage() {
  const { offerId } = useParams({ from: '/offers/$offerId' })
  const { data: offer, isLoading, error } = useOfferDetails(offerId)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)

  if (isLoading) {
    return <OfferDetailsLoadingSkeleton />
  }

  if (error) {
    throw error // Caught by error boundary
  }

  if (!offer) {
    return <NotFoundState />
  }

  const sanitizedDescription = DOMPurify.sanitize(offer.description)

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs offerTitle={offer.title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <OfferHeader
            title={offer.title}
            status={offer.status}
            organizerName={offer.organizer.company_name}
          />

          <OfferImageGallery images={offer.images} />

          <section className="prose max-w-none">
            <h2>Opis zajęć</h2>
            <div
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          </section>

          <OfferDetails offer={offer} />

          <OfferScheduleTable schedules={offer.schedules} />

          <OfferLocationMap
            location={offer.location}
            address={offer.address}
          />
        </div>

        {/* Sidebar - 1 column */}
        <aside className="space-y-6">
          <OrganizerInfo organizer={offer.organizer} />

          {!leadSubmitted ? (
            <div className="sticky top-4">
              {!showLeadForm ? (
                <button
                  onClick={() => setShowLeadForm(true)}
                  className="w-full btn-primary btn-lg"
                  aria-label="Zgłoś dziecko na zajęcia"
                >
                  Zgłoś dziecko
                </button>
              ) : (
                <LeadForm
                  offerId={offer.id}
                  onSuccess={() => {
                    setLeadSubmitted(true)
                    setShowLeadForm(false)
                  }}
                  onCancel={() => setShowLeadForm(false)}
                />
              )}
            </div>
          ) : (
            <LeadFormSuccess
              organizerName={offer.organizer.company_name}
              organizerEmail={offer.organizer.email_public}
            />
          )}
        </aside>
      </div>
    </div>
  )
}
```

### 4.2 OfferHeader Component

```typescript
// src/features/offers/components/OfferHeader.tsx
import { OfferStatusBadge } from './OfferStatusBadge'
import type { OfferStatus } from '../types'

interface OfferHeaderProps {
  title: string
  status: OfferStatus
  organizerName: string
}

export function OfferHeader({ title, status, organizerName }: OfferHeaderProps) {
  return (
    <header className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {title}
        </h1>
        <OfferStatusBadge status={status} />
      </div>
      <p className="text-gray-600">
        Organizator: <span className="font-medium">{organizerName}</span>
      </p>
    </header>
  )
}
```

### 4.3 OfferImageGallery Component

```typescript
// src/features/offers/components/OfferImageGallery.tsx
import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { OfferImageDto } from '../types'

interface OfferImageGalleryProps {
  images: OfferImageDto[]
}

export function OfferImageGallery({ images }: OfferImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  if (!images || images.length === 0) {
    return (
      <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Brak zdjęć</p>
      </div>
    )
  }

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order)
  const currentImage = sortedImages[currentIndex]

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1))
  }

  const getImageUrl = (storagePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${storagePath}`
  }

  return (
    <>
      <div className="relative group">
        <img
          src={getImageUrl(currentImage.storage_path)}
          alt={`Zdjęcie oferty ${currentIndex + 1} z ${sortedImages.length}`}
          className="w-full aspect-video object-cover rounded-lg cursor-pointer"
          onClick={() => setLightboxOpen(true)}
          loading="eager"
        />

        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Poprzednie zdjęcie"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Następne zdjęcie"
            >
              <ChevronRight />
            </button>
          </>
        )}

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {sortedImages.length}
        </div>
      </div>

      {/* Thumbnails */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto py-2">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-20 h-20 rounded border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={getImageUrl(image.storage_path)}
                alt={`Miniatura ${index + 1}`}
                className="w-full h-full object-cover rounded"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-screen-lg">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 btn-icon z-10"
            aria-label="Zamknij"
          >
            <X />
          </button>

          <img
            src={getImageUrl(currentImage.storage_path)}
            alt={`Zdjęcie oferty ${currentIndex + 1}`}
            className="w-full h-auto max-h-[80vh] object-contain"
          />

          {sortedImages.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button onClick={handlePrevious} className="btn-icon">
                <ChevronLeft />
              </button>
              <span className="text-sm">
                {currentIndex + 1} / {sortedImages.length}
              </span>
              <button onClick={handleNext} className="btn-icon">
                <ChevronRight />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
```

### 4.4 OfferDetails Component

```typescript
// src/features/offers/components/OfferDetails.tsx
import { Calendar, Users, Clock, MapPin } from 'lucide-react'
import { formatDate, formatDateRange } from '../utils/formatters'
import type { OfferDetailsResponse } from '../types'

interface OfferDetailsProps {
  offer: OfferDetailsResponse
}

export function OfferDetails({ offer }: OfferDetailsProps) {
  const ageRange = getAgeRange(offer.ages)
  const dateRange = formatDateRange(offer.start_date, offer.end_date)

  return (
    <section className="bg-white rounded-lg border p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-4">Szczegóły oferty</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DetailItem
          icon={<Users className="w-5 h-5" />}
          label="Przedział wiekowy"
          value={ageRange}
        />

        <DetailItem
          icon={<Calendar className="w-5 h-5" />}
          label="Termin"
          value={dateRange}
        />

        <DetailItem
          icon={<Clock className="w-5 h-5" />}
          label="Typ zajęć"
          value={offer.offer_type.name}
        />

        <DetailItem
          icon={<MapPin className="w-5 h-5" />}
          label="Lokalizacja"
          value={offer.address}
        />
      </div>

      {offer.available_spots !== null && offer.available_spots !== undefined && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">Dostępne miejsca</p>
          <p className="text-2xl font-bold text-primary">
            {offer.available_spots === 0 ? (
              <span className="text-red-600">Brak wolnych miejsc</span>
            ) : (
              `${offer.available_spots} ${
                offer.available_spots === 1
                  ? 'miejsce'
                  : offer.available_spots < 5
                  ? 'miejsca'
                  : 'miejsc'
              }`
            )}
          </p>
        </div>
      )}

      {offer.categories.length > 0 && (
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600 mb-2">Kategorie</p>
          <div className="flex flex-wrap gap-2">
            {offer.categories.map((category) => (
              <span
                key={category.id}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
              >
                {category.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

interface DetailItemProps {
  icon: React.ReactNode
  label: string
  value: string
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}

function getAgeRange(ages: number[]): string {
  if (!ages || ages.length === 0) return 'Nie określono'
  const min = Math.min(...ages)
  const max = Math.max(...ages)
  return min === max ? `${min} lat` : `${min}–${max} lat`
}
```

### 4.5 OfferScheduleTable Component

```typescript
// src/features/offers/components/OfferScheduleTable.tsx
import type { OfferScheduleDto } from '../types'

interface OfferScheduleTableProps {
  schedules: OfferScheduleDto[]
}

const DAY_NAMES = [
  'Niedziela',
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
]

export function OfferScheduleTable({ schedules }: OfferScheduleTableProps) {
  if (!schedules || schedules.length === 0) {
    return null
  }

  const activeSchedules = schedules
    .filter((s) => s.is_active)
    .sort((a, b) => a.day_of_week - b.day_of_week)

  if (activeSchedules.length === 0) {
    return null
  }

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-2xl font-bold mb-4">Harmonogram zajęć</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-4 font-semibold">Dzień tygodnia</th>
              <th className="text-left py-2 px-4 font-semibold">Godziny</th>
            </tr>
          </thead>
          <tbody>
            {activeSchedules.map((schedule) => (
              <tr key={schedule.id} className="border-b last:border-0">
                <td className="py-3 px-4">
                  {DAY_NAMES[schedule.day_of_week]}
                </td>
                <td className="py-3 px-4">
                  {formatTime(schedule.start_time)} – {formatTime(schedule.end_time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function formatTime(timeString: string): string {
  // HH:MM:SS -> HH:MM
  return timeString.substring(0, 5)
}
```

### 4.6 OfferLocationMap Component

```typescript
// src/features/offers/components/OfferLocationMap.tsx
import { useEffect, useRef } from 'react'
import type { GeoPointDto } from '../types'

interface OfferLocationMapProps {
  location: GeoPointDto
  address: string
}

export function OfferLocationMap({ location, address }: OfferLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || !window.google) return

    const [lng, lat] = location.coordinates
    const position = { lat, lng }

    // Initialize map
    const map = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    })

    // Add marker
    new google.maps.Marker({
      position,
      map,
      title: address,
    })

    googleMapRef.current = map
  }, [location, address])

  return (
    <section className="bg-white rounded-lg border p-6">
      <h2 className="text-2xl font-bold mb-4">Lokalizacja</h2>

      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <span className="text-gray-600">Adres:</span>
          <span className="font-medium">{address}</span>
        </div>

        <div
          ref={mapRef}
          className="w-full h-64 md:h-96 rounded-lg overflow-hidden"
          role="img"
          aria-label={`Mapa lokalizacji: ${address}`}
        />

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${location.coordinates[1]},${location.coordinates[0]}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-primary hover:underline"
        >
          Otwórz w Google Maps
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </section>
  )
}
```

### 4.7 OrganizerInfo Component

```typescript
// src/features/offers/components/OrganizerInfo.tsx
import { Mail, Phone } from 'lucide-react'
import type { PublicOrganizerDto } from '../types'

interface OrganizerInfoProps {
  organizer: PublicOrganizerDto
}

export function OrganizerInfo({ organizer }: OrganizerInfoProps) {
  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <h3 className="text-xl font-bold">Organizator</h3>

      <div className="space-y-3">
        <p className="font-medium text-lg">{organizer.company_name}</p>

        <div className="space-y-2">
          <a
            href={`mailto:${organizer.email_public}`}
            className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
          >
            <Mail className="w-4 h-4" />
            <span className="text-sm">{organizer.email_public}</span>
          </a>

          <a
            href={`tel:${organizer.phone}`}
            className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
          >
            <Phone className="w-4 h-4" />
            <span className="text-sm">{organizer.phone}</span>
          </a>
        </div>
      </div>
    </div>
  )
}
```

### 4.8 LeadForm Component

```typescript
// src/features/offers/components/LeadForm.tsx
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { useCreateLead } from '../queries/useCreateLead'
import { createLeadSchema, type CreateLeadFormData } from '../types'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

interface LeadFormProps {
  offerId: string
  onSuccess: () => void
  onCancel: () => void
}

export function LeadForm({ offerId, onSuccess, onCancel }: LeadFormProps) {
  const createLeadMutation = useCreateLead()
  const [childrenCount, setChildrenCount] = useState(1)

  const form = useForm({
    defaultValues: {
      email: '',
      phone: '',
      name: '',
      children: [{ name: '', age: 0, interests: [] }],
      contact_preference: 'email' as const,
      additional_message: '',
      consent_communication: false,
      consent_marketing: false,
    } as CreateLeadFormData,
    validatorAdapter: zodValidator,
    validators: {
      onChange: createLeadSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await createLeadMutation.mutateAsync({
          offerId,
          data: value,
        })
        onSuccess()
      } catch (error) {
        // Error handled by mutation
        console.error('Lead submission failed:', error)
      }
    },
  })

  const addChild = () => {
    if (childrenCount < 10) {
      setChildrenCount((prev) => prev + 1)
      form.setFieldValue('children', [
        ...form.state.values.children,
        { name: '', age: 0, interests: [] },
      ])
    }
  }

  const removeChild = (index: number) => {
    if (childrenCount > 1) {
      setChildrenCount((prev) => prev - 1)
      const newChildren = form.state.values.children.filter((_, i) => i !== index)
      form.setFieldValue('children', newChildren)
    }
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-xl font-bold mb-4">Zgłoś dziecko na zajęcia</h3>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        {/* Parent Information */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">Dane rodzica/opiekuna</h4>

          <form.Field name="name">
            {(field) => (
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Imię i nazwisko <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full input"
                  aria-required="true"
                  aria-describedby={field.state.meta.errors.length > 0 ? 'name-error' : undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <p id="name-error" className="text-sm text-red-600 mt-1">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full input"
                  aria-required="true"
                  aria-describedby={field.state.meta.errors.length > 0 ? 'email-error' : undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <p id="email-error" className="text-sm text-red-600 mt-1">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium mb-1">
                  Telefon <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder="+48123456789"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="w-full input"
                  aria-required="true"
                  aria-describedby={field.state.meta.errors.length > 0 ? 'phone-error' : undefined}
                />
                {field.state.meta.errors.length > 0 && (
                  <p id="phone-error" className="text-sm text-red-600 mt-1">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="contact_preference">
            {(field) => (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Preferowany sposób kontaktu <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {['email', 'phone', 'sms'].map((pref) => (
                    <label key={pref} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="contact_preference"
                        value={pref}
                        checked={field.state.value === pref}
                        onChange={(e) => field.handleChange(e.target.value as any)}
                        className="radio"
                      />
                      <span className="text-sm">
                        {pref === 'email' ? 'E-mail' : pref === 'phone' ? 'Telefon' : 'SMS'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </form.Field>
        </div>

        {/* Children Information */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Dane dziecka/dzieci</h4>
            {childrenCount < 10 && (
              <button
                type="button"
                onClick={addChild}
                className="btn-secondary btn-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Dodaj dziecko
              </button>
            )}
          </div>

          {Array.from({ length: childrenCount }).map((_, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-medium">Dziecko {index + 1}</h5>
                {childrenCount > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChild(index)}
                    className="text-red-600 hover:text-red-700"
                    aria-label={`Usuń dziecko ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form.Field name={`children[${index}].name` as any}>
                {(field) => (
                  <div>
                    <label htmlFor={`child-name-${index}`} className="block text-sm font-medium mb-1">
                      Imię dziecka <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`child-name-${index}`}
                      type="text"
                      value={field.state.value || ''}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full input"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              <form.Field name={`children[${index}].age` as any}>
                {(field) => (
                  <div>
                    <label htmlFor={`child-age-${index}`} className="block text-sm font-medium mb-1">
                      Wiek dziecka <span className="text-red-500">*</span>
                    </label>
                    <input
                      id={`child-age-${index}`}
                      type="number"
                      min="1"
                      max="100"
                      value={field.state.value || ''}
                      onChange={(e) => field.handleChange(Number(e.target.value))}
                      onBlur={field.handleBlur}
                      className="w-full input"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {field.state.meta.errors[0]}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>
            </div>
          ))}
        </div>

        {/* Additional Message */}
        <form.Field name="additional_message">
          {(field) => (
            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-1">
                Dodatkowa wiadomość (opcjonalnie)
              </label>
              <textarea
                id="message"
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                rows={3}
                maxLength={500}
                className="w-full input"
                placeholder="Możesz dodać dodatkowe informacje lub pytania..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {(field.state.value || '').length} / 500 znaków
              </p>
            </div>
          )}
        </form.Field>

        {/* Consents */}
        <div className="space-y-3 pt-4 border-t">
          <form.Field name="consent_communication">
            {(field) => (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  className="checkbox mt-1"
                  aria-required="true"
                />
                <span className="text-sm">
                  Wyrażam zgodę na kontakt w sprawie tej oferty{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>
            )}
          </form.Field>

          <form.Field name="consent_marketing">
            {(field) => (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  className="checkbox mt-1"
                />
                <span className="text-sm">
                  Wyrażam zgodę na otrzymywanie informacji marketingowych
                </span>
              </label>
            )}
          </form.Field>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={createLeadMutation.isPending || !form.state.isValid}
            className="btn-primary flex-1"
          >
            {createLeadMutation.isPending ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={createLeadMutation.isPending}
            className="btn-secondary"
          >
            Anuluj
          </button>
        </div>

        {createLeadMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <p className="text-sm text-red-800">
              Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
```

### 4.9 LeadFormSuccess Component

```typescript
// src/features/offers/components/LeadFormSuccess.tsx
import { CheckCircle, Mail, Phone } from 'lucide-react'

interface LeadFormSuccessProps {
  organizerName: string
  organizerEmail: string
}

export function LeadFormSuccess({ organizerName, organizerEmail }: LeadFormSuccessProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
      <div className="flex items-start gap-3">
        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-2">
          <h3 className="font-bold text-green-900">
            Dziękujemy za zgłoszenie!
          </h3>
          <p className="text-sm text-green-800">
            Organizator <strong>{organizerName}</strong> skontaktuje się z Tobą wkrótce.
          </p>
          <p className="text-sm text-green-800">
            Wysłaliśmy również potwierdzenie na Twój adres e-mail.
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-green-200 space-y-2">
        <p className="text-sm font-medium text-green-900">
          Dane kontaktowe organizatora:
        </p>
        <div className="flex items-center gap-2 text-sm text-green-800">
          <Mail className="w-4 h-4" />
          <a href={`mailto:${organizerEmail}`} className="hover:underline">
            {organizerEmail}
          </a>
        </div>
      </div>
    </div>
  )
}
```

### 4.10 OfferStatusBadge Component

```typescript
// src/features/offers/components/OfferStatusBadge.tsx
import type { OfferStatus } from '../types'

interface OfferStatusBadgeProps {
  status: OfferStatus
}

const STATUS_CONFIG: Record<OfferStatus, { label: string; className: string }> = {
  draft: {
    label: 'Szkic',
    className: 'bg-gray-100 text-gray-800',
  },
  pending_review: {
    label: 'Oczekuje',
    className: 'bg-yellow-100 text-yellow-800',
  },
  published: {
    label: 'Opublikowana',
    className: 'bg-green-100 text-green-800',
  },
  rejected: {
    label: 'Odrzucona',
    className: 'bg-red-100 text-red-800',
  },
  archived: {
    label: 'Archiwalna',
    className: 'bg-gray-100 text-gray-600',
  },
}

export function OfferStatusBadge({ status }: OfferStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
```

### 4.11 Breadcrumbs Component

```typescript
// src/features/offers/components/Breadcrumbs.tsx
import { Link } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbsProps {
  offerTitle: string
}

export function Breadcrumbs({ offerTitle }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
      <Link
        to="/"
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
      >
        <Home className="w-4 h-4" />
        <span>Strona główna</span>
      </Link>

      <ChevronRight className="w-4 h-4 text-gray-400" />

      <span className="text-gray-900 font-medium truncate max-w-xs">
        {offerTitle}
      </span>
    </nav>
  )
}
```

### 4.12 Loading Skeleton

```typescript
// src/features/offers/components/OfferDetailsLoadingSkeleton.tsx
export function OfferDetailsLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="h-5 bg-gray-200 rounded w-48 mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="h-10 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-1/3" />
          </div>

          {/* Image */}
          <div className="aspect-video bg-gray-200 rounded-lg" />

          {/* Description */}
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>

          {/* Details */}
          <div className="border rounded-lg p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="border rounded-lg p-6 space-y-3">
            <div className="h-6 bg-gray-200 rounded w-1/2" />
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-2/3" />
          </div>

          <div className="h-12 bg-gray-200 rounded-lg" />
        </aside>
      </div>
    </div>
  )
}
```

---

## 5. Data Fetching & State Management

### 5.1 TanStack Query Hooks

```typescript
// src/features/offers/queries/useOfferDetails.ts
import { queryOptions, useQuery } from '@tanstack/react-query';
import { supabase } from '@/db/supabase.client';
import type { OfferDetailsResponse } from '../types';

export const offerDetailsQueryOptions = (offerId: string) =>
  queryOptions({
    queryKey: ['offers', offerId] as const,
    queryFn: async (): Promise<OfferDetailsResponse> => {
      const { data, error } = await supabase
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
          status,
          created_at,
          updated_at,
          location,
          offer_type:offer_types(id, name, slug),
          categories:offer_categories(
            category:categories(id, name, slug, description)
          ),
          organizer:organizer_profiles(
            id,
            company_name,
            phone,
            email_public
          ),
          images:offer_images(id, storage_path, display_order),
          schedules:offer_schedules(
            id,
            day_of_week,
            start_time,
            end_time,
            is_active
          )
        `,
        )
        .eq('id', offerId)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          throw new Error('Oferta nie została znaleziona');
        }
        throw new Error('Nie udało się pobrać szczegółów oferty');
      }

      // Transform data to match DTO
      return {
        ...data,
        offer_type: Array.isArray(data.offer_type)
          ? data.offer_type[0]
          : data.offer_type,
        categories: data.categories.map((c: any) => c.category),
        organizer: Array.isArray(data.organizer)
          ? data.organizer[0]
          : data.organizer,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

export const useOfferDetails = (offerId: string) => {
  return useQuery(offerDetailsQueryOptions(offerId));
};
```

```typescript
// src/features/offers/queries/useCreateLead.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/db/supabase.client';
import type { CreateLeadRequest, CreateLeadResponse } from '../types';

interface CreateLeadParams {
  offerId: string;
  data: CreateLeadRequest;
}

export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      offerId,
      data,
    }: CreateLeadParams): Promise<CreateLeadResponse> => {
      const { data: lead, error } = await supabase.rpc('create_lead', {
        p_offer_id: offerId,
        p_parent_email: data.email,
        p_parent_phone: data.phone,
        p_parent_name: data.name,
        p_children: JSON.stringify(data.children),
        p_contact_preference: data.contact_preference,
        p_additional_message: data.additional_message,
        p_consent_communication: data.consent_communication,
        p_consent_marketing: data.consent_marketing,
      });

      if (error) {
        throw new Error(error.message || 'Nie udało się wysłać zgłoszenia');
      }

      return lead;
    },
    onSuccess: (data, variables) => {
      // Invalidate offer details query to refresh available spots
      queryClient.invalidateQueries({
        queryKey: ['offers', variables.offerId],
      });
    },
    meta: {
      errorMessage: 'Nie udało się wysłać zgłoszenia. Spróbuj ponownie.',
    },
  });
};
```

### 5.2 Zustand Store (UI State)

```typescript
// src/features/offers/store/offerDetailsStore.ts
import { create } from 'zustand';

interface OfferDetailsState {
  showLeadForm: boolean;
  leadSubmitted: boolean;
  currentImageIndex: number;
  lightboxOpen: boolean;

  setShowLeadForm: (show: boolean) => void;
  setLeadSubmitted: (submitted: boolean) => void;
  setCurrentImageIndex: (index: number) => void;
  setLightboxOpen: (open: boolean) => void;
  resetState: () => void;
}

export const useOfferDetailsStore = create<OfferDetailsState>((set) => ({
  showLeadForm: false,
  leadSubmitted: false,
  currentImageIndex: 0,
  lightboxOpen: false,

  setShowLeadForm: (show) => set({ showLeadForm: show }),
  setLeadSubmitted: (submitted) => set({ leadSubmitted: submitted }),
  setCurrentImageIndex: (index) => set({ currentImageIndex: index }),
  setLightboxOpen: (open) => set({ lightboxOpen: open }),
  resetState: () =>
    set({
      showLeadForm: false,
      leadSubmitted: false,
      currentImageIndex: 0,
      lightboxOpen: false,
    }),
}));
```

---

## 6. Utilities & Formatters

```typescript
// src/features/offers/utils/formatters.ts
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

export const formatDate = (dateString: string): string => {
  try {
    return format(parseISO(dateString), 'd MMMM yyyy', { locale: pl });
  } catch {
    return dateString;
  }
};

export const formatDateRange = (startDate: string, endDate: string): string => {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);

    return `${format(start, 'd MMMM yyyy', { locale: pl })} – ${format(end, 'd MMMM yyyy', { locale: pl })}`;
  } catch {
    return `${startDate} – ${endDate}`;
  }
};

export const formatTime = (timeString: string): string => {
  return timeString.substring(0, 5);
};
```

---

## 7. Error Handling

```typescript
// src/features/offers/components/OfferDetailsErrorBoundary.tsx
import { useRouteError, Link } from '@tanstack/react-router'
import { AlertTriangle, Home } from 'lucide-react'

export function OfferDetailsErrorBoundary() {
  const error = useRouteError() as Error

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center space-y-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />

        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Nie można załadować oferty
          </h1>
          <p className="text-gray-600">
            {error.message === 'Oferta nie została znaleziona'
              ? 'Oferta, której szukasz, nie istnieje lub została usunięta.'
              : 'Wystąpił błąd podczas ładowania szczegółów oferty.'}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            to="/"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    </div>
  )
}
```

---

## 8. Accessibility (WCAG 2.1 AA)

### Keyboard Navigation

- **Tab order:** Logical flow through header → images → content → form
- **Focus indicators:** Visible focus rings on all interactive elements
- **Keyboard shortcuts:**
  - Arrow keys for image gallery navigation
  - Escape key to close lightbox
  - Enter/Space to submit form

### Screen Readers

- Semantic HTML: `<header>`, `<section>`, `<aside>`, `<nav>`
- ARIA labels for all icons and buttons
- ARIA-describedby for form errors
- Alt text for all images
- Focus trap in lightbox modal

### Color Contrast

- Text contrast ratio: Minimum 4.5:1
- Button contrast: Minimum 3:1
- Error messages: Red with sufficient contrast

### Form Accessibility

- All inputs have associated `<label>` elements
- Required fields marked visually and with `aria-required`
- Error messages linked with `aria-describedby`
- Group-related fields with `<fieldset>` and `<legend>`

---

## 9. Security

### Input Validation

- Zod schema validation on client-side
- Sanitization of HTML content with DOMPurify
- Email format validation (RFC 5322)
- Phone number format validation (international)

### XSS Prevention

- React auto-escapes content by default
- DOMPurify for user-generated HTML (description)
- No `eval()` or `innerHTML` usage (except sanitized)

### CSRF Protection

- CSRF token in POST requests (handled by Supabase)
- SameSite cookies
- HTTPS only

### Rate Limiting

- Maximum 3 lead submissions per IP per day
- Implemented on backend via RLS and triggers

---

## 10. Performance Optimization

### Image Optimization

- Lazy loading for gallery thumbnails
- Eager loading for main image
- WebP format preferred
- Responsive images with `srcset`

### Code Splitting

- Route-based code splitting with TanStack Router
- Dynamic imports for heavy components (map, lightbox)

### Caching Strategy

- TanStack Query caching (5 min stale time)
- Browser caching for static assets
- Service worker (future enhancement)

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

---

## 11. Implementation Workflow

### Phase 1: Setup & Routing (1 day)

- [ ] Create route file `/offers/$offerId.tsx`
- [ ] Set up TanStack Router loader
- [ ] Create base page component structure
- [ ] Implement loading skeleton
- [ ] Implement error boundary

### Phase 2: Data Layer (1 day)

- [ ] Define TypeScript types (API, forms, validation)
- [ ] Create Zod schemas
- [ ] Implement `useOfferDetails` query hook
- [ ] Implement `useCreateLead` mutation hook
- [ ] Test API integration

### Phase 3: Core UI Components (2 days)

- [ ] OfferHeader component
- [ ] OfferImageGallery component (with lightbox)
- [ ] OfferDetails component
- [ ] OfferScheduleTable component
- [ ] OfferLocationMap component (Google Maps)
- [ ] OrganizerInfo component
- [ ] OfferStatusBadge component
- [ ] Breadcrumbs component

### Phase 4: Lead Form (2 days)

- [ ] LeadForm component (TanStack Form)
- [ ] Dynamic children fields (add/remove)
- [ ] Form validation and error display
- [ ] LeadFormSuccess component
- [ ] Form submission flow
- [ ] Error handling

### Phase 5: State Management (0.5 day)

- [ ] Zustand store for UI state
- [ ] Integrate store with components
- [ ] Navigation state preservation

### Phase 6: Polish & Optimization (1 day)

- [ ] Responsive design testing (mobile, tablet, desktop)
- [ ] Accessibility audit (keyboard nav, screen readers)
- [ ] Performance optimization (lazy loading, caching)
- [ ] Cross-browser testing
- [ ] Error states and edge cases

### Phase 7: Testing (1.5 days)

- [ ] Unit tests for utilities and formatters
- [ ] Component tests (React Testing Library)
- [ ] Integration tests for form submission
- [ ] E2E tests (Playwright) for critical flows
- [ ] Accessibility tests (axe-core)

**Total estimated time:** 9 days

---

## 12. Testing Strategy

### Unit Tests

```typescript
// src/features/offers/utils/formatters.test.ts
import { describe, it, expect } from 'vitest';
import { formatDate, formatDateRange, formatTime } from './formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('formats ISO date to Polish format', () => {
      expect(formatDate('2026-03-15')).toBe('15 marca 2026');
    });

    it('handles invalid date strings', () => {
      expect(formatDate('invalid')).toBe('invalid');
    });
  });

  describe('formatDateRange', () => {
    it('formats date range correctly', () => {
      expect(formatDateRange('2026-03-01', '2026-06-30')).toBe(
        '1 marca 2026 – 30 czerwca 2026',
      );
    });
  });

  describe('formatTime', () => {
    it('formats time string to HH:MM', () => {
      expect(formatTime('16:30:00')).toBe('16:30');
    });
  });
});
```

### Component Tests

```typescript
// src/features/offers/components/OfferHeader.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OfferHeader } from './OfferHeader'

describe('OfferHeader', () => {
  it('renders title and organizer name', () => {
    render(
      <OfferHeader
        title="Test Offer"
        status="published"
        organizerName="Test Organizer"
      />
    )

    expect(screen.getByText('Test Offer')).toBeInTheDocument()
    expect(screen.getByText(/Test Organizer/)).toBeInTheDocument()
  })

  it('displays correct status badge', () => {
    render(
      <OfferHeader
        title="Test"
        status="published"
        organizerName="Test"
      />
    )

    expect(screen.getByText('Opublikowana')).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
// src/features/offers/components/LeadForm.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LeadForm } from './LeadForm'

describe('LeadForm Integration', () => {
  it('submits form with valid data', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <LeadForm
          offerId="test-offer-id"
          onSuccess={onSuccess}
          onCancel={vi.fn()}
        />
      </QueryClientProvider>
    )

    // Fill form
    await user.type(screen.getByLabelText(/Imię i nazwisko/i), 'Jan Kowalski')
    await user.type(screen.getByLabelText(/E-mail/i), 'jan@example.com')
    await user.type(screen.getByLabelText(/Telefon/i), '+48123456789')
    await user.type(screen.getByLabelText(/Imię dziecka/i), 'Anna')
    await user.type(screen.getByLabelText(/Wiek dziecka/i), '10')
    await user.click(screen.getByLabelText(/Wyrażam zgodę na kontakt/i))

    // Submit
    await user.click(screen.getByRole('button', { name: /Wyślij zgłoszenie/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('displays validation errors for invalid data', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <LeadForm
          offerId="test-offer-id"
          onSuccess={vi.fn()}
          onCancel={vi.fn()}
        />
      </QueryClientProvider>
    )

    // Submit without filling form
    await user.click(screen.getByRole('button', { name: /Wyślij zgłoszenie/i }))

    await waitFor(() => {
      expect(screen.getByText(/Nieprawidłowy format adresu e-mail/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Tests

```typescript
// e2e/offer-details.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Offer Details Page', () => {
  test('displays offer details correctly', async ({ page }) => {
    await page.goto('/offers/test-offer-id');

    await expect(page.locator('h1')).toContainText('Kurs programowania');
    await expect(page.getByText(/TechKids/)).toBeVisible();
    await expect(page.getByText(/10–14 lat/)).toBeVisible();
  });

  test('allows user to submit lead form', async ({ page }) => {
    await page.goto('/offers/test-offer-id');

    await page.click('button:text("Zgłoś dziecko")');

    await page.fill('input[name="name"]', 'Jan Kowalski');
    await page.fill('input[name="email"]', 'jan@example.com');
    await page.fill('input[name="phone"]', '+48123456789');
    await page.fill('input[name="children[0].name"]', 'Anna');
    await page.fill('input[name="children[0].age"]', '10');
    await page.check('input[name="consent_communication"]');

    await page.click('button:text("Wyślij zgłoszenie")');

    await expect(page.getByText(/Dziękujemy za zgłoszenie/i)).toBeVisible();
  });

  test('navigates back to map while preserving filters', async ({ page }) => {
    await page.goto('/?age=10-14&category=educational');

    const firstOffer = page.locator('[data-testid="offer-card"]').first();
    await firstOffer.click();

    await page.click('a:text("Strona główna")');

    expect(page.url()).toContain('age=10-14');
    expect(page.url()).toContain('category=educational');
  });
});
```

---

## 13. Acceptance Criteria (Based on PRD)

### US-008: Przeglądanie szczegółów oferty

- [x] Po kliknięciu na marker/ofertę, wyświetla się nowa strona ze szczegółami
- [x] Widoczne są: nazwa, opis, wiek, terminy, lokalizacja, liczba miejsc, dane organizatora
- [x] Zdjęcia wyświetlane w galerii z możliwością przewijania
- [x] Możliwość powrotu do mapy bez utraty filtrów
- [x] Szczegóły ładują się poniżej 2 sekund

### US-009: Zgłoszenie dziecka na zajęcia

- [x] Przycisk "Zgłoś dziecko" widoczny na stronie szczegółów
- [x] Formularz zawiera: imię dziecka, wiek, imię rodzica, e-mail, telefon, wiadomość
- [x] Pola obowiązkowe są zaznaczone
- [x] Po wysłaniu pojawia się potwierdzenie
- [x] Rodzic otrzymuje e-mail z potwierdzeniem
- [x] Organizator otrzymuje e-mail z danymi zgłoszenia

### US-010: Potwierdzenie wysłania zgłoszenia

- [x] Po wysłaniu pojawia się komunikat: "Dziękujemy za zgłoszenie! Organizator skontaktuje się z tobą wkrótce."
- [x] Potwierdzenie e-mailem zawiera dane zgłoszenia i dane kontaktowe organizatora
- [x] E-mail ma przyjazny ton i jasne instrukcje

---

## 14. Dependencies

```json
{
  "dependencies": {
    "@tanstack/react-router": "^1.0.0",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-form": "^0.30.0",
    "@tanstack/zod-form-adapter": "^0.30.0",
    "zod": "^3.22.0",
    "zustand": "^4.5.0",
    "isomorphic-dompurify": "^2.9.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.300.0",
    "@radix-ui/react-dialog": "^1.0.5"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@playwright/test": "^1.40.0",
    "vitest": "^1.0.0"
  }
}
```

---

## 15. Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## 16. Success Metrics

### Performance Metrics

- Page load time < 2s (95th percentile)
- Time to Interactive < 3s
- Image gallery interaction < 100ms
- Form submission < 1s

### Business Metrics

- Lead conversion rate > 5% (visitors → submissions)
- Form completion rate > 80%
- Bounce rate < 40%
- Average time on page > 2 minutes

### Quality Metrics

- Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- Zero critical accessibility violations
- Form error rate < 5%
- API error rate < 1%

---

## 17. Future Enhancements (Post-MVP)

- [ ] Share buttons (Facebook, WhatsApp, Copy link)
- [ ] Add to favorites functionality
- [ ] Similar offers recommendation
- [ ] Organizer rating and reviews display
- [ ] Calendar integration (Add to Google Calendar)
- [ ] Print-friendly view
- [ ] Social proof (number of views, recent sign-ups)
- [ ] Real-time availability updates (WebSocket)
- [ ] Multi-language support
- [ ] Dark mode support

---

## 18. Documentation References

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [TanStack Form Docs](https://tanstack.com/form/latest)
- [Zod Documentation](https://zod.dev/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
