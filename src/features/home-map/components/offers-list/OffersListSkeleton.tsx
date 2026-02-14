const SKELETON_ITEMS = 4;

export function OffersListSkeleton() {
  return (
    <div className='space-y-3'>
      {Array.from({ length: SKELETON_ITEMS }).map((_, index) => (
        <div
          key={`offer-skeleton-${index}`}
          className='animate-pulse rounded-lg border p-4'
        >
          <div className='mb-3 h-4 w-2/3 rounded bg-muted' />
          <div className='mb-4 h-3 w-full rounded bg-muted' />
          <div className='space-y-2'>
            <div className='h-3 w-3/4 rounded bg-muted' />
            <div className='h-3 w-1/2 rounded bg-muted' />
          </div>
        </div>
      ))}
    </div>
  );
}
