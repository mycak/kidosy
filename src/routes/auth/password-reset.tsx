import { createFileRoute } from '@tanstack/react-router';
import { PasswordResetRequestPage } from '@/features/auth/components/PasswordResetRequestPage';

export const Route = createFileRoute('/auth/password-reset')({
  component: PasswordResetRequestPage,
});
