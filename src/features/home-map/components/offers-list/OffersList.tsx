import { useEffect, useRef } from 'react';
import type { PublicOfferListItemDto } from '@/types';
import { OfferCard } from './OfferCard';

interface OffersListProps {
  offers: PublicOfferListItemDto[];
  selectedOfferId: string | null;
  onOfferSelect: (offerId: string) => void;
  onOfferHover: (offerId: string | null) => void;
}

export function OffersList({
  offers,
  selectedOfferId,
  onOfferSelect,
  onOfferHover,
}: OffersListProps) {
  const offerCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedOfferId) {
      return;
    }

    const selectedElement = offerCardRefs.current[selectedOfferId];
    selectedElement?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [selectedOfferId]);

  return (
    <div className='space-y-3'>
      {offers.map((offer) => (
        <div
          key={offer.id}
          ref={(element) => {
            offerCardRefs.current[offer.id] = element;
          }}
        >
          <OfferCard
            offer={offer}
            isSelected={selectedOfferId === offer.id}
            onSelect={onOfferSelect}
            onHover={onOfferHover}
          />
        </div>
      ))}
    </div>
  );
}
