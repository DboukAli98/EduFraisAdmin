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

  const totalSchoolFees = schoolFees.reduce(
    (sum, payment) => sum + payment.amountPaid,
    0
  )
  const totalMerchandise = merchandisePayments.reduce(
    (sum, payment) => sum + payment.amountPaid,
    0
  )
  const totalTransactions = schoolFees.length + merchandisePayments.length
  const agentProcessedTransactions =
    schoolFees.filter((payment) => payment.processedByAgent).length +
    merchandisePayments.filter((payment) => payment.processedByAgent).length

  return (
    <PageShell
      title='Payments'
      description='Monitor processed school fees, merchandise payments, and individual transaction status from one place.'
      actions={<Badge variant='outline'>Processed history + status lookup</Badge>}
    >
      <section className='grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[1.2fr_0.8fr]'>
        <div>
          <p className='text-sm font-medium'>School scope</p>
          <p className='text-sm text-muted-foreground'>
            Payment history is aggregated school-wide by collecting each parent&apos;s
            transaction history behind the scenes.
          </p>
        </div>
        <Select
          value={selectedSchoolId ? String(selectedSchoolId) : undefined}
          onValueChange={(value) => setSelectedSchoolId(Number(value))}
          disabled={isDirector || accessibleSchools.length === 0}
        >
          <SelectTrigger className='w-full'>
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
      </section>

      <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <SummaryCard
          title='School fee revenue'
          value={formatCurrency(totalSchoolFees)}
          description='Processed installment payments in the selected school.'
        />
        <SummaryCard
          title='Merchandise revenue'
          value={formatCurrency(totalMerchandise)}
          description='Processed merchandise payments tied to parent accounts.'
        />
        <SummaryCard
          title='Transactions'
          value={formatNumber(totalTransactions)}
          description='Combined school fee and merchandise history rows.'
        />
        <SummaryCard
          title='Agent processed'
          value={formatNumber(agentProcessedTransactions)}
          description='Transactions handled by collecting agents.'
        />
      </section>

      <section className='grid gap-4 xl:grid-cols-[1.35fr_0.65fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>School-wide payment coverage</CardTitle>
            <CardDescription>
              This page aggregates per-parent payment histories because the backend
              does not yet expose a single school-level history endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Parents in scope</p>
              <p className='mt-2 text-2xl font-semibold'>
                {schoolFeesQuery.data?.totalParents ??
                  merchandiseQuery.data?.totalParents ??
                  0}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Parents scanned</p>
              <p className='mt-2 text-2xl font-semibold'>
                {schoolFeesQuery.data?.scannedParents ??
                  merchandiseQuery.data?.scannedParents ??
                  0}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>School fee fetch errors</p>
              <p className='mt-2 text-2xl font-semibold'>
                {schoolFeesQuery.data?.failedParents ?? 0}
              </p>
            </div>
            <div className='rounded-xl border bg-muted/20 p-4'>
              <p className='text-sm text-muted-foreground'>Merch fetch errors</p>
              <p className='mt-2 text-2xl font-semibold'>
                {merchandiseQuery.data?.failedParents ?? 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Transaction status lookup</CardTitle>
            <CardDescription>
              Check a payment reference directly against <code>/api/Payments/CheckPaymentStatus</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex gap-2'>
              <Input
                placeholder='Transaction ID'
                value={lookupReference}
                onChange={(event) => setLookupReference(event.target.value)}
              />
              <Button
                onClick={() => lookupMutation.mutate(lookupReference.trim())}
                disabled={lookupMutation.isPending || lookupReference.trim().length === 0}
              >
                <Search className='h-4 w-4' />
                Check
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
                    {lookupMutation.data.status || 'Unknown'}
                  </Badge>
                </div>
                <p className='mt-3 text-muted-foreground'>
                  {lookupMutation.data.message}
                </p>
                <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                  <p>Amount: {formatCurrency(lookupMutation.data.amount)}</p>
                  <p>Currency: {lookupMutation.data.currency}</p>
                  <p>Country: {lookupMutation.data.country}</p>
                </div>
              </div>
            ) : (
              <div className='rounded-xl border border-dashed p-4 text-sm text-muted-foreground'>
                Enter a transaction ID to inspect its latest payment status.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {!selectedSchool ? (
        <EmptyState
          title='No school selected yet'
          description='Choose a school first so the payment console can assemble its transaction history.'
        />
      ) : (
        <Tabs defaultValue='school-fees' className='space-y-4'>
          <div className='overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='school-fees'>School fees</TabsTrigger>
              <TabsTrigger value='merchandise'>Merchandise</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value='school-fees' className='space-y-4'>
            {(schoolFeesQuery.data?.failedParents ?? 0) > 0 ? (
              <Card className='border-amber-500/30 bg-amber-500/5'>
                <CardContent className='flex items-start gap-3 pt-6 text-sm'>
                  <AlertCircle className='mt-0.5 h-4 w-4 text-amber-600' />
                  <p>
                    Some parent payment histories could not be fetched. The table below
                    shows the transactions we successfully aggregated.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>School fee history</CardTitle>
                  <CardDescription>
                    Processed installment payments for {selectedSchool.name}.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{schoolFees.length} transactions</Badge>
              </CardHeader>
              <CardContent>
                {schoolFeesQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : schoolFees.length === 0 ? (
                  <EmptyState
                    title='No school fee payments found'
                    description='No processed installment payments were returned for the selected school.'
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Child</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schoolFees.map((payment) => {
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
                                  Installment {formatCurrency(payment.installmentAmount)}
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
                    Some merchandise histories could not be fetched. The table below
                    includes the successful responses we were able to aggregate.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Merchandise history</CardTitle>
                  <CardDescription>
                    Processed merchandise transactions linked to {selectedSchool.name}.
                  </CardDescription>
                </div>
                <Badge variant='outline'>
                  {merchandisePayments.length} transactions
                </Badge>
              </CardHeader>
              <CardContent>
                {merchandiseQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : merchandisePayments.length === 0 ? (
                  <EmptyState
                    title='No merchandise payments found'
                    description='No processed merchandise payments were returned for the selected school.'
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {merchandisePayments.map((payment) => {
                          const statusMeta = getEntityStatusMeta(payment.statusId)

                          return (
                            <TableRow key={`merchandise-${payment.id}`}>
                              <TableCell>
                                <div className='font-medium'>
                                  {payment.transactionReference || `TRX-${payment.id}`}
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.totalItems} distinct items
                                </div>
                              </TableCell>
                              <TableCell>{payment.parentName}</TableCell>
                              <TableCell>{formatCurrency(payment.amountPaid)}</TableCell>
                              <TableCell>
                                <div className='font-medium'>
                                  {payment.totalQuantity} units
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {payment.items
                                    .slice(0, 2)
                                    .map((item) => item.name)
                                    .join(', ') || 'No item detail'}
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
