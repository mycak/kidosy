import { useEffect, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface UseGoogleMapsLoaderReturn {
  isLoaded: boolean;
  error: Error | null;
}

export function useGoogleMapsLoader(): UseGoogleMapsLoaderReturn {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(() => {
    if (!apiKey) {
      return new Error(
        'Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.',
      );
    }
    return null;
  });

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });

    loader
      .load()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((err) => {
        console.error('Google Maps failed to load:', err);
        setError(new Error('Nie udało się załadować mapy. Odśwież stronę.'));
      });
  }, [apiKey]);

  return { isLoaded, error };
}
