import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenText, Coins, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchCollectingAgents } from '@/features/collecting-agents/api'
import { fetchParents } from '@/features/users/api'
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
  adjustLoyaltyMemberPoints,
  enrollLoyaltyMember,
  fetchLoyaltyMemberLedger,
  fetchLoyaltyMembers,
  fetchLoyaltyProgram,
  type LoyaltyLedgerEntry,
  type LoyaltyMember,
  type LoyaltyMemberType,
} from './api'
import {
  formatPoints,
  loyaltyMemberTypeOptions,
  useDirectorLoyaltyScope,
} from './utils'

type EnrollmentForm = {
  memberType: LoyaltyMemberType
  memberEntityId: string
}

type AdjustmentForm = {
  pointsDelta: string
  reason: string
}

function createEmptyEnrollmentForm(): EnrollmentForm {
  return {
    memberType: 'Parent',
    memberEntityId: '',
  }
}

function createEmptyAdjustmentForm(): AdjustmentForm {
  return {
    pointsDelta: '',
    reason: '',
  }
}

function getLedgerTone(pointsDelta: number): string {
  if (pointsDelta > 0) {
    return 'text-emerald-600 dark:text-emerald-400'
  }

  if (pointsDelta < 0) {
    return 'text-rose-600 dark:text-rose-400'
  }

  return 'text-muted-foreground'
}

export function LoyaltyMembersManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [search, setSearch] = useState('')
  const [memberTypeFilter, setMemberTypeFilter] = useState<
    LoyaltyMemberType | 'all'
  >('all')
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false)
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentForm>(
    createEmptyEnrollmentForm()
  )
  const [memberForAdjustment, setMemberForAdjustment] =
    useState<LoyaltyMember | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(
    createEmptyAdjustmentForm()
  )
  const [memberForLedger, setMemberForLedger] = useState<LoyaltyMember | null>(null)

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  const membersQuery = useQuery({
    queryKey: ['loyalty', 'members', schoolId, program?.id],
    queryFn: () =>
      fetchLoyaltyMembers({
        schoolId,
        loyaltyProgramId: program?.id,
      }),
    enabled: hasAssignedSchool && Boolean(program?.id),
  })

  const parentsQuery = useQuery({
    queryKey: ['loyalty', 'members', 'parents', schoolId],
    queryFn: () => fetchParents({ schoolId }),
    enabled:
      hasAssignedSchool &&
      Boolean(program?.id) &&
      Boolean(program?.allowParentParticipation),
  })

  const agentsQuery = useQuery({
    queryKey: ['loyalty', 'members', 'agents', schoolId],
    queryFn: () => fetchCollectingAgents(schoolId),
    enabled:
      hasAssignedSchool &&
      Boolean(program?.id) &&
      Boolean(program?.allowAgentParticipation),
  })

  const ledgerQuery = useQuery({
    queryKey: ['loyalty', 'member-ledger', memberForLedger?.id],
    queryFn: () => fetchLoyaltyMemberLedger(memberForLedger!.id),
    enabled: Boolean(memberForLedger?.id),
  })

  useEffect(() => {
    if (!isEnrollDialogOpen) {
      setEnrollmentForm(createEmptyEnrollmentForm())
    }
  }, [isEnrollDialogOpen])

  useEffect(() => {
    if (!memberForAdjustment) {
      setAdjustmentForm(createEmptyAdjustmentForm())
    }
  }, [memberForAdjustment])

  useEffect(() => {
    if (!program) {
      return
    }

    if (
      enrollmentForm.memberType === 'Parent' &&
      !program.allowParentParticipation &&
      program.allowAgentParticipation
    ) {
      setEnrollmentForm((current) => ({
        ...current,
        memberType: 'CollectingAgent',
        memberEntityId: '',
      }))
    }

    if (
      enrollmentForm.memberType === 'CollectingAgent' &&
      !program.allowAgentParticipation &&
      program.allowParentParticipation
    ) {
      setEnrollmentForm((current) => ({
        ...current,
        memberType: 'Parent',
        memberEntityId: '',
      }))
    }
  }, [enrollmentForm.memberType, program])

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!program) {
        return
      }

      await enrollLoyaltyMember(program.id, {
        memberType: enrollmentForm.memberType,
        memberEntityId: Number(enrollmentForm.memberEntityId),
      })
    },
    onSuccess: () => {
      toast.success('Member enrolled in the loyalty program.')
      setIsEnrollDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Unable to enroll this member.'))
    },
  })

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!memberForAdjustment) {
        return
      }

      await adjustLoyaltyMemberPoints(memberForAdjustment.id, adjustmentForm)
    },
    onSuccess: () => {
      toast.success('Points adjustment saved.')
      const ledgerMemberId = memberForAdjustment?.id
      setMemberForAdjustment(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
      if (ledgerMemberId) {
        void queryClient.invalidateQueries({
          queryKey: ['loyalty', 'member-ledger', ledgerMemberId],
        })
      }
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to save the points adjustment.')
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Loyalty Members'
        description='Enroll parents and collecting agents, track balances, and review each member ledger.'
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
        title='Loyalty Members'
        description='Enroll parents and collecting agents, track balances, and review each member ledger.'
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
        title='Loyalty Members'
        description='Enroll parents and collecting agents, track balances, and review each member ledger.'
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
        title='Loyalty Members'
        description='Enroll parents and collecting agents, track balances, and review each member ledger.'
      >
        <EmptyState
          title='Create the program first'
          description='Members can only be enrolled after the school loyalty program is created.'
        />
      </PageShell>
    )
  }

  const allMembers = membersQuery.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const filteredMembers = allMembers.filter((member) => {
    if (memberTypeFilter !== 'all' && member.memberType !== memberTypeFilter) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return (
      member.fullName.toLowerCase().includes(normalizedSearch) ||
      (member.email ?? '').toLowerCase().includes(normalizedSearch) ||
      (member.phoneNumber ?? '').toLowerCase().includes(normalizedSearch)
    )
  })
  const parentMembers = allMembers.filter((member) => member.memberType === 'Parent')
  const agentMembers = allMembers.filter(
    (member) => member.memberType === 'CollectingAgent'
  )
  const outstandingPoints = allMembers.reduce(
    (sum, member) => sum + member.currentPointsBalance,
    0
  )

  const enrolledParentIds = new Set(
    allMembers
      .filter((member) => member.memberType === 'Parent' && member.statusId !== 5)
      .map((member) => member.memberEntityId)
  )
  const enrolledAgentIds = new Set(
    allMembers
      .filter(
        (member) => member.memberType === 'CollectingAgent' && member.statusId !== 5
      )
      .map((member) => member.memberEntityId)
  )

  const availableParents = (parentsQuery.data ?? []).filter(
    (parent) => !enrolledParentIds.has(parent.id)
  )
  const availableAgents = (agentsQuery.data ?? []).filter(
    (agent) => !enrolledAgentIds.has(agent.id)
  )

  const enrollmentOptions =
    enrollmentForm.memberType === 'Parent'
      ? availableParents.map((parent) => ({
          value: String(parent.id),
          label:
            buildFullName(parent.firstName, parent.lastName) || `Parent ${parent.id}`,
          meta: parent.email || `${parent.countryCode}${parent.phoneNumber}`,
        }))
      : availableAgents.map((agent) => ({
          value: String(agent.id),
          label:
            buildFullName(agent.firstName, agent.lastName) || `Agent ${agent.id}`,
          meta: agent.email || `${agent.countryCode}${agent.phoneNumber}`,
        }))

  const canOpenEnrollment =
    program.allowParentParticipation || program.allowAgentParticipation
  const canEnroll =
    enrollmentForm.memberEntityId.length > 0 && !enrollMutation.isPending
  const canAdjust =
    adjustmentForm.reason.trim().length > 0 &&
    Number(adjustmentForm.pointsDelta) !== 0 &&
    !adjustMutation.isPending
  const ledgerEntries: LoyaltyLedgerEntry[] = ledgerQuery.data ?? []

  return (
    <>
      <PageShell
        title='Loyalty Members'
        description='Bring parents and collecting agents into the loyalty program, monitor balances, and make manual point adjustments when needed.'
        actions={
          <Button
            onClick={() => setIsEnrollDialogOpen(true)}
            disabled={!canOpenEnrollment}
          >
            <Plus className='h-4 w-4' />
            Enroll member
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-4'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(allMembers.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Members currently enrolled in {program.programName}.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Parent members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(parentMembers.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Parent loyalty accounts connected to the school.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Agent members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(agentMembers.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Collecting agents participating in this program.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Outstanding points
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(outstandingPoints)}</div>
              <p className='text-sm text-muted-foreground'>
                Current balance across every enrolled member.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 md:grid-cols-[1fr_220px]'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Search members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search by member name, email, or phone number'
                />
              </div>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Filter
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
            <CardTitle>Enrolled loyalty members</CardTitle>
            <CardDescription>
              Review balances, activity, and member lifecycle status before approving redemptions or applying manual adjustments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredMembers.length === 0 ? (
              <EmptyState
                title='No loyalty members found'
                description='Enroll parents or collecting agents to begin tracking balances and redemptions.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Current balance</TableHead>
                      <TableHead>Lifetime earned</TableHead>
                      <TableHead>Last activity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className='font-medium'>{member.fullName}</div>
                          <div className='text-xs text-muted-foreground'>
                            {member.email || member.phoneNumber || 'No contact details'}
                          </div>
                        </TableCell>
                        <TableCell>{member.memberType}</TableCell>
                        <TableCell>{formatPoints(member.currentPointsBalance)}</TableCell>
                        <TableCell>{formatPoints(member.lifetimePointsEarned)}</TableCell>
                        <TableCell>{formatDateTime(member.lastActivityOn)}</TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(member.statusId).className}
                          >
                            {getEntityStatusMeta(member.statusId).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setMemberForLedger(member)}
                            >
                              <BookOpenText className='h-4 w-4' />
                              Ledger
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setMemberForAdjustment(member)}
                            >
                              <Coins className='h-4 w-4' />
                              Adjust points
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

      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Enroll loyalty member</DialogTitle>
            <DialogDescription>
              Add a parent or collecting agent to the school loyalty program so points can be tracked against their account.
            </DialogDescription>
          </DialogHeader>

          {!canOpenEnrollment ? (
            <EmptyState
              title='Participation is disabled'
              description='Enable parent or agent participation in the loyalty program settings before enrolling members.'
            />
          ) : (
            <div className='grid gap-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label>Member type</Label>
                  <Select
                    value={enrollmentForm.memberType}
                    onValueChange={(value) =>
                      setEnrollmentForm({
                        memberType: value as LoyaltyMemberType,
                        memberEntityId: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {program.allowParentParticipation ? (
                        <SelectItem value='Parent'>Parents</SelectItem>
                      ) : null}
                      {program.allowAgentParticipation ? (
                        <SelectItem value='CollectingAgent'>
                          Collecting agents
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className='grid gap-2'>
                  <Label>Member</Label>
                  <Select
                    value={enrollmentForm.memberEntityId || 'none'}
                    onValueChange={(value) =>
                      setEnrollmentForm((current) => ({
                        ...current,
                        memberEntityId: value === 'none' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Select a member to enroll' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>Select a member</SelectItem>
                      {enrollmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {enrollmentOptions.length === 0 ? (
                <div className='rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground'>
                  Everyone in this member type is already enrolled, or there are no records available yet.
                </div>
              ) : (
                <div className='rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground'>
                  {enrollmentOptions.find(
                    (option) => option.value === enrollmentForm.memberEntityId
                  )?.meta || 'Choose a member to review the contact information.'}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsEnrollDialogOpen(false)}
              disabled={enrollMutation.isPending}
            >
              Cancel
            </Button>
            <Button disabled={!canEnroll} onClick={() => enrollMutation.mutate()}>
              <Plus className='h-4 w-4' />
              {enrollMutation.isPending ? 'Enrolling...' : 'Enroll member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberForAdjustment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberForAdjustment(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Adjust points</DialogTitle>
            <DialogDescription>
              Add or remove points from{' '}
              <span className='font-medium'>{memberForAdjustment?.fullName}</span>.
              Use a negative number to deduct points.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='points-delta'>Points delta</Label>
              <Input
                id='points-delta'
                inputMode='numeric'
                value={adjustmentForm.pointsDelta}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    pointsDelta: event.target.value,
                  }))
                }
                placeholder='Example: 50 or -20'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='adjustment-reason'>Reason</Label>
              <Textarea
                id='adjustment-reason'
                rows={4}
                value={adjustmentForm.reason}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder='Explain why this manual adjustment is being applied.'
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setMemberForAdjustment(null)}
              disabled={adjustMutation.isPending}
            >
              Cancel
            </Button>
            <Button disabled={!canAdjust} onClick={() => adjustMutation.mutate()}>
              <SlidersHorizontal className='h-4 w-4' />
              {adjustMutation.isPending ? 'Saving...' : 'Save adjustment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberForLedger !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberForLedger(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-5xl'>
          <DialogHeader>
            <DialogTitle>Loyalty ledger</DialogTitle>
            <DialogDescription>
              Detailed point history for{' '}
              <span className='font-medium'>{memberForLedger?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>

          {ledgerQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <EmptyState
              title='No ledger entries yet'
              description='This member has not earned, redeemed, or adjusted any points so far.'
            />
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Delta</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDateTime(entry.createdOn)}</TableCell>
                      <TableCell>
                        <div className='font-medium'>{entry.entryType}</div>
                        <div className='text-xs text-muted-foreground'>
                          {entry.createdByUserId || 'System generated'}
                        </div>
                      </TableCell>
                      <TableCell>{entry.referenceType}</TableCell>
                      <TableCell className={getLedgerTone(entry.pointsDelta)}>
                        {entry.pointsDelta > 0 ? '+' : ''}
                        {formatPoints(entry.pointsDelta)}
                      </TableCell>
                      <TableCell>
                        {formatPoints(entry.balanceBefore)} to{' '}
                        {formatPoints(entry.balanceAfter)}
                      </TableCell>
                      <TableCell>{entry.description || 'No description'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
