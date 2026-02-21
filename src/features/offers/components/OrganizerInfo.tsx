import { Mail, Phone } from 'lucide-react';
import type { PublicOrganizerDto } from '../types';

interface OrganizerInfoProps {
  organizer: PublicOrganizerDto;
}

export function OrganizerInfo({ organizer }: OrganizerInfoProps) {
  return (
    <div className='bg-white rounded-lg border p-6 space-y-4'>
      <h3 className='text-xl font-bold'>Organizator</h3>

      <div className='space-y-3'>
        <p className='font-medium text-lg'>{organizer.company_name}</p>

        <div className='space-y-2'>
          <a
            href={`mailto:${organizer.email_public}`}
            className='flex items-center gap-2 text-gray-700 hover:text-primary transition-colors'
          >
            <Mail className='w-4 h-4' />
            <span className='text-sm'>{organizer.email_public}</span>
          </a>

          <a
            href={`tel:${organizer.phone}`}
            className='flex items-center gap-2 text-gray-700 hover:text-primary transition-colors'
          >
            <Phone className='w-4 h-4' />
            <span className='text-sm'>{organizer.phone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
