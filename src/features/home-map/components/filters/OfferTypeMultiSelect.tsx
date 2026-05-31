import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { translateOfferType } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface OfferTypeMultiSelectProps {
  selectedTypes: string[];
  offerTypes: Array<{ id: string; name: string }>;
  onChange: (typeIds: string[]) => void;
  isLoading?: boolean;
}

export function OfferTypeMultiSelect({
  selectedTypes,
  offerTypes,
  onChange,
  isLoading = false,
}: OfferTypeMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleType = (typeId: string) => {
    const newSelection = selectedTypes.includes(typeId)
      ? selectedTypes.filter((id) => id !== typeId)
      : [...selectedTypes, typeId];
    onChange(newSelection);
  };

  const displayText =
    selectedTypes.length === 0
      ? 'Typ zajęć'
      : selectedTypes.length === 1
        ? translateOfferType(
            offerTypes.find((t) => t.id === selectedTypes[0])?.name || '',
          )
        : `Wybrano ${selectedTypes.length}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label='Wybierz typ zajęć'
          className='h-12 w-full justify-between border-white/60 bg-white/80 px-4 text-base shadow-sm sm:w-57.5'
          disabled={isLoading}
        >
          <span className='truncate'>{displayText}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-57.5 border-white/70 bg-white/90 p-0 shadow-md'
        align='start'
      >
        <Command className='bg-transparent'>
          <CommandInput
            placeholder='Szukaj typu...'
            className='border-b border-white/70 bg-white/70'
          />
          <CommandList>
            <CommandEmpty>Nie znaleziono typu.</CommandEmpty>
            <CommandGroup>
              {offerTypes.map((type) => {
                const isSelected = selectedTypes.includes(type.id);
                return (
                  <CommandItem
                    key={type.id}
                    value={type.name}
                    onSelect={() => toggleType(type.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected
                          ? 'text-emerald-600 opacity-100'
                          : 'text-muted-foreground/90 opacity-100',
                      )}
                    />
                    {translateOfferType(type.name)}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
