import {
  api,
  readApiMessage,
  readBoolean,
  readRecord,
  readString,
} from '@/lib/api'

export interface LoginPayload {
  countryCode: string
  mobileNumber: string
  password: string
}

export interface LoginResult {
  success: boolean
  message: string
  token: string
  mustChangePassword: boolean
  userId: string | null
}

export interface InitPasswordResetPayload {
  channel: 'email' | 'whatsapp'
  email?: string
  countryCode?: string
  mobileNumber?: string
}

export interface ResetPasswordPayload {
  token: string
  newPassword: string
  email?: string
  countryCode?: string
  mobileNumber?: string
}

export interface ChangePasswordPayload {
  userId: string
  currentPassword: string
  newPassword: string
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const { data } = await api.post('/api/Authentication/Login', {
    CountryCode: payload.countryCode,
    MobileNumber: payload.mobileNumber,
    Password: payload.password,
    LoginByType: 'mobile',
  })

  const response = readRecord(data) ?? {}

  return {
    success: readBoolean(response, 'Success', 'success') ?? false,
    message:
      readString(response, 'Message', 'message', 'Error', 'error') ??
      'Unable to sign in.',
    token: readString(response, 'Token', 'token') ?? '',
    mustChangePassword:
      readBoolean(response, 'MustChangePassword', 'mustChangePassword') ?? false,
    userId: readString(response, 'UserId', 'userId') ?? null,
  }
}

export async function logout(): Promise<void> {
  await api.post('/api/Authentication/Logout')
}

export async function initPasswordReset(
  payload: InitPasswordResetPayload
): Promise<string> {
  const { data } = await api.post('/api/Authentication/ResetInitPassword', {
    Channel: payload.channel,
    Email: payload.email?.trim() || null,
    CountryCode: payload.countryCode?.trim() || null,
    MobileNumber: payload.mobileNumber?.trim() || null,
  })

  return readApiMessage(data, 'Reset code sent successfully.')
}

export async function resetPassword(
  payload: ResetPasswordPayload
): Promise<string> {
  const { data } = await api.post('/api/Authentication/ResetPassword', {
    Token: payload.token.trim(),
    NewPassword: payload.newPassword,
    Email: payload.email?.trim() || null,
    CountryCode: payload.countryCode?.trim() || null,
    MobileNumber: payload.mobileNumber?.trim() || null,
  })

  return readApiMessage(data, 'Password reset successfully.')
}

export async function changePassword(
  payload: ChangePasswordPayload
): Promise<string> {
  const { data } = await api.post('/api/Authentication/ChangePassword', {
    UserId: payload.userId,
    CurrentPassword: payload.currentPassword,
    NewPassword: payload.newPassword,
  })

  return readApiMessage(data, 'Password updated successfully.')
}
