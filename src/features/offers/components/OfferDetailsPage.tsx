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
import { Button } from '@/components/ui/button';
import {
  PRIMARY_CTA_CLASS,
  PRIMARY_CTA_FULL_WIDTH_CLASS,
} from '@/shared/constants/ui';

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
    <div className='mx-auto w-full max-w-7xl px-4 py-8'>
      <Breadcrumbs offerTitle={offer.title} />

      <div className='mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <OfferHeader
            title={offer.title}
            status={offer.status}
            organizerName={offer.organizer?.company_name || 'Organizator'}
          />

          <OfferImageGallery images={offer.images} />

          <section className='ui-panel rounded-[24px] p-6'>
            <h2 className='mb-4 text-2xl font-semibold tracking-tight'>
              Opis zajęć
            </h2>
            <div
              className='prose max-w-none text-foreground/90'
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
            <Button
              onClick={() => setIsLeadDialogOpen(true)}
              className={PRIMARY_CTA_FULL_WIDTH_CLASS}
              aria-label='Zgłoś dziecko na zajęcia'
            >
              Zgłoś dziecko
            </Button>
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
              <Button
                type='button'
                onClick={() => setIsLeadSuccessDialogOpen(false)}
                className={PRIMARY_CTA_CLASS}
              >
                Zamknij
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
