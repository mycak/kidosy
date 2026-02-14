import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface AgeRangeFilterProps {
  minAge: number | undefined;
  maxAge: number | undefined;
  onChange: (minAge: number | undefined, maxAge: number | undefined) => void;
}

const MIN_AGE_VALUE = 0;
const MAX_AGE_VALUE = 18;

export function AgeRangeFilter({
  minAge,
  maxAge,
  onChange,
}: AgeRangeFilterProps) {
  const currentMin = minAge ?? MIN_AGE_VALUE;
  const currentMax = maxAge ?? MAX_AGE_VALUE;

  const handleValueChange = (values: number[]) => {
    const [newMin, newMax] = values;
    onChange(
      newMin === MIN_AGE_VALUE ? undefined : newMin,
      newMax === MAX_AGE_VALUE ? undefined : newMax,
    );
  };

  const displayLabel =
    minAge === undefined && maxAge === undefined
      ? 'Wszystkie wieki'
      : `${currentMin} - ${currentMax} lat`;

  return (
    <div className='w-full space-y-3'>
      <div className='flex items-center justify-between'>
        <Label htmlFor='age-range-slider' className='text-sm font-medium'>
          Wiek dziecka
        </Label>
        <span className='text-sm font-semibold text-primary'>
          {displayLabel}
        </span>
      </div>
      <Slider
        id='age-range-slider'
        min={MIN_AGE_VALUE}
        max={MAX_AGE_VALUE}
        step={1}
        value={[currentMin, currentMax]}
        onValueChange={handleValueChange}
        className='w-full'
        aria-label='Wybierz zakres wieku'
      />
      <div className='flex justify-between text-xs text-muted-foreground'>
        <span>{MIN_AGE_VALUE} lat</span>
        <span>{MAX_AGE_VALUE} lat</span>
      </div>
    </div>
  );
}
