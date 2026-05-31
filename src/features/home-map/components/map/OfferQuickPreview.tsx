import { X, MapPin, Calendar, Users } from 'lucide-react';
import { translateCategory } from '@/lib/translations';
import type { PublicOfferListItemDto } from '@/types';

interface OfferQuickPreviewProps {
  offer: PublicOfferListItemDto;
  onClose: () => void;
}

export function OfferQuickPreview({ offer, onClose }: OfferQuickPreviewProps) {
  const minAge = Math.min(...offer.ages);
  const maxAge = Math.max(...offer.ages);

  return (
    <div className='absolute bottom-6 left-1/2 z-10 w-[90%] max-w-sm -translate-x-1/2 rounded-[24px] border border-white/70 bg-gradient-to-br from-white/90 via-emerald-50/80 to-rose-50/80 shadow-lg backdrop-blur'>
      <div className='relative p-4'>
        <button
          onClick={onClose}
          className='absolute right-2 top-2 rounded-full p-1 hover:bg-muted'
          aria-label='Zamknij podgląd'
        >
          <X className='h-4 w-4' />
        </button>

        <div className='space-y-3 pr-6'>
          <div>
            <h3 className='text-lg font-semibold line-clamp-2'>
              {offer.title}
            </h3>
            <p className='text-sm text-muted-foreground line-clamp-2'>
              {offer.description}
            </p>
          </div>

          <div className='space-y-2 text-sm'>
            <div className='flex items-start gap-2'>
              <MapPin className='mt-0.5 h-4 w-4 shrink-0 text-muted-foreground' />
              <span className='line-clamp-1'>{offer.address}</span>
            </div>

            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4 shrink-0 text-muted-foreground' />
              <span>
                Wiek: {minAge}-{maxAge} lat
              </span>
            </div>

            {offer.start_date && (
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 shrink-0 text-muted-foreground' />
                <span>
                  Od: {new Date(offer.start_date).toLocaleDateString('pl-PL')}
                </span>
              </div>
            )}

            {offer.available_spots !== undefined && (
              <div className='flex items-center gap-2'>
                <span className='font-medium'>
                  Wolne miejsca: {offer.available_spots}
                </span>
              </div>
            )}
          </div>

          <div className='flex flex-wrap gap-1'>
            {offer.categories.slice(0, 2).map((category) => (
              <span
                key={category.id}
                className='rounded-full bg-gradient-to-r from-emerald-100 via-sky-100 to-rose-100 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200/70'
              >
                {translateCategory(category.name)}
              </span>
            ))}
            {offer.categories.length > 2 && (
              <span className='rounded-full bg-gradient-to-r from-amber-50 via-rose-50 to-sky-50 px-3 py-1.5 text-sm font-semibold text-muted-foreground ring-1 ring-border/70'>
                +{offer.categories.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
