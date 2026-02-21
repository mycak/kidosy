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

export function OfferDetailsPage() {
  const { offerId } = Route.useParams();
  const { data: offer, isLoading, error } = useOfferDetails(offerId);
  const [showLeadForm, setShowLeadForm] = useState(false);
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

        <aside className='space-y-6'>
          {offer.organizer && <OrganizerInfo organizer={offer.organizer} />}

          {!leadSubmitted ? (
            <div className='sticky top-4'>
              {!showLeadForm ? (
                <button
                  onClick={() => setShowLeadForm(true)}
                  className='w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-lg font-semibold'
                  aria-label='Zgłoś dziecko na zajęcia'
                >
                  Zgłoś dziecko
                </button>
              ) : (
                <LeadForm
                  offerId={offer.id}
                  onSuccess={() => {
                    setLeadSubmitted(true);
                    setShowLeadForm(false);
                  }}
                  onCancel={() => setShowLeadForm(false)}
                />
              )}
            </div>
          ) : (
            <LeadFormSuccess
              organizerName={offer.organizer?.company_name || 'Organizator'}
              organizerEmail={offer.organizer?.email_public || ''}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
