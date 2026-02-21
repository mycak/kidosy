import { useNavigate } from '@tanstack/react-router';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  offerTitle: string;
}

export function Breadcrumbs({ offerTitle }: BreadcrumbsProps) {
  const navigate = useNavigate();

  return (
    <nav aria-label='Breadcrumb' className='flex items-center gap-2 text-sm'>
      <button
        onClick={() => navigate({ to: '/' } as any)}
        className='flex items-center gap-1 text-gray-600 hover:text-gray-900'
      >
        <Home className='w-4 h-4' />
        <span>Strona główna</span>
      </button>

      <ChevronRight className='w-4 h-4 text-gray-400' />

      <span className='text-gray-900 font-medium truncate max-w-xs'>
        {offerTitle}
      </span>
    </nav>
  );
}
