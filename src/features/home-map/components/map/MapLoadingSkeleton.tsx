export function MapLoadingSkeleton() {
  return (
    <div className='relative h-full w-full animate-pulse bg-muted'>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='space-y-3 text-center'>
          <div className='mx-auto h-12 w-12 rounded-full bg-muted-foreground/20' />
          <div className='space-y-2'>
            <div className='mx-auto h-4 w-32 rounded bg-muted-foreground/20' />
            <div className='mx-auto h-3 w-24 rounded bg-muted-foreground/10' />
          </div>
        </div>
      </div>
      <div className='absolute left-4 top-4 space-y-2'>
        <div className='h-10 w-10 rounded-xl bg-muted-foreground/20' />
        <div className='h-10 w-10 rounded-xl bg-muted-foreground/20' />
      </div>
    </div>
  );
}
