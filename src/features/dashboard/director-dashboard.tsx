import { Link } from '@tanstack/react-router'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  GraduationCap,
  HandCoins,
  LifeBuoy,
  School2,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatCurrency,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import {
  fetchCollectingAgents,
  fetchPaidInstallmentsMetrics,
  fetchParentMetrics,
  fetchPendingChildren,
  fetchPendingInstallmentsMetrics,
  fetchStudentMetrics,
  fetchSupportRequests,
  type SupportSource,
} from '@/features/dashboard/api'
import { fetchSchoolDetails, fetchSchoolSections } from '@/features/schools/api'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const supportSources: SupportSource[] = [
  'PARENT_TO_DIRECTOR',
  'PARENT_TO_AGENT',
  'AGENT_TO_DIRECTOR',
]

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string
  value: string
  description: string
  icon: typeof Users
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
      </CardContent>
    </Card>
  )
}

export function DirectorDashboard() {
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const schoolId = currentUser?.schoolIds[0] ?? null

  const schoolQuery = useQuery({
    queryKey: ['director-dashboard', 'school', schoolId],
    queryFn: () => fetchSchoolDetails(schoolId ?? 0),
    enabled: Boolean(schoolId),
  })

  const sectionsQuery = useQuery({
    queryKey: ['director-dashboard', 'sections', schoolId],
    queryFn: () => fetchSchoolSections(schoolId ?? 0),
    enabled: Boolean(schoolId),
  })

  const [
    studentMetricsQuery,
    parentMetricsQuery,
    paidMetricsQuery,
    pendingMetricsQuery,
    pendingChildrenQuery,
    collectingAgentsQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: ['director-dashboard', 'students', schoolId],
        queryFn: () => fetchStudentMetrics(schoolId ?? 0),
        enabled: Boolean(schoolId),
      },
      {
        queryKey: ['director-dashboard', 'parents', schoolId],
        queryFn: () => fetchParentMetrics(schoolId ?? 0),
        enabled: Boolean(schoolId),
      },
      {
        queryKey: ['director-dashboard', 'paid', schoolId],
        queryFn: () => fetchPaidInstallmentsMetrics(schoolId ?? 0),
        enabled: Boolean(schoolId),
      },
      {
        queryKey: ['director-dashboard', 'pending', schoolId],
        queryFn: () => fetchPendingInstallmentsMetrics(schoolId ?? 0),
        enabled: Boolean(schoolId),
      },
      {
        queryKey: ['director-dashboard', 'pending-children', schoolId],
        queryFn: () => fetchPendingChildren(schoolId ?? 0),
        enabled: Boolean(schoolId),
      },
      {
        queryKey: ['director-dashboard', 'agents', schoolId],
        queryFn: () => fetchCollectingAgents(schoolId ?? 0),
        enabled: Boolean(schoolId),
      },
    ],
  })

  const supportQueries = useQueries({
    queries: supportSources.map((source) => ({
      queryKey: ['director-dashboard', 'support', schoolId, source],
      queryFn: () => fetchSupportRequests(schoolId ?? 0, source),
      enabled: Boolean(schoolId),
    })),
  })

  const supportRequests = supportQueries
    .flatMap((query) => query.data?.items ?? [])
    .sort((left, right) => {
      const leftDate = new Date(left.createdOn ?? 0).getTime()
      const rightDate = new Date(right.createdOn ?? 0).getTime()
      return rightDate - leftDate
    })

  const school = schoolQuery.data
  const sections = sectionsQuery.data?.items ?? []
  const agents = collectingAgentsQuery.data?.items ?? []
  const pendingChildren = pendingChildrenQuery.data?.items ?? []
  const isLoading =
    schoolQuery.isLoading ||
    sectionsQuery.isLoading ||
    studentMetricsQuery.isLoading ||
    parentMetricsQuery.isLoading ||
    paidMetricsQuery.isLoading ||
    pendingMetricsQuery.isLoading ||
    pendingChildrenQuery.isLoading ||
    collectingAgentsQuery.isLoading ||
    supportQueries.some((query) => query.isLoading)

  return (
    <PageShell
      title='Director Workspace'
      description='Run your school from one place: reporting, classes, parents, children, agents, payments, and support.'
      actions={
        <Badge variant='outline'>
          <ShieldCheck className='mr-1 h-3.5 w-3.5' />
          Director scope
        </Badge>
      }
    >
      {!schoolId ? (
        <EmptyState
          title='No school is assigned'
          description='This director account is not linked to a school yet, so the workspace cannot load.'
        />
      ) : (
        <>
          <section className='grid gap-4 xl:grid-cols-[1.3fr_0.7fr]'>
            <Card className='overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_38%),linear-gradient(135deg,#0f172a,#0c4a6e_46%,#082f49)] text-white shadow-xl'>
              <CardContent className='grid gap-6 p-6'>
                <div className='space-y-3'>
                  <Badge className='w-fit bg-white/10 text-white hover:bg-white/10'>
                    School command center
                  </Badge>
                  {schoolQuery.isLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-8 w-56 bg-white/10' />
                      <Skeleton className='h-4 w-full bg-white/10' />
                    </div>
                  ) : school ? (
                    <>
                      <div>
                        <h2 className='text-3xl font-semibold tracking-tight'>
                          {school.name}
                        </h2>
                        <p className='mt-2 max-w-2xl text-sm text-white/70'>
                          Monitor families, fees, class structure, field agents, and
                          support operations for your school.
                        </p>
                      </div>
                      <div className='grid gap-3 sm:grid-cols-3'>
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                          <p className='text-xs uppercase tracking-[0.18em] text-white/65'>
                            Status
                          </p>
                          <p className='mt-2 text-2xl font-semibold'>
                            {getEntityStatusMeta(school.statusId).label}
                          </p>
                          <p className='text-sm text-white/70'>Current school state</p>
                        </div>
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                          <p className='text-xs uppercase tracking-[0.18em] text-white/65'>
                            Classes
                          </p>
                          <p className='mt-2 text-2xl font-semibold'>{sections.length}</p>
                          <p className='text-sm text-white/70'>Configured grade sections</p>
                        </div>
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                          <p className='text-xs uppercase tracking-[0.18em] text-white/65'>
                            Support queue
                          </p>
                          <p className='mt-2 text-2xl font-semibold'>
                            {supportRequests.length}
                          </p>
                          <p className='text-sm text-white/70'>Recent support items</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title='School unavailable'
                      description='The assigned school record could not be loaded.'
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
                <CardDescription>
                  Jump straight into the areas directors manage every day.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                <Button asChild className='justify-start'>
                  <Link to='/my-school'>
                    <School2 className='h-4 w-4' />
                    Manage my school
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/users'>
                    <Users className='h-4 w-4' />
                    Manage parents and children
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/payments'>
                    <Wallet className='h-4 w-4' />
                    Review payments
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/collecting-agents'>
                    <UserCog className='h-4 w-4' />
                    Manage collecting agents
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/support'>
                    <LifeBuoy className='h-4 w-4' />
                    Manage support requests
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <SummaryCard
              title='Enabled students'
              value={String(studentMetricsQuery.data?.total ?? 0)}
              description='Students currently linked to this school.'
              icon={GraduationCap}
            />
            <SummaryCard
              title='Enabled parents'
              value={String(parentMetricsQuery.data?.total ?? 0)}
              description='Parent accounts active in your school.'
              icon={Users}
            />
            <SummaryCard
              title='Collected fees'
              value={formatCurrency(paidMetricsQuery.data?.total ?? 0)}
              description='Processed school-fee revenue.'
              icon={Wallet}
            />
            <SummaryCard
              title='Pending balance'
              value={formatCurrency(pendingMetricsQuery.data?.total ?? 0)}
              description='Outstanding installment amount still pending.'
              icon={HandCoins}
            />
          </section>

          <section className='grid gap-4 xl:grid-cols-[1.05fr_0.95fr]'>
            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Pending child approvals</CardTitle>
                  <CardDescription>
                    Recent children waiting for director review.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{pendingChildren.length} pending</Badge>
              </CardHeader>
              <CardContent>
                {pendingChildrenQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : pendingChildren.length === 0 ? (
                  <EmptyState
                    title='Approval queue is clear'
                    description='No child profiles are currently waiting for review.'
                  />
                ) : (
                  <div className='space-y-3'>
                    {pendingChildren.slice(0, 5).map((child) => (
                      <div
                        key={child.id}
                        className='rounded-xl border bg-muted/20 p-4 text-sm'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='font-medium'>
                              {buildFullName(child.firstName, child.lastName)}
                            </p>
                            <p className='text-muted-foreground'>
                              {child.parentName || 'No parent linked'}
                            </p>
                          </div>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(child.statusId).className}
                          >
                            {getEntityStatusMeta(child.statusId).label}
                          </Badge>
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          Submitted {formatDateTime(child.createdOn)}
                        </p>
                      </div>
                    ))}
                    <Button asChild variant='outline' className='w-full'>
                      <Link to='/users'>Open family management</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Support requests</CardTitle>
                  <CardDescription>
                    Parent and collecting-agent issues that need follow-up.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{supportRequests.length} items</Badge>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : supportRequests.length === 0 ? (
                  <EmptyState
                    title='No support requests'
                    description='There are no active support items in the current school scope.'
                  />
                ) : (
                  <div className='space-y-3'>
                    {supportRequests.slice(0, 5).map((request) => (
                      <div
                        key={`${request.source}-${request.id}`}
                        className='rounded-xl border bg-muted/20 p-4 text-sm'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='font-medium'>{request.title}</p>
                            <p className='text-muted-foreground'>
                              {request.parentName || request.agentName || request.source}
                            </p>
                          </div>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(request.statusId).className}
                          >
                            {getEntityStatusMeta(request.statusId).label}
                          </Badge>
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          Created {formatDateTime(request.createdOn)}
                        </p>
                      </div>
                    ))}
                    <Button asChild variant='outline' className='w-full'>
                      <Link to='/support'>Open support workspace</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section className='grid gap-4 xl:grid-cols-[0.9fr_1.1fr]'>
            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>School profile</CardTitle>
                <CardDescription>
                  Core school data visible to the current director account.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 text-sm'>
                {school ? (
                  <>
                    <div className='rounded-xl border bg-muted/20 p-4'>
                      <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
                        School
                      </p>
                      <p className='mt-2 text-lg font-semibold'>{school.name}</p>
                      <p className='text-muted-foreground'>{school.address}</p>
                    </div>
                    <div className='grid gap-3 sm:grid-cols-2'>
                      <div className='rounded-xl border bg-muted/20 p-4'>
                        <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
                          Contact
                        </p>
                        <p className='mt-2'>{school.email || 'No email'}</p>
                        <p className='text-muted-foreground'>
                          {school.phoneNumber || 'No phone'}
                        </p>
                      </div>
                      <div className='rounded-xl border bg-muted/20 p-4'>
                        <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
                          Structure
                        </p>
                        <p className='mt-2'>{sections.length} class sections</p>
                        <p className='text-muted-foreground'>
                          Manage classes and payment cycles from My School
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <EmptyState
                    title='School profile unavailable'
                    description='The school record could not be loaded for this session.'
                  />
                )}
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Collecting agents</CardTitle>
                  <CardDescription>
                    The field team currently linked to your school.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{agents.length} agents</Badge>
              </CardHeader>
              <CardContent>
                {collectingAgentsQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : agents.length === 0 ? (
                  <EmptyState
                    title='No collecting agents yet'
                    description='No agent roster was returned for this school.'
                  />
                ) : (
                  <div className='space-y-3'>
                    {agents.slice(0, 5).map((agent) => (
                      <div
                        key={agent.id}
                        className='rounded-xl border bg-muted/20 p-4 text-sm'
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div>
                            <p className='font-medium'>
                              {buildFullName(agent.firstName, agent.lastName)}
                            </p>
                            <p className='text-muted-foreground'>
                              {agent.assignedArea || 'No assigned area'}
                            </p>
                          </div>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(agent.statusId).className}
                          >
                            {getEntityStatusMeta(agent.statusId).label}
                          </Badge>
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          Commission:{' '}
                          {agent.commissionPercentage != null
                            ? `${agent.commissionPercentage.toFixed(2)}%`
                            : 'Not set'}
                        </p>
                      </div>
                    ))}
                    <Button asChild variant='outline' className='w-full'>
                      <Link to='/collecting-agents'>Open agent management</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </PageShell>
  )
}
