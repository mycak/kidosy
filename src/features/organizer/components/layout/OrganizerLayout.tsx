import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { PATHS } from '@/shared/constants/paths';

interface OrganizerLayoutProps {
  children: ReactNode;
}

const ORGANIZER_NAV_ITEMS = [
  {
    label: 'Dashboard',
    to: PATHS.ORGANIZER.DASHBOARD,
  },
  {
    label: 'Moje oferty',
    to: PATHS.ORGANIZER.OFFERS,
  },
  {
    label: 'Dodaj ofertę',
    to: PATHS.ORGANIZER.OFFERS_NEW,
  },
  {
    label: 'Zgłoszenia',
    to: PATHS.ORGANIZER.LEADS,
  },
  {
    label: 'Profil',
    to: PATHS.ORGANIZER.PROFILE,
  },
] as const;

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  return (
    <section className='mx-auto flex h-full w-full max-w-7xl flex-1 gap-6 px-4 py-4'>
      <aside className='hidden w-56 shrink-0 rounded-xl border bg-card p-3 md:block'>
        <nav className='flex flex-col gap-1'>
          {ORGANIZER_NAV_ITEMS.map((navigationItem) => (
            <Link
              key={navigationItem.to}
              to={navigationItem.to}
              className='rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            >
              {navigationItem.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className='min-h-0 flex-1 rounded-xl border bg-card p-4 md:p-6'>
        {children}
      </div>
    </section>
  );
}
