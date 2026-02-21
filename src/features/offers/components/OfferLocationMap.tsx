import { useEffect, useRef } from 'react';
import type { GeoPointDto } from '../types';

interface OfferLocationMapProps {
  location: GeoPointDto;
  address: string;
}

export function OfferLocationMap({ location, address }: OfferLocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const [lng, lat] = location.coordinates;
    const position = { lat, lng };

    const map = new google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    new google.maps.Marker({
      position,
      map,
      title: address,
    });

    googleMapRef.current = map;
  }, [location, address]);

  return (
    <section className='bg-white rounded-lg border p-6'>
      <h2 className='text-2xl font-bold mb-4'>Lokalizacja</h2>

      <div className='space-y-4'>
        <div className='flex items-start gap-2'>
          <span className='text-gray-600'>Adres:</span>
          <span className='font-medium'>{address}</span>
        </div>

        <div
          ref={mapRef}
          className='w-full h-64 md:h-96 rounded-lg overflow-hidden'
          role='img'
          aria-label={`Mapa lokalizacji: ${address}`}
        />

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${location.coordinates[1]},${location.coordinates[0]}`}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center text-primary hover:underline'
        >
          Otwórz w Google Maps
          <svg
            className='w-4 h-4 ml-1'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
