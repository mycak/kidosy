import { z } from 'zod';

const EMAIL_REQUIRED_MESSAGE = 'Adres e-mail jest wymagany';
const EMAIL_INVALID_MESSAGE = 'Podaj poprawny adres e-mail';
const PASSWORD_REQUIRED_MESSAGE = 'Hasło jest wymagane';
const PASSWORD_MIN_LENGTH_MESSAGE = 'Hasło musi mieć co najmniej 8 znaków';
const PASSWORD_UPPERCASE_MESSAGE =
  'Hasło musi zawierać przynajmniej jedną wielką literę';
const PASSWORD_LOWERCASE_MESSAGE =
  'Hasło musi zawierać przynajmniej jedną małą literę';
const PASSWORD_DIGIT_MESSAGE = 'Hasło musi zawierać przynajmniej jedną cyfrę';
const PASSWORD_SPECIAL_CHAR_MESSAGE =
  'Hasło musi zawierać przynajmniej jeden znak specjalny';
const PASSWORD_MISMATCH_MESSAGE = 'Hasła muszą być identyczne';
const COMPANY_NAME_MIN_LENGTH_MESSAGE =
  'Nazwa firmy musi mieć co najmniej 2 znaki';
const PHONE_INVALID_MESSAGE = 'Podaj poprawny numer telefonu';

const PASSWORD_SPECIAL_CHAR_REGEX = /[!@#$%^&*]/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_DIGIT_REGEX = /[0-9]/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

export const loginFormSchema = z.object({
  email: z.string().min(1, EMAIL_REQUIRED_MESSAGE).email(EMAIL_INVALID_MESSAGE),
  password: z
    .string()
    .min(1, PASSWORD_REQUIRED_MESSAGE)
    .min(8, PASSWORD_MIN_LENGTH_MESSAGE),
});

export const registerFormSchema = z
  .object({
    email: z
      .string()
      .min(1, EMAIL_REQUIRED_MESSAGE)
      .email(EMAIL_INVALID_MESSAGE),
    password: z
      .string()
      .min(1, PASSWORD_REQUIRED_MESSAGE)
      .min(8, PASSWORD_MIN_LENGTH_MESSAGE)
      .regex(PASSWORD_UPPERCASE_REGEX, PASSWORD_UPPERCASE_MESSAGE)
      .regex(PASSWORD_LOWERCASE_REGEX, PASSWORD_LOWERCASE_MESSAGE)
      .regex(PASSWORD_DIGIT_REGEX, PASSWORD_DIGIT_MESSAGE)
      .regex(PASSWORD_SPECIAL_CHAR_REGEX, PASSWORD_SPECIAL_CHAR_MESSAGE),
    confirmPassword: z.string().min(1, PASSWORD_REQUIRED_MESSAGE),
    companyName: z.string().min(2, COMPANY_NAME_MIN_LENGTH_MESSAGE),
    phone: z.string().regex(PHONE_REGEX, PHONE_INVALID_MESSAGE),
    emailPublic: z
      .string()
      .min(1, EMAIL_REQUIRED_MESSAGE)
      .email(EMAIL_INVALID_MESSAGE),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: PASSWORD_MISMATCH_MESSAGE,
  });

export const passwordResetRequestFormSchema = z.object({
  email: z.string().min(1, EMAIL_REQUIRED_MESSAGE).email(EMAIL_INVALID_MESSAGE),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type PasswordResetRequestFormValues = z.infer<
  typeof passwordResetRequestFormSchema
>;
