import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, PackageCheck, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { formatDateTime } from '@/features/admin/utils'
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
import {
  approveLoyaltyRedemption,
  fetchLoyaltyProgram,
  fetchLoyaltyRedemptions,
  fulfillLoyaltyRedemption,
  rejectLoyaltyRedemption,
  type LoyaltyMemberType,
  type LoyaltyRedemption,
} from './api'
import {
  formatPoints,
  getRedemptionStatusMeta,
  getLoyaltyMemberTypeLabel,
  getLoyaltyRewardTypeLabel,
  loyaltyMemberTypeOptions,
  loyaltyRedemptionStatusOptions,
  useDirectorLoyaltyScope,
} from './utils'

type RedemptionActionType = 'approve' | 'reject' | 'fulfill'

type PendingRedemptionAction =
  | {
      redemption: LoyaltyRedemption
      action: RedemptionActionType
    }
  | null

type RedemptionActionForm = {
  reviewNotes: string
  fulfillmentReference: string
}

function createEmptyActionForm(): RedemptionActionForm {
  return {
    reviewNotes: '',
    fulfillmentReference: '',
  }
}

export function LoyaltyRedemptionsManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [search, setSearch] = useState('')
  const [statusFiltre, setStatusFiltre] = useState<
    (typeof loyaltyRedemptionStatusOptions)[number]['value']
  >('all')
  const [memberTypeFiltre, setMemberTypeFiltre] = useState<
    LoyaltyMemberType | 'all'
  >('all')
  const [pendingAction, setPendingAction] = useState<PendingRedemptionAction>(null)
  const [actionForm, setActionForm] = useState<RedemptionActionForm>(
    createEmptyActionForm()
  )

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  const redemptionsQuery = useQuery({
    queryKey: ['loyalty', 'redemptions', schoolId, program?.id],
    queryFn: () =>
      fetchLoyaltyRedemptions({
        schoolId,
        loyaltyProgramId: program?.id,
      }),
    enabled: hasAssignedSchool && Boolean(program?.id),
  })

  useEffect(() => {
    if (!pendingAction) {
      setActionForm(createEmptyActionForm())
      return
    }

    setActionForm({
      reviewNotes: pendingAction.redemption.reviewNotes ?? '',
      fulfillmentReference: pendingAction.redemption.fulfillmentReference ?? '',
    })
  }, [pendingAction])

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return
      }

      if (pendingAction.action === 'approve') {
        await approveLoyaltyRedemption(
          pendingAction.redemption.id,
          actionForm.reviewNotes
        )
        return
      }

      if (pendingAction.action === 'reject') {
        await rejectLoyaltyRedemption(
          pendingAction.redemption.id,
          actionForm.reviewNotes
        )
        return
      }

      await fulfillLoyaltyRedemption(pendingAction.redemption.id, {
        fulfillmentReference: actionForm.fulfillmentReference,
        reviewNotes: actionForm.reviewNotes,
      })
    },
    onSuccess: () => {
      toast.success('Redemption mise a jour.')
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de mettre a jour cette redemption.'
        )
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Redemptions fidelite'
        description='Examinez les demandes de recompense, approuvez ou rejetez-les, puis suivez leur execution.'
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
        title='Redemptions fidelite'
        description='Examinez les demandes de recompense, approuvez ou rejetez-les, puis suivez leur execution.'
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
        title='Redemptions fidelite'
        description='Examinez les demandes de recompense, approuvez ou rejetez-les, puis suivez leur execution.'
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
        title='Redemptions fidelite'
        description='Examinez les demandes de recompense, approuvez ou rejetez-les, puis suivez leur execution.'
      >
        <EmptyState
          title='Creez d abord le programme'
          description='Les workflows de redemption deviennent disponibles apres la creation du programme de fidelite de l ecole.'
        />
      </PageShell>
    )
  }

  const allRedemptions = redemptionsQuery.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const filteredRedemptions = allRedemptions.filter((redemption) => {
    if (statusFiltre !== 'all' && redemption.status !== statusFiltre) {
      return false
    }

    if (memberTypeFiltre !== 'all' && redemption.memberType !== memberTypeFiltre) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return (
      redemption.memberFullName.toLowerCase().includes(normalizedSearch) ||
      redemption.rewardName.toLowerCase().includes(normalizedSearch) ||
      (redemption.requestNotes ?? '').toLowerCase().includes(normalizedSearch) ||
      (redemption.reviewNotes ?? '').toLowerCase().includes(normalizedSearch)
    )
  })
  const pendingCount = allRedemptions.filter(
    (redemption) => redemption.status === 'Pending'
  ).length
  const approvedCount = allRedemptions.filter(
    (redemption) => redemption.status === 'Approved'
  ).length
  const fulfilledCount = allRedemptions.filter(
    (redemption) => redemption.status === 'Fulfilled'
  ).length
  const canSubmitAction =
    pendingAction?.action === 'reject'
      ? actionForm.reviewNotes.trim().length > 0 && !actionMutation.isPending
      : !actionMutation.isPending

  return (
    <>
      <PageShell
        title='Redemptions fidelite'
        description='Traitez les demandes de recompense des parents et des agents collecteurs, puis faites avancer les demandes approuvees jusqu a leur execution.'
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                En attente de revue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(pendingCount)}</div>
              <p className='text-sm text-muted-foreground'>
                Demandes de recompense actuellement en attente d une decision.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Approuvees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(approvedCount)}</div>
              <p className='text-sm text-muted-foreground'>
                Demandes approuvees et pretes pour l execution.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Finalisees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(fulfilledCount)}</div>
              <p className='text-sm text-muted-foreground'>
                Demandes de recompense deja executees.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 lg:grid-cols-[1.3fr_240px_240px]'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Rechercher des redemptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Rechercher par nom du membre, recompense ou notes'
                />
              </div>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={statusFiltre}
                onValueChange={(value) =>
                  setStatusFiltre(
                    value as (typeof loyaltyRedemptionStatusOptions)[number]['value']
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {loyaltyRedemptionStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Type de membre
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={memberTypeFiltre}
                onValueChange={(value) =>
                  setMemberTypeFiltre(value as LoyaltyMemberType | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tous les types de membres</SelectItem>
                  {loyaltyMemberTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>File des redemptions</CardTitle>
            <CardDescription>
              Voyez qui a demande chaque recompense, combien de points ont ete utilises et ou se situe la demande dans le flux d approbation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {redemptionsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredRedemptions.length === 0 ? (
              <EmptyState
                title='Aucune redemption trouvee'
                description='Les redemptions apparaitront ici des que les membres commenceront a utiliser leurs points.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Recompense</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Demandee le</TableHead>
                      <TableHead>Revue / finalisation</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRedemptions.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell>
                          <div className='font-medium'>{redemption.memberFullName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {getLoyaltyMemberTypeLabel(redemption.memberType)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='font-medium'>{redemption.rewardName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {getLoyaltyRewardTypeLabel(redemption.rewardType)}
                            {redemption.quantity > 1
                              ? ` x ${formatPoints(redemption.quantity)}`
                              : ''}
                          </div>
                        </TableCell>
                        <TableCell>{formatPoints(redemption.pointsSpent)}</TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={getRedemptionStatusMeta(redemption.status).className}
                          >
                            {getRedemptionStatusMeta(redemption.status).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>{formatDateTime(redemption.createdOn)}</div>
                          <div className='text-xs text-muted-foreground'>
                            {redemption.requestNotes || 'Aucune note de demande'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{formatDateTime(redemption.reviewedOn || redemption.fulfilledOn)}</div>
                          <div className='text-xs text-muted-foreground'>
                            {redemption.fulfillmentReference ||
                              redemption.reviewNotes ||
                              'Aucune note de revue'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            {redemption.status === 'Pending' ? (
                              <>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    setPendingAction({
                                      redemption,
                                      action: 'approve',
                                    })
                                  }
                                >
                                  <Check className='h-4 w-4' />
                                  Approuver
                                </Button>
                                <Button
                                  variant='destructive'
                                  size='sm'
                                  onClick={() =>
                                    setPendingAction({
                                      redemption,
                                      action: 'reject',
                                    })
                                  }
                                >
                                  <X className='h-4 w-4' />
                                  Rejeter
                                </Button>
                              </>
                            ) : null}
                            {redemption.status === 'Approved' ? (
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() =>
                                  setPendingAction({
                                    redemption,
                                    action: 'fulfill',
                                  })
                                }
                              >
                                  <PackageCheck className='h-4 w-4' />
                                  Finaliser
                              </Button>
                            ) : null}
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

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>
              {pendingAction?.action === 'approve'
                ? 'Approuver la redemption'
                : pendingAction?.action === 'reject'
                  ? 'Rejeter la redemption'
                  : 'Finaliser la redemption'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'approve'
                ? 'Confirmez que la recompense peut passer a l etape suivante.'
                : pendingAction?.action === 'reject'
                  ? 'Fournissez un motif afin que le membre comprenne pourquoi la demande a ete refusee.'
                  : 'Enregistrez comment cette recompense a ete remise afin que l equipe dispose d une trace claire.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
              <p className='font-medium'>
                {pendingAction?.redemption.memberFullName} a demande{' '}
                {pendingAction?.redemption.rewardName}
              </p>
              <p className='mt-1 text-muted-foreground'>
                {pendingAction?.redemption.quantity} article(s) pour{' '}
                {formatPoints(pendingAction?.redemption.pointsSpent ?? 0)} points.
              </p>
            </div>

            {pendingAction?.action === 'fulfill' ? (
              <div className='grid gap-2'>
                <Label htmlFor='fulfillment-reference'>Reference de remise</Label>
                <Input
                  id='fulfillment-reference'
                  value={actionForm.fulfillmentReference}
                  onChange={(event) =>
                    setActionForm((current) => ({
                      ...current,
                      fulfillmentReference: event.target.value,
                    }))
                  }
                  placeholder='Code de retrait, numero de recu, bon de livraison ou autre reference'
                />
              </div>
            ) : null}

            <div className='grid gap-2'>
              <Label htmlFor='review-notes'>
                {pendingAction?.action === 'reject'
                    ? 'Motif du rejet'
                    : 'Notes de revue'}
              </Label>
              <Textarea
                id='review-notes'
                rows={4}
                value={actionForm.reviewNotes}
                onChange={(event) =>
                  setActionForm((current) => ({
                    ...current,
                    reviewNotes: event.target.value,
                  }))
                }
                placeholder={
                  pendingAction?.action === 'reject'
                    ? 'Expliquez pourquoi cette redemption ne peut pas etre approuvee.'
                    : 'Note interne ou visible pour le membre, si necessaire.'
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setPendingAction(null)}
              disabled={actionMutation.isPending}
            >
              Annuler
            </Button>
            <Button disabled={!canSubmitAction} onClick={() => actionMutation.mutate()}>
              {actionMutation.isPending
                ? 'Enregistrement...'
                : pendingAction?.action === 'approve'
                  ? 'Approuver la redemption'
                : pendingAction?.action === 'reject'
                    ? 'Rejeter la redemption'
                    : 'Marquer comme finalisee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


