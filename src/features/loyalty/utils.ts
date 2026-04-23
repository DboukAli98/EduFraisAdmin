import { useAuthStore } from '@/stores/auth-store'

export const loyaltyMemberTypeOptions = [
  { value: 'Parent', label: 'Parents' },
  { value: 'CollectingAgent', label: 'Collecting agents' },
] as const

export const loyaltyTriggerTypeOptions = [
  {
    value: 'SchoolFeePaymentProcessed',
    label: 'School fee payment processed',
  },
  {
    value: 'MerchandisePaymentProcessed',
    label: 'Merchandise payment processed',
  },
  {
    value: 'AgentCollectionProcessed',
    label: 'Agent collection processed',
  },
  {
    value: 'ManualEnrollmentBonus',
    label: 'Manual enrollment bonus',
  },
  {
    value: 'ManualAdjustment',
    label: 'Manual adjustment',
  },
] as const

export const loyaltyPeriodTypeOptions = [
  { value: 'None', label: 'No recurring cap' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
  { value: 'ProgramLifetime', label: 'Program lifetime' },
] as const

export const loyaltyRewardTypeOptions = [
  { value: 'Merchandise', label: 'Merchandise reward' },
  { value: 'SchoolFeeCredit', label: 'School fee credit' },
  { value: 'CustomBenefit', label: 'Custom benefit' },
] as const

export const loyaltyRedemptionStatusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Fulfilled', label: 'Fulfilled' },
  { value: 'Cancelled', label: 'Cancelled' },
] as const

export function useDirectorLoyaltyScope() {
  const currentUser = useAuthStore((state) => state.auth.user)
  const schoolId = currentUser?.schoolIds[0] ?? 0
  const isDirector = currentUser?.roles.includes('Director') ?? false

  return {
    currentUser,
    schoolId,
    isDirector,
    hasAssignedSchool: schoolId > 0,
  }
}

export function formatPoints(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`
}

export function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

export function getRedemptionStatusMeta(status: string): {
  label: string
  className: string
} {
  switch (status) {
    case 'Pending':
      return {
        label: 'Pending',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 'Approved':
      return {
        label: 'Approved',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 'Rejected':
      return {
        label: 'Rejected',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 'Fulfilled':
      return {
        label: 'Fulfilled',
        className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
      }
    case 'Cancelled':
      return {
        label: 'Cancelled',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
    default:
      return {
        label: status || 'Unknown',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
  }
}
