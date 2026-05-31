import { Mail, Phone } from 'lucide-react';
import type { PublicOrganizerDto } from '../types';

interface OrganizerInfoProps {
  organizer: PublicOrganizerDto;
}

export function OrganizerInfo({ organizer }: OrganizerInfoProps) {
  return (
    <div className='ui-panel space-y-4 rounded-[24px] p-6'>
      <h3 className='text-xl font-semibold tracking-tight'>Organizator</h3>

      <div className='space-y-3'>
        <p className='font-medium text-lg'>{organizer.company_name}</p>

        <div className='space-y-2'>
          <a
            href={`mailto:${organizer.email_public}`}
            className='flex items-center gap-2 text-gray-700 transition-colors hover:text-primary'
          >
            <Mail className='w-4 h-4' />
            <span className='text-sm'>{organizer.email_public}</span>
          </a>

          <a
            href={`tel:${organizer.phone}`}
            className='flex items-center gap-2 text-gray-700 transition-colors hover:text-primary'
          >
            <Phone className='w-4 h-4' />
            <span className='text-sm'>{organizer.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
