import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, ImageIcon, X } from 'lucide-react';
import type { OfferImageDto } from '../types';

interface OfferImageGalleryProps {
  images: OfferImageDto[];
}

const KIDOSY_LOGO_LETTERS = [
  { letter: 'K', className: 'text-sky-500' },
  { letter: 'i', className: 'text-emerald-500' },
  { letter: 'd', className: 'text-rose-400' },
  { letter: 'o', className: 'text-amber-400' },
  { letter: 's', className: 'text-violet-400' },
  { letter: 'y', className: 'text-teal-500' },
] as const;

export function OfferImageGallery({ images }: OfferImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className='h-36 md:h-40 bg-gray-50 rounded-lg border flex items-center justify-center'>
        <div className='flex flex-col items-center gap-1.5 text-gray-500'>
          <div className='text-base font-bold tracking-tight'>
            {KIDOSY_LOGO_LETTERS.map((logoLetter, index) => (
              <span
                key={`${logoLetter.letter}-${index}`}
                className={logoLetter.className}
              >
                {logoLetter.letter}
              </span>
            ))}
          </div>
          <ImageIcon className='w-6 h-6' />
          <p className='text-xs font-medium'>Brak zdjęć dla tej oferty</p>
        </div>
      </div>
    );
  }

  const sortedImages = [...images].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const currentImage = sortedImages[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? sortedImages.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === sortedImages.length - 1 ? 0 : prev + 1,
    );
  };

  const getImageUrl = (storagePath: string) => {
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${storagePath}`;
  };

  return (
    <>
      <div className='relative group'>
        <img
          src={getImageUrl(currentImage.storage_path)}
          alt={`Zdjęcie oferty ${currentIndex + 1} z ${sortedImages.length}`}
          className='w-full aspect-video object-cover rounded-lg cursor-pointer'
          onClick={() => setLightboxOpen(true)}
          loading='eager'
        />

        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className='absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70'
              aria-label='Poprzednie zdjęcie'
            >
              <ChevronLeft className='w-6 h-6' />
            </button>
            <button
              onClick={handleNext}
              className='absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70'
              aria-label='Następne zdjęcie'
            >
              <ChevronRight className='w-6 h-6' />
            </button>
          </>
        )}

        <div className='absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm'>
          {currentIndex + 1} / {sortedImages.length}
        </div>
      </div>

      {sortedImages.length > 1 && (
        <div className='flex gap-2 overflow-x-auto py-2'>
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setCurrentIndex(index)}
              className={`shrink-0 w-20 h-20 rounded border-2 transition-all ${
                index === currentIndex
                  ? 'border-primary scale-105'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={getImageUrl(image.storage_path)}
                alt={`Miniatura ${index + 1}`}
                className='w-full h-full object-cover rounded'
                loading='lazy'
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className='max-w-5xl'>
          <button
            onClick={() => setLightboxOpen(false)}
            className='absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10'
            aria-label='Zamknij'
          >
            <X className='w-6 h-6' />
          </button>

          <img
            src={getImageUrl(currentImage.storage_path)}
            alt={`Zdjęcie oferty ${currentIndex + 1}`}
            className='w-full h-auto max-h-[80vh] object-contain'
          />

          {sortedImages.length > 1 && (
            <div className='flex items-center justify-center gap-4 mt-4'>
              <button
                onClick={handlePrevious}
                className='bg-black/50 text-white p-2 rounded-full hover:bg-black/70'
                aria-label='Poprzednie'
              >
                <ChevronLeft className='w-6 h-6' />
              </button>
              <span className='text-sm'>
                {currentIndex + 1} / {sortedImages.length}
              </span>
              <button
                onClick={handleNext}
                className='bg-black/50 text-white p-2 rounded-full hover:bg-black/70'
                aria-label='Następne'
              >
                <ChevronRight className='w-6 h-6' />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
