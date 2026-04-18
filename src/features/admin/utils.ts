export function buildFullName(...parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-CG', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value: Date | string | null | undefined): string {
  const date = parseDate(value)

  if (!date) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatDateOnly(value: Date | string | null | undefined): string {
  const date = parseDate(value)

  if (!date) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function getEntityStatusMeta(statusId: number): {
  label: string
  className: string
} {
  switch (statusId) {
    case 1:
      return {
        label: 'Enabled',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 2:
      return {
        label: 'Disabled',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      }
    case 5:
      return {
        label: 'Deleted',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 6:
      return {
        label: 'Pending',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 8:
      return {
        label: 'Processed',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 9:
      return {
        label: 'Cancelled',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
    case 10:
      return {
        label: 'Failed',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 11:
      return {
        label: 'InProgress',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 12:
      return {
        label: 'Approved',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 13:
      return {
        label: 'Rejected',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 14:
      return {
        label: 'Resolved',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 15:
      return {
        label: 'Stall',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      }
    case 101:
      return {
        label: 'Pending',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 102:
      return {
        label: 'UnderReview',
        className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
      }
    case 103:
      return {
        label: 'Rejected',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 104:
      return {
        label: 'Approved',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    default:
      return {
        label: `Status ${statusId}`,
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
  }
}
