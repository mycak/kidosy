import { OfferStatusBadge } from './OfferStatusBadge';
import type { OfferStatus } from '../types';

interface OfferHeaderProps {
  title: string;
  status: OfferStatus;
  organizerName: string;
}

export function OfferHeader({
  title,
  status,
  organizerName,
}: OfferHeaderProps) {
  return (
    <header className='space-y-2'>
      <div className='flex items-start justify-between gap-4'>
        <h1 className='text-3xl md:text-4xl font-bold text-gray-900'>
          {title}
        </h1>
        <OfferStatusBadge status={status} />
      </div>
      <p className='text-gray-600'>
        Organizator: <span className='font-medium'>{organizerName}</span>
      </p>
    </header>
  );
}
