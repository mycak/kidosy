import { useLoadScript } from '@react-google-maps/api';
import type { PublicOfferListItemDto, LocationData } from '@/types';
import { GoogleMapContainer } from './GoogleMapContainer';
import { MapLoadingSkeleton } from './MapLoadingSkeleton';

interface MapSectionProps {
  offers: PublicOfferListItemDto[];
  location: LocationData | null;
  selectedOfferId: string | null;
  hoveredOfferId: string | null;
  fitBoundsKey: string;
  onOfferSelect: (offerId: string | null) => void;
}

const LIBRARIES: ('places' | 'geometry')[] = ['places', 'geometry'];

export function MapSection({
  offers,
  location,
  selectedOfferId,
  hoveredOfferId,
  fitBoundsKey,
  onOfferSelect,
}: MapSectionProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  if (loadError) {
    return (
      <div className='flex h-full items-center justify-center bg-muted'>
        <div className='text-center'>
          <p className='text-lg font-semibold text-destructive'>
            Błąd ładowania mapy
          </p>
          <p className='text-sm text-muted-foreground'>
            Sprawdź połączenie internetowe i odśwież stronę
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <MapLoadingSkeleton />;
  }

  const center = location ? { lat: location.lat, lng: location.lon } : null;

  return (
    <GoogleMapContainer
      offers={offers}
      center={center}
      selectedOfferId={selectedOfferId}
      hoveredOfferId={hoveredOfferId}
      fitBoundsKey={fitBoundsKey}
      onOfferSelect={onOfferSelect}
    />
  );
}
