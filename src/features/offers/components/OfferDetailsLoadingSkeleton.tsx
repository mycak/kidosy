export function OfferDetailsLoadingSkeleton() {
  return (
    <div className='container mx-auto px-4 py-8 animate-pulse'>
      <div className='h-5 bg-gray-200 rounded w-48 mb-6' />

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        <div className='lg:col-span-2 space-y-6'>
          <div className='space-y-2'>
            <div className='h-10 bg-gray-200 rounded w-3/4' />
            <div className='h-5 bg-gray-200 rounded w-1/3' />
          </div>

          <div className='aspect-video bg-gray-200 rounded-lg' />

          <div className='space-y-2'>
            <div className='h-6 bg-gray-200 rounded w-1/4' />
            <div className='h-4 bg-gray-200 rounded w-full' />
            <div className='h-4 bg-gray-200 rounded w-full' />
            <div className='h-4 bg-gray-200 rounded w-2/3' />
          </div>

          <div className='border rounded-lg p-6 space-y-4'>
            <div className='h-6 bg-gray-200 rounded w-1/3' />
            <div className='grid grid-cols-2 gap-4'>
              {[...Array(4)].map((_, i) => (
                <div key={i} className='h-16 bg-gray-200 rounded' />
              ))}
            </div>
          </div>
        </div>

        <aside className='space-y-6'>
          <div className='border rounded-lg p-6 space-y-3'>
            <div className='h-6 bg-gray-200 rounded w-1/2' />
            <div className='h-5 bg-gray-200 rounded w-3/4' />
            <div className='h-5 bg-gray-200 rounded w-2/3' />
          </div>

          <div className='h-12 bg-gray-200 rounded-lg' />
        </aside>
      </div>
    </div>
  );
}
