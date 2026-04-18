export interface AuthUser {
  userId: string
  entityUserId: number | null
  name: string
  email: string
  phoneNumber: string
  roles: string[]
  schoolIds: number[]
  exp: number
}

const CLAIM_NAMES = {
  userId: [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
    'sub',
  ],
  role: ['http://schemas.microsoft.com/ws/2008/06/identity/claims/role', 'role'],
  name: ['Name', 'name', 'unique_name'],
  email: ['Email', 'email'],
  phoneNumber: ['phoneNumber', 'phone_number'],
  school: ['School', 'school'],
  entityUserId: ['EntityUserId', 'entityUserId'],
  exp: ['exp'],
} as const

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4
  const padded =
    padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), '=')

  return window.atob(padded)
}

function readClaim(
  payload: Record<string, unknown>,
  claimNames: readonly string[]
): unknown {
  for (const claimName of claimNames) {
    if (claimName in payload) {
      return payload[claimName]
    }
  }

  return undefined
}

function normalizeRoles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((role): role is string => typeof role === 'string')
  }

  return typeof value === 'string' && value.length > 0 ? [value] : []
}

function normalizeSchoolIds(value: unknown): number[] {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return []
  }

  return value
    .split(',')
    .map((schoolId) => Number.parseInt(schoolId.trim(), 10))
    .filter((schoolId) => Number.isFinite(schoolId) && schoolId > 0)
}

export function parseJwt(token: string): Record<string, unknown> | null {
  if (!token) {
    return null
  }

  const segments = token.split('.')
  if (segments.length !== 3) {
    return null
  }

  try {
    const decoded = decodeBase64Url(segments[1])
    const parsed = JSON.parse(decoded)

    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>
    }

    return null
  } catch {
    return null
  }
}

export function parseAuthUser(token: string): AuthUser | null {
  const payload = parseJwt(token)
  if (!payload) {
    return null
  }

  const userId = readClaim(payload, CLAIM_NAMES.userId)
  const exp = readClaim(payload, CLAIM_NAMES.exp)

  if (typeof userId !== 'string' || typeof exp !== 'number') {
    return null
  }

  const entityUserIdValue = readClaim(payload, CLAIM_NAMES.entityUserId)
  const entityUserId =
    typeof entityUserIdValue === 'string'
      ? Number.parseInt(entityUserIdValue, 10)
      : typeof entityUserIdValue === 'number'
        ? entityUserIdValue
        : null

  return {
    userId,
    entityUserId: Number.isFinite(entityUserId) ? entityUserId : null,
    name:
      typeof readClaim(payload, CLAIM_NAMES.name) === 'string'
        ? (readClaim(payload, CLAIM_NAMES.name) as string)
        : '',
    email:
      typeof readClaim(payload, CLAIM_NAMES.email) === 'string'
        ? (readClaim(payload, CLAIM_NAMES.email) as string)
        : '',
    phoneNumber:
      typeof readClaim(payload, CLAIM_NAMES.phoneNumber) === 'string'
        ? (readClaim(payload, CLAIM_NAMES.phoneNumber) as string)
        : '',
    roles: normalizeRoles(readClaim(payload, CLAIM_NAMES.role)),
    schoolIds: normalizeSchoolIds(readClaim(payload, CLAIM_NAMES.school)),
    exp,
  }
}

export function hasAdminAccess(user: AuthUser | null): boolean {
  if (!user) {
    return false
  }

  return user.roles.some((role) => role === 'Director' || role === 'SuperAdmin')
}
