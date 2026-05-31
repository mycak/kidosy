import { createFileRoute } from '@tanstack/react-router';
import { OrganizerDashboardPlaceholderPage } from '@/features/auth/components/OrganizerDashboardPlaceholderPage';

export const Route = createFileRoute('/organizer/dashboard')({
  component: OrganizerDashboardPlaceholderPage,
});
