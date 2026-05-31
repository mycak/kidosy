import { useNavigate } from '@tanstack/react-router';
import { AuthPageShell } from '@/features/auth/components/AuthPageShell';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { PATHS } from '@/shared/constants/paths';

export function LoginPage() {
  const navigate = useNavigate();

  return (
    <AuthPageShell
      title='Logowanie organizatora'
      description='Zaloguj się, aby zarządzać swoimi ofertami i zgłoszeniami.'
    >
      <LoginForm
        onSuccess={() => {
          void navigate({ to: PATHS.ORGANIZER.DASHBOARD });
        }}
      />
    </AuthPageShell>
  );
}
