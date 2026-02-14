import { X } from 'lucide-react';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  variant?: 'default' | 'location';
}

export function FilterChip({
  label,
  onRemove,
  variant = 'default',
}: FilterChipProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
        variant === 'location'
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-foreground'
      }`}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        className='rounded-full hover:bg-background/50 p-0.5 transition-colors'
        aria-label={`Usuń filtr: ${label}`}
      >
        <X className='h-3.5 w-3.5' />
      </button>
    </div>
  );
}
