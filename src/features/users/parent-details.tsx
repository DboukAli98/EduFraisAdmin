import { type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  HandCoins,
  UserRound,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import {
  fetchParentChildren,
  fetchParentDetails,
  fetchParentInstallments,
  fetchParentSchools,
} from '@/features/users/api'

interface ParentDetailsProps {
  parentId: number
}

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

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0'>
      <span className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
        {label}
      </span>
      <div className='text-sm'>{value}</div>
    </div>
  )
}

export function ParentDetails({ parentId }: ParentDetailsProps) {
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const hasValidParentId = Number.isFinite(parentId) && parentId > 0

  const parentQuery = useQuery({
    queryKey: ['users', 'parent-details', parentId],
    queryFn: () => fetchParentDetails(parentId),
    enabled: hasValidParentId,
  })

  const schoolsQuery = useQuery({
    queryKey: ['users', 'parent-details', parentId, 'schools'],
    queryFn: () => fetchParentSchools(parentId),
    enabled: hasValidParentId,
  })

  const childrenQuery = useQuery({
    queryKey: ['users', 'parent-details', parentId, 'children'],
    queryFn: () => fetchParentChildren(parentId),
    enabled: hasValidParentId,
  })

  const installmentsQuery = useQuery({
    queryKey: ['users', 'parent-details', parentId, 'installments'],
    queryFn: () => fetchParentInstallments(parentId),
    enabled: hasValidParentId,
  })

  if (!hasValidParentId) {
    return (
      <PageShell
        title='Parent details'
        description='Review linked schools, children, and payment dependencies.'
        actions={
          <Button variant='outline' asChild>
            <Link to='/users'>
              <ArrowLeft className='h-4 w-4' />
              Back to users
            </Link>
          </Button>
        }
      >
        <EmptyState
          title='Invalid parent'
          description='The page was opened without a valid parent id.'
        />
      </PageShell>
    )
  }

  const parent = parentQuery.data
  const schools = schoolsQuery.data ?? []
  const children = childrenQuery.data ?? []
  const installments = installmentsQuery.data ?? []
  const unpaidInstallments = installments.filter(
    (installment) => !installment.isPaid
  )
  const outstandingAmount = unpaidInstallments.reduce((total, installment) => {
    return total + installment.amount + (installment.lateFee ?? 0)
  }, 0)
  const hasAccess =
    !isDirector ||
    (parent?.schoolIds ?? []).some((schoolId) =>
      (currentUser?.schoolIds ?? []).includes(schoolId)
    )

  return (
    <PageShell
      title={
        parent
          ? buildFullName(parent.firstName, parent.lastName)
          : 'Parent details'
      }
      description='Inspect the parent profile, linked schools, children, and installment history.'
      actions={
        <Button variant='outline' asChild>
          <Link to='/users'>
            <ArrowLeft className='h-4 w-4' />
            Back to users
          </Link>
        </Button>
      }
    >
      {parentQuery.isLoading ? (
        <div className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-4'>
            <Skeleton className='h-28 w-full' />
            <Skeleton className='h-28 w-full' />
            <Skeleton className='h-28 w-full' />
            <Skeleton className='h-28 w-full' />
          </div>
          <Skeleton className='h-64 w-full' />
          <Skeleton className='h-64 w-full' />
        </div>
      ) : parentQuery.isError || !parent ? (
        <EmptyState
          title='Unable to load parent'
          description='The backend did not return a usable parent record for this page.'
        />
      ) : !hasAccess ? (
        <EmptyState
          title='Access limited'
          description='This parent is linked to a school outside the current director scope.'
        />
      ) : (
        <>
          <section className='grid gap-4 md:grid-cols-4'>
            <SummaryCard
              title='Status'
              value={getEntityStatusMeta(parent.statusId).label}
              description='Current account lifecycle for the parent.'
            />
            <SummaryCard
              title='Schools'
              value={String(schools.length)}
              description='Schools currently linked to this parent.'
            />
            <SummaryCard
              title='Children'
              value={String(children.length)}
              description='Children currently attached to this parent.'
            />
            <SummaryCard
              title='Outstanding'
              value={formatCurrency(outstandingAmount)}
              description={`${unpaidInstallments.length} unpaid installment${unpaidInstallments.length === 1 ? '' : 's'} in the history.`}
            />
          </section>

          <section className='grid gap-4 xl:grid-cols-[0.95fr_1.05fr]'>
            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <UserRound className='h-5 w-5 text-primary' />
                    Parent profile
                  </CardTitle>
                  <CardDescription>
                    Contact and identity details returned from the EduFrais
                    parent record.
                  </CardDescription>
                </div>
                <Badge
                  variant='outline'
                  className={getEntityStatusMeta(parent.statusId).className}
                >
                  {getEntityStatusMeta(parent.statusId).label}
                </Badge>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <DetailRow
                  label='Full name'
                  value={buildFullName(parent.firstName, parent.lastName)}
                />
                <DetailRow
                  label='Father name'
                  value={parent.fatherName || 'No father name'}
                />
                <DetailRow
                  label='Civil id'
                  value={parent.civilId || 'No civil id'}
                />
                <DetailRow label='Email' value={parent.email || 'No email'} />
                <DetailRow
                  label='Phone number'
                  value={`+${parent.countryCode} ${parent.phoneNumber || 'No phone number'}`}
                />
                <DetailRow
                  label='Created on'
                  value={formatDateTime(parent.createdOn)}
                />
                <DetailRow
                  label='Linked schools'
                  value={
                    parent.schoolNames.length > 0
                      ? parent.schoolNames.join(', ')
                      : 'No schools'
                  }
                />
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Building2 className='h-5 w-5 text-primary' />
                    School dependencies
                  </CardTitle>
                  <CardDescription>
                    Every school currently associated with this parent.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{schools.length} schools</Badge>
              </CardHeader>
              <CardContent>
                {schoolsQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : schools.length === 0 ? (
                  <EmptyState
                    title='No schools found'
                    description='The parent school dependency endpoint returned an empty list.'
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>School</TableHead>
                          <TableHead className='text-right'>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schools.map((school) => (
                          <TableRow key={school.schoolId}>
                            <TableCell className='font-medium'>
                              {school.schoolName}
                            </TableCell>
                            <TableCell className='text-right'>
                              <Button variant='outline' size='sm' asChild>
                                <Link
                                  to='/school-details/$schoolId'
                                  params={{ schoolId: String(school.schoolId) }}
                                >
                                  View school
                                </Link>
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
          </section>

          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <GraduationCap className='h-5 w-5 text-primary' />
                  Children
                </CardTitle>
                <CardDescription>
                  Children linked to this parent, including their school and
                  current class label.
                </CardDescription>
              </div>
              <Badge variant='outline'>{children.length} children</Badge>
            </CardHeader>
            <CardContent>
              {childrenQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : children.length === 0 ? (
                <EmptyState
                  title='No children found'
                  description='The parent child dependency endpoint returned an empty list.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className='text-right'>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {children.map((child) => {
                        const statusMeta = getEntityStatusMeta(child.statusId)

                        return (
                          <TableRow key={child.id}>
                            <TableCell>
                              <div className='font-medium'>
                                {buildFullName(child.firstName, child.lastName)}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                {formatDateOnly(child.dateOfBirth)}
                              </div>
                            </TableCell>
                            <TableCell>{child.schoolName}</TableCell>
                            <TableCell>
                              {child.schoolGradeName || 'No class assigned'}
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
                              <Button variant='outline' size='sm' asChild>
                                <Link
                                  to='/child-details/$childId'
                                  params={{ childId: String(child.id) }}
                                >
                                  View child
                                </Link>
                              </Button>
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

          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <HandCoins className='h-5 w-5 text-primary' />
                  Installments
                </CardTitle>
                <CardDescription>
                  School fee history returned for this parent and their
                  children.
                </CardDescription>
              </div>
              <Badge variant='outline'>
                {installments.length} installments
              </Badge>
            </CardHeader>
            <CardContent>
              {installmentsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : installments.length === 0 ? (
                <EmptyState
                  title='No installments found'
                  description='The payment history endpoint returned no installments for this parent.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Child</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments.map((installment) => {
                        const statusMeta = getEntityStatusMeta(
                          installment.statusId
                        )

                        return (
                          <TableRow key={installment.installmentId}>
                            <TableCell className='font-medium'>
                              {installment.childName}
                            </TableCell>
                            <TableCell>{installment.schoolName}</TableCell>
                            <TableCell>{installment.className}</TableCell>
                            <TableCell>
                              <div>{formatCurrency(installment.amount)}</div>
                              {installment.lateFee ? (
                                <div className='text-xs text-muted-foreground'>
                                  Late fee {formatCurrency(installment.lateFee)}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div>{formatDateOnly(installment.dueDate)}</div>
                              <div className='text-xs text-muted-foreground'>
                                Paid {formatDateOnly(installment.paidDate)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant='outline'
                                className={statusMeta.className}
                              >
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
        </>
      )}
    </PageShell>
  )
}
