import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createPaymentCycle,
  fetchPaymentCycles,
  updatePaymentCycle,
  type PaymentCycleMutationInput,
  type PaymentCycleRecord,
  type PaymentCycleType,
  type PaymentIntervalUnit,
  type SchoolSection,
} from '@/features/schools/api'
import { EmptyState } from '@/features/admin/components/empty-state'
import {
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { getApiErrorMessage } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

interface PaymentCyclesPanelProps {
  schoolId: number
  sections: SchoolSection[]
  canManage: boolean
}

interface PaymentCycleFormState {
  schoolGradeSectionId: number
  paymentCycleName: string
  paymentCycleDescription: string
  paymentCycleType: PaymentCycleType
  planStartDate: string
  intervalCount: string
  intervalUnit: PaymentIntervalUnit | ''
  installmentAmounts: string
  customInstallments: CustomInstallmentFormRow[]
}

interface CustomInstallmentFormRow {
  amount: string
  dueDate: string
}

interface CycleInstallmentPreview {
  rows: Array<{ amount: number; dueDate?: string }>
  source: 'custom' | 'csv' | 'synthesized' | 'legacy' | 'none'
}

const paymentCycleTypes: PaymentCycleType[] = [
  'Full',
  'Monthly',
  'Weekly',
  'Quarterly',
  'Custom',
]

const intervalUnits: PaymentIntervalUnit[] = ['Day', 'Week', 'Month', 'Year']

const paymentCycleTypeLabels: Record<PaymentCycleType, string> = {
  Full: 'Complet',
  Monthly: 'Mensuel',
  Weekly: 'Hebdomadaire',
  Quarterly: 'Trimestriel',
  Custom: 'Personnalise',
}

const intervalUnitLabels: Record<PaymentIntervalUnit, string> = {
  Day: 'Jour',
  Week: 'Semaine',
  Month: 'Mois',
  Year: 'Annee',
}

const synthesizedInstallmentCounts: Partial<Record<PaymentCycleType, number>> = {
  Full: 1,
  Monthly: 12,
  Quarterly: 4,
  Weekly: 52,
}

function createEmptyInstallmentRow(): CustomInstallmentFormRow {
  return {
    amount: '',
    dueDate: '',
  }
}

function getTodayInputValue(): string {
  const now = new Date()
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
    .toISOString()
    .slice(0, 10)
}

function parseInstallmentAmount(value: string): number {
  const parsed = Number.parseFloat(
    String(value).replace(/\s/g, '').replace(',', '.')
  )

  return Number.isFinite(parsed) ? parsed : 0
}

function toDueDateIso(value: string): string {
  return new Date(`${value}T00:00:00Z`).toISOString()
}

function buildCustomInstallmentsPayload(
  rows: CustomInstallmentFormRow[]
): PaymentCycleMutationInput['customInstallments'] {
  return rows
    .map((row) => ({
      amount: parseInstallmentAmount(row.amount),
      dueDate: row.dueDate,
    }))
    .filter((row) => row.amount > 0 && row.dueDate)
    .map((row) => ({
      amount: row.amount,
      dueDate: toDueDateIso(row.dueDate),
    }))
    .sort(
      (left, right) =>
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
    )
}

function getCycleInstallmentPreview(
  cycle: PaymentCycleRecord,
  section: SchoolSection | null
): CycleInstallmentPreview {
  if (
    Array.isArray(cycle.customInstallments) &&
    cycle.customInstallments.length > 0
  ) {
    return {
      rows: cycle.customInstallments
        .slice()
        .sort(
          (left, right) =>
            new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
        ),
      source: 'custom',
    }
  }

  if (cycle.paymentCycleType === 'Custom' && cycle.intervalCount != null) {
    const rows = cycle.installmentAmounts
      ? cycle.installmentAmounts
          .split(',')
          .map((item) => Number(item.trim()))
          .filter((amount) => Number.isFinite(amount) && amount > 0)
          .map((amount) => ({ amount }))
      : []

    return { rows, source: 'legacy' }
  }

  if (cycle.installmentAmounts) {
    const rows = cycle.installmentAmounts
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((amount) => Number.isFinite(amount) && amount > 0)
      .map((amount) => ({ amount }))

    if (rows.length > 0) {
      return { rows, source: 'csv' }
    }
  }

  const installmentCount = synthesizedInstallmentCounts[cycle.paymentCycleType] ?? 0

  if (installmentCount > 0 && section?.fee) {
    return {
      rows: Array.from({ length: installmentCount }, () => ({
        amount: section.fee / installmentCount,
      })),
      source: 'synthesized',
    }
  }

  return { rows: [], source: 'none' }
}

function createEmptyForm(sectionId: number | null): PaymentCycleFormState {
  return {
    schoolGradeSectionId: sectionId ?? 0,
    paymentCycleName: '',
    paymentCycleDescription: '',
    paymentCycleType: 'Monthly',
    planStartDate: '',
    intervalCount: '',
    intervalUnit: '',
    installmentAmounts: '',
    customInstallments: [],
  }
}

function mapCycleToForm(cycle: PaymentCycleRecord): PaymentCycleFormState {
  return {
    schoolGradeSectionId: cycle.schoolGradeSectionId,
    paymentCycleName: cycle.paymentCycleName,
    paymentCycleDescription: cycle.paymentCycleDescription ?? '',
    paymentCycleType: cycle.paymentCycleType,
    planStartDate: cycle.planStartDate?.slice(0, 10) ?? '',
    intervalCount: cycle.intervalCount != null ? String(cycle.intervalCount) : '',
    intervalUnit: cycle.intervalUnit ?? '',
    installmentAmounts: cycle.installmentAmounts ?? '',
    customInstallments:
      cycle.customInstallments
        ?.slice()
        .sort(
          (left, right) =>
            new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
        )
        .map((installment) => ({
          amount: String(installment.amount),
          dueDate: installment.dueDate.slice(0, 10),
        })) ?? [],
  }
}

export function PaymentCyclesPanel({
  schoolId,
  sections,
  canManage,
}: PaymentCyclesPanelProps) {
  const queryClient = useQueryClient()
  const selectableSections = useMemo(
    () => sections.filter((section) => section.statusId !== 5),
    [sections]
  )
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(
    selectableSections[0]?.id ?? null
  )
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCycle, setEditingCycle] = useState<PaymentCycleRecord | null>(null)
  const [formState, setFormState] = useState<PaymentCycleFormState>(
    createEmptyForm(selectableSections[0]?.id ?? null)
  )

  useEffect(() => {
    if (!selectableSections.length) {
      setSelectedSectionId(null)
      setFormState(createEmptyForm(null))
      return
    }

    setSelectedSectionId((current) => {
      if (current && selectableSections.some((section) => section.id === current)) {
        return current
      }

      return selectableSections[0].id
    })
  }, [selectableSections])

  useEffect(() => {
    if (editingCycle) {
      return
    }

    setFormState((current) => ({
      ...current,
      schoolGradeSectionId: selectedSectionId ?? 0,
    }))
  }, [editingCycle, selectedSectionId])

  const selectedSection =
    selectableSections.find((section) => section.id === selectedSectionId) ?? null
  const formSection =
    selectableSections.find(
      (section) => section.id === formState.schoolGradeSectionId
    ) ?? null
  const todayInputValue = useMemo(() => getTodayInputValue(), [])
  const isCustomCycle = formState.paymentCycleType === 'Custom'
  const isCreateMode = !editingCycle
  const customInstallmentsSum = useMemo(
    () =>
      formState.customInstallments.reduce(
        (total, row) => total + parseInstallmentAmount(row.amount),
        0
      ),
    [formState.customInstallments]
  )
  const customInstallmentsDelta = customInstallmentsSum - (formSection?.fee ?? 0)
  const customInstallmentsSumMatches = formSection
    ? Math.abs(customInstallmentsDelta) < 0.5
    : false
  const customInstallmentErrors = useMemo(
    () =>
      formState.customInstallments.map((row, index) => {
        const errors: { amount?: string; dueDate?: string } = {}
        const installmentNumber = index + 1

        if (parseInstallmentAmount(row.amount) <= 0) {
          errors.amount = `Versement ${installmentNumber} : montant invalide.`
        }

        if (!row.dueDate) {
          errors.dueDate = `Versement ${installmentNumber} : choisissez une date d echeance.`
        } else if (isCreateMode && row.dueDate < todayInputValue) {
          errors.dueDate = `Versement ${installmentNumber} : la date d echeance ne peut pas etre dans le passe.`
        }

        return errors
      }),
    [formState.customInstallments, isCreateMode, todayInputValue]
  )
  const hasCustomInstallmentErrors = customInstallmentErrors.some(
    (errors) => errors.amount || errors.dueDate
  )
  const customInstallmentsValid =
    !isCustomCycle ||
    (formState.customInstallments.length > 0 &&
      !hasCustomInstallmentErrors &&
      customInstallmentsSumMatches)
  const isLegacyCustomCycle = Boolean(
    editingCycle &&
      formState.paymentCycleType === 'Custom' &&
      (!editingCycle.customInstallments ||
        editingCycle.customInstallments.length === 0) &&
      editingCycle.intervalCount != null
  )

  const paymentCyclesQuery = useQuery({
    queryKey: ['schools', 'details', schoolId, 'payment-cycles', selectedSectionId],
    queryFn: () => fetchPaymentCycles(selectedSectionId ?? 0),
    enabled: Boolean(selectedSectionId),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isCustomPayload = formState.paymentCycleType === 'Custom'
      const payload: PaymentCycleMutationInput = {
        schoolGradeSectionId: formState.schoolGradeSectionId,
        paymentCycleName: formState.paymentCycleName,
        paymentCycleDescription: formState.paymentCycleDescription,
        paymentCycleType: formState.paymentCycleType,
        planStartDate: isCustomPayload ? '' : formState.planStartDate,
        intervalCount: isCustomPayload ? '' : formState.intervalCount,
        intervalUnit: isCustomPayload ? '' : formState.intervalUnit,
        installmentAmounts: isCustomPayload ? '' : formState.installmentAmounts,
        customInstallments: isCustomPayload
          ? buildCustomInstallmentsPayload(formState.customInstallments)
          : undefined,
      }

      if (editingCycle) {
        await updatePaymentCycle(editingCycle.id, payload)
        return
      }

      await createPaymentCycle(payload)
    },
    onSuccess: () => {
      toast.success(
        editingCycle
          ? 'Cycle de paiement mis a jour avec succes.'
          : 'Cycle de paiement cree avec succes.'
      )
      setIsDialogOpen(false)
      setEditingCycle(null)
      setFormState(createEmptyForm(selectedSectionId))
      void queryClient.invalidateQueries({
        queryKey: ['schools', 'details', schoolId, 'payment-cycles'],
      })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible d enregistrer le cycle de paiement.'
        )
      )
    },
  })

  const cycles = paymentCyclesQuery.data?.items ?? []
  const canSaveCycle =
    !saveMutation.isPending &&
    formState.schoolGradeSectionId !== 0 &&
    formState.paymentCycleName.trim().length > 0 &&
    customInstallmentsValid

  const addCustomInstallment = () => {
    setFormState((current) => ({
      ...current,
      customInstallments: [
        ...current.customInstallments,
        createEmptyInstallmentRow(),
      ],
    }))
  }

  const updateCustomInstallment = (
    index: number,
    patch: Partial<CustomInstallmentFormRow>
  ) => {
    setFormState((current) => ({
      ...current,
      customInstallments: current.customInstallments.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      ),
    }))
  }

  const removeCustomInstallment = (index: number) => {
    if (
      formState.customInstallments.length >= 3 &&
      !window.confirm('Supprimer ce versement ?')
    ) {
      return
    }

    setFormState((current) => ({
      ...current,
      customInstallments: current.customInstallments.filter(
        (_row, rowIndex) => rowIndex !== index
      ),
    }))
  }

  const renderCycleInstallments = (cycle: PaymentCycleRecord) => {
    const preview = getCycleInstallmentPreview(cycle, selectedSection)

    if (preview.source === 'legacy') {
      return (
        <div className='max-w-[280px] space-y-1 text-sm'>
          <p className='font-medium text-amber-700 dark:text-amber-300'>
            Ancien format
          </p>
          {cycle.intervalCount && cycle.intervalUnit ? (
            <p>
              Tous les {cycle.intervalCount}{' '}
              {intervalUnitLabels[cycle.intervalUnit]}
              {cycle.intervalCount > 1 ? 's' : ''}
            </p>
          ) : null}
          {preview.rows.map((row, index) => (
            <p key={`${cycle.id}-legacy-${index}`} className='text-xs'>
              Versement {index + 1} - {formatCurrency(row.amount)} - echeance -
            </p>
          ))}
          <p className='text-xs text-muted-foreground'>
            Le backend conserve la generation historique.
          </p>
        </div>
      )
    }

    if (preview.rows.length === 0) {
      return (
        <div className='max-w-[240px] text-sm text-muted-foreground'>
          Valeurs par defaut du backend
        </div>
      )
    }

    return (
      <div className='max-h-40 max-w-[300px] space-y-1 overflow-y-auto pr-1 text-sm'>
        {preview.rows.map((row, index) => (
          <p key={`${cycle.id}-installment-${index}`}>
            Versement {index + 1} - {formatCurrency(row.amount)} - echeance{' '}
            {row.dueDate ? formatDateOnly(row.dueDate) : '-'}
          </p>
        ))}
        {preview.source === 'synthesized' ? (
          <p className='text-xs italic text-muted-foreground'>
            Apercu indicatif - l ecole peut affiner.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <Card className='border-border/70'>
        <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <CardTitle>Cycles de paiement</CardTitle>
            <CardDescription>
              Configurez la collecte des frais de classe par echeances ou en
              cycle complet.
            </CardDescription>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Select
              value={selectedSectionId ? String(selectedSectionId) : undefined}
              onValueChange={(value) => setSelectedSectionId(Number(value))}
              disabled={selectableSections.length === 0}
            >
              <SelectTrigger className='w-full min-w-0 sm:w-[260px]'>
                <SelectValue placeholder='Selectionner une classe' />
              </SelectTrigger>
              <SelectContent>
                {selectableSections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canManage ? (
              <Button
                disabled={!selectedSectionId}
                onClick={() => {
                  setEditingCycle(null)
                  setFormState(createEmptyForm(selectedSectionId))
                  setIsDialogOpen(true)
                }}
              >
                <Plus className='h-4 w-4' />
                Ajouter un cycle
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSection ? (
            <EmptyState
              title='Aucune classe selectionnee'
              description='Creez d abord une classe avant de configurer les cycles de paiement.'
            />
          ) : paymentCyclesQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : cycles.length === 0 ? (
            <EmptyState
              title='Aucun cycle de paiement trouve'
              description={`Aucun cycle de paiement n est encore configure pour ${selectedSection.name}.`}
            />
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Debut du plan</TableHead>
                    <TableHead>Echeances</TableHead>
                    <TableHead>Mis a jour</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell>
                        <div className='font-medium'>{cycle.paymentCycleName}</div>
                        <div className='text-xs text-muted-foreground'>
                          {cycle.paymentCycleDescription || 'Aucune description'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col gap-1'>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(1).className}
                          >
                            {paymentCycleTypeLabels[cycle.paymentCycleType]}
                          </Badge>
                          {cycle.intervalCount && cycle.intervalUnit ? (
                            <span className='text-xs text-muted-foreground'>
                              Tous les {cycle.intervalCount}{' '}
                              {intervalUnitLabels[cycle.intervalUnit]}
                              {cycle.intervalCount > 1 ? 's' : ''}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{formatDateOnly(cycle.planStartDate)}</TableCell>
                      <TableCell>{renderCycleInstallments(cycle)}</TableCell>
                      <TableCell>
                        {formatDateTime(cycle.modifiedOn ?? cycle.createdOn)}
                      </TableCell>
                      <TableCell className='text-right'>
                        {canManage ? (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => {
                              setEditingCycle(cycle)
                              setFormState(mapCycleToForm(cycle))
                              setIsDialogOpen(true)
                            }}
                          >
                            <Pencil className='h-4 w-4' />
                            Modifier
                          </Button>
                        ) : (
                          <Badge variant='outline'>Lecture seule</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingCycle(null)
            setFormState(createEmptyForm(selectedSectionId))
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingCycle
                ? 'Modifier le cycle de paiement'
                : 'Ajouter un cycle de paiement'}
            </DialogTitle>
            <DialogDescription>
              {editingCycle
                ? 'Mettez a jour le cycle. Pour les cycles personnalises, definissez chaque versement manuellement.'
                : 'Definissez la cadence de paiement ou les versements personnalises de la classe selectionnee.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='payment-cycle-section'>Classe</Label>
              <Select
                value={
                  formState.schoolGradeSectionId
                    ? String(formState.schoolGradeSectionId)
                    : undefined
                }
                onValueChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    schoolGradeSectionId: Number(value),
                  }))
                }
              >
                <SelectTrigger id='payment-cycle-section'>
                  <SelectValue placeholder='Selectionner une classe' />
                </SelectTrigger>
                <SelectContent>
                  {selectableSections.map((section) => (
                    <SelectItem key={section.id} value={String(section.id)}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='payment-cycle-name'>Nom du cycle</Label>
                <Input
                  id='payment-cycle-name'
                  value={formState.paymentCycleName}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      paymentCycleName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='payment-cycle-type'>Type de cycle</Label>
                <Select
                  value={formState.paymentCycleType}
                  onValueChange={(value) =>
                    setFormState((current) => ({
                      ...current,
                      paymentCycleType: value as PaymentCycleType,
                      intervalCount:
                        value === 'Custom' ? '' : current.intervalCount,
                      intervalUnit:
                        value === 'Custom' ? '' : current.intervalUnit,
                      installmentAmounts:
                        value === 'Custom' ? '' : current.installmentAmounts,
                    }))
                  }
                >
                  <SelectTrigger id='payment-cycle-type'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentCycleTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {paymentCycleTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='payment-cycle-description'>Description</Label>
              <Textarea
                id='payment-cycle-description'
                rows={3}
                value={formState.paymentCycleDescription}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    paymentCycleDescription: event.target.value,
                  }))
                }
              />
            </div>

            {isCustomCycle ? (
              <div className='space-y-4 rounded-lg border border-border/70 p-4'>
                <div className='space-y-1'>
                  <Label>Versements personnalises</Label>
                  <p className='text-sm text-muted-foreground'>
                    Ajoutez chaque versement avec son montant et sa date d
                    echeance. Le total doit correspondre aux frais de la classe.
                  </p>
                </div>

                {isLegacyCustomCycle ? (
                  <div className='rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'>
                    Cycle au format herite. Definissez les versements
                    manuellement pour migrer vers le nouveau flux.
                    {editingCycle?.intervalCount && editingCycle.intervalUnit ? (
                      <span className='mt-1 block'>
                        Ancien rythme : tous les {editingCycle.intervalCount}{' '}
                        {intervalUnitLabels[editingCycle.intervalUnit]}
                        {editingCycle.intervalCount > 1 ? 's' : ''}.
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {formState.customInstallments.length === 0 ? (
                  <div className='rounded-lg border border-dashed p-3 text-sm text-muted-foreground'>
                    Aucun versement pour le moment - ajoutez-en au moins un
                    ci-dessous.
                  </div>
                ) : null}

                <div className='space-y-3'>
                  {formState.customInstallments.map((row, index) => {
                    const errors = customInstallmentErrors[index] ?? {}

                    return (
                      <div
                        key={`custom-installment-${index}`}
                        className='rounded-lg border bg-muted/20 p-3'
                      >
                        <div className='grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-start'>
                          <div className='pt-2 text-sm font-semibold text-muted-foreground'>
                            #{index + 1}
                          </div>
                          <div className='grid gap-1'>
                            <Label
                              htmlFor={`custom-installment-amount-${index}`}
                              className='sr-only'
                            >
                              Montant
                            </Label>
                            <Input
                              id={`custom-installment-amount-${index}`}
                              type='number'
                              inputMode='decimal'
                              min='0'
                              step='0.01'
                              placeholder='Montant'
                              value={row.amount}
                              onChange={(event) =>
                                updateCustomInstallment(index, {
                                  amount: event.target.value.replace(
                                    /[^\d.,\s]/g,
                                    ''
                                  ),
                                })
                              }
                            />
                            {errors.amount ? (
                              <p className='text-xs text-destructive'>
                                {errors.amount}
                              </p>
                            ) : null}
                          </div>
                          <div className='grid gap-1'>
                            <Label
                              htmlFor={`custom-installment-date-${index}`}
                              className='sr-only'
                            >
                              Choisir l echeance
                            </Label>
                            <Input
                              id={`custom-installment-date-${index}`}
                              type='date'
                              min={isCreateMode ? todayInputValue : undefined}
                              value={row.dueDate}
                              onChange={(event) =>
                                updateCustomInstallment(index, {
                                  dueDate: event.target.value,
                                })
                              }
                            />
                            {errors.dueDate ? (
                              <p className='text-xs text-destructive'>
                                {errors.dueDate}
                              </p>
                            ) : null}
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label='Supprimer le versement'
                            onClick={() => removeCustomInstallment(index)}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <Button
                  type='button'
                  variant='outline'
                  className='w-full sm:w-auto'
                  onClick={addCustomInstallment}
                >
                  <Plus className='h-4 w-4' />
                  + Ajouter un versement
                </Button>

                {formState.customInstallments.length === 0 ? (
                  <p className='text-sm text-destructive'>
                    Ajoutez au moins un versement.
                  </p>
                ) : null}

                <div
                  className={`rounded-lg border p-3 ${
                    customInstallmentsSumMatches
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100'
                      : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
                  }`}
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1 text-sm'>
                      <p>
                        Total des versements:{' '}
                        <span className='font-semibold'>
                          {formatCurrency(customInstallmentsSum)}
                        </span>
                      </p>
                      <p>
                        Frais de la classe:{' '}
                        <span className='font-semibold'>
                          {formatCurrency(formSection?.fee ?? 0)}
                        </span>
                      </p>
                      {!formSection ? (
                        <p>Selectionnez une classe pour verifier le total.</p>
                      ) : customInstallmentsSumMatches ? (
                        <p>Total valide.</p>
                      ) : customInstallmentsDelta < 0 ? (
                        <p>
                          Manque{' '}
                          {formatCurrency(Math.abs(customInstallmentsDelta))}
                        </p>
                      ) : (
                        <p>
                          Excedent de{' '}
                          {formatCurrency(customInstallmentsDelta)}
                        </p>
                      )}
                    </div>
                    {customInstallmentsSumMatches ? (
                      <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0' />
                    ) : (
                      <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0' />
                    )}
                  </div>
                </div>
              </div>
            ) : !editingCycle ? (
              <>
                <div className='grid gap-4 sm:grid-cols-3'>
                  <div className='grid gap-2'>
                    <Label htmlFor='payment-cycle-start'>Date de debut du plan</Label>
                    <Input
                      id='payment-cycle-start'
                      type='date'
                      value={formState.planStartDate}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          planStartDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='payment-cycle-interval-count'>Nombre d intervalles</Label>
                    <Input
                      id='payment-cycle-interval-count'
                      inputMode='numeric'
                      value={formState.intervalCount}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          intervalCount: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='payment-cycle-interval-unit'>Unite d intervalle</Label>
                    <Select
                      value={formState.intervalUnit || undefined}
                      onValueChange={(value) =>
                        setFormState((current) => ({
                          ...current,
                          intervalUnit: value as PaymentIntervalUnit,
                        }))
                      }
                    >
                      <SelectTrigger id='payment-cycle-interval-unit'>
                        <SelectValue placeholder='Optionnel' />
                      </SelectTrigger>
                      <SelectContent>
                        {intervalUnits.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {intervalUnitLabels[unit]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='payment-cycle-installments'>
                    Montants des echeances
                  </Label>
                  <Textarea
                    id='payment-cycle-installments'
                    rows={3}
                    placeholder='Exemple : 25000,25000,25000,25000'
                    value={formState.installmentAmounts}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        installmentAmounts: event.target.value,
                      }))
                    }
                  />
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSaveCycle}
            >
              {saveMutation.isPending
                ? 'Enregistrement...'
                : editingCycle
                  ? 'Enregistrer'
                  : 'Creer le cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
