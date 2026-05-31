type OrganizerToastProps = {
  message: string;
  variant: 'success' | 'error';
  onClose: () => void;
};

const TOAST_VARIANT_CLASSES = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
  error: 'border-destructive/40 bg-destructive/10 text-destructive',
} as const;

export function OrganizerToast({
  message,
  variant,
  onClose,
}: OrganizerToastProps) {
  return (
    <div className='fixed right-4 top-4 z-50 max-w-sm'>
      <div
        className={`rounded-md border px-3 py-2 text-sm shadow ${TOAST_VARIANT_CLASSES[variant]}`}
      >
        <div className='flex items-start justify-between gap-3'>
          <p>{message}</p>
          <button
            type='button'
            onClick={onClose}
            className='text-xs underline-offset-2 hover:underline'
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
}
