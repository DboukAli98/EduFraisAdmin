import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Award, Gift, ListChecks, Settings, Users } from 'lucide-react'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fetchLoyaltyDashboard, fetchLoyaltyProgram } from './api'
import { formatPoints, useDirectorLoyaltyScope } from './utils'

function MetricCard({
  title,
  value,
  description,
}: {
  title: string
  value: string
  description: string
}) {
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

export function LoyaltyOverviewPage() {
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const dashboardQuery = useQuery({
    queryKey: ['loyalty', 'dashboard', schoolId],
    queryFn: () => fetchLoyaltyDashboard(schoolId),
    enabled: hasAssignedSchool,
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Fidelite'
        description='Programmes de recompenses concus par le directeur pour les parents et les agents collecteurs.'
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
        title='Fidelite'
        description='Programmes de recompenses concus par le directeur pour les parents et les agents collecteurs.'
      >
        <EmptyState
          title='Aucune ecole affectee'
          description='Ce compte directeur n est pas encore lie a une ecole.'
        />
      </PageShell>
    )
  }

  const program = programQuery.data
  const dashboard = dashboardQuery.data

  return (
    <PageShell
      title='Fidelite'
      description='Concevez le programme de fidelite de l ecole, definissez les regles de gain et suivez les redemptions.'
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link to='/loyalty/program'>
              <Settings className='h-4 w-4' />
              Programme
            </Link>
          </Button>
          <Button asChild variant='outline'>
            <Link to='/loyalty/rules'>
              <ListChecks className='h-4 w-4' />
              Regles
            </Link>
          </Button>
          <Button asChild>
            <Link to='/loyalty/rewards'>
              <Gift className='h-4 w-4' />
              Recompenses
            </Link>
          </Button>
        </div>
      }
    >
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
          <MetricCard
            title='Membres actifs'
            value={dashboardQuery.isLoading ? '...' : formatPoints(dashboard?.activeMembers ?? 0)}
            description='Parents et agents participant actuellement au programme.'
          />
        <MetricCard
          title='Points en circulation'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.currentOutstandingPoints ?? 0)
          }
          description='Solde actuel cumule de tous les membres fidelite.'
        />
        <MetricCard
          title='Points attribues'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.totalPointsIssued ?? 0)
          }
          description='Tous les points gagnes et credits manuellement emis a ce jour.'
        />
        <MetricCard
          title='Points utilises'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.totalPointsRedeemed ?? 0)
          }
          description='Points consommes via les redemptions reussies et les debits.'
        />
        <MetricCard
          title='Redemptions en attente'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.pendingRedemptions ?? 0)
          }
          description='Demandes en attente d approbation ou de remise par le directeur.'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Award className='h-5 w-5' />
              Apercu du programme
            </CardTitle>
            <CardDescription>
              Configuration actuelle de fidelite de l ecole retournee par
              <code> /api/Loyalty/GetSchoolProgram</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {programQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-56' />
                <Skeleton className='h-5 w-full' />
                <Skeleton className='h-5 w-2/3' />
              </div>
            ) : !program ? (
                <EmptyState
                  title='Aucun programme fidelite'
                  description='Creez le premier programme de fidelite pour commencer a gagner et utiliser des points.'
                />
            ) : (
              <div className='space-y-5'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-2xl font-semibold'>
                      {program.programName}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      {program.programDescription || 'Aucune description du programme pour le moment.'}
                    </p>
                  </div>
                  <Badge
                    variant='outline'
                    className={getEntityStatusMeta(program.statusId).className}
                  >
                    {getEntityStatusMeta(program.statusId).label}
                  </Badge>
                </div>

                <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                  <div className='rounded-xl border bg-muted/20 p-4'>
                    <p className='text-sm text-muted-foreground'>Libelle des points</p>
                    <p className='mt-2 text-xl font-semibold'>{program.pointsLabel}</p>
                  </div>
                  <div className='rounded-xl border bg-muted/20 p-4'>
                    <p className='text-sm text-muted-foreground'>Bonus de bienvenue</p>
                    <p className='mt-2 text-xl font-semibold'>
                      {formatPoints(program.welcomeBonusPoints)}
                    </p>
                  </div>
                  <div className='rounded-xl border bg-muted/20 p-4'>
                    <p className='text-sm text-muted-foreground'>Minimum de redemption</p>
                    <p className='mt-2 text-xl font-semibold'>
                      {formatPoints(program.minimumRedeemPoints)}
                    </p>
                  </div>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='rounded-xl border p-4 text-sm'>
                    <p className='font-medium'>Participation</p>
                    <p className='mt-2 text-muted-foreground'>
                      Parents : {program.allowParentParticipation ? 'Activee' : 'Desactivee'}
                    </p>
                    <p className='text-muted-foreground'>
                      Agents collecteurs :{' '}
                      {program.allowAgentParticipation ? 'Activee' : 'Desactivee'}
                    </p>
                  </div>
                  <div className='rounded-xl border p-4 text-sm'>
                    <p className='font-medium'>Approbations et dates</p>
                    <p className='mt-2 text-muted-foreground'>
                      Redemptions : {program.autoApproveRedemptions ? 'Approbation automatique' : 'Revue directeur'}
                    </p>
                    <p className='text-muted-foreground'>
                      Debute le {formatDateTime(program.startsOn)}
                    </p>
                    <p className='text-muted-foreground'>
                      Se termine le {formatDateTime(program.endsOn)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Repartition de la participation
            </CardTitle>
            <CardDescription>
              Vue rapide des profils actifs et de la charge du programme de fidelite.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Parents actifs</p>
              <p className='mt-2 text-3xl font-semibold'>
                {dashboardQuery.isLoading ? '...' : formatPoints(dashboard?.activeParents ?? 0)}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Agents actifs</p>
              <p className='mt-2 text-3xl font-semibold'>
                {dashboardQuery.isLoading ? '...' : formatPoints(dashboard?.activeAgents ?? 0)}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Recompenses finalisees</p>
              <p className='mt-2 text-3xl font-semibold'>
                {dashboardQuery.isLoading
                  ? '...'
                  : formatPoints(dashboard?.fulfilledRedemptions ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className='border-border/70'>
        <CardHeader>
          <CardTitle>Recompenses les plus utilisees</CardTitle>
          <CardDescription>
            Recompenses les plus sollicitees d apres l historique des redemptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : !dashboard || dashboard.topRewards.length === 0 ? (
            <EmptyState
              title='Aucune activite de recompense'
              description='Des que les membres commenceront a utiliser leurs recompenses, les plus populaires apparaitront ici.'
            />
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recompense</TableHead>
                    <TableHead>Redemptions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.topRewards.map((reward) => (
                    <TableRow key={reward.loyaltyRewardId}>
                      <TableCell className='font-medium'>{reward.rewardName}</TableCell>
                      <TableCell>{formatPoints(reward.redemptionCount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  )
}


