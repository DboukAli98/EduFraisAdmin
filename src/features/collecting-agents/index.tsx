import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Coins,
  MapPinned,
  Pencil,
  Plus,
  Power,
  Settings,
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

function getActivityTypeLabel(type: AgentActivityType): string {
  switch (type) {
    case 'PaymentCollected':
      return 'Paiement collecte'
    case 'PaymentAttempted':
      return 'Tentative de paiement'
    case 'ParentContact':
      return 'Contact parent'
    case 'SupportRequestHandled':
      return 'Demande de support traitee'
    case 'ParentAssigned':
      return 'Parent affecte'
    case 'ParentUnassigned':
      return 'Parent retire'
    case 'FieldVisit':
      return 'Visite terrain'
    case 'PhoneCall':
      return 'Appel telephonique'
    case 'Other':
    default:
      return 'Autre'
  }
}

function translateWorkflowStatus(status: string | null | undefined): string {
  switch (status?.trim().toLowerCase()) {
    case 'approved':
      return 'Approuve'
    case 'pending':
      return 'En attente'
    case 'rejected':
      return 'Rejete'
    case 'cancelled':
      return 'Annule'
    case 'failed':
      return 'Echoue'
    case 'processed':
      return 'Traite'
    case 'inprogress':
    case 'in progress':
      return 'En cours'
    default:
      return status?.trim() || 'En attente'
  }
}

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
  return translateWorkflowStatus(
    record.status ?? (record.isApproved ? 'Approved' : 'Pending')
  )
}

function formatApprovalStatus(status: string | null): string {
  return translateWorkflowStatus(status)
}

export function CollectingAgents() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const schoolId = currentUser?.schoolIds[0] ?? null
  const directorId = isDirector ? currentUser?.entityUserId ?? null : null

  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
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
  const selectedAgentPanelRef = useRef<HTMLDivElement | null>(null)

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

  function scrollToSelectedAgentPanel() {
    requestAnimationFrame(() => {
      selectedAgentPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  function openAgentManagement(agentId: number) {
    setSelectedAgentId(agentId)
    setIsManageDialogOpen(true)
    scrollToSelectedAgentPanel()
  }

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
          ? 'Agent collecteur mis a jour avec succes.'
          : 'Agent collecteur ajoute avec succes.'
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
      toast.success(
        `Agent collecteur ${nextLabel === 'disabled' ? 'desactive' : 'active'} avec succes.`
      )
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
      toast.success('Parent affecte a l agent collecteur.')
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
      toast.success('Parent retire de l agent collecteur.')
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
          ? 'Demande d agent approuvee.'
          : 'Demande d agent rejetee.'
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
      toast.success('Activite agent enregistree avec succes.')
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
      toast.success('Commission enregistree avec succes.')
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
        title='Agents collecteurs'
        description='Espace des operations terrain gere par le directeur.'
      >
        <EmptyState
          title='Espace reserve au directeur'
          description='Cette page est reservee aux comptes directeur car les affectations agents, le suivi d activite et le support sont lies a l ecole.'
        />
      </PageShell>
    )
  }

  if (!schoolId || !directorId) {
    return (
      <PageShell
        title='Agents collecteurs'
        description='Espace des operations terrain gere par le directeur.'
      >
        <EmptyState
          title='Profil directeur incomplet'
          description='Ce compte ne contient pas d ecole liee ou d identifiant directeur, la gestion des agents collecteurs ne peut donc pas encore etre chargee.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='Agents collecteurs'
        description='Gerez votre equipe terrain, les affectations parents, les commissions et le suivi des activites.'
        actions={
          <Button
            onClick={() => {
              setEditingAgent(null)
              setAgentForm(createEmptyAgentForm())
              setIsAgentDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Ajouter un agent collecteur
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            title='Agents collecteurs'
            value={String(agents.length)}
            description='Comptes agents dans l ecole actuelle.'
          />
          <SummaryCard
            title='Parents affectes'
            value={String(assignedParents.length)}
            description='Parents lies a l agent selectionne.'
          />
          <SummaryCard
            title='Demandes en attente'
            value={String(pendingRequests.length)}
            description='Demandes d affectation initiees par les parents en attente de revue.'
          />
          <SummaryCard
            title='Activites recentes'
            value={String(activities.length)}
            description='Activites journalisees pour l agent selectionne.'
          />
        </section>

        <section className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>Liste des agents</CardTitle>
              <CardDescription>
                Ajoutez des agents, ajustez les pourcentages de commission, definissez leurs zones et activez ou desactivez les comptes.
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
                  title='Aucun agent collecteur pour le moment'
                  description='Commencez par ajouter le premier agent terrain pour cette ecole.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead>Zone</TableHead>
                          <TableHead>Commission</TableHead>
                          <TableHead>Statut</TableHead>
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
                                {agent.email || 'Aucun e-mail'} | +{agent.countryCode}{' '}
                                {agent.phoneNumber}
                              </div>
                            </TableCell>
                            <TableCell>{agent.assignedArea || 'Aucune zone definie'}</TableCell>
                            <TableCell>
                              {agent.commissionPercentage != null
                                ? `${agent.commissionPercentage.toFixed(2)}%`
                                : 'Non defini'}
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
                                  variant={
                                    selectedAgentId === agent.id ? 'secondary' : 'outline'
                                  }
                                  size='sm'
                                  onClick={() => openAgentManagement(agent.id)}
                                >
                                  <Settings className='h-4 w-4' />
                                  Gerer
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
                                  Modifier
                                </Button>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => setPendingStatusAgent(agent)}
                                >
                                  <Power className='h-4 w-4' />
                                  {agent.statusId === 1 ? 'Desactiver' : 'Activer'}
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

          <div ref={selectedAgentPanelRef}>
            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>
                  {selectedAgent
                    ? `Agent selectionne : ${buildFullName(selectedAgent.firstName, selectedAgent.lastName)}`
                    : 'Agent selectionne'}
                </CardTitle>
                <CardDescription>
                  Travaillez avec un agent a la fois pour gerer les affectations, activites et commissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedAgent ? (
                  <EmptyState
                    title='Aucun agent selectionne'
                    description='Choisissez un agent dans la liste pour gerer son activite.'
                  />
                ) : (
                  <div className='space-y-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div>
                        <h3 className='text-lg font-semibold'>
                          {buildFullName(selectedAgent.firstName, selectedAgent.lastName)}
                        </h3>
                        <p className='text-sm text-muted-foreground'>
                          {selectedAgent.email || 'Aucun e-mail'} | +{selectedAgent.countryCode}{' '}
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
                        label='Zone attribuee'
                        value={selectedAgent.assignedArea || 'Aucune zone configuree'}
                      />
                      <DetailRow
                        label='Pourcentage de commission'
                        value={
                          selectedAgent.commissionPercentage != null
                            ? `${selectedAgent.commissionPercentage.toFixed(2)}%`
                            : 'Non configure'
                        }
                      />
                      <DetailRow
                        label='Portee operationnelle'
                        value='Ce directeur peut affecter des parents, journaliser des activites et enregistrer des commissions pour l agent selectionne.'
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className='grid gap-4 xl:grid-cols-2'>
          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='h-4 w-4 text-primary' />
                  Parents affectes
                </CardTitle>
                <CardDescription>
                  Liez des parents a l agent selectionne et retirez les affectations inactives.
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
                Affecter un parent
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='Selectionnez d abord un agent'
                  description='Les parents affectes s affichent agent par agent.'
                />
              ) : assignedParentsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : assignedParents.length === 0 ? (
                <EmptyState
                  title='Aucun parent affecte'
                  description='L agent selectionne n a encore aucune affectation parent.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parent</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Enfants</TableHead>
                        <TableHead>Statut</TableHead>
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
                                {parent.fatherName || 'Aucun nom du pere'}
                              </div>
                            </TableCell>
                          <TableCell>
                            <div>{parent.email || 'Aucun e-mail'}</div>
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
                              Retirer
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
                Demandes d affectation en attente
              </CardTitle>
              <CardDescription>
                Examinez les demandes de parents visant des agents collecteurs specifiques dans cette ecole.
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
                  title='Aucune demande en attente'
                  description='Aucune demande d agent initiee par un parent n attend la revue du directeur.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Parent</TableHead>
                        <TableHead>Agent demande</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Cree le</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                              <div className='font-medium'>
                                {request.parentName || 'Parent inconnu'}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                {request.assignmentNotes || 'Aucune note de demande'}
                              </div>
                            </TableCell>
                          <TableCell>
                            {request.collectingAgentName || 'Agent inconnu'}
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
                                Approuver
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setReviewAction({ mode: 'reject', request })
                                  setReviewNotes('')
                                }}
                              >
                                Rejeter
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
                  Journal des activites
                </CardTitle>
                <CardDescription>
                  Suivez le travail terrain, les tentatives de contact, les mises a jour de collecte de paiement et les demandes manuelles du directeur.
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
                Journaliser une activite
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='Selectionnez d abord un agent'
                  description='Les activites sont chargees pour l agent collecteur selectionne.'
                />
              ) : activitiesQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : activities.length === 0 ? (
                <EmptyState
                  title='Aucune activite pour le moment'
                  description='Aucune entree de journal n a ete retournee pour l agent selectionne.'
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
                              {getActivityTypeLabel(activity.activityType)}
                            </div>
                          </TableCell>
                          <TableCell>{activity.parentName || 'Aucun parent lie'}</TableCell>
                          <TableCell>
                            <div className='font-medium'>
                              {activity.activityDescription}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {activity.notes || 'Aucune note supplementaire'}
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
                  Enregistrez et consultez les commissions liees aux paiements collectes par les agents.
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
                Ajouter une commission
              </Button>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <EmptyState
                  title='Selectionnez d abord un agent'
                  description='Les commissions s affichent pour l agent collecteur selectionne.'
                />
              ) : commissionsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : commissions.length === 0 ? (
                <EmptyState
                  title='Aucune commission pour le moment'
                  description='Aucun historique de commission n a ete retourne pour l agent selectionne.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Taux</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Cree le</TableHead>
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
                              {commission.description || 'Aucune description'}
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

      <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {selectedAgent
                ? `Gerer ${buildFullName(selectedAgent.firstName, selectedAgent.lastName)}`
                : 'Gerer l agent'}
            </DialogTitle>
            <DialogDescription>
              Accedez rapidement aux actions principales pour l agent collecteur selectionne.
            </DialogDescription>
          </DialogHeader>

          {!selectedAgent ? (
            <EmptyState
              title='Aucun agent selectionne'
              description='Selectionnez un agent dans la liste pour ouvrir sa gestion.'
            />
          ) : (
            <div className='grid gap-4'>
              <div className='rounded-lg border bg-muted/20 p-4'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <div className='font-semibold'>
                      {buildFullName(selectedAgent.firstName, selectedAgent.lastName)}
                    </div>
                    <div className='text-sm text-muted-foreground'>
                      {selectedAgent.email || 'Aucun e-mail'} | +{selectedAgent.countryCode}{' '}
                      {selectedAgent.phoneNumber}
                    </div>
                  </div>
                  <Badge
                    variant='outline'
                    className={getEntityStatusMeta(selectedAgent.statusId).className}
                  >
                    {getEntityStatusMeta(selectedAgent.statusId).label}
                  </Badge>
                </div>
                <div className='mt-4 grid gap-3 text-sm sm:grid-cols-2'>
                  <div>
                    <p className='text-muted-foreground'>Zone attribuee</p>
                    <p className='font-medium'>
                      {selectedAgent.assignedArea || 'Aucune zone configuree'}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground'>Commission</p>
                    <p className='font-medium'>
                      {selectedAgent.commissionPercentage != null
                        ? `${selectedAgent.commissionPercentage.toFixed(2)}%`
                        : 'Non configuree'}
                    </p>
                  </div>
                </div>
              </div>

              <div className='grid gap-2 sm:grid-cols-2'>
                <Button
                  variant='outline'
                  onClick={() => {
                    setEditingAgent(selectedAgent)
                    setAgentForm(createEmptyAgentForm(selectedAgent))
                    setIsManageDialogOpen(false)
                    setIsAgentDialogOpen(true)
                  }}
                >
                  <Pencil className='h-4 w-4' />
                  Modifier l agent
                </Button>
                <Button
                  variant='outline'
                  disabled={availableParents.length === 0}
                  onClick={() => {
                    setAssignmentForm(createEmptyAssignmentForm())
                    setIsManageDialogOpen(false)
                    setIsAssignmentDialogOpen(true)
                  }}
                >
                  <UserPlus className='h-4 w-4' />
                  Affecter un parent
                </Button>
                <Button
                  variant='outline'
                  onClick={() => {
                    setActivityForm(createEmptyActivityForm())
                    setIsManageDialogOpen(false)
                    setIsActivityDialogOpen(true)
                  }}
                >
                  <MapPinned className='h-4 w-4' />
                  Journaliser une activite
                </Button>
                <Button
                  variant='outline'
                  onClick={() => {
                    setCommissionForm(
                      createEmptyCommissionForm(
                        selectedAgent.commissionPercentage != null
                          ? String(selectedAgent.commissionPercentage)
                          : ''
                      )
                    )
                    setIsManageDialogOpen(false)
                    setIsCommissionDialogOpen(true)
                  }}
                >
                  <Coins className='h-4 w-4' />
                  Ajouter une commission
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setIsManageDialogOpen(false)
                scrollToSelectedAgentPanel()
              }}
            >
              Voir le panneau complet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {editingAgent
                ? 'Modifier un agent collecteur'
                : 'Ajouter un agent collecteur'}
            </DialogTitle>
            <DialogDescription>
              Configurez l identite de l agent, sa zone terrain attribuee et son pourcentage de commission par defaut.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='agent-first-name'>Prenom</Label>
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
                <Label htmlFor='agent-last-name'>Nom</Label>
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
                <Label htmlFor='agent-country-code'>Indicatif pays</Label>
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
                <Label htmlFor='agent-phone'>Numero de telephone</Label>
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
              <Label htmlFor='agent-email'>Adresse e-mail</Label>
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
                <Label htmlFor='agent-area'>Zone attribuee</Label>
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
                <Label htmlFor='agent-commission'>Pourcentage de commission</Label>
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
              Annuler
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
                ? 'Enregistrement...'
                : editingAgent
                  ? 'Enregistrer les modifications'
                  : 'Creer l agent'}
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
            <DialogTitle>Affecter un parent</DialogTitle>
            <DialogDescription>
              Liez un compte parent a l agent collecteur selectionne.
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
                  <SelectValue placeholder='Selectionnez un parent' />
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
              <Label htmlFor='assignment-notes'>Notes d affectation</Label>
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
              Annuler
            </Button>
            <Button
              disabled={assignmentMutation.isPending || assignmentForm.parentId === 0}
              onClick={() => assignmentMutation.mutate()}
            >
              {assignmentMutation.isPending
                ? 'Affectation en cours...'
                : 'Affecter le parent'}
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
            <DialogTitle>Journaliser une activite agent</DialogTitle>
            <DialogDescription>
              Enregistrez une action terrain, un suivi de paiement ou une demande manuelle specifique pour l agent selectionne.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='activity-type'>Type d activite</Label>
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
                        {getActivityTypeLabel(type)}
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
                    <SelectItem value='none'>Aucun parent lie</SelectItem>
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
                <Label htmlFor='activity-transaction'>ID transaction</Label>
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
                <Label htmlFor='activity-support-request'>ID demande de support</Label>
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
              Annuler
            </Button>
            <Button
              disabled={
                activityMutation.isPending ||
                activityForm.activityDescription.trim().length === 0
              }
              onClick={() => activityMutation.mutate()}
            >
              {activityMutation.isPending
                ? 'Enregistrement...'
                : 'Journaliser l activite'}
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
            <DialogTitle>Ajouter une commission</DialogTitle>
            <DialogDescription>
              Enregistrez une ligne de commission liee a une transaction de paiement specifique.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='commission-transaction'>ID transaction de paiement</Label>
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
                <Label htmlFor='commission-amount'>Montant de la commission</Label>
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
                <Label htmlFor='commission-rate'>Taux de commission</Label>
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
              Annuler
            </Button>
            <Button
              disabled={
                commissionMutation.isPending ||
                commissionForm.paymentTransactionId.trim().length === 0 ||
                commissionForm.commissionAmount.trim().length === 0
              }
              onClick={() => commissionMutation.mutate()}
            >
              {commissionMutation.isPending
                ? 'Enregistrement...'
                : 'Enregistrer la commission'}
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
                ? 'Approuver la demande d agent'
                : 'Rejeter la demande d agent'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction?.mode === 'approve'
                ? 'Confirmez la demande d affectation et laissez eventuellement une note de revue.'
                : 'Rejetez la demande d affectation et enregistrez eventuellement une explication.'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-2'>
            <Label htmlFor='review-notes'>Notes de revue</Label>
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
              Annuler
            </Button>
            <Button onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending
                ? 'Enregistrement...'
                : reviewAction?.mode === 'approve'
                  ? 'Approuver la demande'
                  : 'Rejeter la demande'}
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
              {pendingStatusAgent?.statusId === 1
                ? 'Desactiver cet agent ?'
                : 'Activer cet agent ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusAgent?.statusId === 1
                ? 'Cela empechera l agent d etre utilise dans les operations terrain actives jusqu a sa reactivation.'
                : 'Cela remettra l agent en service actif.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => statusMutation.mutate()}>
              Confirmer
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
            <AlertDialogTitle>Retirer ce parent ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela retirera le parent selectionne de la liste d affectation de l agent courant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => unassignMutation.mutate()}>
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
