import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus } from 'lucide-react'
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
  formatDateOnly,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
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

  const paymentCyclesQuery = useQuery({
    queryKey: ['schools', 'details', schoolId, 'payment-cycles', selectedSectionId],
    queryFn: () => fetchPaymentCycles(selectedSectionId ?? 0),
    enabled: Boolean(selectedSectionId),
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: PaymentCycleMutationInput = {
        schoolGradeSectionId: formState.schoolGradeSectionId,
        paymentCycleName: formState.paymentCycleName,
        paymentCycleDescription: formState.paymentCycleDescription,
        paymentCycleType: formState.paymentCycleType,
        planStartDate: formState.planStartDate,
        intervalCount: formState.intervalCount,
        intervalUnit: formState.intervalUnit,
        installmentAmounts: formState.installmentAmounts,
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
  })

  const cycles = paymentCyclesQuery.data?.items ?? []

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
                      <TableCell>
                        <div className='max-w-[240px] text-sm'>
                          {cycle.installmentAmounts || 'Valeurs par defaut du backend'}
                        </div>
                      </TableCell>
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
                ? 'Mettez a jour l identite du cycle et l affectation de classe. La structure des echeances n est modifiable qu a la creation dans le backend actuel.'
                : 'Definissez la cadence de paiement pour la classe selectionnee.'}
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

            {!editingCycle ? (
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
              disabled={
                saveMutation.isPending ||
                formState.schoolGradeSectionId === 0 ||
                formState.paymentCycleName.trim().length === 0
              }
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
