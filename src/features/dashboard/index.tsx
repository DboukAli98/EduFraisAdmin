import { useEffect, useState, type ComponentType } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  ExternalLink,
  GraduationCap,
  HandCoins,
  LoaderCircle,
  RefreshCcw,
  School2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getEntityStatusMeta } from '@/features/admin/utils'
import { toApiUrl } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { DirectorDashboard } from './director-dashboard'
import {
  fetchAgentCollectionSummary,
  fetchCollectingAgents,
  fetchPaidInstallmentsMetrics,
  fetchParentMetrics,
  fetchPaymentMethodBreakdown,
  fetchPaymentTrend,
  fetchPendingChildren,
  fetchPendingInstallmentsMetrics,
  fetchSchools,
  fetchStudentMetrics,
  fetchSupportRequests,
  type AgentCollectionPoint,
  type AgentSummary,
  type MetricWidget,
  type PaymentMethodPoint,
  type PendingChild,
  type ReportingPeriod,
  type SchoolSummary,
  type SupportRequestSummary,
  type SupportSource,
  type TrendPoint,
} from './api'

const periodOptions: Array<{ value: ReportingPeriod; label: string }> = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'quarter', label: 'This quarter' },
  { value: 'year', label: 'This year' },
]

const supportSources: SupportSource[] = [
  'PARENT_TO_DIRECTOR',
  'AGENT_TO_DIRECTOR',
  'PARENT_TO_AGENT',
]

const paymentMethodColors = ['#0f766e', '#0284c7', '#f59e0b', '#ef4444', '#8b5cf6']

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-CG', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatGrowth(value: number): string {
  const rounded = Math.abs(value).toFixed(1)
  return `${value >= 0 ? '+' : '-'}${rounded}%`
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Aucune date'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Aucune date'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getSchoolStatusLabel(statusId: number): string {
  return getEntityStatusMeta(statusId).label
}

function getSupportStatusLabel(statusId: number): string {
  return getEntityStatusMeta(statusId).label
}

function getSupportStatusClass(statusId: number): string {
  return getEntityStatusMeta(statusId).className
}

function getPriorityClass(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
    case 'high':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
    case 'medium':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
    default:
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300'
  }
}

function renderMetricValue(metric: MetricWidget, kind: 'currency' | 'number'): string {
  return kind === 'currency' ? formatCurrency(metric.total) : formatNumber(metric.total)
}

function formatSourceLabel(source: SupportSource): string {
  switch (source) {
    case 'PARENT_TO_DIRECTOR':
      return 'Parent -> Director'
    case 'PARENT_TO_AGENT':
      return 'Parent -> Agent'
    case 'AGENT_TO_DIRECTOR':
      return 'Agent -> Director'
  }
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className='flex h-[240px] flex-col items-center justify-center rounded-lg border border-dashed text-center'>
      <p className='font-medium'>{title}</p>
      <p className='mt-1 max-w-sm text-sm text-muted-foreground'>{description}</p>
    </div>
  )
}

function LoadingCard({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <Skeleton className='h-8 w-32' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-2/3' />
      </CardContent>
    </Card>
  )
}

function MetricCard({
  title,
  description,
  value,
  growth,
  icon: Icon,
}: {
  title: string
  description: string
  value: string
  growth: number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <Card className='border-border/70'>
      <CardHeader className='flex flex-row items-start justify-between gap-3 space-y-0 pb-2'>
        <div className='space-y-1'>
          <CardTitle className='text-sm font-medium text-muted-foreground'>
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className='rounded-full bg-primary/10 p-2 text-primary'>
          <Icon className='h-4 w-4' />
        </div>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-semibold'>{value}</div>
        <p className='mt-1 text-xs text-muted-foreground'>
          {formatGrowth(growth)} vs previous comparable period
        </p>
      </CardContent>
    </Card>
  )
}

function PaymentTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title='No payment trend yet'
        description='Paid installment activity will appear here once the selected school records processed payments.'
      />
    )
  }

  return (
    <ResponsiveContainer width='100%' height={320}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} strokeDasharray='3 3' />
        <XAxis dataKey='label' tickLine={false} axisLine={false} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatNumber(Number(value))}
        />
        <ChartTooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Collected']}
          labelFormatter={(label) => `Period: ${label}`}
        />
        <Bar dataKey='totalAmount' fill='#0f766e' radius={[10, 10, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function PaymentMethodChart({ data }: { data: PaymentMethodPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title='No payment methods yet'
        description='Once transactions are processed, the method mix for the selected school will show here.'
      />
    )
  }

  return (
    <ResponsiveContainer width='100%' height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey='totalAmount'
          nameKey='paymentMethod'
          innerRadius={70}
          outerRadius={110}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              key={`${entry.paymentMethod}-${index}`}
              fill={paymentMethodColors[index % paymentMethodColors.length]}
            />
          ))}
        </Pie>
        <ChartTooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Amount']}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

function AgentCollectionChart({ data }: { data: AgentCollectionPoint[] }) {
  if (data.length === 0) {
    return (
      <EmptyState
        title='No agent collections yet'
        description='Agent collection performance will appear here when the selected school starts recording agent-processed payments.'
      />
    )
  }

  return (
    <ResponsiveContainer width='100%' height={320}>
      <BarChart
        data={data}
        layout='vertical'
        margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray='3 3' />
        <XAxis
          type='number'
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatNumber(Number(value))}
        />
        <YAxis
          type='category'
          dataKey='agentName'
          width={110}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          formatter={(value) => [formatCurrency(Number(value ?? 0)), 'Collected']}
        />
        <Bar dataKey='totalCollectedAmount' fill='#0284c7' radius={[0, 10, 10, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function SchoolsTable({ schools }: { schools: SchoolSummary[] }) {
  if (schools.length === 0) {
    return (
      <EmptyState
        title='No schools found'
        description='The School controller returned an empty listing for this account.'
      />
    )
  }

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>School</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Established</TableHead>
            <TableHead>Website</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schools.map((school) => (
            <TableRow key={school.id}>
              <TableCell>
                <div className='font-medium'>{school.name}</div>
                <div className='text-xs text-muted-foreground'>{school.address}</div>
              </TableCell>
              <TableCell>
                <Badge variant='secondary'>{getSchoolStatusLabel(school.statusId)}</Badge>
              </TableCell>
              <TableCell>
                <div>{school.email}</div>
                <div className='text-xs text-muted-foreground'>{school.phoneNumber}</div>
              </TableCell>
              <TableCell>{school.establishedYear ?? 'N/A'}</TableCell>
              <TableCell>
                {school.website ? (
                  <a
                    href={school.website}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-1 text-primary hover:underline'
                  >
                    Open
                    <ExternalLink className='h-3.5 w-3.5' />
                  </a>
                ) : (
                  'N/A'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PendingChildrenTable({ children }: { children: PendingChild[] }) {
  if (children.length === 0) {
    return (
      <EmptyState
        title='No pending child approvals'
        description='The approval queue is clear for the selected school.'
      />
    )
  }

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Parent</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {children.map((child) => (
            <TableRow key={child.id}>
              <TableCell>
                <div className='font-medium'>
                  {[child.firstName, child.lastName].filter(Boolean).join(' ')}
                </div>
                <div className='text-xs text-muted-foreground'>Child #{child.id}</div>
              </TableCell>
              <TableCell>{child.parentName || 'No parent linked'}</TableCell>
              <TableCell>{formatDate(child.createdOn)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SupportRequestsTable({
  requests,
}: {
  requests: SupportRequestSummary[]
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title='No support requests'
        description='There are no support escalations to review for the selected school right now.'
      />
    )
  }

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Request</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={`${request.source}-${request.id}`}>
              <TableCell>
                <div className='font-medium'>{request.title}</div>
                <div className='text-xs text-muted-foreground'>
                  {request.parentName || request.agentName || request.supportRequestType}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant='outline' className={getSupportStatusClass(request.statusId)}>
                  {getSupportStatusLabel(request.statusId)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant='outline' className={getPriorityClass(request.priority)}>
                  {request.priority}
                </Badge>
              </TableCell>
              <TableCell>{formatSourceLabel(request.source)}</TableCell>
              <TableCell>{formatDate(request.createdOn)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AgentsTable({ agents }: { agents: AgentSummary[] }) {
  if (agents.length === 0) {
    return (
      <EmptyState
        title='No collecting agents found'
        description='No agents are assigned to the selected school yet.'
      />
    )
  }

  return (
    <div className='rounded-lg border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Area</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <div className='font-medium'>
                  {[agent.firstName, agent.lastName].filter(Boolean).join(' ')}
                </div>
                <div className='text-xs text-muted-foreground'>{agent.phoneNumber}</div>
              </TableCell>
              <TableCell>{agent.assignedArea || 'Unassigned'}</TableCell>
              <TableCell>
                {agent.commissionPercentage != null
                  ? `${agent.commissionPercentage.toFixed(2)}%`
                  : 'N/A'}
              </TableCell>
              <TableCell>
                <Badge variant='secondary'>{getSchoolStatusLabel(agent.statusId)}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function Dashboard() {
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false

  if (isDirector && !isSuperAdmin) {
    return <DirectorDashboard />
  }

  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(
    currentUser?.schoolIds[0] ?? null
  )
  const [period, setPeriod] = useState<ReportingPeriod>('month')

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: fetchSchools,
  })

  const accessibleSchools =
    isDirector && currentUser?.schoolIds.length
      ? (schoolsQuery.data?.items ?? []).filter((school) =>
          currentUser.schoolIds.includes(school.id)
        )
      : (schoolsQuery.data?.items ?? [])

  useEffect(() => {
    if (isDirector && currentUser?.schoolIds[0]) {
      setSelectedSchoolId(currentUser.schoolIds[0])
      return
    }

    if (!selectedSchoolId && accessibleSchools[0]) {
      setSelectedSchoolId(accessibleSchools[0].id)
    }
  }, [accessibleSchools, currentUser?.schoolIds, isDirector, selectedSchoolId])

  const selectedSchool =
    accessibleSchools.find((school) => school.id === selectedSchoolId) ?? null

  const [
    studentMetricsQuery,
    parentMetricsQuery,
    paidMetricsQuery,
    pendingMetricsQuery,
    paymentTrendQuery,
    paymentMethodQuery,
    agentSummaryQuery,
    collectingAgentsQuery,
    pendingChildrenQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'students', selectedSchoolId],
        queryFn: () => fetchStudentMetrics(selectedSchoolId ?? 0),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'parents', selectedSchoolId],
        queryFn: () => fetchParentMetrics(selectedSchoolId ?? 0),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'paid', selectedSchoolId],
        queryFn: () => fetchPaidInstallmentsMetrics(selectedSchoolId ?? 0),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'pending', selectedSchoolId],
        queryFn: () => fetchPendingInstallmentsMetrics(selectedSchoolId ?? 0),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'trend', selectedSchoolId, period],
        queryFn: () => fetchPaymentTrend(selectedSchoolId ?? 0, period),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'methods', selectedSchoolId, period],
        queryFn: () => fetchPaymentMethodBreakdown(selectedSchoolId ?? 0, period),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'agents-summary', selectedSchoolId, period],
        queryFn: () => fetchAgentCollectionSummary(selectedSchoolId ?? 0, period),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'agents', selectedSchoolId],
        queryFn: () => fetchCollectingAgents(selectedSchoolId ?? 0),
        enabled: Boolean(selectedSchoolId),
      },
      {
        queryKey: ['dashboard', 'pending-children', selectedSchoolId],
        queryFn: () => fetchPendingChildren(selectedSchoolId ?? 0),
        enabled: Boolean(selectedSchoolId),
      },
    ],
  })

  const supportQueries = useQueries({
    queries: supportSources.map((source) => ({
      queryKey: ['dashboard', 'support', source, selectedSchoolId],
      queryFn: () => fetchSupportRequests(selectedSchoolId ?? 0, source),
      enabled: Boolean(selectedSchoolId && isDirector),
    })),
  })

  const supportRequests = supportQueries
    .flatMap((query) => query.data?.items ?? [])
    .sort((left, right) => {
      const leftDate = left.createdOn ? new Date(left.createdOn).getTime() : 0
      const rightDate = right.createdOn ? new Date(right.createdOn).getTime() : 0
      return rightDate - leftDate
    })
    .slice(0, 8)

  const supportTotalCount = supportQueries.reduce(
    (total, query) => total + (query.data?.totalCount ?? 0),
    0
  )

  const isRefreshing =
    schoolsQuery.isFetching ||
    studentMetricsQuery.isFetching ||
    parentMetricsQuery.isFetching ||
    paidMetricsQuery.isFetching ||
    pendingMetricsQuery.isFetching ||
    paymentTrendQuery.isFetching ||
    paymentMethodQuery.isFetching ||
    agentSummaryQuery.isFetching ||
    collectingAgentsQuery.isFetching ||
    pendingChildrenQuery.isFetching ||
    supportQueries.some((query) => query.isFetching)

  const refreshDashboard = () => {
    void schoolsQuery.refetch()
    void studentMetricsQuery.refetch()
    void parentMetricsQuery.refetch()
    void paidMetricsQuery.refetch()
    void pendingMetricsQuery.refetch()
    void paymentTrendQuery.refetch()
    void paymentMethodQuery.refetch()
    void agentSummaryQuery.refetch()
    void collectingAgentsQuery.refetch()
    void pendingChildrenQuery.refetch()
    supportQueries.forEach((query) => {
      void query.refetch()
    })
  }

  const openSupportPanel = isDirector
  const enabledSchools = accessibleSchools.filter((school) => school.statusId === 1).length
  const schoolCount = accessibleSchools.length
  const pendingChildrenCount = pendingChildrenQuery.data?.totalCount ?? 0
  const agentsCount = collectingAgentsQuery.data?.totalCount ?? 0

  return (
    <>
      <Header fixed>
        <div className='flex flex-1 items-center justify-between gap-3'>
          <div>
            <p className='text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase'>
              EduFrais Control Room
            </p>
            <h1 className='text-lg font-semibold'>Reporting and monitoring</h1>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={refreshDashboard}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <LoaderCircle className='h-4 w-4 animate-spin' />
              ) : (
                <RefreshCcw className='h-4 w-4' />
              )}
              Refresh
            </Button>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      <Main className='flex flex-col gap-6' fluid>
        <section className='grid gap-4 xl:grid-cols-[1.35fr_0.95fr]'>
          <Card className='overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.35),_transparent_42%),linear-gradient(135deg,#0f172a,#052e2b_48%,#022c22)] text-white shadow-xl'>
            <CardContent className='flex h-full flex-col justify-between gap-8 p-6'>
              <div className='space-y-3'>
                <Badge className='bg-white/10 text-white hover:bg-white/10'>
                  {isDirector ? 'Director view' : 'Super Admin view'}
                </Badge>
                <div>
                  <h2 className='text-3xl font-semibold tracking-tight'>
                    {selectedSchool?.name || 'Select a school'}
                  </h2>
                  <p className='mt-2 max-w-2xl text-sm text-white/70'>
                    Live financial reporting, support visibility, and operational
                    monitoring connected directly to the EduFrais backend APIs.
                  </p>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-3'>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-white/65'>
                    Schools in scope
                  </p>
                  <p className='mt-2 text-2xl font-semibold'>{schoolCount}</p>
                    <p className='text-sm text-white/70'>{enabledSchools} enabled</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-white/65'>
                    Pending approvals
                  </p>
                  <p className='mt-2 text-2xl font-semibold'>{pendingChildrenCount}</p>
                  <p className='text-sm text-white/70'>Children awaiting action</p>
                </div>
                <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                  <p className='text-xs uppercase tracking-[0.18em] text-white/65'>
                    Agent footprint
                  </p>
                  <p className='mt-2 text-2xl font-semibold'>{agentsCount}</p>
                  <p className='text-sm text-white/70'>Collecting agents listed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>Operational links</CardTitle>
              <CardDescription>
                Fast access to the API surfaces already exposed by the backend.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='rounded-xl border bg-muted/30 p-4'>
                <p className='text-sm font-medium'>Current API base</p>
                <p className='mt-1 break-all text-sm text-muted-foreground'>
                  {toApiUrl('/api')}
                </p>
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <Button asChild variant='outline' className='justify-between'>
                  <a href={toApiUrl('/swagger')} target='_blank' rel='noreferrer'>
                    Swagger
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </Button>
                <Button asChild variant='outline' className='justify-between'>
                  <a href={toApiUrl('/hangfire')} target='_blank' rel='noreferrer'>
                    Hangfire
                    <ExternalLink className='h-4 w-4' />
                  </a>
                </Button>
              </div>
              <div className='rounded-xl border bg-muted/30 p-4 text-sm'>
                <div className='flex items-center gap-2 font-medium'>
                  <ShieldCheck className='h-4 w-4 text-emerald-600' />
                  Signed in as {currentUser?.name || 'EduFrais User'}
                </div>
                <p className='mt-2 text-muted-foreground'>
                  Role: {(currentUser?.roles ?? []).join(', ') || 'Unknown'}
                </p>
                <p className='text-muted-foreground'>
                  Scope:{' '}
                  {currentUser?.schoolIds.length
                    ? currentUser.schoolIds.join(', ')
                    : 'All schools'}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[1.3fr_0.7fr_auto]'>
          <div>
            <p className='text-sm font-medium'>School scope</p>
            <p className='text-sm text-muted-foreground'>
              Directors stay locked to their own school. Super Admins can switch
              between schools for reporting.
            </p>
          </div>
          <Select
            value={selectedSchoolId ? String(selectedSchoolId) : undefined}
            onValueChange={(value) => setSelectedSchoolId(Number(value))}
            disabled={isDirector || accessibleSchools.length === 0}
          >
            <SelectTrigger className='w-full min-w-0 md:w-[320px]'>
              <SelectValue placeholder='Select a school' />
            </SelectTrigger>
            <SelectContent>
              {accessibleSchools.map((school) => (
                <SelectItem key={school.id} value={String(school.id)}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(value) => setPeriod(value as ReportingPeriod)}>
            <SelectTrigger className='w-full md:w-[160px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {!selectedSchoolId ? (
          <Card>
            <CardContent className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
              <AlertCircle className='h-8 w-8 text-muted-foreground' />
              <div>
                <p className='font-medium'>No school selected yet</p>
                <p className='text-sm text-muted-foreground'>
                  Once a school is available, the dashboard will load reporting and
                  monitoring data automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
              {studentMetricsQuery.isLoading ? (
                <LoadingCard title='Students' />
              ) : (
                <MetricCard
                  title='Enabled students'
                  description='Students linked to the selected school'
                  value={renderMetricValue(
                    studentMetricsQuery.data ?? {
                      total: 0,
                      count: null,
                      growthPercentage: 0,
                    },
                    'number'
                  )}
                  growth={studentMetricsQuery.data?.growthPercentage ?? 0}
                  icon={GraduationCap}
                />
              )}
              {parentMetricsQuery.isLoading ? (
                <LoadingCard title='Parents' />
              ) : (
                <MetricCard
                  title='Enabled parents'
                  description='Parent accounts currently enabled'
                  value={renderMetricValue(
                    parentMetricsQuery.data ?? {
                      total: 0,
                      count: null,
                      growthPercentage: 0,
                    },
                    'number'
                  )}
                  growth={parentMetricsQuery.data?.growthPercentage ?? 0}
                  icon={Users}
                />
              )}
              {paidMetricsQuery.isLoading ? (
                <LoadingCard title='Collected revenue' />
              ) : (
                <MetricCard
                  title='Collected revenue'
                  description='Processed installment payments'
                  value={renderMetricValue(
                    paidMetricsQuery.data ?? {
                      total: 0,
                      count: null,
                      growthPercentage: 0,
                    },
                    'currency'
                  )}
                  growth={paidMetricsQuery.data?.growthPercentage ?? 0}
                  icon={Wallet}
                />
              )}
              {pendingMetricsQuery.isLoading ? (
                <LoadingCard title='Pending balance' />
              ) : (
                <MetricCard
                  title='Pending balance'
                  description='Outstanding installment amount'
                  value={renderMetricValue(
                    pendingMetricsQuery.data ?? {
                      total: 0,
                      count: null,
                      growthPercentage: 0,
                    },
                    'currency'
                  )}
                  growth={pendingMetricsQuery.data?.growthPercentage ?? 0}
                  icon={HandCoins}
                />
              )}
            </section>

            <Tabs defaultValue='reporting' className='space-y-4'>
              <div className='overflow-x-auto pb-2'>
                <TabsList>
                  <TabsTrigger value='reporting'>Reporting</TabsTrigger>
                  <TabsTrigger value='monitoring'>Monitoring</TabsTrigger>
                  <TabsTrigger value='schools'>Schools</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value='reporting' className='space-y-4'>
                <div className='grid gap-4 xl:grid-cols-2'>
                  <Card className='border-border/70'>
                    <CardHeader>
                      <CardTitle>Payment trend</CardTitle>
                      <CardDescription>
                        Paid installment totals for the selected {period}.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PaymentTrendChart data={paymentTrendQuery.data ?? []} />
                    </CardContent>
                  </Card>

                  <Card className='border-border/70'>
                    <CardHeader>
                      <CardTitle>Payment methods</CardTitle>
                      <CardDescription>
                        Channel distribution across processed transactions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PaymentMethodChart data={paymentMethodQuery.data ?? []} />
                    </CardContent>
                  </Card>
                </div>

                <Card className='border-border/70'>
                  <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <CardTitle>Agent collection summary</CardTitle>
                      <CardDescription>
                        Which collecting agents are contributing the most revenue.
                      </CardDescription>
                    </div>
                    <Badge variant='outline' className='w-fit'>
                      {agentSummaryQuery.data?.length ?? 0} agents in chart
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <AgentCollectionChart data={agentSummaryQuery.data ?? []} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='monitoring' className='space-y-4'>
                <div className='grid gap-4 xl:grid-cols-3'>
                  <Card className='border-border/70'>
                    <CardHeader>
                      <CardTitle>Approval queue</CardTitle>
                      <CardDescription>
                        Recent children awaiting validation.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='flex items-end justify-between'>
                        <div>
                          <p className='text-3xl font-semibold'>{pendingChildrenCount}</p>
                          <p className='text-sm text-muted-foreground'>Pending child profiles</p>
                        </div>
                        <Badge variant='secondary'>Director workflow</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='border-border/70'>
                    <CardHeader>
                      <CardTitle>Support queue</CardTitle>
                      <CardDescription>
                        Director-facing support demand across request channels.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='flex items-end justify-between'>
                        <div>
                          <p className='text-3xl font-semibold'>
                            {openSupportPanel ? supportTotalCount : 'N/A'}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            {openSupportPanel
                              ? 'Support items in view'
                              : 'Support oversight is currently director-only'}
                          </p>
                        </div>
                        <Badge variant='secondary'>
                          {openSupportPanel ? 'Live' : 'Restricted'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='border-border/70'>
                    <CardHeader>
                      <CardTitle>Agent roster</CardTitle>
                      <CardDescription>
                        Active collecting footprint in the selected school.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <div className='flex items-end justify-between'>
                        <div>
                          <p className='text-3xl font-semibold'>{agentsCount}</p>
                          <p className='text-sm text-muted-foreground'>Agents returned by API</p>
                        </div>
                        <Badge variant='secondary'>Field ops</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className='border-border/70'>
                  <CardHeader>
                    <CardTitle>Pending child approvals</CardTitle>
                    <CardDescription>
                      Latest students waiting for approval in the selected school.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PendingChildrenTable children={pendingChildrenQuery.data?.items ?? []} />
                  </CardContent>
                </Card>

                <Card className='border-border/70'>
                  <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <CardTitle>Support requests</CardTitle>
                      <CardDescription>
                        Requests pulled from the support controller for the current school.
                      </CardDescription>
                    </div>
                    {openSupportPanel ? (
                      <Badge variant='outline' className='w-fit'>
                        {supportSources.map(formatSourceLabel).join(' â€¢ ')}
                      </Badge>
                    ) : null}
                  </CardHeader>
                  <CardContent>
                    {openSupportPanel ? (
                      <SupportRequestsTable requests={supportRequests} />
                    ) : (
                      <EmptyState
                        title='Support monitoring unavailable'
                        description='The current backend support endpoint authorizes director workflows only, so Super Admin sessions cannot query this panel yet.'
                      />
                    )}
                  </CardContent>
                </Card>

                <Card className='border-border/70'>
                  <CardHeader>
                    <CardTitle>Collecting agents</CardTitle>
                    <CardDescription>
                      Agent roster and commission setup for the selected school.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AgentsTable agents={collectingAgentsQuery.data?.items ?? []} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='schools' className='space-y-4'>
                <div className='grid gap-4 md:grid-cols-3'>
                  <Card className='border-border/70'>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        Accessible schools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='text-3xl font-semibold'>{schoolCount}</div>
                      <p className='text-sm text-muted-foreground'>
                        Schools returned from `School/SchoolsListing`
                      </p>
                    </CardContent>
                  </Card>
                  <Card className='border-border/70'>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        Enabled schools
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='text-3xl font-semibold'>{enabledSchools}</div>
                      <p className='text-sm text-muted-foreground'>
                        Status id `1` in the accessible scope
                      </p>
                    </CardContent>
                  </Card>
                  <Card className='border-border/70'>
                    <CardHeader className='pb-2'>
                      <CardTitle className='text-sm font-medium text-muted-foreground'>
                        Current focus
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='text-xl font-semibold'>
                        {selectedSchool?.name || 'No school selected'}
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {selectedSchool?.address || 'Choose a school above to inspect it'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className='border-border/70'>
                  <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <CardTitle>School directory</CardTitle>
                      <CardDescription>
                        Basic school contacts and visibility status from the backend.
                      </CardDescription>
                    </div>
                    <Button asChild variant='outline' size='sm'>
                      <a href={toApiUrl('/swagger')} target='_blank' rel='noreferrer'>
                        Open API docs
                        <ArrowUpRight className='h-4 w-4' />
                      </a>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <SchoolsTable schools={accessibleSchools} />
                  </CardContent>
                </Card>

                <Card className='border-border/70'>
                  <CardHeader>
                    <CardTitle>Backend coverage in this panel</CardTitle>
                    <CardDescription>
                      The current dashboard pulls from `Authentication`, `School`,
                      `Reports`, `Director`, `CollectingAgent`, and
                      `SupportRequest`.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                    {[
                      {
                        icon: School2,
                        label: 'School directory',
                        detail: 'School/SchoolsListing',
                      },
                      {
                        icon: Wallet,
                        label: 'Finance widgets',
                        detail: 'Reports/Get*',
                      },
                      {
                        icon: Building2,
                        label: 'Agent roster',
                        detail: 'CollectingAgent/GetCollectingAgents',
                      },
                      {
                        icon: AlertCircle,
                        label: 'Operations queue',
                        detail: 'Director + SupportRequest',
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className='rounded-xl border bg-muted/20 p-4'
                      >
                        <item.icon className='h-5 w-5 text-primary' />
                        <p className='mt-3 font-medium'>{item.label}</p>
                        <p className='text-sm text-muted-foreground'>{item.detail}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </Main>
    </>
  )
}

