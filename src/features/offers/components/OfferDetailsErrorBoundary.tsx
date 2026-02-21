import { useNavigate, type ErrorComponentProps } from '@tanstack/react-router';
import { AlertTriangle, Home } from 'lucide-react';

export function OfferDetailsErrorBoundary({ error }: ErrorComponentProps) {
  const navigate = useNavigate();

  return (
    <div className='container mx-auto px-4 py-16'>
      <div className='max-w-md mx-auto text-center space-y-6'>
        <AlertTriangle className='w-16 h-16 text-red-500 mx-auto' />

        <div>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>
            Nie można załadować oferty
          </h1>
          <p className='text-gray-600'>
            {error.message === 'Oferta nie została znaleziona'
              ? 'Oferta, której szukasz, nie istnieje lub została usunięta.'
              : 'Wystąpił błąd podczas ładowania szczegółów oferty.'}
          </p>
        </div>

        <div className='flex gap-3 justify-center'>
          <button
            onClick={() => navigate({ to: '/' } as any)}
            className='inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors'
          >
            <Home className='w-4 h-4' />
            Wróć do strony głównej
          </button>
        </div>
      </div>
    </div>
  );
}
