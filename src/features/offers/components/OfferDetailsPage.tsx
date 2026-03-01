import { Route } from '@/routes/offers/$offerId';
import { useOfferDetails } from '../queries/useOfferDetails';
import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { Breadcrumbs } from './Breadcrumbs';
import { OfferHeader } from './OfferHeader';
import { OfferImageGallery } from './OfferImageGallery';
import { OfferDetails } from './OfferDetails';
import { OfferScheduleTable } from './OfferScheduleTable';
import { OfferLocationMap } from './OfferLocationMap';
import { OrganizerInfo } from './OrganizerInfo';
import { LeadForm } from './LeadForm';
import { LeadFormSuccess } from './LeadFormSuccess';
import { OfferDetailsLoadingSkeleton } from './OfferDetailsLoadingSkeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function OfferDetailsPage() {
  const { offerId } = Route.useParams();
  const { data: offer, isLoading, error } = useOfferDetails(offerId);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [isLeadSuccessDialogOpen, setIsLeadSuccessDialogOpen] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  if (isLoading) {
    return <OfferDetailsLoadingSkeleton />;
  }

  if (error) {
    throw error;
  }

  if (!offer) {
    throw new Error('Oferta nie została znaleziona');
  }

  const sanitizedDescription = DOMPurify.sanitize(offer.description);

  return (
    <div className='container mx-auto px-4 py-8'>
      <Breadcrumbs offerTitle={offer.title} />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6'>
        <div className='lg:col-span-2 space-y-6'>
          <OfferHeader
            title={offer.title}
            status={offer.status}
            organizerName={offer.organizer?.company_name || 'Organizator'}
          />

          <OfferImageGallery images={offer.images} />

          <section className='prose max-w-none'>
            <h2 className='text-2xl font-bold mb-4'>Opis zajęć</h2>
            <div
              className='text-gray-700'
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          </section>

          <OfferDetails offer={offer} />

          <OfferScheduleTable schedules={offer.schedules} />

          <OfferLocationMap location={offer.location} address={offer.address} />
        </div>

        <aside className='space-y-6 lg:sticky lg:top-4 lg:self-start'>
          {offer.organizer && <OrganizerInfo organizer={offer.organizer} />}

          {!leadSubmitted ? (
            <button
              onClick={() => setIsLeadDialogOpen(true)}
              className='w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-lg font-semibold'
              aria-label='Zgłoś dziecko na zajęcia'
            >
              Zgłoś dziecko
            </button>
          ) : (
            <LeadFormSuccess
              organizerName={offer.organizer?.company_name || 'Organizator'}
              organizerEmail={offer.organizer?.email_public || ''}
            />
          )}
        </aside>
      </div>

      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className='max-w-3xl max-h-[90vh] overflow-y-auto sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Zgłoś dziecko na zajęcia</DialogTitle>
          </DialogHeader>
          <LeadForm
            offerId={offer.id}
            onSuccess={() => {
              setLeadSubmitted(true);
              setIsLeadDialogOpen(false);
              setIsLeadSuccessDialogOpen(true);
            }}
            onCancel={() => setIsLeadDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isLeadSuccessDialogOpen}
        onOpenChange={setIsLeadSuccessDialogOpen}
      >
        <DialogContent className='max-w-xl'>
          <DialogHeader>
            <DialogTitle>Dziękujemy za zgłoszenie</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <LeadFormSuccess
              organizerName={offer.organizer?.company_name || 'Organizator'}
              organizerEmail={offer.organizer?.email_public || ''}
            />
            <div className='flex justify-end'>
              <button
                type='button'
                onClick={() => setIsLeadSuccessDialogOpen(false)}
                className='px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors'
              >
                Zamknij
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
