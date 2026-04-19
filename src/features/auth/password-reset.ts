export type PasswordResetChannel = 'email' | 'whatsapp'

export interface PasswordResetContext {
  channel: PasswordResetChannel
  email?: string
  countryCode?: string
  mobileNumber?: string
}

const PASSWORD_RESET_STORAGE_KEY = 'edufrais_admin_password_reset'

export function writePasswordResetContext(
  context: PasswordResetContext
): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(
    PASSWORD_RESET_STORAGE_KEY,
    JSON.stringify(context)
  )
}

export function readPasswordResetContext(): PasswordResetContext | null {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.sessionStorage.getItem(PASSWORD_RESET_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as PasswordResetContext

    if (parsed.channel === 'email' || parsed.channel === 'whatsapp') {
      return parsed
    }

    return null
  } catch {
    return null
  }
}

export function clearPasswordResetContext(): void {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(PASSWORD_RESET_STORAGE_KEY)
}

export function formatPasswordResetDestination(
  context: PasswordResetContext | null
): string {
  if (!context) {
    return 'your selected contact method'
  }

  if (context.channel === 'email') {
    return context.email || 'your registered email'
  }

  const countryCode = context.countryCode?.trim() || ''
  const mobileNumber = context.mobileNumber?.trim() || ''

  return countryCode || mobileNumber
    ? `+${countryCode} ${mobileNumber}`.trim()
    : 'your registered WhatsApp number'
}
