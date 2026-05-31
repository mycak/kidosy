import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { supabaseClient } from '@/db/supabase.client';
import { PATHS } from '@/shared/constants/paths';

export const Route = createFileRoute('/organizer')({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      throw redirect({
        to: PATHS.AUTH.LOGIN,
      });
    }
  },
  component: OrganizerRoute,
});

function OrganizerRoute() {
  return <Outlet />;
}
