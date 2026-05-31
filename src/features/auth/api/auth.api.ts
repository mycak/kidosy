import { supabaseClient } from '@/db/supabase.client';
import type {
  AuthResponseDto,
  LoginRequestDto,
  PasswordResetRequestDto,
  RegisterRequestDto,
} from '@/types';

const USER_ALREADY_REGISTERED_MESSAGE = 'User already registered';
const INVALID_CREDENTIALS_MESSAGE = 'Invalid login credentials';
const EMAIL_NOT_CONFIRMED_MESSAGE = 'Email not confirmed';

type AuthErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'PROCESSING_ERROR';

export class AuthApiError extends Error {
  status: number;
  code: AuthErrorCode;

  constructor(status: number, code: AuthErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type RegisterOrganizerResult = {
  userId: string;
  email: string;
  emailConfirmedAt: string | undefined;
  requiresEmailVerification: boolean;
};

function mapSupabaseAuthError(error: {
  message: string;
  status?: number;
}): AuthApiError {
  const lowerCaseMessage = error.message.toLowerCase();

  if (
    lowerCaseMessage.includes(USER_ALREADY_REGISTERED_MESSAGE.toLowerCase())
  ) {
    return new AuthApiError(
      409,
      'CONFLICT',
      'Ten adres e-mail jest już zarejestrowany.',
    );
  }

  if (lowerCaseMessage.includes(INVALID_CREDENTIALS_MESSAGE.toLowerCase())) {
    return new AuthApiError(
      401,
      'AUTH_ERROR',
      'Nieprawidłowy e-mail lub hasło.',
    );
  }

  if (lowerCaseMessage.includes(EMAIL_NOT_CONFIRMED_MESSAGE.toLowerCase())) {
    return new AuthApiError(
      403,
      'AUTH_ERROR',
      'Konto nie zostało jeszcze zweryfikowane. Sprawdź swoją skrzynkę e-mail.',
    );
  }

  if (error.status === 429) {
    return new AuthApiError(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Zbyt wiele prób. Spróbuj ponownie za chwilę.',
    );
  }

  return new AuthApiError(
    error.status ?? 500,
    'PROCESSING_ERROR',
    'Wystąpił błąd podczas przetwarzania żądania.',
  );
}

export async function registerOrganizer(
  registerPayload: RegisterRequestDto,
): Promise<RegisterOrganizerResult> {
  const { data, error } = await supabaseClient.auth.signUp({
    email: registerPayload.email,
    password: registerPayload.password,
    options: {
      data: {
        role: 'organizer',
        company_name: registerPayload.company_name,
        phone: registerPayload.phone,
        email_public: registerPayload.email_public,
      },
    },
  });

  if (error) {
    throw mapSupabaseAuthError(error);
  }

  if (!data.user) {
    throw new AuthApiError(
      500,
      'PROCESSING_ERROR',
      'Nie udało się utworzyć konta.',
    );
  }

  return {
    userId: data.user.id,
    email: data.user.email ?? registerPayload.email,
    emailConfirmedAt: data.user.email_confirmed_at ?? undefined,
    requiresEmailVerification: !data.user.email_confirmed_at,
  };
}

export async function loginOrganizer(
  loginPayload: LoginRequestDto,
): Promise<AuthResponseDto> {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: loginPayload.email,
    password: loginPayload.password,
  });

  if (error) {
    throw mapSupabaseAuthError(error);
  }

  if (!data.user || !data.session) {
    throw new AuthApiError(
      500,
      'PROCESSING_ERROR',
      'Nie udało się utworzyć sesji użytkownika.',
    );
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? loginPayload.email,
      created_at: data.user.created_at,
      role: 'organizer',
    },
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    },
  };
}

export async function requestPasswordReset(
  passwordResetPayload: PasswordResetRequestDto,
): Promise<void> {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(
    passwordResetPayload.email,
    {
      redirectTo: `${window.location.origin}/auth/password-reset/confirm`,
    },
  );

  if (error) {
    throw mapSupabaseAuthError(error);
  }
}

export async function logoutOrganizer(): Promise<{
  message: string;
  logged_out_at: string;
}> {
  const { error } = await supabaseClient.auth.signOut({ scope: 'global' });

  if (error) {
    throw mapSupabaseAuthError(error);
  }

  return {
    message: 'Wylogowano pomyślnie',
    logged_out_at: new Date().toISOString(),
  };
}
