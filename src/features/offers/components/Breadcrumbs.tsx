import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  offerTitle: string;
}

export function Breadcrumbs({ offerTitle }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav
      aria-label='Breadcrumb'
      className='ui-panel inline-flex max-w-full items-center gap-2 rounded-2xl px-4 py-2 text-sm'
    >
      <button
        onClick={() => navigate({ to: '/' } as any)}
        className='flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground'
      >
        <Home className='w-4 h-4' />
        <span>Strona główna</span>
      </button>

      <ChevronRight className='w-4 h-4 text-muted-foreground/70' />

      <span className='max-w-xs truncate font-medium text-foreground'>
        {offerTitle}
      </span>
    </nav>
  );
}
