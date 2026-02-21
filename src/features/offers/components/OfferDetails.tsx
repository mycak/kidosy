import { Calendar, Users, Clock, MapPin } from 'lucide-react';
import { formatDateRange, getAgeRange } from '../utils/formatters';
import { translateCategory, translateOfferType } from '@/lib/translations';
import type { OfferDetailsResponse } from '../types';

interface OfferDetailsProps {
  offer: OfferDetailsResponse;
}

export function OfferDetails({ offer }: OfferDetailsProps) {
  const ageRange = getAgeRange(offer.ages);
  const dateRange = formatDateRange(offer.start_date, offer.end_date);

  return (
    <section className='bg-white rounded-lg border p-6 space-y-4'>
      <h2 className='text-2xl font-bold mb-4'>Szczegóły oferty</h2>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <DetailItem
          icon={<Users className='w-5 h-5' />}
          label='Przedział wiekowy'
          value={ageRange}
        />

        <DetailItem
          icon={<Calendar className='w-5 h-5' />}
          label='Termin'
          value={dateRange}
        />

        <DetailItem
          icon={<Clock className='w-5 h-5' />}
          label='Typ zajęć'
          value={translateOfferType(offer.offer_type.name)}
        />

        <DetailItem
          icon={<MapPin className='w-5 h-5' />}
          label='Lokalizacja'
          value={offer.address}
        />
      </div>

      {offer.available_spots !== null &&
        offer.available_spots !== undefined && (
          <div className='pt-4 border-t'>
            <p className='text-sm text-gray-600'>Dostępne miejsca</p>
            <p className='text-2xl font-bold text-primary'>
              {offer.available_spots === 0 ? (
                <span className='text-red-600'>Brak wolnych miejsc</span>
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
        <div className='pt-4 border-t'>
          <p className='text-sm text-gray-600 mb-2'>Kategorie</p>
          <div className='flex flex-wrap gap-2'>
            {offer.categories.map((category) => (
              <span
                key={category.id}
                className='px-3 py-1 bg-primary/10 text-primary rounded-full text-sm'
              >
                {translateCategory(category.name)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className='flex items-start gap-3'>
      <div className='text-primary mt-0.5'>{icon}</div>
      <div>
        <p className='text-sm text-gray-600'>{label}</p>
        <p className='font-medium'>{value}</p>
      </div>
    </div>
  );
}
