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
    return merchandise?.name || reward.schoolMerchandiseName || 'Linked merchandise'
  }

  if (reward.rewardType === 'SchoolFeeCredit' && reward.monetaryValue != null) {
    return `Fee credit value ${formatCurrency(reward.monetaryValue)}`
  }

  return reward.rewardDescription || 'Custom reward'
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
      toast.success(editingReward ? 'Reward updated.' : 'Reward created.')
      setIsDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Unable to save the loyalty reward.'))
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
        getApiErrorMessage(error, 'Unable to update the reward status.')
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Loyalty Rewards'
        description='Build the catalog of benefits, discounts, and merchandise rewards members can redeem.'
      >
        <EmptyState
          title='Director access required'
          description='This loyalty workspace is available from the director experience.'
        />
      </PageShell>
    )
  }

  if (!hasAssignedSchool) {
    return (
      <PageShell
        title='Loyalty Rewards'
        description='Build the catalog of benefits, discounts, and merchandise rewards members can redeem.'
      >
        <EmptyState
          title='No school assigned'
          description='This director account is not linked to a school yet.'
        />
      </PageShell>
    )
  }

  if (programQuery.isLoading) {
    return (
      <PageShell
        title='Loyalty Rewards'
        description='Build the catalog of benefits, discounts, and merchandise rewards members can redeem.'
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
        title='Loyalty Rewards'
        description='Build the catalog of benefits, discounts, and merchandise rewards members can redeem.'
      >
        <EmptyState
          title='Create the program first'
          description='Rewards can only be configured after the school loyalty program is created.'
        />
      </PageShell>
    )
  }

  const allRewards = rewardsQuery.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const merchandiseItems = merchandiseQuery.data?.items ?? []
  const merchandiseById = new Map(
    merchandiseItems.map((item) => [item.id, item] as const)
  )
  const filteredRewards = allRewards.filter((reward) => {
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
  const rewardsRequiringApproval = allRewards.filter(
    (reward) => reward.requiresDirectorApproval
  ).length
  const linkedMerchandiseRewards = allRewards.filter(
    (reward) => reward.schoolMerchandiseId != null
  ).length
  const canSave =
    form.rewardName.trim().length > 0 &&
    Number(form.pointsCost) > 0 &&
    !saveMutation.isPending

  return (
    <>
      <PageShell
        title='Loyalty Rewards'
        description='Offer school merchandise, fee credits, or custom benefits that parents and agents can redeem with their points.'
        actions={
          <Button
            onClick={() => {
              setEditingReward(null)
              setForm(createEmptyRewardForm())
              setIsDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Add reward
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(allRewards.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Reward options available to this school program.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Needs director approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>
                {formatPoints(rewardsRequiringApproval)}
              </div>
              <p className='text-sm text-muted-foreground'>
                Rewards that stay pending until you review the request.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Search rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search by reward name, type, or merchandise'
                />
              </div>
              <p className='mt-3 text-sm text-muted-foreground'>
                {formatPoints(linkedMerchandiseRewards)} rewards are tied to school merchandise.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Configured rewards catalog</CardTitle>
            <CardDescription>
              Design the benefits members can redeem, how much each reward costs, and whether it needs approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rewardsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredRewards.length === 0 ? (
              <EmptyState
                title='No loyalty rewards found'
                description='Create the first reward to give members something meaningful to redeem.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reward</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Points cost</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell>
                          <div className='font-medium'>{reward.rewardName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {buildRewardSubtitle(reward, merchandiseById)}
                          </div>
                        </TableCell>
                        <TableCell>{reward.rewardType}</TableCell>
                        <TableCell>{formatPoints(reward.pointsCost)}</TableCell>
                        <TableCell>
                          {reward.stockQuantity != null
                            ? formatPoints(reward.stockQuantity)
                            : 'Unlimited'}
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
                              Edit
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
                                Enable
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
                                Disable
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
                              Delete
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
              {editingReward ? 'Edit loyalty reward' : 'Add loyalty reward'}
            </DialogTitle>
            <DialogDescription>
              Create a reward members can redeem with points, and decide whether it maps to a merchandise item, a fee credit, or a custom school benefit.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='reward-name'>Reward name</Label>
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
                <Label>Reward type</Label>
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
                <Label htmlFor='points-cost'>Points cost</Label>
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
                <Label htmlFor='monetary-value'>Monetary value</Label>
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
                  placeholder='Optional'
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2 sm:col-span-2'>
                <Label>Linked merchandise</Label>
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
                    <SelectValue placeholder='No linked merchandise' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>No linked merchandise</SelectItem>
                    {merchandiseItems.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='stock-quantity'>Stock quantity</Label>
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
                  placeholder='Leave empty for unlimited'
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2'>
                <Label htmlFor='max-redeem'>Max redeem/member</Label>
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
                  placeholder='Optional'
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='reward-valid-from'>Valid from</Label>
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
                <Label htmlFor='reward-valid-to'>Valid to</Label>
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
                <p className='font-medium'>Requires director approval</p>
                <p className='text-sm text-muted-foreground'>
                  If enabled, redemptions for this reward remain pending until you review them.
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
              <Label htmlFor='fulfillment-instructions'>Fulfillment instructions</Label>
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
                placeholder='Optional pickup, delivery, or approval instructions for the school team.'
              />
            </div>

            {editingReward ? (
              <div className='rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground'>
                Created {formatDateTime(editingReward.createdOn)} and last updated{' '}
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
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={() => saveMutation.mutate()}>
              <Save className='h-4 w-4' />
              {saveMutation.isPending
                ? 'Saving...'
                : editingReward
                  ? 'Update reward'
                  : 'Create reward'}
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
                ? 'Delete this reward?'
                : pendingAction?.action === 'disable'
                  ? 'Disable this reward?'
                  : 'Enable this reward?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'deleted'
                ? 'The reward will stay in history but it will be removed from active redemptions.'
                : pendingAction?.action === 'disable'
                  ? 'Members will no longer be able to redeem this reward until it is enabled again.'
                  : 'The reward will become available in the loyalty catalog again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionMutation.mutate()}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
