import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, Percent, Plus, Settings2 } from 'lucide-react'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { formatDateTime, formatNumber } from '@/features/admin/utils'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fetchCommissionSettings } from './api'

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

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

export function CommissionOverview() {
  const currentUser = useAuthStore((state) => state.auth.user)
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false

  const settingsQuery = useQuery({
    queryKey: ['commission-settings'],
    queryFn: fetchCommissionSettings,
    enabled: isSuperAdmin,
  })

  const settings = settingsQuery.data
  const platformFee = settings?.platformFee ?? null
  const providers = settings?.providers ?? []
  const activeProviders = providers.filter((provider) => provider.isActive)
  const activeProviderAverage =
    activeProviders.length > 0
      ? activeProviders.reduce(
          (sum, provider) => sum + provider.feePercentage,
          0
        ) / activeProviders.length
      : 0

  if (!isSuperAdmin) {
    return (
      <PageShell
        title='Commission Admin'
        description='Platform commission and payment provider settings.'
      >
        <EmptyState
          title='SuperAdmin access required'
          description='Commission administration is restricted to SuperAdmin accounts.'
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      title='Commission Admin'
      description='Manage EduFrais platform fees and payment-provider commissions.'
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link to='/commission-admin/platform-fee'>
              <Percent className='h-4 w-4' />
              Platform fee
            </Link>
          </Button>
          <Button asChild>
            <Link to='/commission-admin/providers'>
              <Plus className='h-4 w-4' />
              Provider
            </Link>
          </Button>
        </div>
      }
    >
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Platform fee'
          value={
            settingsQuery.isLoading
              ? '...'
              : platformFee
                ? formatPercentage(platformFee.feePercentage)
                : 'Not set'
          }
          description='Current active EduFrais platform fee.'
        />
        <MetricCard
          title='Payment providers'
          value={settingsQuery.isLoading ? '...' : formatNumber(providers.length)}
          description='Total providers configured in the commission table.'
        />
        <MetricCard
          title='Active providers'
          value={
            settingsQuery.isLoading
              ? '...'
              : formatNumber(activeProviders.length)
          }
          description='Providers currently enabled for payment fee rules.'
        />
        <MetricCard
          title='Avg provider fee'
          value={
            settingsQuery.isLoading
              ? '...'
              : formatPercentage(activeProviderAverage)
          }
          description='Average fee percentage across active providers.'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[0.85fr_1.15fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings2 className='h-5 w-5' />
              Active platform fee
            </CardTitle>
            <CardDescription>
              Updating the platform fee creates a new active row and keeps old
              rates for history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-32' />
                <Skeleton className='h-5 w-full' />
                <Skeleton className='h-5 w-2/3' />
              </div>
            ) : !platformFee ? (
              <EmptyState
                title='No active platform fee'
                description='Create a platform fee to start tracking EduFrais commission revenue.'
              />
            ) : (
              <div className='space-y-4'>
                <div>
                  <div className='text-4xl font-semibold'>
                    {formatPercentage(platformFee.feePercentage)}
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Created {formatDateTime(platformFee.createdOn)}
                  </p>
                </div>
                <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
                  {platformFee.note || 'No note was recorded for this fee.'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <CreditCard className='h-5 w-5' />
              Provider commission list
            </CardTitle>
            <CardDescription>
              Snapshot of every payment provider returned by
              <code> GetCommissionSettings</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : providers.length === 0 ? (
              <EmptyState
                title='No payment providers yet'
                description='Add providers such as Airtel or MTN to start managing provider commission rates.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers
                      .slice()
                      .sort((left, right) => left.displayOrder - right.displayOrder)
                      .map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell className='font-medium'>
                            {provider.name}
                          </TableCell>
                          <TableCell>{provider.code}</TableCell>
                          <TableCell>
                            {formatPercentage(provider.feePercentage)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={provider.isActive ? 'default' : 'outline'}
                            >
                              {provider.isActive ? 'Active' : 'Inactive'}
                            </Badge>
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
  )
}
