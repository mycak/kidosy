import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import {
  LayoutDashboard,
  MessagesSquare,
  PlusCircle,
  Settings2,
  UserRound,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DEFAULT_ORGANIZER_LEADS_SEARCH } from '@/features/organizer/constants/leads-search.constants';
import { DEFAULT_ORGANIZER_OFFERS_SEARCH } from '@/features/organizer/constants/offers-search.constants';
import { PATHS } from '@/shared/constants/paths';

interface OrganizerLayoutProps {
  children: ReactNode;
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  return (
    <section className='mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 gap-6 overflow-hidden px-4 py-4'>
      <aside className='ui-entrance ui-panel sticky top-24 hidden w-60 shrink-0 overflow-hidden rounded-[28px] p-4 md:block'>
        <div className='mb-4 flex items-center justify-between gap-2'>
          <div>
            <p className='text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground'>
              organizer hub
            </p>
            <h2 className='mt-1 text-sm font-semibold'>Centrum sterowania</h2>
          </div>
          <Badge variant='secondary'>pro</Badge>
        </div>

        <Separator className='mb-4' />

        <nav className='flex flex-col gap-1'>
          <Link
            to={PATHS.ORGANIZER.DASHBOARD}
            className='inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground hover:shadow-sm'
          >
            <LayoutDashboard className='size-4' />
            Dashboard
          </Link>

          <Link
            to={PATHS.ORGANIZER.OFFERS}
            search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
            className='inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground hover:shadow-sm'
          >
            <LayoutDashboard className='size-4' />
            Moje oferty
          </Link>

          <Link
            to={PATHS.ORGANIZER.OFFERS_NEW}
            search={DEFAULT_ORGANIZER_OFFERS_SEARCH}
            className='inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground hover:shadow-sm'
          >
            <PlusCircle className='size-4' />
            Dodaj ofertę
          </Link>

          <Link
            to={PATHS.ORGANIZER.LEADS}
            search={DEFAULT_ORGANIZER_LEADS_SEARCH}
            className='inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground hover:shadow-sm'
          >
            <MessagesSquare className='size-4' />
            Zgłoszenia
          </Link>

          <Link
            to={PATHS.ORGANIZER.PROFILE}
            className='inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-white/80 hover:text-foreground hover:shadow-sm'
          >
            <UserRound className='size-4' />
            Profil
          </Link>
        </nav>

        <div className='mt-4 rounded-2xl border border-white/60 bg-white/60 p-3 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2 font-medium text-foreground'>
            <Settings2 className='size-3.5' />
            Szybkie wskazówki
          </div>
          <p className='mt-2 leading-5'>
            Dodawaj oferty, reaguj na zgłoszenia i utrzymuj profil w jednym,
            czytelnym widoku.
          </p>
        </div>
      </aside>

      <div className='ui-entrance ui-panel min-h-0 flex flex-1 flex-col overflow-hidden rounded-[28px] p-4 md:p-6'>
        <div className='ui-scrollbar-thin min-h-0 flex-1 overflow-y-auto pr-5 [scrollbar-gutter:stable] md:pr-6'>
          {children}
        </div>
      </div>
    </section>
  );
}
