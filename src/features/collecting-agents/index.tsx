import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Coins,
  MapPinned,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatCurrency,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import {
  approveAgentRequest,
  assignCollectingAgentToParent,
  createAgentCommission,
  createCollectingAgent,
  fetchAgentCommissions,
  fetchCollectingAgentParents,
  fetchCollectingAgents,
  fetchPendingAgentRequests,
  fetchSchoolAgentActivities,
  logAgentActivity,
  rejectAgentRequest,
  unassignCollectingAgentFromParent,
  updateCollectingAgent,
  updateCollectingAgentStatus,
  type AgentActivityMutationInput,
  type AgentActivityRecord,
  type AgentActivityType,
  type AgentAssignmentParent,
  type AgentCommissionRecord,
  type AgentMutationInput,
  type AgentRecord,
  type CommissionMutationInput,
  type PendingAgentRequestRecord,
} from '@/features/collecting-agents/api'
import { fetchParents } from '@/features/users/api'
import { useAuthStore } from '@/stores/auth-store'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

interface SummaryCardProps {
  title: string
  value: string
  description: string
}

interface AgentFormState {
  firstName: string
  lastName: string
  email: string
  countryCode: string
  phoneNumber: string
  assignedArea: string
  commissionPercentage: string
}

interface AssignmentFormState {
  parentId: number
  assignmentNotes: string
}

interface ActivityFormState {
  parentId: number
  activityType: AgentActivityType
  activityDescription: string
  notes: string
  relatedTransactionId: string
  relatedSupportRequestId: string
}

interface CommissionFormState {
  paymentTransactionId: string
  commissionAmount: string
  commissionRate: string
  description: string
}

type ReviewAction =
  | {
      mode: 'approve' | 'reject'
      request: PendingAgentRequestRecord
    }
  | null

const activityTypeOptions: AgentActivityType[] = [
  'PaymentCollected',
  'PaymentAttempted',
  'ParentContact',
  'SupportRequestHandled',
  'ParentAssigned',
  'ParentUnassigned',
  'FieldVisit',
  'PhoneCall',
  'Other',
]

function SummaryCard({ title, value, description }: SummaryCardProps) {
  return (
    <Card className='border-border/70'>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium text-muted-foreground'>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='text-3xl font-semibold'>{value}</div>
        <p className='text-sm text-muted-foreground'>{description}</p>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='space-y-1 border-b pb-3 last:border-b-0 last:pb-0'>
      <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
        {label}
      </p>
      <div className='text-sm'>{value}</div>
    </div>
  )
}

function createEmptyAgentForm(agent?: AgentRecord | null): AgentFormState {
  return {
    firstName: agent?.firstName ?? '',
    lastName: agent?.lastName ?? '',
    email: agent?.email ?? '',
    countryCode: agent?.countryCode ?? '242',
    phoneNumber: agent?.phoneNumber ?? '',
    assignedArea: agent?.assignedArea ?? '',
    commissionPercentage:
      agent?.commissionPercentage != null ? String(agent.commissionPercentage) : '',
  }
}

function createEmptyAssignmentForm(): AssignmentFormState {
  return {
    parentId: 0,
    assignmentNotes: '',
  }
}

function createEmptyActivityForm(): ActivityFormState {
  return {
    parentId: 0,
    activityType: 'ParentContact',
    activityDescription: '',
    notes: '',
    relatedTransactionId: '',
    relatedSupportRequestId: '',
  }
}

function createEmptyCommissionForm(defaultRate = ''): CommissionFormState {
  return {
    paymentTransactionId: '',
    commissionAmount: '',
    commissionRate: defaultRate,
    description: '',
  }
}

function formatCommissionStatus(record: AgentCommissionRecord): string {
  if (record.status) {
    return record.status
  }

  return record.isApproved ? 'Approved' : 'Pending'
}

function formatApprovalStatus(status: string | null): string {
  return status?.trim() || 'Pending'
}

export function CollectingAgents() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const schoolId = currentUser?.schoolIds[0] ?? null
  const directorId = isDirector ? currentUser?.entityUserId ?? null : null

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null)
  const [agentForm, setAgentForm] = useState<AgentFormState>(createEmptyAgentForm())

  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false)
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(
    createEmptyAssignmentForm()
  )

  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [activityForm, setActivityForm] = useState<ActivityFormState>(
    createEmptyActivityForm()
  )

  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false)
  const [commissionForm, setCommissionForm] = useState<CommissionFormState>(
    createEmptyCommissionForm()
  )

  const [reviewAction, setReviewAction] = useState<ReviewAction>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [pendingStatusAgent, setPendingStatusAgent] = useState<AgentRecord | null>(
    null
  )
  const [pendingUnassignParent, setPendingUnassignParent] =
    useState<AgentAssignmentParent | null>(null)

  const agentsQuery = useQuery({
    queryKey: ['collecting-agents', 'roster', schoolId],
    queryFn: () => fetchCollectingAgents(schoolId ?? 0),
    enabled: isDirector && Boolean(schoolId),
  })

  const parentsQuery = useQuery({
    queryKey: ['collecting-agents', 'available-parents', schoolId],
    queryFn: () => fetchParents({ schoolId }),
    enabled: isDirector && Boolean(schoolId),
  })

  const pendingRequestsQuery = useQuery({
    queryKey: ['collecting-agents', 'pending-requests', schoolId],
    queryFn: () => fetchPendingAgentRequests(schoolId ?? 0),
    enabled: isDirector && Boolean(schoolId),
  })

  const agents = agentsQuery.data ?? []
  const selectedAgent =
    agents.find((agent) => agent.id === selectedAgentId) ?? null

  useEffect(() => {
    if (!agents.length) {
      setSelectedAgentId(null)
      return
    }

    setSelectedAgentId((current) => {
      if (current && agents.some((agent) => agent.id === current)) {
        return current
      }

      return agents[0].id
    })
  }, [agents])

  const assignedParentsQuery = useQuery({
    queryKey: ['collecting-agents', 'assigned-parents', selectedAgentId],
    queryFn: () => fetchCollectingAgentParents(selectedAgentId ?? 0),
    enabled: isDirector && Boolean(selectedAgentId),
  })

  const activitiesQuery = useQuery({
    queryKey: ['collecting-agents', 'activities', schoolId, selectedAgentId],
    queryFn: () =>
      fetchSchoolAgentActivities({
        schoolId,
        collectingAgentId: selectedAgentId,
      }),
    enabled: isDirector && Boolean(selectedAgentId),
  })

  const commissionsQuery = useQuery({
    queryKey: ['collecting-agents', 'commissions', selectedAgentId],
    queryFn: () => fetchAgentCommissions(selectedAgentId ?? 0),
    enabled: isDirector && Boolean(selectedAgentId),
  })

  const assignedParents = assignedParentsQuery.data ?? []
  const schoolParents = parentsQuery.data ?? []
  const pendingRequests = pendingRequestsQuery.data ?? []
  const activities = activitiesQuery.data?.items ?? []
  const commissions = commissionsQuery.data?.items ?? []

  const availableParents = useMemo(() => {
    const assignedParentIds = new Set(assignedParents.map((parent) => parent.id))

    return schoolParents.filter(
      (parent) => parent.statusId !== 5 && !assignedParentIds.has(parent.id)
    )
  }, [assignedParents, schoolParents])

  const saveAgentMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId) {
        return
      }

      const payload: AgentMutationInput = {
        schoolId,
        firstName: agentForm.firstName,
        lastName: agentForm.lastName,
        email: agentForm.email,
        countryCode: agentForm.countryCode,
        phoneNumber: agentForm.phoneNumber,
        assignedArea: agentForm.assignedArea,
        commissionPercentage: agentForm.commissionPercentage,
      }

      if (editingAgent) {
        await updateCollectingAgent(editingAgent.id, editingAgent.statusId, payload)
        return
      }

      await createCollectingAgent(payload)
    },
    onSuccess: () => {
      toast.success(
        editingAgent
          ? 'Collecting agent updated successfully.'
          : 'Collecting agent added successfully.'
      )
      setIsAgentDialogOpen(false)
      setEditingAgent(null)
      setAgentForm(createEmptyAgentForm())
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'roster', schoolId],
      })
    },
  })

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!pendingStatusAgent) {
        return
      }

      const nextStatusId = pendingStatusAgent.statusId === 1 ? 2 : 1
      await updateCollectingAgentStatus(pendingStatusAgent, nextStatusId)
    },
    onSuccess: () => {
      if (!pendingStatusAgent) {
        return
      }

      const nextLabel = pendingStatusAgent.statusId === 1 ? 'disabled' : 'enabled'
      toast.success(`Collecting agent ${nextLabel} successfully.`)
      setPendingStatusAgent(null)
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'roster', schoolId],
      })
    },
  })

  const assignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId || !directorId || assignmentForm.parentId === 0) {
        return
      }

      await assignCollectingAgentToParent({
        collectingAgentId: selectedAgentId,
        parentId: assignmentForm.parentId,
        directorId,
        assignmentNotes: assignmentForm.assignmentNotes,
      })
    },
    onSuccess: () => {
      toast.success('Parent assigned to collecting agent.')
      setIsAssignmentDialogOpen(false)
      setAssignmentForm(createEmptyAssignmentForm())
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'assigned-parents', selectedAgentId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'pending-requests', schoolId],
      })
    },
  })

  const unassignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId || !pendingUnassignParent) {
        return
      }

      await unassignCollectingAgentFromParent({
        collectingAgentId: selectedAgentId,
        parentId: pendingUnassignParent.id,
      })
    },
    onSuccess: () => {
      toast.success('Parent unassigned from collecting agent.')
      setPendingUnassignParent(null)
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'assigned-parents', selectedAgentId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'pending-requests', schoolId],
      })
    },
  })

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!reviewAction || !directorId) {
        return
      }

      if (reviewAction.mode === 'approve') {
        await approveAgentRequest({
          collectingAgentParentId: reviewAction.request.id,
          directorId,
          approvalNotes: reviewNotes,
        })
        return
      }

      await rejectAgentRequest({
        collectingAgentParentId: reviewAction.request.id,
        directorId,
        approvalNotes: reviewNotes,
      })
    },
    onSuccess: () => {
      toast.success(
        reviewAction?.mode === 'approve'
          ? 'Agent request approved.'
          : 'Agent request rejected.'
      )
      setReviewAction(null)
      setReviewNotes('')
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'pending-requests', schoolId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'assigned-parents', selectedAgentId],
      })
    },
  })

  const activityMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId) {
        return
      }

      const payload: AgentActivityMutationInput = {
        collectingAgentId: selectedAgentId,
        parentId: activityForm.parentId || null,
        activityType: activityForm.activityType,
        activityDescription: activityForm.activityDescription,
        notes: activityForm.notes,
        relatedTransactionId: activityForm.relatedTransactionId,
        relatedSupportRequestId: activityForm.relatedSupportRequestId,
      }

      await logAgentActivity(payload)
    },
    onSuccess: () => {
      toast.success('Agent activity logged successfully.')
      setIsActivityDialogOpen(false)
      setActivityForm(createEmptyActivityForm())
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'activities', schoolId, selectedAgentId],
      })
    },
  })

  const commissionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAgentId || !directorId) {
        return
      }

      const payload: CommissionMutationInput = {
        paymentTransactionId: commissionForm.paymentTransactionId,
        commissionAmount: commissionForm.commissionAmount,
        commissionRate: commissionForm.commissionRate,
        description: commissionForm.description,
      }

      await createAgentCommission({
        collectingAgentId: selectedAgentId,
        directorId,
        ...payload,
      })
    },
    onSuccess: () => {
      toast.success('Commission recorded successfully.')
      setIsCommissionDialogOpen(false)
      setCommissionForm(
        createEmptyCommissionForm(
          selectedAgent?.commissionPercentage != null
            ? String(selectedAgent.commissionPercentage)
            : ''
        )
      )
      void queryClient.invalidateQueries({
        queryKey: ['collecting-agents', 'commissions', selectedAgentId],
      })
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Collecting Agents'
        description='Director-owned field operations workspace.'
      >
        <EmptyState
          title='Director workspace only'
          description='This page is reserved for director accounts because agent assignments, activity tracking, and support follow-up are school-scoped director workflows.'
        />
      </PageShell>
    )
  }

  if (!schoolId || !directorId) {
    return (
      <PageShell
        title='Collecting Agents'
        description='Director-owned field operations workspace.'
      >
        <EmptyState
          title='Director profile is incomplete'
          description='This account is missing a linked school or director entity id, so collecting-agent management cannot load yet.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='Collecting Agents'
        description='Manage your field collection team, parent assignments, commissions, and activity follow-up.'
        actions={
          <Button
            onClick={() => {
              setEditingAgent(null)
              setAgentForm(createEmptyAgentForm())
              setIsAgentDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Add collecting agent
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            title='Collecting agents'
            value={String(agents.length)}
            description='Agent accounts in the current school.'
          />
          <SummaryCard
            title='Assigned parents'
            value={String(assignedParents.length)}
            description='Parents linked to the selected agent.'
          />
          <SummaryCard
            title='Pending requests'
            value={String(pendingRequests.length)}
            description='Parent-initiated assignment requests awaiting review.'
          />
          <SummaryCard
            title='Recent activities'
            value={String(activities.length)}
            description='Logged activity entries for the selected agent.'
          />
        </section>

        <section className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>Agent roster</CardTitle>
              <CardDescription>
                Add agents, adjust commission percentages, set their areas, and
                enable or disable accounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {agentsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : agents.length === 0 ? (
                <EmptyState
                  title='No collecting agents yet'
                  description='Start by adding the first field agent for this school.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => {
                        const statusMeta = getEntityStatusMeta(agent.statusId)

                        return (
                          <TableRow
                            key={agent.id}
                            className={
                              selectedAgentId === agent.id ? 'bg-muted/25' : undefined
                            }
                          >
                            <TableCell>
                              <div className='font-medium'>
                                {buildFullName(agent.firstName, agent.lastName)}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                {agent.email || 'No email'} | +{agent.countryCode}{' '}
                                {agent.phoneNumber}
                              </div>
                            </TableCell>
                            <TableCell>{agent.assignedArea || 'No area set'}</TableCell>
                            <TableCell>
                              {agent.commissionPercentage != null
                                ? `${agent.commissionPercentage.toFixed(2)}%`
                                : 'Not set'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant='outline'
                                className={statusMeta.className}
                              >
                                {statusMeta.label}
                              </Badge>
                            </TableCell>
                            <TableCell className='text-right'>
                              <div className='flex flex-wrap justify-end gap-2'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => setSelectedAgentId(agent.id)}
                                >
                                  Manage
                                </Button>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    setEditingAgent(agent)
                                    setAgentForm(createEmptyAgentForm(agent))
                                    setIsAgentDialogOpen(true)
                                  }}
                                >
                                  <Pencil className='h-4 w-4' />
                                  Edit
                                </Button>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => setPendingStatusAgent(agent)}
                                >
                                  <Power className='h-4 w-4' />
                                  {agent.statusId === 1 ? 'Disable' : 'Enable'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>Selected agent</CardTitle>
              <CardDescription>
                Work with one agent at a time to manage assignments, activities,
                and commission entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='No agent selected'
                  description='Choose an agent from the roster to manage their work.'
                />
              ) : (
                <div className='space-y-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <h3 className='text-lg font-semibold'>
                        {buildFullName(selectedAgent.firstName, selectedAgent.lastName)}
                      </h3>
                      <p className='text-sm text-muted-foreground'>
                        {selectedAgent.email || 'No email'} | +{selectedAgent.countryCode}{' '}
                        {selectedAgent.phoneNumber}
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className={getEntityStatusMeta(selectedAgent.statusId).className}
                    >
                      {getEntityStatusMeta(selectedAgent.statusId).label}
                    </Badge>
                  </div>

                  <div className='grid gap-4'>
                    <DetailRow
                      label='Assigned area'
                      value={selectedAgent.assignedArea || 'No area configured'}
                    />
                    <DetailRow
                      label='Commission percentage'
                      value={
                        selectedAgent.commissionPercentage != null
                          ? `${selectedAgent.commissionPercentage.toFixed(2)}%`
                          : 'Not configured'
                      }
                    />
                    <DetailRow
                      label='Operational scope'
                      value='This director can assign parents, log activities, and post commission records for the selected agent.'
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 xl:grid-cols-2'>
          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='h-4 w-4 text-primary' />
                  Assigned parents
                </CardTitle>
                <CardDescription>
                  Link parents to the selected agent and remove inactive assignments.
                </CardDescription>
              </div>
              <Button
                size='sm'
                disabled={!selectedAgent || availableParents.length === 0}
                onClick={() => {
                  setAssignmentForm(createEmptyAssignmentForm())
                  setIsAssignmentDialogOpen(true)
                }}
              >
                <UserPlus className='h-4 w-4' />
                Assign parent
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='Select an agent first'
                  description='Assigned parents are shown per agent.'
                />
              ) : assignedParentsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : assignedParents.length === 0 ? (
                <EmptyState
                  title='No assigned parents'
                  description='The selected agent does not have any parent assignments yet.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parent</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Children</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedParents.map((parent) => (
                        <TableRow key={parent.id}>
                          <TableCell>
                            <div className='font-medium'>
                              {buildFullName(parent.firstName, parent.lastName)}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {parent.fatherName || 'No father name'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>{parent.email || 'No email'}</div>
                            <div className='text-xs text-muted-foreground'>
                              +{parent.countryCode} {parent.phoneNumber}
                            </div>
                          </TableCell>
                          <TableCell>{parent.childCount}</TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className={getEntityStatusMeta(parent.statusId).className}
                            >
                              {getEntityStatusMeta(parent.statusId).label}
                            </Badge>
                          </TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setPendingUnassignParent(parent)}
                            >
                              Unassign
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ShieldCheck className='h-4 w-4 text-primary' />
                Pending assignment requests
              </CardTitle>
              <CardDescription>
                Review parent requests for specific collecting agents in this school.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequestsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : pendingRequests.length === 0 ? (
                <EmptyState
                  title='No pending requests'
                  description='There are no parent-initiated agent requests awaiting director review.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parent</TableHead>
                        <TableHead>Requested agent</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div className='font-medium'>
                              {request.parentName || 'Unknown parent'}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {request.assignmentNotes || 'No request notes'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.collectingAgentName || 'Unknown agent'}
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline'>
                              {formatApprovalStatus(request.approvalStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(request.createdOn)}</TableCell>
                          <TableCell className='text-right'>
                            <div className='flex flex-wrap justify-end gap-2'>
                              <Button
                                size='sm'
                                onClick={() => {
                                  setReviewAction({ mode: 'approve', request })
                                  setReviewNotes('')
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setReviewAction({ mode: 'reject', request })
                                  setReviewNotes('')
                                }}
                              >
                                Reject
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
        </section>

        <section className='grid gap-4 xl:grid-cols-2'>
          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <MapPinned className='h-4 w-4 text-primary' />
                  Activity log
                </CardTitle>
                <CardDescription>
                  Track field work, contact attempts, payment collection updates,
                  and manual director requests.
                </CardDescription>
              </div>
              <Button
                size='sm'
                disabled={!selectedAgent}
                onClick={() => {
                  setActivityForm(createEmptyActivityForm())
                  setIsActivityDialogOpen(true)
                }}
              >
                <Plus className='h-4 w-4' />
                Log activity
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='Select an agent first'
                  description='Activities are loaded for the selected collecting agent.'
                />
              ) : activitiesQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : activities.length === 0 ? (
                <EmptyState
                  title='No activities yet'
                  description='No activity log entries were returned for the selected agent.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activities.map((activity: AgentActivityRecord) => (
                        <TableRow key={activity.id}>
                          <TableCell>
                            <div className='font-medium'>
                              {activity.activityTypeDisplayName}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {activity.activityType}
                            </div>
                          </TableCell>
                          <TableCell>{activity.parentName || 'No parent linked'}</TableCell>
                          <TableCell>
                            <div className='font-medium'>
                              {activity.activityDescription}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {activity.notes || 'No extra notes'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(activity.activityDate ?? activity.createdOn)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <Coins className='h-4 w-4 text-primary' />
                  Commissions
                </CardTitle>
                <CardDescription>
                  Record and review commission payouts related to agent-collected payments.
                </CardDescription>
              </div>
              <Button
                size='sm'
                disabled={!selectedAgent}
                onClick={() => {
                  setCommissionForm(
                    createEmptyCommissionForm(
                      selectedAgent?.commissionPercentage != null
                        ? String(selectedAgent.commissionPercentage)
                        : ''
                    )
                  )
                  setIsCommissionDialogOpen(true)
                }}
              >
                <Plus className='h-4 w-4' />
                Add commission
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='Select an agent first'
                  description='Commissions are shown for the selected collecting agent.'
                />
              ) : commissionsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : commissions.length === 0 ? (
                <EmptyState
                  title='No commissions yet'
                  description='No commission history was returned for the selected agent.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissions.map((commission) => (
                        <TableRow key={commission.id}>
                          <TableCell>
                            <div className='font-medium'>
                              #{commission.paymentTransactionId}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {commission.description || 'No description'}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(commission.commissionAmount)}</TableCell>
                          <TableCell>{commission.commissionRate.toFixed(2)}%</TableCell>
                          <TableCell>
                            <Badge variant='outline'>
                              {formatCommissionStatus(commission)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(commission.createdOn ?? commission.approvedDate)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </PageShell>

      <Dialog
        open={isAgentDialogOpen}
        onOpenChange={(open) => {
          setIsAgentDialogOpen(open)
          if (!open) {
            setEditingAgent(null)
            setAgentForm(createEmptyAgentForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Edit collecting agent' : 'Add collecting agent'}
            </DialogTitle>
            <DialogDescription>
              Configure the agent identity, assigned field area, and default commission percentage.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='agent-first-name'>First name</Label>
                <Input
                  id='agent-first-name'
                  value={agentForm.firstName}
                  onChange={(event) =>
                    setAgentForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='agent-last-name'>Last name</Label>
                <Input
                  id='agent-last-name'
                  value={agentForm.lastName}
                  onChange={(event) =>
                    setAgentForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-[120px_1fr]'>
              <div className='grid gap-2'>
                <Label htmlFor='agent-country-code'>Country code</Label>
                <Input
                  id='agent-country-code'
                  value={agentForm.countryCode}
                  onChange={(event) =>
                    setAgentForm((current) => ({
                      ...current,
                      countryCode: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='agent-phone'>Phone number</Label>
                <Input
                  id='agent-phone'
                  value={agentForm.phoneNumber}
                  onChange={(event) =>
                    setAgentForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='agent-email'>Email</Label>
              <Input
                id='agent-email'
                type='email'
                value={agentForm.email}
                onChange={(event) =>
                  setAgentForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='agent-area'>Assigned area</Label>
                <Input
                  id='agent-area'
                  value={agentForm.assignedArea}
                  onChange={(event) =>
                    setAgentForm((current) => ({
                      ...current,
                      assignedArea: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='agent-commission'>Commission percentage</Label>
                <Input
                  id='agent-commission'
                  inputMode='decimal'
                  value={agentForm.commissionPercentage}
                  onChange={(event) =>
                    setAgentForm((current) => ({
                      ...current,
                      commissionPercentage: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsAgentDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                saveAgentMutation.isPending ||
                agentForm.firstName.trim().length === 0 ||
                agentForm.lastName.trim().length === 0 ||
                agentForm.phoneNumber.trim().length === 0
              }
              onClick={() => saveAgentMutation.mutate()}
            >
              {saveAgentMutation.isPending
                ? 'Saving...'
                : editingAgent
                  ? 'Save changes'
                  : 'Create agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAssignmentDialogOpen}
        onOpenChange={(open) => {
          setIsAssignmentDialogOpen(open)
          if (!open) {
            setAssignmentForm(createEmptyAssignmentForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Assign parent</DialogTitle>
            <DialogDescription>
              Link a parent account to the selected collecting agent.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='assignment-parent'>Parent</Label>
              <Select
                value={
                  assignmentForm.parentId > 0
                    ? String(assignmentForm.parentId)
                    : undefined
                }
                onValueChange={(value) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    parentId: Number(value),
                  }))
                }
              >
                <SelectTrigger id='assignment-parent'>
                  <SelectValue placeholder='Select a parent' />
                </SelectTrigger>
                <SelectContent>
                  {availableParents.map((parent) => (
                    <SelectItem key={parent.id} value={String(parent.id)}>
                      {buildFullName(parent.firstName, parent.lastName)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='assignment-notes'>Assignment notes</Label>
              <Textarea
                id='assignment-notes'
                rows={4}
                value={assignmentForm.assignmentNotes}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    assignmentNotes: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsAssignmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={assignmentMutation.isPending || assignmentForm.parentId === 0}
              onClick={() => assignmentMutation.mutate()}
            >
              {assignmentMutation.isPending ? 'Assigning...' : 'Assign parent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={(open) => {
          setIsActivityDialogOpen(open)
          if (!open) {
            setActivityForm(createEmptyActivityForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Log agent activity</DialogTitle>
            <DialogDescription>
              Record a field action, payment follow-up, or a specific manual task request for the selected agent.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='activity-type'>Activity type</Label>
                <Select
                  value={activityForm.activityType}
                  onValueChange={(value) =>
                    setActivityForm((current) => ({
                      ...current,
                      activityType: value as AgentActivityType,
                    }))
                  }
                >
                  <SelectTrigger id='activity-type'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='activity-parent'>Parent</Label>
                <Select
                  value={activityForm.parentId > 0 ? String(activityForm.parentId) : 'none'}
                  onValueChange={(value) =>
                    setActivityForm((current) => ({
                      ...current,
                      parentId: value === 'none' ? 0 : Number(value),
                    }))
                  }
                >
                  <SelectTrigger id='activity-parent'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>No parent linked</SelectItem>
                    {assignedParents.map((parent) => (
                      <SelectItem key={parent.id} value={String(parent.id)}>
                        {buildFullName(parent.firstName, parent.lastName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='activity-description'>Description</Label>
              <Input
                id='activity-description'
                value={activityForm.activityDescription}
                onChange={(event) =>
                  setActivityForm((current) => ({
                    ...current,
                    activityDescription: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='activity-notes'>Notes</Label>
              <Textarea
                id='activity-notes'
                rows={4}
                value={activityForm.notes}
                onChange={(event) =>
                  setActivityForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='activity-transaction'>Transaction id</Label>
                <Input
                  id='activity-transaction'
                  inputMode='numeric'
                  value={activityForm.relatedTransactionId}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      relatedTransactionId: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='activity-support-request'>Support request id</Label>
                <Input
                  id='activity-support-request'
                  inputMode='numeric'
                  value={activityForm.relatedSupportRequestId}
                  onChange={(event) =>
                    setActivityForm((current) => ({
                      ...current,
                      relatedSupportRequestId: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsActivityDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                activityMutation.isPending ||
                activityForm.activityDescription.trim().length === 0
              }
              onClick={() => activityMutation.mutate()}
            >
              {activityMutation.isPending ? 'Saving...' : 'Log activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCommissionDialogOpen}
        onOpenChange={(open) => {
          setIsCommissionDialogOpen(open)
          if (!open) {
            setCommissionForm(
              createEmptyCommissionForm(
                selectedAgent?.commissionPercentage != null
                  ? String(selectedAgent.commissionPercentage)
                  : ''
              )
            )
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Add commission</DialogTitle>
            <DialogDescription>
              Record a commission entry tied to a specific payment transaction.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='commission-transaction'>Payment transaction id</Label>
              <Input
                id='commission-transaction'
                inputMode='numeric'
                value={commissionForm.paymentTransactionId}
                onChange={(event) =>
                  setCommissionForm((current) => ({
                    ...current,
                    paymentTransactionId: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='commission-amount'>Commission amount</Label>
                <Input
                  id='commission-amount'
                  inputMode='decimal'
                  value={commissionForm.commissionAmount}
                  onChange={(event) =>
                    setCommissionForm((current) => ({
                      ...current,
                      commissionAmount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='commission-rate'>Commission rate</Label>
                <Input
                  id='commission-rate'
                  inputMode='decimal'
                  value={commissionForm.commissionRate}
                  onChange={(event) =>
                    setCommissionForm((current) => ({
                      ...current,
                      commissionRate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='commission-description'>Description</Label>
              <Textarea
                id='commission-description'
                rows={4}
                value={commissionForm.description}
                onChange={(event) =>
                  setCommissionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsCommissionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                commissionMutation.isPending ||
                commissionForm.paymentTransactionId.trim().length === 0 ||
                commissionForm.commissionAmount.trim().length === 0
              }
              onClick={() => commissionMutation.mutate()}
            >
              {commissionMutation.isPending ? 'Saving...' : 'Record commission'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(reviewAction)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewAction(null)
            setReviewNotes('')
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>
              {reviewAction?.mode === 'approve'
                ? 'Approve agent request'
                : 'Reject agent request'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction?.mode === 'approve'
                ? 'Confirm the assignment request and optionally leave a review note.'
                : 'Reject the assignment request and record an optional explanation.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-2'>
            <Label htmlFor='review-notes'>Review notes</Label>
            <Textarea
              id='review-notes'
              rows={4}
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setReviewAction(null)
                setReviewNotes('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending
                ? 'Saving...'
                : reviewAction?.mode === 'approve'
                  ? 'Approve request'
                  : 'Reject request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingStatusAgent)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusAgent(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusAgent?.statusId === 1 ? 'Disable agent?' : 'Enable agent?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusAgent?.statusId === 1
                ? 'This will prevent the agent from being used in active field operations until they are enabled again.'
                : 'This will restore the agent to active operational use.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusMutation.mutate()}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingUnassignParent)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUnassignParent(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unassign parent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected parent from the current agent assignment list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => unassignMutation.mutate()}>
              Unassign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
