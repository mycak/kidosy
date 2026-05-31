import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut, LayoutDashboard } from 'lucide-react';
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
    <header className='sticky top-0 z-40 border-b border-white/50 bg-white/85 px-4 py-3 backdrop-blur'>
      <div className='mx-auto flex w-full max-w-7xl items-center justify-between gap-3'>
        <Link
          to={PATHS.HOME}
          search={HOME_SEARCH_DEFAULTS}
          className='inline-flex items-center gap-2'
        >
          <span className='text-2xl font-bold tracking-tight sm:text-3xl'>
            {BRAND_LETTERS.map((item, index) => (
              <span key={`${item.letter}-${index}`} className={item.className}>
                {item.letter}
              </span>
            ))}
          </span>
        </Link>

        {user ? (
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button type='button' variant='outline' size='sm'>
                {buildUserDisplayName(user.email)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>Konto organizatora</DropdownMenuLabel>
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
            <Button type='button' variant='secondary'>
              Dla organizatorów
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
