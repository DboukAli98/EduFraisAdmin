import { type ReactNode, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  Save,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchSchoolDetails, fetchSchoolSections } from '@/features/schools/api'
import {
  createChildGrade,
  fetchChildDetails,
  fetchChildGrade,
  fetchParentDetails,
  updateChildGradeRecord,
} from '@/features/users/api'

interface ChildDetailsProps {
  childId: number
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

export function ChildDetails({ childId }: ChildDetailsProps) {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const hasValidChildId = Number.isFinite(childId) && childId > 0
  const [selectedSectionId, setSelectedSectionId] = useState('')

  const childQuery = useQuery({
    queryKey: ['users', 'child-details', childId],
    queryFn: () => fetchChildDetails(childId),
    enabled: hasValidChildId,
  })

  const parentQuery = useQuery({
    queryKey: ['users', 'child-details', childId, 'parent'],
    queryFn: () => fetchParentDetails(childQuery.data?.parentId ?? 0),
    enabled: Boolean(childQuery.data?.parentId),
  })

  const schoolQuery = useQuery({
    queryKey: ['schools', 'child-details', childId, 'school'],
    queryFn: () => fetchSchoolDetails(childQuery.data?.schoolId ?? 0),
    enabled: Boolean(childQuery.data?.schoolId),
  })

  const gradeQuery = useQuery({
    queryKey: ['users', 'child-details', childId, 'grade'],
    queryFn: () => fetchChildGrade(childId),
    enabled: hasValidChildId,
  })

  const sectionsQuery = useQuery({
    queryKey: [
      'schools',
      'child-details',
      childId,
      'sections',
      childQuery.data?.schoolId,
    ],
    queryFn: () => fetchSchoolSections(childQuery.data?.schoolId ?? 0),
    enabled: Boolean(childQuery.data?.schoolId),
  })

  useEffect(() => {
    setSelectedSectionId(
      gradeQuery.data?.schoolGradeSectionId
        ? String(gradeQuery.data.schoolGradeSectionId)
        : ''
    )
  }, [gradeQuery.data?.schoolGradeSectionId])

  const child = childQuery.data
  const school = schoolQuery.data
  const parent = parentQuery.data
  const grade = gradeQuery.data
  const sections = sectionsQuery.data?.items ?? []
  const hasAccess =
    !isDirector ||
    (child?.schoolId != null &&
      (currentUser?.schoolIds ?? []).includes(child.schoolId))

  const assignmentMutation = useMutation({
    mutationFn: async () => {
      const schoolGradeSectionId = Number(selectedSectionId)

      if (
        !child ||
        !Number.isFinite(schoolGradeSectionId) ||
        schoolGradeSectionId <= 0
      ) {
        throw new Error('Select a valid class before saving.')
      }

      if (grade?.id) {
        await updateChildGradeRecord(grade.id, child.id, schoolGradeSectionId)
        return
      }

      await createChildGrade(child.id, schoolGradeSectionId)
    },
    onSuccess: () => {
      toast.success(
        grade ? 'Class assignment updated.' : 'Class assigned successfully.'
      )
      void queryClient.invalidateQueries({
        queryKey: ['users', 'child-details', childId, 'grade'],
      })
    },
  })

  if (!hasValidChildId) {
    return (
      <PageShell
        title='Child details'
        description='Inspect school dependencies and manage class assignments.'
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
          title='Invalid child'
          description='The page was opened without a valid child id.'
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      title={
        child ? buildFullName(child.firstName, child.lastName) : 'Child details'
      }
      description='Inspect child dependencies and manage the class assignment for this student.'
      actions={
        <Button variant='outline' asChild>
          <Link to='/users'>
            <ArrowLeft className='h-4 w-4' />
            Back to users
          </Link>
        </Button>
      }
    >
      {childQuery.isLoading ? (
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
      ) : childQuery.isError || !child ? (
        <EmptyState
          title='Unable to load child'
          description='The backend did not return a usable child record for this page.'
        />
      ) : !hasAccess ? (
        <EmptyState
          title='Access limited'
          description='This child belongs to a school outside the current director scope.'
        />
      ) : (
        <>
          <section className='grid gap-4 md:grid-cols-4'>
            <SummaryCard
              title='Status'
              value={getEntityStatusMeta(child.statusId).label}
              description='Current child review and lifecycle state.'
            />
            <SummaryCard
              title='Current class'
              value={grade?.schoolGradeName || 'Unassigned'}
              description='The active school grade section for this child.'
            />
            <SummaryCard
              title='Class fee'
              value={
                grade?.schoolGradeFee
                  ? formatCurrency(grade.schoolGradeFee)
                  : 'N/A'
              }
              description='Fee configured on the currently assigned class.'
            />
            <SummaryCard
              title='Available classes'
              value={String(sections.length)}
              description='Class sections currently available in the child school.'
            />
          </section>

          <section className='grid gap-4 xl:grid-cols-[0.95fr_1.05fr]'>
            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <UserRound className='h-5 w-5 text-primary' />
                    Child profile
                  </CardTitle>
                  <CardDescription>
                    Child identity and review information returned from the API.
                  </CardDescription>
                </div>
                <Badge
                  variant='outline'
                  className={getEntityStatusMeta(child.statusId).className}
                >
                  {getEntityStatusMeta(child.statusId).label}
                </Badge>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <DetailRow
                  label='Full name'
                  value={buildFullName(child.firstName, child.lastName)}
                />
                <DetailRow
                  label='Father name'
                  value={child.fatherName || 'No father name'}
                />
                <DetailRow
                  label='Date of birth'
                  value={formatDateOnly(child.dateOfBirth)}
                />
                <DetailRow
                  label='Created on'
                  value={formatDateTime(child.createdOn)}
                />
                <DetailRow
                  label='Review notes'
                  value={child.rejectionReason || 'No rejection reason'}
                />
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>Dependencies</CardTitle>
                <CardDescription>
                  Parent and school records currently connected to this child.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <div className='rounded-lg border bg-muted/20 p-4'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <UserRound className='h-4 w-4 text-primary' />
                    Parent
                  </div>
                  {parentQuery.isLoading ? (
                    <Skeleton className='mt-3 h-16 w-full' />
                  ) : parent ? (
                    <div className='mt-3 space-y-2'>
                      <div className='font-medium'>
                        {buildFullName(parent.firstName, parent.lastName)}
                      </div>
                      <div className='text-sm text-muted-foreground'>
                        {parent.email || 'No email'} | +{parent.countryCode}{' '}
                        {parent.phoneNumber}
                      </div>
                      <Button variant='outline' size='sm' asChild>
                        <Link
                          to='/parent-details/$parentId'
                          params={{ parentId: String(parent.id) }}
                        >
                          View parent
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className='mt-3 text-sm text-muted-foreground'>
                      No parent details were returned for this child.
                    </p>
                  )}
                </div>

                <div className='rounded-lg border bg-muted/20 p-4'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <Building2 className='h-4 w-4 text-primary' />
                    School
                  </div>
                  {schoolQuery.isLoading ? (
                    <Skeleton className='mt-3 h-16 w-full' />
                  ) : school ? (
                    <div className='mt-3 space-y-2'>
                      <div className='font-medium'>{school.name}</div>
                      <div className='text-sm text-muted-foreground'>
                        {school.address || 'No address'}
                      </div>
                      <Button variant='outline' size='sm' asChild>
                        <Link
                          to='/school-details/$schoolId'
                          params={{ schoolId: String(school.id) }}
                        >
                          View school
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className='mt-3 text-sm text-muted-foreground'>
                      No school details were returned for this child.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className='grid gap-4 xl:grid-cols-[0.85fr_1.15fr]'>
            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <GraduationCap className='h-5 w-5 text-primary' />
                  Current assignment
                </CardTitle>
                <CardDescription>
                  Review the current class, fee, and term dates for this child.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <DetailRow
                  label='Current class'
                  value={grade?.schoolGradeName || 'No class assigned'}
                />
                <DetailRow
                  label='Description'
                  value={
                    grade?.schoolGradeDescription || 'No class description'
                  }
                />
                <DetailRow
                  label='Fee'
                  value={
                    grade?.schoolGradeFee
                      ? formatCurrency(grade.schoolGradeFee)
                      : 'N/A'
                  }
                />
                <DetailRow
                  label='Term'
                  value={
                    grade?.termStartDate || grade?.termEndDate
                      ? `${formatDateOnly(grade?.termStartDate)} to ${formatDateOnly(grade?.termEndDate)}`
                      : 'No term dates'
                  }
                />
                <DetailRow
                  label='Assignment status'
                  value={
                    grade ? (
                      <Badge
                        variant='outline'
                        className={
                          getEntityStatusMeta(grade.statusId).className
                        }
                      >
                        {getEntityStatusMeta(grade.statusId).label}
                      </Badge>
                    ) : (
                      'No assignment yet'
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>Assign class</CardTitle>
                <CardDescription>
                  Choose one of the configured school classes and save it to the
                  child record.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {sectionsQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-10 w-full' />
                    <Skeleton className='h-28 w-full' />
                  </div>
                ) : sections.length === 0 ? (
                  <EmptyState
                    title='No classes available'
                    description='Add classes on the school details page before assigning one to this child.'
                  />
                ) : (
                  <>
                    <div className='grid gap-2'>
                      <Select
                        value={selectedSectionId || undefined}
                        onValueChange={setSelectedSectionId}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select a class' />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem
                              key={section.id}
                              value={String(section.id)}
                              disabled={section.statusId !== 1}
                            >
                              {section.name} - {formatCurrency(section.fee)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <Button
                        disabled={
                          assignmentMutation.isPending ||
                          selectedSectionId.length === 0
                        }
                        onClick={() => assignmentMutation.mutate()}
                      >
                        <Save className='h-4 w-4' />
                        {grade ? 'Update assignment' : 'Assign class'}
                      </Button>
                      {school ? (
                        <Button variant='outline' asChild>
                          <Link
                            to='/school-details/$schoolId'
                            params={{ schoolId: String(school.id) }}
                          >
                            Manage school classes
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    <div className='rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Class</TableHead>
                            <TableHead>Fee</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sections.map((section) => {
                            const statusMeta = getEntityStatusMeta(
                              section.statusId
                            )

                            return (
                              <TableRow key={section.id}>
                                <TableCell>
                                  <div className='font-medium'>
                                    {section.name}
                                  </div>
                                  <div className='text-xs text-muted-foreground'>
                                    {section.description || 'No description'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(section.fee)}
                                </TableCell>
                                <TableCell>
                                  {section.termStartDate || section.termEndDate
                                    ? `${formatDateOnly(section.termStartDate)} to ${formatDateOnly(section.termEndDate)}`
                                    : 'No term dates'}
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
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </PageShell>
  )
}
