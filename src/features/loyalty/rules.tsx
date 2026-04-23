import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { getEntityStatusMeta } from '@/features/admin/utils'
import { getApiErrorMessage } from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  createLoyaltyRule,
  fetchLoyaltyProgram,
  fetchLoyaltyRules,
  setLoyaltyRuleStatus,
  updateLoyaltyRule,
  type LoyaltyLifecycleAction,
  type LoyaltyRule,
  type LoyaltyRuleMutationInput,
} from './api'
import {
  formatPoints,
  getLoyaltyMemberTypeLabel,
  getLoyaltyTriggerTypeLabel,
  loyaltyMemberTypeOptions,
  loyaltyPeriodTypeOptions,
  loyaltyTriggerTypeOptions,
  toDateInputValue,
  useDirectorLoyaltyScope,
} from './utils'

type PendingRuleAction =
  | {
      rule: LoyaltyRule
      action: LoyaltyLifecycleAction
    }
  | null

function createEmptyRuleForm(rule?: LoyaltyRule | null): LoyaltyRuleMutationInput {
  return {
    ruleName: rule?.ruleName ?? '',
    ruleDescription: rule?.ruleDescription ?? '',
    memberType: rule?.memberType ?? 'Parent',
    triggerType: rule?.triggerType ?? 'SchoolFeePaymentProcessed',
    pointsAwarded: rule ? String(rule.pointsAwarded) : '0',
    minimumAmount:
      rule?.minimumAmount != null ? String(rule.minimumAmount) : '',
    requiresOnTimePayment: rule?.requiresOnTimePayment ?? false,
    requiresFullPayment: rule?.requiresFullPayment ?? false,
    maxAwardsPerMember:
      rule?.maxAwardsPerMember != null ? String(rule.maxAwardsPerMember) : '',
    periodType: rule?.periodType ?? 'None',
    executionOrder: rule ? String(rule.executionOrder) : '0',
    canStackWithOtherRules: rule?.canStackWithOtherRules ?? true,
    validFrom: toDateInputValue(rule?.validFrom),
    validTo: toDateInputValue(rule?.validTo),
  }
}

export function LoyaltyRulesManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null)
  const [form, setForm] = useState<LoyaltyRuleMutationInput>(
    createEmptyRuleForm()
  )
  const [pendingAction, setPendingAction] = useState<PendingRuleAction>(null)

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  const rulesQuery = useQuery({
    queryKey: ['loyalty', 'rules', program?.id],
    queryFn: () => fetchLoyaltyRules(program!.id),
    enabled: Boolean(program?.id),
  })

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingRule(null)
      setForm(createEmptyRuleForm())
    }
  }, [isDialogOpen])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!program) {
        return
      }

      if (editingRule) {
        await updateLoyaltyRule(editingRule.id, editingRule.statusId, form)
        return
      }

      await createLoyaltyRule(program.id, form)
    },
    onSuccess: () => {
      toast.success(editingRule ? 'Regle mise a jour.' : 'Regle creee.')
      setIsDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Impossible d enregistrer la regle de fidelite.')
      )
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return ''
      }

      return setLoyaltyRuleStatus(pendingAction.rule.id, pendingAction.action)
    },
    onSuccess: (message) => {
      toast.success(message)
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de mettre a jour le statut de la regle de fidelite.'
        )
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Regles fidelite'
        description='Definissez quelles activites rapportent des points et a quelle frequence les membres peuvent en beneficier.'
      >
        <EmptyState
          title='Acces directeur requis'
          description='Cet espace fidelite est disponible depuis l experience directeur.'
        />
      </PageShell>
    )
  }

  if (!hasAssignedSchool) {
    return (
      <PageShell
        title='Regles fidelite'
        description='Definissez quelles activites rapportent des points et a quelle frequence les membres peuvent en beneficier.'
      >
        <EmptyState
          title='Aucune ecole affectee'
          description='Ce compte directeur n est pas encore lie a une ecole.'
        />
      </PageShell>
    )
  }

  if (programQuery.isLoading) {
    return (
      <PageShell
        title='Regles fidelite'
        description='Definissez quelles activites rapportent des points et a quelle frequence les membres peuvent en beneficier.'
      >
        <Card className='border-border/70'>
          <CardContent className='space-y-3 p-6'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  if (!program) {
    return (
      <PageShell
        title='Regles fidelite'
        description='Definissez quelles activites rapportent des points et a quelle frequence les membres peuvent en beneficier.'
      >
        <EmptyState
          title='Creez d abord le programme'
          description='Les regles ne peuvent etre configurees qu apres la creation du programme de fidelite de l ecole.'
        />
      </PageShell>
    )
  }

  const allRegles = rulesQuery.data ?? []
  const filteredRegles = allRegles.filter((rule) => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return true
    }

    return (
      rule.ruleName.toLowerCase().includes(normalizedSearch) ||
      (rule.ruleDescription ?? '').toLowerCase().includes(normalizedSearch) ||
      rule.memberType.toLowerCase().includes(normalizedSearch) ||
      rule.triggerType.toLowerCase().includes(normalizedSearch)
    )
  })
  const activeRegles = allRegles.filter((rule) => rule.statusId === 1).length
  const canSave =
    form.ruleName.trim().length > 0 &&
    Number(form.pointsAwarded) > 0 &&
    !saveMutation.isPending

  return (
    <>
      <PageShell
        title='Regles fidelite'
        description='Recompensez exactement les comportements que l ecole souhaite encourager, des paiements a temps aux encaissements terrain.'
        actions={
          <Button
            onClick={() => {
              setEditingRule(null)
              setForm(createEmptyRuleForm())
              setIsDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Ajouter une regle
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Programme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{program.programName}</div>
              <p className='text-sm text-muted-foreground'>
                Logique d attribution des {program.pointsLabel.toLowerCase()} pour cette ecole.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Regles actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(activeRegles)}</div>
              <p className='text-sm text-muted-foreground'>
                Regles actuellement actives pour la logique d attribution.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Rechercher des regles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Rechercher par nom de regle, declencheur ou type de membre'
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Regles d attribution configurees</CardTitle>
            <CardDescription>
              Les regles sont evaluees selon l ordre d execution et peuvent, si besoin, se cumuler.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rulesQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredRegles.length === 0 ? (
              <EmptyState
                title='Aucune regle de fidelite trouvee'
                description='Creez la premiere regle pour commencer a attribuer des points automatiquement ou manuellement.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Regle</TableHead>
                      <TableHead>Membre</TableHead>
                      <TableHead>Declencheur</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegles
                      .slice()
                      .sort((left, right) => left.executionOrder - right.executionOrder)
                      .map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div className='font-medium'>{rule.ruleName}</div>
                            <div className='text-xs text-muted-foreground'>
                              Ordre {rule.executionOrder}
                              {rule.requiresOnTimePayment
                                ? ' ; Paiement a temps uniquement'
                                : ''}
                              {rule.requiresFullPayment
                                ? ' ; Paiement integral uniquement'
                                : ''}
                            </div>
                          </TableCell>
                          <TableCell>{getLoyaltyMemberTypeLabel(rule.memberType)}</TableCell>
                          <TableCell>{getLoyaltyTriggerTypeLabel(rule.triggerType)}</TableCell>
                          <TableCell>{formatPoints(rule.pointsAwarded)}</TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className={getEntityStatusMeta(rule.statusId).className}
                            >
                              {getEntityStatusMeta(rule.statusId).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className='flex justify-end gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setEditingRule(rule)
                                  setForm(createEmptyRuleForm(rule))
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Pencil className='h-4 w-4' />
                                Modifier
                              </Button>
                              {rule.statusId !== 1 ? (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    setPendingAction({ rule, action: 'enable' })
                                  }
                                >
                                  <Power className='h-4 w-4' />
                                  Activer
                                </Button>
                              ) : (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    setPendingAction({ rule, action: 'disable' })
                                  }
                                >
                                  <Power className='h-4 w-4' />
                                  Desactiver
                                </Button>
                              )}
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() =>
                                  setPendingAction({ rule, action: 'deleted' })
                                }
                              >
                                <Trash2 className='h-4 w-4' />
                                Supprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              {editingRule
                ? 'Modifier la regle de fidelite'
                : 'Ajouter une regle de fidelite'}
            </DialogTitle>
            <DialogDescription>
              Definissez qui gagne des points, quelle activite declenche l attribution et quelles contraintes s appliquent.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='rule-name'>Nom de la regle</Label>
              <Input
                id='rule-name'
                value={form.ruleName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruleName: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='rule-description'>Description</Label>
              <Textarea
                id='rule-description'
                rows={3}
                value={form.ruleDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruleDescription: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label>Type de membre</Label>
                <Select
                  value={form.memberType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      memberType: value as LoyaltyRuleMutationInput['memberType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyMemberTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Type de declencheur</Label>
                <Select
                  value={form.triggerType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      triggerType: value as LoyaltyRuleMutationInput['triggerType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyTriggerTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='grid gap-2'>
                <Label htmlFor='points-awarded'>Points attribues</Label>
                <Input
                  id='points-awarded'
                  inputMode='numeric'
                  value={form.pointsAwarded}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pointsAwarded: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='minimum-amount'>Montant minimum</Label>
                <Input
                  id='minimum-amount'
                  inputMode='decimal'
                  value={form.minimumAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minimumAmount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='max-awards'>Maximum d attributions / membre</Label>
                <Input
                  id='max-awards'
                  inputMode='numeric'
                  value={form.maxAwardsPerMember}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxAwardsPerMember: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='execution-order'>Ordre d execution</Label>
                <Input
                  id='execution-order'
                  inputMode='numeric'
                  value={form.executionOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      executionOrder: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2'>
                <Label>Limite par periode</Label>
                <Select
                  value={form.periodType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      periodType: value as LoyaltyRuleMutationInput['periodType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyPeriodTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='valid-from'>Valide a partir de</Label>
                <Input
                  id='valid-from'
                  type='date'
                  value={form.validFrom}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      validFrom: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='valid-to'>Valide jusqu au</Label>
                <Input
                  id='valid-to'
                  type='date'
                  value={form.validTo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      validTo: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              <div className='flex items-center justify-between rounded-xl border p-4'>
                <div>
                  <p className='font-medium'>Paiement a temps uniquement</p>
                  <p className='text-sm text-muted-foreground'>
                    Restreindre l attribution aux transactions payees a temps.
                  </p>
                </div>
                <Switch
                  checked={form.requiresOnTimePayment}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      requiresOnTimePayment: checked,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between rounded-xl border p-4'>
                <div>
                  <p className='font-medium'>Paiement integral uniquement</p>
                  <p className='text-sm text-muted-foreground'>
                    N attribuer des points que lorsque le montant total est regle.
                  </p>
                </div>
                <Switch
                  checked={form.requiresFullPayment}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      requiresFullPayment: checked,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between rounded-xl border p-4'>
                <div>
                  <p className='font-medium'>Cumuler avec les autres regles</p>
                  <p className='text-sm text-muted-foreground'>
                    Plusieurs regles peuvent recompenser la meme activite.
                  </p>
                </div>
                <Switch
                  checked={form.canStackWithOtherRules}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      canStackWithOtherRules: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Annuler
            </Button>
            <Button disabled={!canSave} onClick={() => saveMutation.mutate()}>
              <Save className='h-4 w-4' />
              {saveMutation.isPending
                ? 'Enregistrement...'
                : editingRule
                  ? 'Mettre a jour la regle'
                  : 'Creer la regle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'deleted'
                ? 'Supprimer cette regle ?'
                : pendingAction?.action === 'disable'
                  ? 'Desactiver cette regle ?'
                  : 'Activer cette regle ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'deleted'
                ? 'La regle sera conservee pour l historique mais retiree des calculs actifs de fidelite.'
                : pendingAction?.action === 'disable'
                  ? 'La regle cessera d attribuer des points jusqu a sa reactivation.'
                  : 'La regle redeviendra active dans le moteur de fidelite.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionMutation.mutate()}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? 'Mise a jour...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


