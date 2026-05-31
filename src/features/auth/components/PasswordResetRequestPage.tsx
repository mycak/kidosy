import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { FieldDescription } from '@/components/ui/field';
import { AuthPageShell } from '@/features/auth/components/AuthPageShell';
import { PasswordResetRequestForm } from '@/features/auth/components/PasswordResetRequestForm';
import { PATHS } from '@/shared/constants/paths';

export function PasswordResetRequestPage() {
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);

  if (requestedEmail) {
    return (
      <AuthPageShell
        title='Sprawdź skrzynkę e-mail'
        description='Jeśli konto istnieje, wysłaliśmy link do resetu hasła.'
      >
        <div className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Wysłaliśmy instrukcję resetowania hasła na adres:
          </p>
          <p className='text-sm font-medium'>{requestedEmail}</p>
          <FieldDescription>
            Link będzie aktywny przez ograniczony czas.
          </FieldDescription>
          <Link
            to={PATHS.AUTH.LOGIN}
            className='text-sm underline underline-offset-4'
          >
            Wróć do logowania
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title='Reset hasła'
      description='Podaj e-mail, a wyślemy Ci link do ustawienia nowego hasła.'
    >
      <PasswordResetRequestForm
        onSuccess={(email) => {
          setRequestedEmail(email);
        }}
      />
    </AuthPageShell>
  );
}
