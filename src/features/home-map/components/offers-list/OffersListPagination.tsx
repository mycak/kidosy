import { Button } from '@/components/ui/button';

interface OffersListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const MIN_PAGE = 1;

export function OffersListPagination({
  currentPage,
  totalPages,
  onPageChange,
}: OffersListPaginationProps) {
  if (totalPages <= MIN_PAGE) {
    return null;
  }

  const canGoBack = currentPage > MIN_PAGE;
  const canGoNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canGoBack) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className='flex items-center justify-between border-t p-4'>
      <Button
        variant='outline'
        size='sm'
        disabled={!canGoBack}
        onClick={handlePrev}
      >
        Poprzednia
      </Button>
      <div className='text-sm text-muted-foreground'>
        Strona {currentPage} z {totalPages}
      </div>
      <Button
        variant='outline'
        size='sm'
        disabled={!canGoNext}
        onClick={handleNext}
      >
        Następna
      </Button>
    </div>
  );
}
