import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';
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

export function OfferCard({
  offer,
  isSelected,
  onSelect,
  onHover,
}: OfferCardProps) {
  const minAge = Math.min(...offer.ages);
  const maxAge = Math.max(...offer.ages);

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

          {offer.start_date && (
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4 text-muted-foreground' />
              <span>
                Od: {new Date(offer.start_date).toLocaleDateString('pl-PL')}
              </span>
            </div>
          )}
        </div>
        {offer.available_spots !== undefined && (
          <div className='text-xs font-medium text-primary'>
            Wolne miejsca: {offer.available_spots}
          </div>
        )}
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
