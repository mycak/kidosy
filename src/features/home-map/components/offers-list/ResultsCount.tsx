interface ResultsCountProps {
  totalResults: number;
  isLoading: boolean;
}

const DEFAULT_RESULTS_COUNT = 0;

export function ResultsCount({ totalResults, isLoading }: ResultsCountProps) {
  return (
    <div className='text-sm font-medium'>
      Znaleziono:{' '}
      <span className='font-bold'>
        {isLoading ? '...' : totalResults || DEFAULT_RESULTS_COUNT}
      </span>{' '}
      ofert
    </div>
  );
}
