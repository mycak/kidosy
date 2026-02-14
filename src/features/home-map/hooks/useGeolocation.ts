import { useState, useCallback } from 'react';
import type { LocationData } from '../types';

interface UseGeolocationReturn {
  isLoading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<LocationData | null>;
}

export function useGeolocation(): UseGeolocationReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        location: { lat, lng: lon },
      });

      if (response.results[0]) {
        const addressComponents = response.results[0].address_components;
        const city =
          addressComponents.find((c) => c.types.includes('locality'))
            ?.long_name ||
          addressComponents.find((c) =>
            c.types.includes('administrative_area_level_2'),
          )?.long_name;
        const country = addressComponents.find((c) =>
          c.types.includes('country'),
        )?.long_name;

        return city && country ? `${city}, ${country}` : 'Wybrana lokalizacja';
      }

      return 'Wybrana lokalizacja';
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
      return 'Wybrana lokalizacja';
    }
  };

  const getCurrentLocation =
    useCallback(async (): Promise<LocationData | null> => {
      if (!navigator.geolocation) {
        setError('Twoja przeglądarka nie obsługuje geolokalizacji');
        return null;
      }

      setIsLoading(true);
      setError(null);

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            try {
              const placeName = await reverseGeocode(latitude, longitude);
              const locationData: LocationData = {
                lat: latitude,
                lon: longitude,
                name: placeName,
              };
              setIsLoading(false);
              resolve(locationData);
            } catch (err) {
              console.error('Failed to get location name:', err);
              setError('Nie udało się pobrać nazwy lokalizacji');
              setIsLoading(false);
              resolve(null);
            }
          },
          (geoError) => {
            setIsLoading(false);

            let errorMessage: string;
            switch (geoError.code) {
              case geoError.PERMISSION_DENIED:
                errorMessage =
                  'Dostęp do lokalizacji został odrzucony. Sprawdź ustawienia przeglądarki.';
                break;
              case geoError.POSITION_UNAVAILABLE:
                errorMessage = 'Lokalizacja niedostępna. Spróbuj ponownie.';
                break;
              case geoError.TIMEOUT:
                errorMessage = 'Przekroczono czas oczekiwania na lokalizację.';
                break;
              default:
                errorMessage = 'Nie udało się pobrać lokalizacji.';
            }

            setError(errorMessage);
            resolve(null);
          },
          {
            timeout: 10000,
            enableHighAccuracy: true,
          },
        );
      });
    }, []);

  return {
    isLoading,
    error,
    getCurrentLocation,
  };
}
