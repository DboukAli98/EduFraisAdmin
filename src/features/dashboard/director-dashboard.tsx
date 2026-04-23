import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  GraduationCap,
  HandCoins,
  LifeBuoy,
  School2,
  ShieldCheck,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
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
      title='Espace directeur'
      description='Gerez votre ecole depuis un seul espace : rapports, classes, parents, enfants, agents, paiements et support.'
      actions={
        <Badge variant='outline'>
          <ShieldCheck className='mr-1 h-3.5 w-3.5' />
          Portee directeur
        </Badge>
      }
    >
      {!schoolId ? (
        <EmptyState
          title='Aucune ecole affectee'
          description='Ce compte directeur n est pas encore lie a une ecole, l espace ne peut donc pas etre charge.'
        />
      ) : (
        <>
          <section className='grid gap-4 xl:grid-cols-[1.3fr_0.7fr]'>
            <Card className='overflow-hidden border-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_38%),linear-gradient(135deg,#0f172a,#0c4a6e_46%,#082f49)] text-white shadow-xl'>
              <CardContent className='grid gap-6 p-6'>
                <div className='space-y-3'>
                  <Badge className='w-fit bg-white/10 text-white hover:bg-white/10'>
                    Centre de pilotage de l ecole
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
                          Suivez les familles, les frais, la structure des classes,
                          les agents terrain et les operations de support de votre ecole.
                        </p>
                      </div>
                      <div className='grid gap-3 sm:grid-cols-3'>
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                          <p className='text-xs tracking-[0.18em] text-white/65 uppercase'>
                            Statut
                          </p>
                          <p className='mt-2 text-2xl font-semibold'>
                            {getEntityStatusMeta(school.statusId).label}
                          </p>
                          <p className='text-sm text-white/70'>
                            Etat actuel de l ecole
                          </p>
                        </div>
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                          <p className='text-xs tracking-[0.18em] text-white/65 uppercase'>
                            Classes
                          </p>
                          <p className='mt-2 text-2xl font-semibold'>
                            {sections.length}
                          </p>
                          <p className='text-sm text-white/70'>
                            Sections configurees
                          </p>
                        </div>
                        <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                          <p className='text-xs tracking-[0.18em] text-white/65 uppercase'>
                            File de support
                          </p>
                          <p className='mt-2 text-2xl font-semibold'>
                            {supportRequests.length}
                          </p>
                          <p className='text-sm text-white/70'>
                            Elements recents du support
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      title='Ecole indisponible'
                      description='L enregistrement de l ecole affectee n a pas pu etre charge.'
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>Actions rapides</CardTitle>
                <CardDescription>
                  Accedez directement aux espaces que les directeurs utilisent chaque jour.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                <Button asChild className='justify-start'>
                  <Link to='/my-school'>
                    <School2 className='h-4 w-4' />
                    Gerer mon ecole
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/users'>
                    <Users className='h-4 w-4' />
                    Gerer parents et enfants
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/payments'>
                    <Wallet className='h-4 w-4' />
                    Consulter les paiements
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/collecting-agents'>
                    <UserCog className='h-4 w-4' />
                    Gerer les agents collecteurs
                  </Link>
                </Button>
                <Button asChild variant='outline' className='justify-start'>
                  <Link to='/support'>
                    <LifeBuoy className='h-4 w-4' />
                    Gerer les demandes de support
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            <SummaryCard
              title='Eleves actifs'
              value={String(studentMetricsQuery.data?.total ?? 0)}
              description='Eleves actuellement lies a cette ecole.'
              icon={GraduationCap}
            />
            <SummaryCard
              title='Parents actifs'
              value={String(parentMetricsQuery.data?.total ?? 0)}
              description='Comptes parents actifs dans votre ecole.'
              icon={Users}
            />
            <SummaryCard
              title='Frais encaisses'
              value={formatCurrency(paidMetricsQuery.data?.total ?? 0)}
              description='Revenus des frais scolaires traites.'
              icon={Wallet}
            />
            <SummaryCard
              title='Solde en attente'
              value={formatCurrency(pendingMetricsQuery.data?.total ?? 0)}
              description='Montant des echeances encore en attente.'
              icon={HandCoins}
            />
          </section>

          <section className='grid gap-4 xl:grid-cols-[1.05fr_0.95fr]'>
            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Approbations d enfants en attente</CardTitle>
                  <CardDescription>
                    Enfants recents en attente de validation par le directeur.
                  </CardDescription>
                </div>
                <Badge variant='outline'>
                  {pendingChildren.length} en attente
                </Badge>
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
                    title='Aucune approbation en attente'
                    description='Aucun profil enfant n attend actuellement de validation.'
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
                              {child.parentName || 'Aucun parent lie'}
                            </p>
                          </div>
                          <Badge
                            variant='outline'
                            className={
                              getEntityStatusMeta(child.statusId).className
                            }
                          >
                            {getEntityStatusMeta(child.statusId).label}
                          </Badge>
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          Soumis le {formatDateTime(child.createdOn)}
                        </p>
                      </div>
                    ))}
                    <Button asChild variant='outline' className='w-full'>
                      <Link to='/users'>Ouvrir la gestion des familles</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Demandes de support</CardTitle>
                  <CardDescription>
                    Problemes des parents et des agents collecteurs necessitant un suivi.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{supportRequests.length} elements</Badge>
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
                    title='Aucune demande de support'
                    description='Aucun element de support actif dans la portee actuelle de l ecole.'
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
                              {request.parentName ||
                                request.agentName ||
                                request.source}
                            </p>
                          </div>
                          <Badge
                            variant='outline'
                            className={
                              getEntityStatusMeta(request.statusId).className
                            }
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
                      <p className='mt-2 text-lg font-semibold'>
                        {school.name}
                      </p>
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
                            className={
                              getEntityStatusMeta(agent.statusId).className
                            }
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
