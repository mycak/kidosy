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
import {
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_CTA_CLASS,
} from '@/features/auth/constants/ui';
import { useLoginMutation } from '@/features/auth/hooks/useAuthMutations';
import { loginFormSchema, type LoginFormValues } from '@/features/auth/schemas';
import { PATHS } from '@/shared/constants/paths';

const LOGIN_ERROR_FALLBACK_MESSAGE =
  'Nie udało się zalogować. Spróbuj ponownie.';

interface LoginFormProps {
  onSuccess: () => void;
}

function getErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  return undefined;
}

function getFirstFieldErrorMessage(
  errors: unknown[] | undefined,
): string | undefined {
  if (!errors || errors.length === 0) {
    return undefined;
  }

  return getErrorMessage(errors[0]);
}

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return LOGIN_ERROR_FALLBACK_MESSAGE;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const loginMutation = useLoginMutation();
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    } as LoginFormValues,
    onSubmit: async ({ value }) => {
      const validationResult = loginFormSchema.safeParse(value);

      if (!validationResult.success) {
        return;
      }

      setSubmitError(undefined);

      try {
        await loginMutation.mutateAsync(validationResult.data);
        onSuccess();
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
                loginFormSchema.shape.email.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='login-email'>E-mail</FieldLabel>
              <FieldContent>
                <Input
                  id='login-email'
                  type='email'
                  autoComplete='email'
                  className={AUTH_INPUT_CLASS}
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

        <form.Field
          name='password'
          validators={{
            onChange: ({ value }) => {
              const validationResult =
                loginFormSchema.shape.password.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='login-password'>Hasło</FieldLabel>
              <FieldContent>
                <Input
                  id='login-password'
                  type='password'
                  autoComplete='current-password'
                  className={AUTH_INPUT_CLASS}
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
        className={AUTH_PRIMARY_CTA_CLASS}
        disabled={loginMutation.isPending || !form.state.canSubmit}
      >
        {loginMutation.isPending ? 'Logowanie...' : 'Zaloguj się'}
      </Button>

      <FieldDescription className='text-center'>
        <Link
          to={PATHS.AUTH.PASSWORD_RESET}
          className='underline underline-offset-4'
        >
          Nie pamiętasz hasła?
        </Link>
      </FieldDescription>

      <FieldDescription className='text-center'>
        Nie masz konta?{' '}
        <Link to={PATHS.AUTH.REGISTER} className='underline underline-offset-4'>
          Zarejestruj się
        </Link>
      </FieldDescription>

      <form.Subscribe
        selector={(state) => state.errorMap}
        children={(errorMap) => {
          const errorMessage = getErrorMessage(errorMap.onSubmit);
          return errorMessage ? <FieldError>{errorMessage}</FieldError> : null;
        }}
      />
    </form>
  );
}
