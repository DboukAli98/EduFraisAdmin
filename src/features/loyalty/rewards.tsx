import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  formatCurrency,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import {
  fetchSchoolMerchandises,
  type SchoolMerchandise,
} from '@/features/merchandise/api'
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
  createLoyaltyReward,
  fetchLoyaltyProgram,
  fetchLoyaltyRewards,
  setLoyaltyRewardStatus,
  updateLoyaltyReward,
  type LoyaltyLifecycleAction,
  type LoyaltyReward,
  type LoyaltyRewardMutationInput,
} from './api'
import {
  formatPoints,
  getLoyaltyRewardTypeLabel,
  loyaltyRewardTypeOptions,
  toDateInputValue,
  useDirectorLoyaltyScope,
} from './utils'

type PendingRewardAction =
  | {
      reward: LoyaltyReward
      action: LoyaltyLifecycleAction
    }
  | null

function createEmptyRewardForm(
  reward?: LoyaltyReward | null
): LoyaltyRewardMutationInput {
  return {
    rewardName: reward?.rewardName ?? '',
    rewardDescription: reward?.rewardDescription ?? '',
    rewardType: reward?.rewardType ?? 'CustomBenefit',
    pointsCost: reward ? String(reward.pointsCost) : '0',
    monetaryValue: reward?.monetaryValue != null ? String(reward.monetaryValue) : '',
    schoolMerchandiseId:
      reward?.schoolMerchandiseId != null ? String(reward.schoolMerchandiseId) : '',
    stockQuantity: reward?.stockQuantity != null ? String(reward.stockQuantity) : '',
    maxRedeemPerMember:
      reward?.maxRedeemPerMember != null ? String(reward.maxRedeemPerMember) : '',
    requiresDirectorApproval: reward?.requiresDirectorApproval ?? true,
    fulfillmentInstructions: reward?.fulfillmentInstructions ?? '',
    validFrom: toDateInputValue(reward?.validFrom),
    validTo: toDateInputValue(reward?.validTo),
  }
}

function buildRewardSubtitle(
  reward: LoyaltyReward,
  merchandiseById: Map<number, SchoolMerchandise>
): string {
  if (reward.rewardType === 'Merchandise' && reward.schoolMerchandiseId) {
    const merchandise = merchandiseById.get(reward.schoolMerchandiseId)
    return merchandise?.name || reward.schoolMerchandiseName || 'Article lie'
  }

  if (reward.rewardType === 'SchoolFeeCredit' && reward.monetaryValue != null) {
    return `Valeur du credit de frais ${formatCurrency(reward.monetaryValue)}`
  }

  return reward.rewardDescription || 'Recompense personnalisee'
}

export function LoyaltyRewardsManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null)
  const [form, setForm] = useState<LoyaltyRewardMutationInput>(
    createEmptyRewardForm()
  )
  const [pendingAction, setPendingAction] = useState<PendingRewardAction>(null)

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  const rewardsQuery = useQuery({
    queryKey: ['loyalty', 'rewards', program?.id],
    queryFn: () => fetchLoyaltyRewards(program!.id),
    enabled: Boolean(program?.id),
  })

  const merchandiseQuery = useQuery({
    queryKey: ['school-merchandise', schoolId, 'loyalty'],
    queryFn: () => fetchSchoolMerchandises({ schoolId, includeAll: true }),
    enabled: hasAssignedSchool,
  })

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingReward(null)
      setForm(createEmptyRewardForm())
    }
  }, [isDialogOpen])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!program) {
        return
      }

      if (editingReward) {
        await updateLoyaltyReward(editingReward.id, editingReward.statusId, form)
        return
      }

      await createLoyaltyReward(program.id, form)
    },
    onSuccess: () => {
      toast.success(editingReward ? 'Recompense mise a jour.' : 'Recompense creee.')
      setIsDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible d enregistrer la recompense de fidelite.'
        )
      )
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return ''
      }

      return setLoyaltyRewardStatus(pendingAction.reward.id, pendingAction.action)
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
          'Impossible de mettre a jour le statut de la recompense.'
        )
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Recompenses fidelite'
        description='Construisez le catalogue d avantages, de remises et de recompenses marchandise que les membres peuvent utiliser.'
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
        title='Recompenses fidelite'
        description='Construisez le catalogue d avantages, de remises et de recompenses marchandise que les membres peuvent utiliser.'
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
        title='Recompenses fidelite'
        description='Construisez le catalogue d avantages, de remises et de recompenses marchandise que les membres peuvent utiliser.'
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
        title='Recompenses fidelite'
        description='Construisez le catalogue d avantages, de remises et de recompenses marchandise que les membres peuvent utiliser.'
      >
        <EmptyState
          title='Creez d abord le programme'
          description='Les recompenses ne peuvent etre configurees qu apres la creation du programme de fidelite de l ecole.'
        />
      </PageShell>
    )
  }

  const allRecompenses = rewardsQuery.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const merchandiseItems = merchandiseQuery.data?.items ?? []
  const merchandiseById = new Map(
    merchandiseItems.map((item) => [item.id, item] as const)
  )
  const filteredRecompenses = allRecompenses.filter((reward) => {
    if (!normalizedSearch) {
      return true
    }

    return (
      reward.rewardName.toLowerCase().includes(normalizedSearch) ||
      (reward.rewardDescription ?? '').toLowerCase().includes(normalizedSearch) ||
      reward.rewardType.toLowerCase().includes(normalizedSearch) ||
      (reward.schoolMerchandiseName ?? '').toLowerCase().includes(normalizedSearch)
    )
  })
  const rewardsRequiringApproval = allRecompenses.filter(
    (reward) => reward.requiresDirectorApproval
  ).length
  const linkedMerchandiseRecompenses = allRecompenses.filter(
    (reward) => reward.schoolMerchandiseId != null
  ).length
  const canSave =
    form.rewardName.trim().length > 0 &&
    Number(form.pointsCost) > 0 &&
    !saveMutation.isPending

  return (
    <>
      <PageShell
        title='Recompenses fidelite'
        description='Proposez des articles scolaires, des credits de frais ou des avantages personnalises que les parents et les agents peuvent obtenir avec leurs points.'
        actions={
          <Button
            onClick={() => {
              setEditingReward(null)
              setForm(createEmptyRewardForm())
              setIsDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Ajouter une recompense
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total des recompenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(allRecompenses.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Options de recompense disponibles pour ce programme scolaire.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Necessite l approbation du directeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>
                {formatPoints(rewardsRequiringApproval)}
              </div>
              <p className='text-sm text-muted-foreground'>
                Recompenses qui restent en attente jusqu a votre revue.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Rechercher des recompenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Rechercher par nom, type ou marchandise'
                />
              </div>
              <p className='mt-3 text-sm text-muted-foreground'>
                {formatPoints(linkedMerchandiseRecompenses)} recompenses sont liees a des articles de l ecole.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Catalogue des recompenses configurees</CardTitle>
            <CardDescription>
              Definissez les avantages que les membres peuvent obtenir, leur cout et la necessite d approbation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rewardsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredRecompenses.length === 0 ? (
              <EmptyState
                title='Aucune recompense fidelite trouvee'
                description='Creez la premiere recompense pour offrir aux membres quelque chose d utile a utiliser.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recompense</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cout en points</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecompenses.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell>
                          <div className='font-medium'>{reward.rewardName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {buildRewardSubtitle(reward, merchandiseById)}
                          </div>
                        </TableCell>
                        <TableCell>{getLoyaltyRewardTypeLabel(reward.rewardType)}</TableCell>
                        <TableCell>{formatPoints(reward.pointsCost)}</TableCell>
                        <TableCell>
                          {reward.stockQuantity != null
                            ? formatPoints(reward.stockQuantity)
                            : 'Illimite'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(reward.statusId).className}
                          >
                            {getEntityStatusMeta(reward.statusId).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setEditingReward(reward)
                                setForm(createEmptyRewardForm(reward))
                                setIsDialogOpen(true)
                              }}
                            >
                              <Pencil className='h-4 w-4' />
                              Modifier
                            </Button>
                            {reward.statusId !== 1 ? (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setPendingAction({ reward, action: 'enable' })
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
                                  setPendingAction({ reward, action: 'disable' })
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
                                setPendingAction({ reward, action: 'deleted' })
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
              {editingReward
                ? 'Modifier la recompense de fidelite'
                : 'Ajouter une recompense de fidelite'}
            </DialogTitle>
            <DialogDescription>
              Creez une recompense que les membres peuvent obtenir avec des points et decidez si elle correspond a un article, un credit de frais ou un avantage personnalise.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='reward-name'>Nom de la recompense</Label>
              <Input
                id='reward-name'
                value={form.rewardName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rewardName: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='reward-description'>Description</Label>
              <Textarea
                id='reward-description'
                rows={3}
                value={form.rewardDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    rewardDescription: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2'>
                <Label>Type de recompense</Label>
                <Select
                  value={form.rewardType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      rewardType: value as LoyaltyRewardMutationInput['rewardType'],
                      schoolMerchandiseId:
                        value === 'Merchandise' ? current.schoolMerchandiseId : '',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyRewardTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='points-cost'>Cout en points</Label>
                <Input
                  id='points-cost'
                  inputMode='numeric'
                  value={form.pointsCost}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pointsCost: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='monetary-value'>Valeur monetaire</Label>
                <Input
                  id='monetary-value'
                  inputMode='decimal'
                  value={form.monetaryValue}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      monetaryValue: event.target.value,
                    }))
                  }
                  placeholder='Optionnel'
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2 sm:col-span-2'>
                <Label>Article lie</Label>
                <Select
                  value={form.schoolMerchandiseId || 'none'}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      schoolMerchandiseId: value === 'none' ? '' : value,
                    }))
                  }
                >
                  <SelectTrigger>
                      <SelectValue placeholder='Aucune marchandise liee' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>Aucune marchandise liee</SelectItem>
                    {merchandiseItems.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='stock-quantity'>Quantite en stock</Label>
                <Input
                  id='stock-quantity'
                  inputMode='numeric'
                  value={form.stockQuantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stockQuantity: event.target.value,
                    }))
                  }
                  placeholder='Laisser vide pour illimite'
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2'>
                <Label htmlFor='max-redeem'>Maximum de redemptions / membre</Label>
                <Input
                  id='max-redeem'
                  inputMode='numeric'
                  value={form.maxRedeemPerMember}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxRedeemPerMember: event.target.value,
                    }))
                  }
                  placeholder='Optionnel'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='reward-valid-from'>Valide a partir de</Label>
                <Input
                  id='reward-valid-from'
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
                <Label htmlFor='reward-valid-to'>Valide jusqu au</Label>
                <Input
                  id='reward-valid-to'
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

            <div className='flex items-center justify-between rounded-xl border p-4'>
              <div>
                  <p className='font-medium'>Necessite approbation directeur</p>
                  <p className='text-sm text-muted-foreground'>
                    Si active, les redemptions de cette recompense restent en attente jusqu a votre revue.
                  </p>
              </div>
              <Switch
                checked={form.requiresDirectorApproval}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    requiresDirectorApproval: checked,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='fulfillment-instructions'>Instructions de remise</Label>
              <Textarea
                id='fulfillment-instructions'
                rows={4}
                value={form.fulfillmentInstructions}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    fulfillmentInstructions: event.target.value,
                  }))
                }
                placeholder='Instructions de retrait, de livraison ou d approbation pour l equipe de l ecole.'
              />
            </div>

            {editingReward ? (
              <div className='rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground'>
                Date de creation : {formatDateTime(editingReward.createdOn)}.
                Derniere mise a jour :{' '}
                {formatDateTime(editingReward.modifiedOn)}.
              </div>
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
            <Button disabled={!canSave} onClick={() => saveMutation.mutate()}>
              <Save className='h-4 w-4' />
              {saveMutation.isPending
                ? 'Enregistrement...'
                : editingReward
                  ? 'Mettre a jour la recompense'
                  : 'Creer la recompense'}
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
                ? 'Supprimer cette recompense ?'
                : pendingAction?.action === 'disable'
                  ? 'Desactiver cette recompense ?'
                  : 'Activer cette recompense ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'deleted'
                ? 'La recompense restera dans l historique mais sera retiree des redemptions actives.'
                : pendingAction?.action === 'disable'
                  ? 'Les membres ne pourront plus utiliser cette recompense jusqu a sa reactivation.'
                  : 'La recompense redeviendra disponible dans le catalogue de fidelite.'}
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


