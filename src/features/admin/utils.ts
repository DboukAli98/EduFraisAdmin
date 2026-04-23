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
  return new Intl.NumberFormat('fr-FR', {
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
    return 'Aucune date'
  }

  return new Intl.DateTimeFormat('fr-FR', {
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
    return 'Aucune date'
  }

  return new Intl.DateTimeFormat('fr-FR', {
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
        label: 'Actif',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 2:
      return {
        label: 'Desactive',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      }
    case 5:
      return {
        label: 'Supprime',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 6:
      return {
        label: 'En attente',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 8:
      return {
        label: 'Traite',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 9:
      return {
        label: 'Annule',
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
    case 10:
      return {
        label: 'Echec',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 11:
      return {
        label: 'En cours',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 12:
      return {
        label: 'Approuve',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 13:
      return {
        label: 'Rejete',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 14:
      return {
        label: 'Resolu',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    case 15:
      return {
        label: 'Bloque',
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
      }
    case 101:
      return {
        label: 'En attente',
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
      }
    case 102:
      return {
        label: 'En revision',
        className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
      }
    case 103:
      return {
        label: 'Rejete',
        className: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
      }
    case 104:
      return {
        label: 'Approuve',
        className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
      }
    default:
      return {
        label: `Statut ${statusId}`,
        className: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
      }
  }
}
