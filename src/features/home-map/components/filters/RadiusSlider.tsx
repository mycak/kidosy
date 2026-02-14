import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RADIUS_OPTIONS } from '../../types';

interface RadiusSliderProps {
  radiusKm: number | undefined;
  onChange: (radiusKm: number | undefined) => void;
  disabled?: boolean;
}

const DEFAULT_RADIUS = 10;

export function RadiusSlider({
  radiusKm,
  onChange,
  disabled = false,
}: RadiusSliderProps) {
  const currentRadius = radiusKm ?? DEFAULT_RADIUS;

  const handleValueChange = (values: number[]) => {
    const newRadius = values[0];
    onChange(newRadius === DEFAULT_RADIUS ? undefined : newRadius);
  };

  const radiusOptions = RADIUS_OPTIONS;
  const minRadius = Math.min(...radiusOptions);
  const maxRadius = Math.max(...radiusOptions);

  return (
    <div className='w-full space-y-3'>
      <div className='flex items-center justify-between'>
        <Label
          htmlFor='radius-slider'
          className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : ''}`}
        >
          Promień wyszukiwania
        </Label>
        <span
          className={`text-sm font-semibold ${disabled ? 'text-muted-foreground' : 'text-primary'}`}
        >
          {currentRadius} km
        </span>
      </div>
      <Slider
        id='radius-slider'
        min={minRadius}
        max={maxRadius}
        step={5}
        value={[currentRadius]}
        onValueChange={handleValueChange}
        disabled={disabled}
        className='w-full rounded-full bg-white/60'
        aria-label='Wybierz promień wyszukiwania'
      />
      <div className='flex justify-between text-xs text-muted-foreground'>
        <span>{minRadius} km</span>
        <span>{maxRadius} km</span>
      </div>
      {disabled && (
        <p className='text-xs text-muted-foreground'>
          Wybierz lokalizację, aby ustawić promień
        </p>
      )}
    </div>
  );
}
