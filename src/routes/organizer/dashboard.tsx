import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Archive,
  BadgeCheck,
  ChartColumnIncreasing,
  Clock3,
  LayoutDashboard,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import { useOrganizerDashboardQuery } from '@/features/organizer/api/organizer.queries';
import { DEFAULT_ORGANIZER_OFFERS_SEARCH } from '@/features/organizer/constants/offers-search.constants';
import { getOfferStatusLabel } from '@/features/organizer/constants/offer-status.constants';

export const Route = createFileRoute('/organizer/dashboard')({
  component: OrganizerDashboardRoute,
});

function OrganizerDashboardRoute() {
  const { user } = useAuthSession();

  const dashboardQuery = useOrganizerDashboardQuery(user?.id);

  if (!user) {
    return (
      <p className='text-sm text-muted-foreground'>
        Brak aktywnej sesji użytkownika.
      </p>
    );
  }

  if (dashboardQuery.isLoading) {
    return (
      <p className='text-sm text-muted-foreground'>Ładowanie dashboardu...</p>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <p className='text-sm text-destructive'>
        Nie udało się pobrać danych dashboardu.
      </p>
    );
  }

  const { summary, recentOffers } = dashboardQuery.data;

  return (
    <section className='flex flex-1 flex-col gap-6'>
      <header className='ui-entrance ui-panel flex flex-col gap-3 rounded-[28px] p-5'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='secondary' className='gap-1.5 rounded-full px-3 py-1'>
            <Sparkles className='size-3' />
            organizer dashboard
          </Badge>
          <Badge variant='outline' className='gap-1.5 rounded-full px-3 py-1'>
            <ChartColumnIncreasing className='size-3' />
            na bieżąco
          </Badge>
        </div>
        <div>
          <h1 className='text-3xl font-semibold tracking-tight'>
            Dashboard organizatora
          </h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Podsumowanie Twoich ofert i zgłoszeń.
          </p>
        </div>
      </header>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          label='Wszystkie oferty'
          value={summary.totalOffers}
          icon={LayoutDashboard}
          accentClassName='from-sky-500 to-cyan-400'
        />
        <MetricCard
          label='Szkice'
          value={summary.draftCount}
          icon={Clock3}
          accentClassName='from-amber-500 to-orange-400'
        />
        <MetricCard
          label='W moderacji'
          value={summary.pendingReviewCount}
          icon={BadgeCheck}
          accentClassName='from-violet-500 to-fuchsia-400'
        />
        <MetricCard
          label='Opublikowane'
          value={summary.publishedCount}
          icon={Users}
          accentClassName='from-emerald-500 to-teal-400'
        />
        <MetricCard
          label='Odrzucone'
          value={summary.rejectedCount}
          icon={Archive}
          accentClassName='from-rose-500 to-pink-400'
        />
        <MetricCard
          label='Archiwalne'
          value={summary.archivedCount}
          icon={Archive}
          accentClassName='from-slate-500 to-slate-400'
        />
        <MetricCard
          label='Wszystkie zgłoszenia'
          value={summary.totalLeads}
          icon={ChartColumnIncreasing}
          accentClassName='from-sky-500 to-indigo-400'
        />
      </div>

      <section className='flex flex-col gap-3'>
        <div className='flex items-center justify-between gap-2'>
          <h2 className='text-lg font-medium'>Ostatnio aktualizowane oferty</h2>
          <Link
            to='/organizer/offers'
            search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
            className='inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline'
          >
            Zobacz wszystkie
            <ArrowRight className='size-3.5' />
          </Link>
        </div>

        {recentOffers.length === 0 ? (
          <div className='ui-panel rounded-[24px] border-dashed p-5 text-sm text-muted-foreground'>
            <div className='flex items-center gap-2 font-medium text-foreground'>
              <Sparkles className='size-4 text-sky-500' />
              Nie masz jeszcze żadnych ofert.
            </div>
            <p className='mt-2 max-w-xl leading-6'>
              Dodaj pierwszą ofertę, aby zacząć zbierać zgłoszenia i zobaczyć
              statystyki w tym miejscu.
            </p>
          </div>
        ) : (
          <ul className='flex flex-col gap-2'>
            {recentOffers.map((recentOffer) => (
              <li
                key={recentOffer.id}
                className='ui-panel rounded-2xl px-4 py-3 text-sm transition-all hover:-translate-y-0.5'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='font-medium'>{recentOffer.title}</span>
                  <Link
                    to='/organizer/offers/$id/edit'
                    params={{ id: recentOffer.id }}
                    search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
                    className='inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline'
                  >
                    Edytuj
                    <ArrowRight className='size-3.5' />
                  </Link>
                </div>
                <p className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  <Badge variant='outline' className='rounded-full px-2 py-0.5'>
                    Status: {getOfferStatusLabel(recentOffer.status)}
                  </Badge>
                  <span>Zgłoszenia: {recentOffer.leadsCount}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  accentClassName: string;
};

function MetricCard({
  label,
  value,
  icon: Icon,
  accentClassName,
}: MetricCardProps) {
  return (
    <article className='ui-panel rounded-[24px] p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <p className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>
            {label}
          </p>
          <p className='mt-2 text-3xl font-semibold tracking-tight'>{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-lg ${accentClassName}`}
        >
          <Icon className='size-5' />
        </div>
      </div>
    </article>
  );
}
