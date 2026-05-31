import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePasswordResetRequestMutation } from '@/features/auth/hooks/useAuthMutations';
import {
  passwordResetRequestFormSchema,
  type PasswordResetRequestFormValues,
} from '@/features/auth/schemas';
import { PATHS } from '@/shared/constants/paths';

const PASSWORD_RESET_ERROR_FALLBACK_MESSAGE =
  'Nie udało się wysłać wiadomości resetującej hasło.';

function getFirstFieldErrorMessage(
  errors: unknown[] | undefined,
): string | undefined {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  const firstError = errors[0];
  if (typeof firstError === 'string') {
    return firstError;
  }

  if (firstError && typeof firstError === 'object' && 'message' in firstError) {
    const message = (firstError as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }

  return undefined;
}

type PasswordResetRequestFormProps = {
  onSuccess: (email: string) => void;
};

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return PASSWORD_RESET_ERROR_FALLBACK_MESSAGE;
}

export function PasswordResetRequestForm({
  onSuccess,
}: PasswordResetRequestFormProps) {
  const passwordResetMutation = usePasswordResetRequestMutation();
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const form = useForm({
    defaultValues: {
      email: '',
    } as PasswordResetRequestFormValues,
    onSubmit: async ({ value }) => {
      const validationResult = passwordResetRequestFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }

      setSubmitError(undefined);

      try {
        await passwordResetMutation.mutateAsync({
          email: validationResult.data.email,
        });
        onSuccess(validationResult.data.email);
      } catch (error) {
        setSubmitError(getMutationErrorMessage(error));
      }
    },
  });

  return (
    <form
      className='space-y-4'
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <FieldGroup>
        <form.Field
          name='email'
          validators={{
            onChange: ({ value }) => {
              const validationResult =
                passwordResetRequestFormSchema.shape.email.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='password-reset-email'>
                E-mail konta
              </FieldLabel>
              <FieldContent>
                <Input
                  id='password-reset-email'
                  type='email'
                  autoComplete='email'
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError>
                  {getFirstFieldErrorMessage(field.state.meta.errors)}
                </FieldError>
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      {submitError && <FieldError>{submitError}</FieldError>}

      <Button
        type='submit'
        className='w-full'
        disabled={passwordResetMutation.isPending || !form.state.canSubmit}
      >
        {passwordResetMutation.isPending
          ? 'Wysyłanie...'
          : 'Wyślij link resetujący'}
      </Button>

      <FieldDescription className='text-center'>
        <Link to={PATHS.AUTH.LOGIN} className='underline underline-offset-4'>
          Wróć do logowania
        </Link>
      </FieldDescription>
    </form>
  );
}
