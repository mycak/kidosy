import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { FieldDescription } from '@/components/ui/field';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { AuthPageShell } from '@/features/auth/components/AuthPageShell';
import type { RegisterOrganizerResult } from '@/features/auth/api/auth.api';
import { PATHS } from '@/shared/constants/paths';

export function RegisterPage() {
  const [registrationResult, setRegistrationResult] =
    useState<RegisterOrganizerResult | null>(null);

  if (registrationResult) {
    return (
      <AuthPageShell
        title='Konto zostało utworzone'
        description='Sprawdź skrzynkę e-mail, aby dokończyć aktywację konta.'
      >
        <div className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Wysłaliśmy wiadomość weryfikacyjną na adres:
          </p>
          <p className='text-sm font-medium'>{registrationResult.email}</p>
          <FieldDescription>
            Po potwierdzeniu adresu e-mail wróć do logowania.
          </FieldDescription>
          <Link
            to={PATHS.AUTH.LOGIN}
            className='text-sm underline underline-offset-4'
          >
            Przejdź do logowania
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title='Rejestracja organizatora'
      description='Załóż konto, aby publikować i zarządzać ofertami zajęć.'
    >
      <RegisterForm
        onSuccess={(result) => {
          setRegistrationResult(result);
        }}
      />
    </AuthPageShell>
  );
}
