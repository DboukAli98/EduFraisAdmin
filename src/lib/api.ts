import axios from 'axios'
import { useAuthStore } from '@/stores/auth-store'

export type ApiRecord = Record<string, unknown>

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = (
  configuredBaseUrl && configuredBaseUrl.length > 0
    ? configuredBaseUrl
    : 'https://edufrais-cnatavfte0fhdfe2.francecentral-01.azurewebsites.net'
).replace(/\/$/, '')

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState().auth

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

export function isApiRecord(value: unknown): value is ApiRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function readValue(record: unknown, ...keys: string[]): unknown {
  if (!isApiRecord(record)) {
    return undefined
  }

  for (const key of keys) {
    if (key in record) {
      return record[key]
    }
  }

  return undefined
}

export function readString(
  record: unknown,
  ...keys: string[]
): string | undefined {
  const value = readValue(record, ...keys)
  return typeof value === 'string' ? value : undefined
}

export function readNumber(
  record: unknown,
  ...keys: string[]
): number | undefined {
  const value = readValue(record, ...keys)

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function readBoolean(
  record: unknown,
  ...keys: string[]
): boolean | undefined {
  const value = readValue(record, ...keys)

  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true
    }

    if (value.toLowerCase() === 'false') {
      return false
    }
  }

  return undefined
}

export function readRecord(
  record: unknown,
  ...keys: string[]
): ApiRecord | undefined {
  const value = keys.length === 0 ? record : readValue(record, ...keys)
  return isApiRecord(value) ? value : undefined
}

export function readArray(record: unknown, ...keys: string[]): ApiRecord[] {
  const value = keys.length === 0 ? record : readValue(record, ...keys)
  return Array.isArray(value) ? value.filter(isApiRecord) : []
}

export function toApiUrl(path: string): string {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
