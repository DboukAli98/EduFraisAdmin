import { useAuthStore } from '@/stores/auth-store'

export const loyaltyMemberTypeOptions = [
  { value: 'Parent', label: 'Parents' },
  { value: 'CollectingAgent', label: 'Agents collecteurs' },
] as const

export const loyaltyTriggerTypeOptions = [
  {
    value: 'SchoolFeePaymentProcessed',
    label: 'Paiement des frais scolaires traite',
  },
  {
    value: 'MerchandisePaymentProcessed',
    label: 'Paiement de marchandise traite',
  },
  {
    value: 'AgentCollectionProcessed',
    label: 'Encaissement agent traite',
  },
  {
    value: 'ManualEnrollmentBonus',
    label: 'Bonus d inscription manuel',
  },
  {
    value: 'ManualAdjustment',
    label: 'Ajustement manuel',
  },
] as const

export const loyaltyPeriodTypeOptions = [
  { value: 'None', label: 'Aucune limite recurrente' },
  { value: 'Daily', label: 'Quotidien' },
  { value: 'Weekly', label: 'Hebdomadaire' },
  { value: 'Monthly', label: 'Mensuel' },
  { value: 'ProgramLifetime', label: 'Duree de vie du programme' },
] as const

export const loyaltyRewardTypeOptions = [
  { value: 'Merchandise', label: 'Recompense marchandise' },
  { value: 'SchoolFeeCredit', label: 'Credit de frais scolaires' },
  { value: 'CustomBenefit', label: 'Avantage personnalise' },
] as const

export const loyaltyRedemptionStatusOptions = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'Pending', label: 'En attente' },
  { value: 'Approved', label: 'Approuve' },
  { value: 'Rejected', label: 'Rejete' },
  { value: 'Fulfilled', label: 'Finalise' },
  { value: 'Cancelled', label: 'Annule' },
] as const

function getOptionLabel(
  value: string,
  options: ReadonlyArray<{ value: string; label: string }>
): string {
  return options.find((option) => option.value === value)?.label ?? value
}

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
  return new Intl.NumberFormat('fr-FR').format(value)
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
        label: 'En attente',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 'Approved':
      return {
        label: 'Approuve',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 'Rejected':
      return {
        label: 'Rejete',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 'Fulfilled':
      return {
        label: 'Finalise',
        className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
      }
    case 'Cancelled':
      return {
        label: 'Annule',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
    default:
      return {
        label: status || 'Inconnu',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
  }
}

export function getLoyaltyMemberTypeLabel(value: string): string {
  return getOptionLabel(value, loyaltyMemberTypeOptions)
}

export function getLoyaltyTriggerTypeLabel(value: string): string {
  return getOptionLabel(value, loyaltyTriggerTypeOptions)
}

export function getLoyaltyRewardTypeLabel(value: string): string {
  return getOptionLabel(value, loyaltyRewardTypeOptions)
}

export function getLoyaltyEntryTypeLabel(value: string): string {
  switch (value) {
    case 'Earn':
    case 'Earned':
      return 'Gain'
    case 'Redeem':
    case 'Redeemed':
      return 'Utilisation'
    case 'Reversal':
    case 'Reversed':
      return 'Annulation'
    case 'Adjustment':
    case 'ManualAdjustment':
      return 'Ajustement'
    case 'EnrollmentBonus':
    case 'ManualEnrollmentBonus':
      return 'Bonus d inscription'
    case 'Expiration':
    case 'Expired':
      return 'Expiration'
    default:
      return value || 'Inconnu'
  }
}

export function getLoyaltyReferenceTypeLabel(value: string): string {
  switch (value) {
    case 'Rule':
      return 'Regle'
    case 'Redemption':
      return 'Redemption'
    case 'Program':
      return 'Programme'
    case 'Payment':
      return 'Paiement'
    case 'SchoolFeePayment':
      return 'Paiement frais scolaires'
    case 'MerchandisePayment':
      return 'Paiement marchandise'
    case 'AgentCollection':
      return 'Encaissement agent'
    case 'ManualAdjustment':
      return 'Ajustement manuel'
    case 'System':
      return 'Systeme'
    default:
      return value || 'Inconnu'
  }
}


