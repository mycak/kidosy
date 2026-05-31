import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PATHS } from '@/shared/constants/paths';
import type { HomeMapSearchParams } from '@/features/home-map/schemas';

const HOME_SEARCH_DEFAULTS: HomeMapSearchParams = {
  page: 1,
  sort_by: 'date_created',
  sort_order: 'desc',
};

export function OrganizerDashboardPlaceholderPage() {
  return (
    <section className='flex flex-1 items-center justify-center bg-linear-to-br from-sky-50 via-emerald-50 to-rose-50 p-4'>
      <Card className='w-full max-w-2xl'>
        <CardHeader>
          <CardTitle>Dashboard organizatora</CardTitle>
          <CardDescription>
            Panel organizatora jest przygotowany do dalszej implementacji.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Na tym etapie wdrożyliśmy logowanie, rejestrację, reset hasła i
            wylogowanie z poziomu nagłówka.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Link to={PATHS.HOME} search={HOME_SEARCH_DEFAULTS}>
              <Button type='button' variant='outline'>
                Wróć do strony głównej
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
