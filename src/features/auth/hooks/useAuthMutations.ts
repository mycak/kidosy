import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  loginOrganizer,
  logoutOrganizer,
  registerOrganizer,
  requestPasswordReset,
} from '@/features/auth/api/auth.api';
import type {
  LoginRequestDto,
  PasswordResetRequestDto,
  RegisterRequestDto,
} from '@/types';

export function useLoginMutation() {
  return useMutation({
    mutationFn: (loginPayload: LoginRequestDto) => loginOrganizer(loginPayload),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (registerPayload: RegisterRequestDto) =>
      registerOrganizer(registerPayload),
  });
}

export function usePasswordResetRequestMutation() {
  return useMutation({
    mutationFn: (passwordResetPayload: PasswordResetRequestDto) =>
      requestPasswordReset(passwordResetPayload),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => logoutOrganizer(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
