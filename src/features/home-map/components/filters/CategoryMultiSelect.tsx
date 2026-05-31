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
import { translateCategory } from '@/lib/translations';
import { cn } from '@/lib/utils';

interface CategoryMultiSelectProps {
  selectedCategories: string[];
  categories: Array<{ id: string; name: string }>;
  onChange: (categoryIds: string[]) => void;
  isLoading?: boolean;
}

export function CategoryMultiSelect({
  selectedCategories,
  categories,
  onChange,
  isLoading = false,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    onChange(newSelection);
  };

  const displayText =
    selectedCategories.length === 0
      ? 'Wybierz kategorie'
      : selectedCategories.length === 1
        ? translateCategory(
            categories.find((c) => c.id === selectedCategories[0])?.name || '',
          )
        : `Wybrano ${selectedCategories.length}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-label='Wybierz kategorie'
          className='h-12 w-full justify-between border-white/60 bg-white/80 px-4 text-base shadow-sm sm:w-65'
          disabled={isLoading}
        >
          <span className='truncate'>{displayText}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-65 border-white/70 bg-white/90 p-0 shadow-md'
        align='start'
      >
        <Command className='bg-transparent'>
          <CommandInput
            placeholder='Szukaj kategorii...'
            className='border-b border-white/70 bg-white/70'
          />
          <CommandList>
            <CommandEmpty>Nie znaleziono kategorii.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => toggleCategory(category.id)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        isSelected
                          ? 'text-emerald-600 opacity-100'
                          : 'text-muted-foreground/90 opacity-100',
                      )}
                    />
                    {translateCategory(category.name)}
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
