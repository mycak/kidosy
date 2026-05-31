import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { DEFAULT_ORGANIZER_LEADS_SEARCH } from '@/features/organizer/constants/leads-search.constants';
import { DEFAULT_ORGANIZER_OFFERS_SEARCH } from '@/features/organizer/constants/offers-search.constants';
import { PATHS } from '@/shared/constants/paths';

interface OrganizerLayoutProps {
  children: ReactNode;
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  return (
    <section className='mx-auto flex h-full w-full max-w-7xl flex-1 gap-6 px-4 py-4'>
      <aside className='hidden w-56 shrink-0 rounded-xl border bg-card p-3 md:block'>
        <nav className='flex flex-col gap-1'>
          <Link
            to={PATHS.ORGANIZER.DASHBOARD}
            className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            Dashboard
          </Link>

          <Link
            to={PATHS.ORGANIZER.OFFERS}
            search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
            className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            Moje oferty
          </Link>

          <Link
            to={PATHS.ORGANIZER.OFFERS_NEW}
            search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
            className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            Dodaj ofertę
          </Link>

          <Link
            to={PATHS.ORGANIZER.LEADS}
            search={DEFAULT_ORGANIZER_LEADS_SEARCH}
            className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            Zgłoszenia
          </Link>

          <Link
            to={PATHS.ORGANIZER.PROFILE}
            className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          >
            Profil
          </Link>
        </nav>
      </aside>

      <div className='min-h-0 flex-1 rounded-xl border bg-card p-4 md:p-6'>
        {children}
      </div>
    </section>
  );
}
