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
        title='Administration des commissions'
        description='Parametrez les commissions de la plateforme et des prestataires de paiement.'
      >
        <EmptyState
          title='Acces SuperAdmin requis'
          description='L administration des commissions est reservee aux comptes SuperAdmin.'
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      title='Administration des commissions'
      description='Gerez les frais de plateforme EduFrais et les commissions des prestataires de paiement.'
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link to='/commission-admin/platform-fee'>
              <Percent className='h-4 w-4' />
              Frais plateforme
            </Link>
          </Button>
          <Button asChild>
            <Link to='/commission-admin/providers'>
              <Plus className='h-4 w-4' />
              Prestataires
            </Link>
          </Button>
        </div>
      }
    >
      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Frais plateforme'
          value={
            settingsQuery.isLoading
              ? '...'
              : platformFee
                ? formatPercentage(platformFee.feePercentage)
                : 'Non defini'
          }
          description='Taux de frais plateforme EduFrais actuellement actif.'
        />
        <MetricCard
          title='Prestataires de paiement'
          value={settingsQuery.isLoading ? '...' : formatNumber(providers.length)}
          description='Nombre total de prestataires configures dans la table des commissions.'
        />
        <MetricCard
          title='Prestataires actifs'
          value={
            settingsQuery.isLoading
              ? '...'
              : formatNumber(activeProviders.length)
          }
          description='Prestataires actuellement actives pour les regles de commission.'
        />
        <MetricCard
          title='Moyenne des frais'
          value={
            settingsQuery.isLoading
              ? '...'
              : formatPercentage(activeProviderAverage)
          }
          description='Pourcentage moyen des frais sur les prestataires actifs.'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[0.85fr_1.15fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Settings2 className='h-5 w-5' />
              Frais plateforme actif
            </CardTitle>
            <CardDescription>
              La mise a jour cree une nouvelle ligne active et conserve
              l historique des anciens taux.
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
                title='Aucun frais plateforme actif'
                description='Creez un frais plateforme pour commencer a suivre les revenus de commission EduFrais.'
              />
            ) : (
              <div className='space-y-4'>
                <div>
                  <div className='text-4xl font-semibold'>
                    {formatPercentage(platformFee.feePercentage)}
                  </div>
                  <p className='text-sm text-muted-foreground'>
                    Cree le {formatDateTime(platformFee.createdOn)}
                  </p>
                </div>
                <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
                  {platformFee.note || 'Aucune note n a ete enregistree pour ce taux.'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <CreditCard className='h-5 w-5' />
              Liste des commissions des prestataires
            </CardTitle>
            <CardDescription>
              Vue d ensemble des prestataires retournes par
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
                title='Aucun prestataire de paiement'
                description='Ajoutez des prestataires comme Airtel ou MTN pour commencer a gerer leurs taux de commission.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prestataire</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Frais</TableHead>
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
                              {provider.isActive ? 'Actif' : 'Inactif'}
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

