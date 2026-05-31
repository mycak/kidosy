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
    <header className='ui-panel rounded-[24px] p-6'>
      <div className='flex items-start justify-between gap-4'>
        <h1 className='text-3xl font-semibold tracking-tight text-foreground md:text-4xl'>
          {title}
        </h1>
        <OfferStatusBadge status={status} />
      </div>
      <p className='mt-2 text-sm text-muted-foreground'>
        Organizator: <span className='font-medium'>{organizerName}</span>
      </p>
    </header>
  );
}
