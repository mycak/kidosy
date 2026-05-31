import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Baby, ChevronDown, LayoutDashboard, LogOut, Sparkles, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthSession } from '@/features/auth/context/useAuthSession';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import { PATHS } from '@/shared/constants/paths';
import type { HomeMapSearchParams } from '@/features/home-map/schemas';

const BRAND_LETTERS = [
  { letter: 'K', className: 'text-sky-500' },
  { letter: 'i', className: 'text-emerald-500' },
  { letter: 'd', className: 'text-rose-400' },
  { letter: 'o', className: 'text-amber-400' },
  { letter: 's', className: 'text-violet-400' },
  { letter: 'y', className: 'text-teal-500' },
];

const EMAIL_PREVIEW_LENGTH = 24;
const HOME_SEARCH_DEFAULTS: HomeMapSearchParams = {
  page: 1,
  sort_by: 'date_created',
  sort_order: 'desc',
};

function buildUserDisplayName(email: string | undefined): string {
  if (!email) {
    return 'Organizator';
  }

  if (email.length <= EMAIL_PREVIEW_LENGTH) {
    return email;
  }

  return `${email.slice(0, EMAIL_PREVIEW_LENGTH)}…`;
}

export function AppHeader() {
  const navigate = useNavigate();
  const { user, clearSession } = useAuthSession();
  const logoutMutation = useLogoutMutation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      clearSession();
    } finally {
      setIsMenuOpen(false);
      void navigate({ to: PATHS.HOME, search: HOME_SEARCH_DEFAULTS });
    }
  };

  return (
    <header className='sticky top-0 z-40 border-b border-white/70 bg-white/92 px-4 py-3 shadow-[0_12px_28px_-24px_rgb(15_23_42/0.55)] backdrop-blur-xl'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-3'>
        <Link
          to={PATHS.HOME}
          search={HOME_SEARCH_DEFAULTS}
          className='group inline-flex items-center gap-3'
        >
          <span className='flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-sky-500 via-emerald-500 to-rose-500 text-white shadow-lg shadow-sky-500/20 transition-transform duration-300 group-hover:scale-105'>
            <Baby className='size-4' />
          </span>

          <span className='flex flex-col'>
            <span className='text-2xl font-bold tracking-tight sm:text-3xl'>
              {BRAND_LETTERS.map((item, index) => (
                <span key={`${item.letter}-${index}`} className={item.className}>
                  {item.letter}
                </span>
              ))}
            </span>
            <span className='-mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.24em] text-muted-foreground'>
              marketplace dla zajęć
            </span>
          </span>
        </Link>

        {user ? (
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' size='sm' className='gap-2 rounded-full border-white/60 bg-white/80 px-3 shadow-sm'>
                <UserRound className='size-3.5' />
                <span className='max-w-32 truncate'>{buildUserDisplayName(user.email)}</span>
                <ChevronDown className='size-3.5 opacity-70' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel className='flex items-center justify-between gap-2'>
                <span>Konto organizatora</span>
                <Badge variant='secondary'>online</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  void navigate({ to: PATHS.ORGANIZER.DASHBOARD });
                }}
              >
                <LayoutDashboard className='size-4' />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  void handleLogout();
                }}
                disabled={logoutMutation.isPending}
              >
                <LogOut className='size-4' />
                {logoutMutation.isPending ? 'Wylogowywanie...' : 'Wyloguj się'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to={PATHS.AUTH.LOGIN}>
            <Button
              type='button'
              variant='secondary'
              className='h-10 gap-2 rounded-full px-5 text-sm font-semibold shadow-sm hover:cursor-pointer'
            >
              <Sparkles className='size-3.5' />
              Dla organizatorów
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
