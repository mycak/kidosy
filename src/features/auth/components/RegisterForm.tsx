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
import { useRegisterMutation } from '@/features/auth/hooks/useAuthMutations';
import {
  registerFormSchema,
  type RegisterFormValues,
} from '@/features/auth/schemas';
import type { RegisterOrganizerResult } from '@/features/auth/api/auth.api';
import { PATHS } from '@/shared/constants/paths';

const REGISTER_ERROR_FALLBACK_MESSAGE =
  'Nie udało się utworzyć konta. Spróbuj ponownie.';

type RegisterFormProps = {
  onSuccess: (result: RegisterOrganizerResult) => void;
};

function getMutationErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return REGISTER_ERROR_FALLBACK_MESSAGE;
}

function getFieldError(error: unknown): string | undefined {
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

  return getFieldError(errors[0]);
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const registerMutation = useRegisterMutation();
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      phone: '',
      emailPublic: '',
    } as RegisterFormValues,
    onSubmit: async ({ value }) => {
      const validationResult = registerFormSchema.safeParse(value);
      if (!validationResult.success) {
        return;
      }

      setSubmitError(undefined);

      try {
        const registerResult = await registerMutation.mutateAsync({
          email: validationResult.data.email,
          password: validationResult.data.password,
          company_name: validationResult.data.companyName,
          phone: validationResult.data.phone,
          email_public: validationResult.data.emailPublic,
        });

        onSuccess(registerResult);
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
                registerFormSchema.shape.email.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='register-email'>E-mail logowania</FieldLabel>
              <FieldContent>
                <Input
                  id='register-email'
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

        <form.Field
          name='password'
          validators={{
            onChange: ({ value }) => {
              const validationResult =
                registerFormSchema.shape.password.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='register-password'>Hasło</FieldLabel>
              <FieldContent>
                <Input
                  id='register-password'
                  type='password'
                  autoComplete='new-password'
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
          name='confirmPassword'
          validators={{
            onChange: ({ value, fieldApi }) => {
              const password = fieldApi.form.getFieldValue('password');
              const validationResult =
                registerFormSchema.shape.confirmPassword.safeParse(value);

              if (!validationResult.success) {
                return validationResult.error.issues[0]?.message;
              }

              return value === password
                ? undefined
                : 'Hasła muszą być identyczne';
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='register-confirm-password'>
                Potwierdź hasło
              </FieldLabel>
              <FieldContent>
                <Input
                  id='register-confirm-password'
                  type='password'
                  autoComplete='new-password'
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
          name='companyName'
          validators={{
            onChange: ({ value }) => {
              const validationResult =
                registerFormSchema.shape.companyName.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='register-company-name'>
                Nazwa firmy
              </FieldLabel>
              <FieldContent>
                <Input
                  id='register-company-name'
                  type='text'
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
          name='phone'
          validators={{
            onChange: ({ value }) => {
              const validationResult =
                registerFormSchema.shape.phone.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='register-phone'>Telefon</FieldLabel>
              <FieldContent>
                <Input
                  id='register-phone'
                  type='tel'
                  autoComplete='tel'
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
          name='emailPublic'
          validators={{
            onChange: ({ value }) => {
              const validationResult =
                registerFormSchema.shape.emailPublic.safeParse(value);
              return validationResult.success
                ? undefined
                : validationResult.error.issues[0]?.message;
            },
          }}
        >
          {(field) => (
            <Field>
              <FieldLabel htmlFor='register-email-public'>
                Publiczny e-mail kontaktowy
              </FieldLabel>
              <FieldContent>
                <Input
                  id='register-email-public'
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
        disabled={registerMutation.isPending || !form.state.canSubmit}
      >
        {registerMutation.isPending ? 'Tworzenie konta...' : 'Zarejestruj się'}
      </Button>

      <FieldDescription className='text-center'>
        Masz już konto?{' '}
        <Link to={PATHS.AUTH.LOGIN} className='underline underline-offset-4'>
          Przejdź do logowania
        </Link>
      </FieldDescription>

      <form.Subscribe
        selector={(state) => state.errorMap}
        children={(errorMap) => {
          const errorMessage = getFieldError(errorMap.onSubmit);
          return errorMessage ? <FieldError>{errorMessage}</FieldError> : null;
        }}
      />
    </form>
  );
}
