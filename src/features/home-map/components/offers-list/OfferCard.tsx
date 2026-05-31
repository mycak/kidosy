import { useMemo, useState } from 'react';
import { Calendar, MapPin, Users, ArrowRight, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { translateCategory } from '@/lib/translations';
import type { PublicOfferListItemDto } from '@/types';

interface OfferCardProps {
  offer: PublicOfferListItemDto;
  isSelected: boolean;
  onSelect: (offerId: string) => void;
  onHover: (offerId: string | null) => void;
}

const CATEGORY_LIMIT = 2;
const MAIN_IMAGE_DISPLAY_ORDER = 0;

function getPublicImageUrl(storagePath: string): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
}

export function OfferCard({
  offer,
  isSelected,
  onSelect,
  onHover,
}: OfferCardProps) {
  const minAge = Math.min(...offer.ages);
  const maxAge = Math.max(...offer.ages);
  const [hasImageLoadingError, setHasImageLoadingError] = useState(false);

  const mainOfferImage = useMemo(() => {
    return [...offer.images].sort(
      (imageA, imageB) => imageA.display_order - imageB.display_order,
    )[MAIN_IMAGE_DISPLAY_ORDER];
  }, [offer.images]);

  const mainOfferImageUrl =
    mainOfferImage && !hasImageLoadingError
      ? getPublicImageUrl(mainOfferImage.storage_path)
      : undefined;

  return (
    <Card
      className={`cursor-pointer rounded-[24px] border-sky-100/80 bg-linear-to-br from-white/80 via-sky-50/70 to-rose-50/70 transition-shadow hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={() => onSelect(offer.id)}
      onMouseEnter={() => onHover(offer.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(offer.id)}
      onBlur={() => onHover(null)}
      tabIndex={0}
    >
      <div className='mx-4 mt-4 overflow-hidden rounded-4xl border border-white/70 bg-muted/40'>
        {mainOfferImageUrl ? (
          <img
            src={mainOfferImageUrl}
            alt={`Zdjęcie oferty ${offer.title}`}
            className='aspect-video w-full object-cover'
            loading='lazy'
            onError={() => setHasImageLoadingError(true)}
          />
        ) : (
          <div className='flex aspect-video w-full items-center justify-center bg-linear-to-br from-sky-50 to-emerald-50 text-muted-foreground'>
            <div className='flex flex-col items-center gap-2 text-xs font-medium uppercase tracking-[0.12em]'>
              <ImageIcon className='size-6 text-sky-500' />
              Brak zdjęcia głównego
            </div>
          </div>
        )}
      </div>

      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>{offer.title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3 text-sm'>
        <p className='text-muted-foreground line-clamp-2'>
          {offer.description}
        </p>
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <MapPin className='h-4 w-4 text-muted-foreground' />
            <span className='line-clamp-1'>{offer.address}</span>
          </div>

          <div className='flex items-center gap-2'>
            <Users className='h-4 w-4 text-muted-foreground' />
            <span>
              Wiek: {minAge}-{maxAge} lat
            </span>
          </div>

          {offer.available_spots !== undefined && (
            <div className='inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm'>
              Wolne miejsca:
              <span className='ml-1 text-sm font-bold'>
                {offer.available_spots}
              </span>
            </div>
          )}

          {offer.start_date && (
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4 text-muted-foreground' />
              <span>
                Od: {new Date(offer.start_date).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
        </div>
        <div className='flex flex-wrap gap-1'>
          {offer.categories.slice(0, CATEGORY_LIMIT).map((category) => (
            <span
              key={category.id}
              className='rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary'
            >
              {translateCategory(category.name)}
            </span>
          ))}
          {offer.categories.length > CATEGORY_LIMIT && (
            <span className='rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground'>
              +{offer.categories.length - CATEGORY_LIMIT}
            </span>
          )}
        </div>
        <div className='pt-2'>
          <a
            href={`/offers/${offer.id}`}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className='block w-full'
          >
            <Button className='h-10 w-full gap-2 text-sm'>
              Szczegóły
              <ArrowRight className='h-4 w-4' />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
