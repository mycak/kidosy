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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm ${
        variant === 'location'
          ? 'bg-gradient-to-r from-sky-100 via-emerald-100 to-teal-100 text-sky-800'
          : 'bg-gradient-to-r from-rose-50 via-sky-50 to-amber-50 text-foreground'
      }`}
    >
      <span>{label}</span>
      <button
        onClick={onRemove}
        className='rounded-full p-0.5 transition-colors hover:bg-white/70'
        aria-label={`Usuń filtr: ${label}`}
      >
        <X className='h-3.5 w-3.5' />
      </button>
    </div>
  );
}
