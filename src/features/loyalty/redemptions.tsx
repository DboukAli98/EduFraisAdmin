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
  const [statusFilter, setStatusFilter] = useState<
    (typeof loyaltyRedemptionStatusOptions)[number]['value']
  >('all')
  const [memberTypeFilter, setMemberTypeFilter] = useState<
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
      toast.success('Redemption updated.')
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update this redemption.')
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Loyalty Redemptions'
        description='Review reward claims, approve or reject requests, and track fulfillment.'
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
        title='Loyalty Redemptions'
        description='Review reward claims, approve or reject requests, and track fulfillment.'
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
        title='Loyalty Redemptions'
        description='Review reward claims, approve or reject requests, and track fulfillment.'
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
        title='Loyalty Redemptions'
        description='Review reward claims, approve or reject requests, and track fulfillment.'
      >
        <EmptyState
          title='Create the program first'
          description='Redemption workflows become available after the school loyalty program is created.'
        />
      </PageShell>
    )
  }

  const allRedemptions = redemptionsQuery.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const filteredRedemptions = allRedemptions.filter((redemption) => {
    if (statusFilter !== 'all' && redemption.status !== statusFilter) {
      return false
    }

    if (memberTypeFilter !== 'all' && redemption.memberType !== memberTypeFilter) {
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
        title='Loyalty Redemptions'
        description='Handle reward requests from parents and collecting agents, then move approved claims through fulfillment.'
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Pending review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(pendingCount)}</div>
              <p className='text-sm text-muted-foreground'>
                Reward requests currently waiting for a decision.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(approvedCount)}</div>
              <p className='text-sm text-muted-foreground'>
                Requests that are approved and ready for fulfillment.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Fulfilled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(fulfilledCount)}</div>
              <p className='text-sm text-muted-foreground'>
                Reward claims that have already been completed.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 lg:grid-cols-[1.3fr_240px_240px]'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Search redemptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search by member name, reward, or notes'
                />
              </div>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(
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
                Member type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={memberTypeFilter}
                onValueChange={(value) =>
                  setMemberTypeFilter(value as LoyaltyMemberType | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All member types</SelectItem>
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
            <CardTitle>Reward redemption queue</CardTitle>
            <CardDescription>
              See who requested each reward, how many points were spent, and where the request currently sits in the approval flow.
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
                title='No redemptions found'
                description='Redemptions will appear here once members start using their points.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Reviewed / fulfilled</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRedemptions.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell>
                          <div className='font-medium'>{redemption.memberFullName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {redemption.memberType}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='font-medium'>{redemption.rewardName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {redemption.rewardType}
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
                            {redemption.requestNotes || 'No request notes'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{formatDateTime(redemption.reviewedOn || redemption.fulfilledOn)}</div>
                          <div className='text-xs text-muted-foreground'>
                            {redemption.fulfillmentReference ||
                              redemption.reviewNotes ||
                              'No review notes'}
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
                                  Approve
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
                                  Reject
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
                                Fulfill
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
                ? 'Approve redemption'
                : pendingAction?.action === 'reject'
                  ? 'Reject redemption'
                  : 'Fulfill redemption'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.action === 'approve'
                ? 'Confirm the reward can move to the next step.'
                : pendingAction?.action === 'reject'
                  ? 'Provide a reason so the member understands why the request was declined.'
                  : 'Record how this reward was fulfilled so the team has a clear audit trail.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
              <p className='font-medium'>
                {pendingAction?.redemption.memberFullName} requested{' '}
                {pendingAction?.redemption.rewardName}
              </p>
              <p className='mt-1 text-muted-foreground'>
                {pendingAction?.redemption.quantity} item(s) for{' '}
                {formatPoints(pendingAction?.redemption.pointsSpent ?? 0)} points.
              </p>
            </div>

            {pendingAction?.action === 'fulfill' ? (
              <div className='grid gap-2'>
                <Label htmlFor='fulfillment-reference'>Fulfillment reference</Label>
                <Input
                  id='fulfillment-reference'
                  value={actionForm.fulfillmentReference}
                  onChange={(event) =>
                    setActionForm((current) => ({
                      ...current,
                      fulfillmentReference: event.target.value,
                    }))
                  }
                  placeholder='Pickup code, receipt number, delivery note, or other reference'
                />
              </div>
            ) : null}

            <div className='grid gap-2'>
              <Label htmlFor='review-notes'>
                {pendingAction?.action === 'reject'
                  ? 'Rejection reason'
                  : 'Review notes'}
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
                    ? 'Explain why this redemption cannot be approved.'
                    : 'Optional internal or member-facing note.'
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
              Cancel
            </Button>
            <Button disabled={!canSubmitAction} onClick={() => actionMutation.mutate()}>
              {actionMutation.isPending
                ? 'Saving...'
                : pendingAction?.action === 'approve'
                  ? 'Approve redemption'
                  : pendingAction?.action === 'reject'
                    ? 'Reject redemption'
                    : 'Mark as fulfilled'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
