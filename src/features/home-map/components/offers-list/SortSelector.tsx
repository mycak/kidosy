import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortBy, SortOrder } from '../../types';

interface SortSelectorProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

const SORT_VALUE_SEPARATOR = ':';

const SORT_OPTIONS = [
  {
    value: `date_created${SORT_VALUE_SEPARATOR}desc`,
    label: 'Najnowsze',
  },
  {
    value: `date_updated${SORT_VALUE_SEPARATOR}desc`,
    label: 'Ostatnio aktualizowane',
  },
  {
    value: `distance${SORT_VALUE_SEPARATOR}asc`,
    label: 'Najbliżej',
  },
  {
    value: `relevance${SORT_VALUE_SEPARATOR}desc`,
    label: 'Najtrafniejsze',
  },
] as const;

export function SortSelector({
  sortBy,
  sortOrder,
  onSortChange,
}: SortSelectorProps) {
  const selectedValue = `${sortBy}${SORT_VALUE_SEPARATOR}${sortOrder}`;

  const handleValueChange = (value: string) => {
    const [sortByValue, sortOrderValue] = value.split(SORT_VALUE_SEPARATOR) as [
      SortBy,
      SortOrder,
    ];

    onSortChange(sortByValue, sortOrderValue);
  };

  return (
    <Select value={selectedValue} onValueChange={handleValueChange}>
      <SelectTrigger className='h-9 w-[200px] border-white/60 bg-white/80 shadow-sm'>
        <SelectValue placeholder='Sortowanie' />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
