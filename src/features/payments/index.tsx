import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, Search } from 'lucide-react'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchSchools } from '@/features/schools/api'
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
import { Input } from '@/components/ui/input'
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
import {
  fetchMerchandisePaymentsBySchool,
  fetchSchoolFeePaymentsBySchool,
  lookupPaymentStatus,
} from './api'

const knownPaymentStatusIds = [8, 11, 9, 10]

function SummaryCard({
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

export function Payments() {
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false

  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(
    currentUser?.schoolIds[0] ?? null
  )
  const [selectedStatusId, setSelectedStatusId] = useState(0)
  const [lookupReference, setLookupReference] = useState('')

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

  const schoolFeesQuery = useQuery({
    queryKey: ['payments', 'school-fees', selectedSchoolId],
    queryFn: () => fetchSchoolFeePaymentsBySchool(selectedSchoolId ?? 0),
    enabled: Boolean(selectedSchoolId),
  })

  const merchandiseQuery = useQuery({
    queryKey: ['payments', 'merchandise', selectedSchoolId],
    queryFn: () => fetchMerchandisePaymentsBySchool(selectedSchoolId ?? 0),
    enabled: Boolean(selectedSchoolId),
  })

  const lookupMutation = useMutation({
    mutationFn: (transactionId: string) => lookupPaymentStatus(transactionId),
  })

  const schoolFees = schoolFeesQuery.data?.items ?? []
  const merchandisePayments = merchandiseQuery.data?.items ?? []
  const statusFilterOptions = [
    0,
    ...Array.from(
      new Set(
        [...knownPaymentStatusIds, ...schoolFees, ...merchandisePayments]
          .map((value) => (typeof value === 'number' ? value : value.statusId))
          .filter((statusId) => statusId > 0)
      )
    ),
  ]
  const selectedStatusLabel =
    selectedStatusId === 0
      ? 'All statuses'
      : getEntityStatusMeta(selectedStatusId).label
  const filteredSchoolFees =
    selectedStatusId === 0
      ? schoolFees
      : schoolFees.filter((payment) => payment.statusId === selectedStatusId)
  const filteredMerchandisePayments =
    selectedStatusId === 0
      ? merchandisePayments
      : merchandisePayments.filter(
          (payment) => payment.statusId === selectedStatusId
        )

  const processedSchoolFees = schoolFees.filter((payment) => payment.statusId === 8)
  const processedMerchandisePayments = merchandisePayments.filter(
    (payment) => payment.statusId === 8
  )

  const totalSchoolFees = processedSchoolFees.reduce(
    (sum, payment) => sum + payment.amountPaid,
    0
  )
  const totalMerchandise = processedMerchandisePayments.reduce(
    (sum, payment) => sum + payment.amountPaid,
    0
  )
  const totalTransactions =
    filteredSchoolFees.length + filteredMerchandisePayments.length
  const agentProcessedTransactions =
    filteredSchoolFees.filter((payment) => payment.processedByAgent).length +
    filteredMerchandisePayments.filter((payment) => payment.processedByAgent)
      .length

  return (
    <PageShell
      title='Paiements'
      description='Suivez l historique des paiements des frais scolaires et des articles avec un filtre de statut partage et une verification directe des transactions.'
      actions={<Badge variant='outline'>Filtre actif : {selectedStatusLabel}</Badge>}
    >
      <section className='grid gap-4 rounded-2xl border bg-card p-4 lg:grid-cols-[1.1fr_0.9fr_0.9fr]'>
        <div className='space-y-1'>
          <p className='text-sm font-medium'>Portee ecole</p>
          <p className='text-sm text-muted-foreground'>
            L historique des paiements est agrege a l echelle de l ecole en collectant en arriere-plan l historique de chaque parent.
          </p>
        </div>
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Ecole</p>
          <Select
            value={selectedSchoolId ? String(selectedSchoolId) : undefined}
            onValueChange={(value) => setSelectedSchoolId(Number(value))}
            disabled={isDirector || accessibleSchools.length === 0}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Selectionner une ecole' />
            </SelectTrigger>
            <SelectContent>
              {accessibleSchools.map((school) => (
                <SelectItem key={school.id} value={String(school.id)}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Filtre de statut</p>
          <Select
            value={String(selectedStatusId)}
            onValueChange={(value) => setSelectedStatusId(Number(value))}
          >
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Selectionner un statut de paiement' />
            </SelectTrigger>
            <SelectContent>
              {statusFilterOptions.map((statusId) => (
                <SelectItem key={statusId} value={String(statusId)}>
                  {statusId === 0
                    ? 'Tous les statuts'
                    : getEntityStatusMeta(statusId).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          title='Frais scolaires traites'
          value={formatCurrency(totalSchoolFees)}
          description='Paiements d echeances collectes avec le statut Traite.'
        />
        <SummaryCard
          title='Articles traites'
          value={formatCurrency(totalMerchandise)}
          description='Paiements d articles collectes avec le statut Traite.'
        />
        <SummaryCard
          title='Transactions visibles'
          value={formatNumber(totalTransactions)}
          description={`Historique combine des frais scolaires et des articles pour ${selectedStatusLabel.toLowerCase()}.`}
        />
        <SummaryCard
          title='Pris en charge par un agent'
          value={formatNumber(agentProcessedTransactions)}
          description={`Transactions prises en charge par les agents collecteurs pour ${selectedStatusLabel.toLowerCase()}.`}
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.35fr_0.65fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Couverture des paiements de l ecole</CardTitle>
            <CardDescription>
              Cette page agrege les historiques de paiement par parent car le backend n expose pas encore un endpoint unique au niveau de l ecole.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Parents concernes</p>
              <p className='mt-2 text-2xl font-semibold'>
                {schoolFeesQuery.data?.totalParents ??
                  merchandiseQuery.data?.totalParents ??
                  0}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Parents analyses</p>
              <p className='mt-2 text-2xl font-semibold'>
                {schoolFeesQuery.data?.scannedParents ??
                  merchandiseQuery.data?.scannedParents ??
                  0}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Erreurs de chargement des frais scolaires</p>
              <p className='mt-2 text-2xl font-semibold'>
                {schoolFeesQuery.data?.failedParents ?? 0}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Erreurs de chargement des articles</p>
              <p className='mt-2 text-2xl font-semibold'>
                {merchandiseQuery.data?.failedParents ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Verification du statut d une transaction</CardTitle>
            <CardDescription>
              Verifiez directement une reference de paiement via <code>/api/Payments/CheckPaymentStatus</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex gap-2'>
              <Input
                placeholder='ID de transaction'
                value={lookupReference}
                onChange={(event) => setLookupReference(event.target.value)}
              />
              <Button
                onClick={() => lookupMutation.mutate(lookupReference.trim())}
                disabled={lookupMutation.isPending || lookupReference.trim().length === 0}
              >
                <Search className='h-4 w-4' />
                Verifier
              </Button>
            </div>

            {lookupMutation.isPending ? (
              <div className='space-y-3'>
                <Skeleton className='h-5 w-full' />
                <Skeleton className='h-5 w-2/3' />
              </div>
            ) : lookupMutation.data ? (
              <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='font-medium'>Reference {lookupMutation.data.transactionId}</p>
                  <Badge variant='outline'>
                    {lookupMutation.data.status || 'Inconnu'}
                  </Badge>
                </div>
                <p className='mt-3 text-muted-foreground'>
                  {lookupMutation.data.message}
                </p>
                <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                  <p>Montant : {formatCurrency(lookupMutation.data.amount)}</p>
                  <p>Devise : {lookupMutation.data.currency}</p>
                  <p>Pays : {lookupMutation.data.country}</p>
                </div>
              </div>
            ) : (
              <div className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                Saisissez un ID de transaction pour consulter son dernier statut de paiement.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {!selectedSchool ? (
        <EmptyState
          title='Aucune ecole selectionnee'
          description='Choisissez d abord une ecole pour que la console de paiement puisse assembler son historique de transactions.'
        />
      ) : (
        <Tabs defaultValue='school-fees' className='space-y-4'>
          <div className='overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='school-fees'>Frais scolaires</TabsTrigger>
              <TabsTrigger value='merchandise'>Articles</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='school-fees' className='space-y-4'>
            {(schoolFeesQuery.data?.failedParents ?? 0) > 0 ? (
              <Card className='border-amber-500/30 bg-amber-500/5'>
                <CardContent className='flex items-start gap-3 pt-6 text-sm'>
                  <AlertCircle className='mt-0.5 h-4 w-4 text-amber-600' />
                  <p>
                    Certains historiques de paiement parent n ont pas pu etre charges. Le tableau ci-dessous affiche les transactions agregees avec succes.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Historique des frais scolaires</CardTitle>
                  <CardDescription>
                    Historique des paiements d echeances pour {selectedSchool.name} filtre par{' '}
                    {selectedStatusLabel}.
                  </CardDescription>
                </div>
                <Badge variant='outline'>
                  {filteredSchoolFees.length} transactions
                </Badge>
              </CardHeader>
              <CardContent>
                {schoolFeesQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : filteredSchoolFees.length === 0 ? (
                  <EmptyState
                    title={
                      schoolFees.length === 0
                        ? 'Aucun paiement de frais scolaires trouve'
                        : 'Aucun paiement de frais scolaires ne correspond a ce statut'
                    }
                    description={
                      schoolFees.length === 0
                        ? 'Aucun historique de paiement des frais scolaires n a ete renvoye pour l ecole selectionnee.'
                        : `Aucun historique de paiement des frais scolaires avec le statut ${selectedStatusLabel} n a ete renvoye pour l ecole selectionnee.`
                    }
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Enfant</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Methode</TableHead>
                          <TableHead>Paye le</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSchoolFees.map((payment) => {
                          const statusMeta = getEntityStatusMeta(payment.statusId)

                          return (
                            <TableRow key={`school-fee-${payment.id}`}>
                              <TableCell>
                                <div className='font-medium'>
                                  {payment.transactionReference || `TRX-${payment.id}`}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.gradeName}
                                </div>
                              </TableCell>
                              <TableCell>{payment.parentName}</TableCell>
                              <TableCell>{payment.childName}</TableCell>
                              <TableCell>
                                <div className='font-medium'>
                                  {formatCurrency(payment.amountPaid)}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  Echeance {formatCurrency(payment.installmentAmount)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>{payment.paymentMethod}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.collectionMethod || payment.agentName || 'Direct'}
                                </div>
                              </TableCell>
                              <TableCell>{formatDateTime(payment.paidDate)}</TableCell>
                              <TableCell>
                                <Badge variant='outline' className={statusMeta.className}>
                                  {statusMeta.label}
                                </Badge>
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
          </TabsContent>

          <TabsContent value='merchandise' className='space-y-4'>
            {(merchandiseQuery.data?.failedParents ?? 0) > 0 ? (
              <Card className='border-amber-500/30 bg-amber-500/5'>
                <CardContent className='flex items-start gap-3 pt-6 text-sm'>
                  <AlertCircle className='mt-0.5 h-4 w-4 text-amber-600' />
                  <p>
                    Certains historiques d articles n ont pas pu etre charges. Le tableau ci-dessous inclut les reponses agregees avec succes.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Historique des articles</CardTitle>
                  <CardDescription>
                    Historique des paiements d articles lie a {selectedSchool.name} filtre par{' '}
                    {selectedStatusLabel}.
                  </CardDescription>
                </div>
                <Badge variant='outline'>
                  {filteredMerchandisePayments.length} transactions
                </Badge>
              </CardHeader>
              <CardContent>
                {merchandiseQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : filteredMerchandisePayments.length === 0 ? (
                  <EmptyState
                    title={
                      merchandisePayments.length === 0
                        ? 'Aucun paiement d article trouve'
                        : 'Aucun paiement d article ne correspond a ce statut'
                    }
                    description={
                      merchandisePayments.length === 0
                        ? 'Aucun historique de paiement d article n a ete renvoye pour l ecole selectionnee.'
                        : `Aucun historique de paiement d article avec le statut ${selectedStatusLabel} n a ete renvoye pour l ecole selectionnee.`
                    }
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Articles</TableHead>
                          <TableHead>Methode</TableHead>
                          <TableHead>Paye le</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMerchandisePayments.map((payment) => {
                          const statusMeta = getEntityStatusMeta(payment.statusId)

                          return (
                            <TableRow key={`merchandise-${payment.id}`}>
                              <TableCell>
                                <div className='font-medium'>
                                  {payment.transactionReference || `TRX-${payment.id}`}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.totalItems} articles distincts
                                </div>
                              </TableCell>
                              <TableCell>{payment.parentName}</TableCell>
                              <TableCell>{formatCurrency(payment.amountPaid)}</TableCell>
                              <TableCell>
                                <div className='font-medium'>
                                  {payment.totalQuantity} unites
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.items
                                    .slice(0, 2)
                                    .map((item) => item.name)
                                    .join(', ') || 'Aucun detail d article'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>{payment.paymentMethod}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.collectionMethod || payment.agentName || 'Direct'}
                                </div>
                              </TableCell>
                              <TableCell>{formatDateTime(payment.paidDate)}</TableCell>
                              <TableCell>
                                <Badge variant='outline' className={statusMeta.className}>
                                  {statusMeta.label}
                                </Badge>
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
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  )
}
