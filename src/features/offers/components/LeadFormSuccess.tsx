import { CheckCircle, Mail } from 'lucide-react';

interface LeadFormSuccessProps {
  organizerName: string;
  organizerEmail: string;
}

export function LeadFormSuccess({
  organizerName,
  organizerEmail,
}: LeadFormSuccessProps) {
  return (
    <div className='bg-green-50 border border-green-200 rounded-lg p-6 space-y-4'>
      <div className='flex items-start gap-3'>
        <CheckCircle className='w-6 h-6 text-green-600 shrink-0 mt-0.5' />
        <div className='space-y-2'>
          <h3 className='font-bold text-green-900'>
            Dziękujemy za zgłoszenie!
          </h3>
          <p className='text-sm text-green-800'>
            Organizator <strong>{organizerName}</strong> skontaktuje się z Tobą
            wkrótce.
          </p>
          <p className='text-sm text-green-800'>
            Wysłaliśmy również potwierdzenie na Twój adres e-mail.
          </p>
        </div>
      </div>

      <div className='pt-3 border-t border-green-200 space-y-2'>
        <p className='text-sm font-medium text-green-900'>
          Dane kontaktowe organizatora:
        </p>
        <div className='flex items-center gap-2 text-sm text-green-800'>
          <Mail className='w-4 h-4' />
          <a href={`mailto:${organizerEmail}`} className='hover:underline'>
            {organizerEmail}
          </a>
        </div>
      </div>
    </div>
  );
}
