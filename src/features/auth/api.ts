import {
  api,
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
