import { useState, useRef, useEffect } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { LocationData } from '../../types';

interface LocationSearchInputProps {
  location: LocationData | null;
  onChange: (location: LocationData | null) => void;
  onUseCurrentLocation?: () => void;
  isLoadingCurrentLocation?: boolean;
}

export function LocationSearchInput({
  location,
  onChange,
  onUseCurrentLocation,
  isLoadingCurrentLocation = false,
}: LocationSearchInputProps) {
  const [inputValue, setInputValue] = useState(location?.name || '');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google?.maps?.places) {
      return;
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['geocode'],
        componentRestrictions: { country: 'pl' },
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      },
    );

    const listener = autocompleteRef.current.addListener(
      'place_changed',
      () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place?.geometry?.location) {
          return;
        }

        const newLocation: LocationData = {
          lat: place.geometry.location.lat(),
          lon: place.geometry.location.lng(),
          name: place.formatted_address || place.name || '',
        };

        setInputValue(newLocation.name);
        onChange(newLocation);
      },
    );

    return () => {
      if (listener) {
        google.maps.event.removeListener(listener);
      }
    };
  }, [onChange]);

  const handleClear = () => {
    setInputValue('');
    onChange(null);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleUseCurrentLocation = () => {
    if (onUseCurrentLocation) {
      onUseCurrentLocation();
      if (location) {
        setInputValue(location.name);
      }
    }
  };

  return (
    <div className='relative flex w-full gap-2 sm:w-70'>
      <div className='relative flex-1'>
        <MapPin className='absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground' />
        <Input
          ref={inputRef}
          type='text'
          placeholder='Wpisz lokalizację...'
          value={inputValue}
          onChange={handleInputChange}
          className='h-12 border-white/60 bg-white/80 pl-11 pr-10 text-base shadow-sm focus-visible:ring-sky-200'
          aria-label='Wyszukaj lokalizację'
        />
        {inputValue && (
          <button
            type='button'
            onClick={handleClear}
            className='absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-muted'
            aria-label='Wyczyść lokalizację'
          >
            <X className='h-4.5 w-4.5' />
          </button>
        )}
      </div>
      {onUseCurrentLocation && (
        <Button
          variant='outline'
          size='icon'
          onClick={handleUseCurrentLocation}
          disabled={isLoadingCurrentLocation}
          className='h-12 w-12 shrink-0'
          aria-label='Użyj mojej lokalizacji'
          title='Użyj mojej lokalizacji'
        >
          {isLoadingCurrentLocation ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <MapPin className='h-4 w-4' />
          )}
        </Button>
      )}
    </div>
  );
}
