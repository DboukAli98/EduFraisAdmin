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
        title='Loyalty'
        description='Director-designed rewards programs for parents and collecting agents.'
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
        title='Loyalty'
        description='Director-designed rewards programs for parents and collecting agents.'
      >
        <EmptyState
          title='No school assigned'
          description='This director account is not linked to a school yet.'
        />
      </PageShell>
    )
  }

  const program = programQuery.data
  const dashboard = dashboardQuery.data

  return (
    <PageShell
      title='Loyalty'
      description='Design the school loyalty program, define earning rules, and monitor reward redemptions.'
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link to='/loyalty/program'>
              <Settings className='h-4 w-4' />
              Program
            </Link>
          </Button>
          <Button asChild variant='outline'>
            <Link to='/loyalty/rules'>
              <ListChecks className='h-4 w-4' />
              Rules
            </Link>
          </Button>
          <Button asChild>
            <Link to='/loyalty/rewards'>
              <Gift className='h-4 w-4' />
              Rewards
            </Link>
          </Button>
        </div>
      }
    >
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-5'>
        <MetricCard
          title='Active members'
          value={dashboardQuery.isLoading ? '...' : formatPoints(dashboard?.activeMembers ?? 0)}
          description='Parents and agents currently participating in the program.'
        />
        <MetricCard
          title='Outstanding points'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.currentOutstandingPoints ?? 0)
          }
          description='Current live balance across every loyalty member.'
        />
        <MetricCard
          title='Points issued'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.totalPointsIssued ?? 0)
          }
          description='All earned and manually credited points issued so far.'
        />
        <MetricCard
          title='Points redeemed'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.totalPointsRedeemed ?? 0)
          }
          description='Points consumed through successful redemptions and debits.'
        />
        <MetricCard
          title='Pending redemptions'
          value={
            dashboardQuery.isLoading
              ? '...'
              : formatPoints(dashboard?.pendingRedemptions ?? 0)
          }
          description='Requests waiting for director approval or fulfillment.'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Award className='h-5 w-5' />
              Program snapshot
            </CardTitle>
            <CardDescription>
              Current school loyalty configuration returned by
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
                title='No loyalty program yet'
                description='Create the first school loyalty program to start earning and redeeming points.'
              />
            ) : (
              <div className='space-y-5'>
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-2xl font-semibold'>
                      {program.programName}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      {program.programDescription || 'No program description yet.'}
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
                    <p className='text-sm text-muted-foreground'>Points label</p>
                    <p className='mt-2 text-xl font-semibold'>{program.pointsLabel}</p>
                  </div>
                  <div className='rounded-xl border bg-muted/20 p-4'>
                    <p className='text-sm text-muted-foreground'>Welcome bonus</p>
                    <p className='mt-2 text-xl font-semibold'>
                      {formatPoints(program.welcomeBonusPoints)}
                    </p>
                  </div>
                  <div className='rounded-xl border bg-muted/20 p-4'>
                    <p className='text-sm text-muted-foreground'>Min redeem</p>
                    <p className='mt-2 text-xl font-semibold'>
                      {formatPoints(program.minimumRedeemPoints)}
                    </p>
                  </div>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='rounded-xl border p-4 text-sm'>
                    <p className='font-medium'>Participation</p>
                    <p className='mt-2 text-muted-foreground'>
                      Parents: {program.allowParentParticipation ? 'Enabled' : 'Disabled'}
                    </p>
                    <p className='text-muted-foreground'>
                      Collecting agents:{' '}
                      {program.allowAgentParticipation ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className='rounded-xl border p-4 text-sm'>
                    <p className='font-medium'>Approvals & dates</p>
                    <p className='mt-2 text-muted-foreground'>
                      Redemptions: {program.autoApproveRedemptions ? 'Auto-approved' : 'Director review'}
                    </p>
                    <p className='text-muted-foreground'>
                      Starts {formatDateTime(program.startsOn)}
                    </p>
                    <p className='text-muted-foreground'>
                      Ends {formatDateTime(program.endsOn)}
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
              Participation mix
            </CardTitle>
            <CardDescription>
              Quick read on who is active and what the loyalty workload looks like.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Active parents</p>
              <p className='mt-2 text-3xl font-semibold'>
                {dashboardQuery.isLoading ? '...' : formatPoints(dashboard?.activeParents ?? 0)}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Active agents</p>
              <p className='mt-2 text-3xl font-semibold'>
                {dashboardQuery.isLoading ? '...' : formatPoints(dashboard?.activeAgents ?? 0)}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Fulfilled rewards</p>
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
          <CardTitle>Top redeemed rewards</CardTitle>
          <CardDescription>
            Highest-traffic rewards based on the loyalty redemption history.
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
              title='No reward activity yet'
              description='Once members start redeeming rewards, the most-used rewards will show up here.'
            />
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reward</TableHead>
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
