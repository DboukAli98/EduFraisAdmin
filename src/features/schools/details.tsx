import { type ReactNode, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Pencil,
  Plus,
  Power,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { toApiUrl } from '@/lib/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchCollectingAgents } from '@/features/dashboard/api'
import {
  alterSchoolSectionStatus,
  createSchoolSection,
  fetchSchoolDetails,
  fetchSchoolSections,
  updateSchoolSection,
  type SchoolSection,
  type SchoolSectionMutationInput,
} from '@/features/schools/api'
import {
  fetchChildren,
  fetchDirectorBySchoolId,
  fetchParents,
} from '@/features/users/api'

interface SchoolDetailsProps {
  schoolId: number
}

interface SectionFormState {
  name: string
  description: string
  fee: string
  termStartDate: string
  termEndDate: string
}

type SectionAction = {
  type: 'enable' | 'disable' | 'delete'
  section: SchoolSection
} | null

function createEmptySectionForm(): SectionFormState {
  return {
    name: '',
    description: '',
    fee: '',
    termStartDate: '',
    termEndDate: '',
  }
}

function mapSectionToForm(section: SchoolSection): SectionFormState {
  return {
    name: section.name,
    description: section.description ?? '',
    fee: section.fee > 0 ? String(section.fee) : '',
    termStartDate: section.termStartDate?.slice(0, 10) ?? '',
    termEndDate: section.termEndDate?.slice(0, 10) ?? '',
  }
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

export function SchoolDetails({ schoolId }: SchoolDetailsProps) {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false
  const hasValidSchoolId = Number.isFinite(schoolId) && schoolId > 0
  const hasSchoolAccess =
    hasValidSchoolId &&
    (!isDirector || (currentUser?.schoolIds ?? []).includes(schoolId))
  const canManageSections = hasSchoolAccess && (isDirector || isSuperAdmin)

  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<SchoolSection | null>(
    null
  )
  const [sectionForm, setSectionForm] = useState<SectionFormState>(
    createEmptySectionForm
  )
  const [pendingAction, setPendingAction] = useState<SectionAction>(null)

  const schoolQuery = useQuery({
    queryKey: ['schools', 'details', schoolId],
    queryFn: () => fetchSchoolDetails(schoolId),
    enabled: hasSchoolAccess,
  })

  const sectionsQuery = useQuery({
    queryKey: ['schools', 'details', schoolId, 'sections'],
    queryFn: () => fetchSchoolSections(schoolId),
    enabled: hasSchoolAccess,
  })

  const parentsQuery = useQuery({
    queryKey: ['users', 'parents', 'school', schoolId],
    queryFn: () => fetchParents({ schoolId }),
    enabled: hasSchoolAccess,
  })

  const childrenQuery = useQuery({
    queryKey: ['users', 'children', 'school', schoolId],
    queryFn: () => fetchChildren({ schoolId }),
    enabled: hasSchoolAccess,
  })

  const directorQuery = useQuery({
    queryKey: ['users', 'director-by-school', schoolId],
    queryFn: () =>
      fetchDirectorBySchoolId({
        id: schoolId,
        name: schoolQuery.data?.name ?? `School ${schoolId}`,
      }),
    enabled: hasSchoolAccess && Boolean(schoolQuery.data),
  })

  const collectingAgentsQuery = useQuery({
    queryKey: ['dashboard', 'collecting-agents', schoolId],
    queryFn: () => fetchCollectingAgents(schoolId),
    enabled: hasSchoolAccess,
  })

  const saveSectionMutation = useMutation({
    mutationFn: async () => {
      const payload: SchoolSectionMutationInput = {
        schoolId,
        name: sectionForm.name,
        description: sectionForm.description,
        fee: sectionForm.fee,
        termStartDate: sectionForm.termStartDate,
        termEndDate: sectionForm.termEndDate,
      }

      if (editingSection) {
        await updateSchoolSection(editingSection.id, payload)
        return
      }

      await createSchoolSection(payload)
    },
    onSuccess: () => {
      toast.success(
        editingSection
          ? 'Class updated successfully.'
          : 'Class created successfully.'
      )
      setIsSectionDialogOpen(false)
      setEditingSection(null)
      setSectionForm(createEmptySectionForm())
      void queryClient.invalidateQueries({
        queryKey: ['schools', 'details', schoolId, 'sections'],
      })
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return
      }

      await alterSchoolSectionStatus(
        [pendingAction.section.id],
        pendingAction.type === 'delete' ? 'deleted' : pendingAction.type
      )
    },
    onSuccess: () => {
      if (!pendingAction) {
        return
      }

      toast.success(
        pendingAction.type === 'delete'
          ? 'Class deleted successfully.'
          : `Class ${pendingAction.type}d successfully.`
      )
      setPendingAction(null)
      void queryClient.invalidateQueries({
        queryKey: ['schools', 'details', schoolId, 'sections'],
      })
    },
  })

  if (!hasValidSchoolId) {
    return (
      <PageShell
        title='School details'
        description='Review the school profile, dependencies, and class setup.'
        actions={
          <Button variant='outline' asChild>
            <Link to='/schools'>
              <ArrowLeft className='h-4 w-4' />
              Back to schools
            </Link>
          </Button>
        }
      >
        <EmptyState
          title='Invalid school'
          description='The page was opened without a valid school id.'
        />
      </PageShell>
    )
  }

  if (!hasSchoolAccess) {
    return (
      <PageShell
        title='School details'
        description='Review the school profile, dependencies, and class setup.'
        actions={
          <Button variant='outline' asChild>
            <Link to='/schools'>
              <ArrowLeft className='h-4 w-4' />
              Back to schools
            </Link>
          </Button>
        }
      >
        <EmptyState
          title='Access limited'
          description='This school is outside the current director scope.'
        />
      </PageShell>
    )
  }

  const school = schoolQuery.data
  const sections = sectionsQuery.data?.items ?? []
  const parents = parentsQuery.data ?? []
  const children = childrenQuery.data ?? []
  const collectingAgents = collectingAgentsQuery.data?.items ?? []
  const director = directorQuery.data ?? null

  return (
    <>
      <PageShell
        title={school?.name ?? 'School details'}
        description='Track the school profile, linked users, and class structure from one place.'
        actions={
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' asChild>
              <Link to='/schools'>
                <ArrowLeft className='h-4 w-4' />
                Back to schools
              </Link>
            </Button>
            {canManageSections ? (
              <Button
                onClick={() => {
                  setEditingSection(null)
                  setSectionForm(createEmptySectionForm())
                  setIsSectionDialogOpen(true)
                }}
              >
                <Plus className='h-4 w-4' />
                Add class
              </Button>
            ) : null}
          </div>
        }
      >
        {schoolQuery.isLoading ? (
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
        ) : schoolQuery.isError || !school ? (
          <EmptyState
            title='Unable to load school'
            description='The School details endpoint did not return a usable record for this page.'
          />
        ) : (
          <>
            <section className='grid gap-4 md:grid-cols-4'>
              <SummaryCard
                title='Status'
                value={getEntityStatusMeta(school.statusId).label}
                description='Current lifecycle status from the school record.'
              />
              <SummaryCard
                title='Parents'
                value={String(parents.length)}
                description='Parent accounts linked to this school.'
              />
              <SummaryCard
                title='Children'
                value={String(children.length)}
                description='Child records currently assigned to this school.'
              />
              <SummaryCard
                title='Classes'
                value={String(sections.length)}
                description='School grade sections available for assignment.'
              />
            </section>

            <section className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <Card className='border-border/70'>
                <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <CardTitle className='flex items-center gap-2'>
                      <Building2 className='h-5 w-5 text-primary' />
                      School profile
                    </CardTitle>
                    <CardDescription>
                      Primary school information returned from the EduFrais
                      backend.
                    </CardDescription>
                  </div>
                  <Badge
                    variant='outline'
                    className={getEntityStatusMeta(school.statusId).className}
                  >
                    {getEntityStatusMeta(school.statusId).label}
                  </Badge>
                </CardHeader>
                <CardContent className='grid gap-6 lg:grid-cols-[auto_1fr]'>
                  <div className='flex justify-center lg:justify-start'>
                    {school.logo ? (
                      <img
                        src={toApiUrl(`/uploads/schools/${school.logo}`)}
                        alt={school.name}
                        className='h-28 w-28 rounded-2xl border object-cover'
                      />
                    ) : (
                      <div className='flex h-28 w-28 items-center justify-center rounded-2xl border bg-primary/10 text-primary'>
                        <Building2 className='h-10 w-10' />
                      </div>
                    )}
                  </div>
                  <div className='grid gap-4'>
                    <DetailRow label='School name' value={school.name} />
                    <DetailRow
                      label='Address'
                      value={school.address || 'No address'}
                    />
                    <DetailRow
                      label='Email'
                      value={school.email || 'No email'}
                    />
                    <DetailRow
                      label='Phone number'
                      value={school.phoneNumber || 'No phone number'}
                    />
                    <DetailRow
                      label='Established'
                      value={
                        school.establishedYear
                          ? String(school.establishedYear)
                          : 'No established year'
                      }
                    />
                    <DetailRow
                      label='Website'
                      value={
                        school.website ? (
                          <a
                            href={school.website}
                            target='_blank'
                            rel='noreferrer'
                            className='inline-flex items-center gap-1 text-primary hover:underline'
                          >
                            Visit website
                            <ExternalLink className='h-3.5 w-3.5' />
                          </a>
                        ) : (
                          'No website'
                        )
                      }
                    />
                    <DetailRow
                      label='Description'
                      value={school.description || 'No description'}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className='space-y-4'>
                <Card className='border-border/70'>
                  <CardHeader>
                    <CardTitle>Dependencies</CardTitle>
                    <CardDescription>
                      People and operations directly linked to this school.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='grid gap-4'>
                    <DetailRow
                      label='Director'
                      value={
                        director ? (
                          <div className='space-y-1'>
                            <div className='font-medium'>
                              {buildFullName(
                                director.firstName,
                                director.lastName
                              )}
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              {director.email || 'No email'} | +
                              {director.countryCode} {director.phoneNumber}
                            </div>
                          </div>
                        ) : (
                          'No director returned for this school.'
                        )
                      }
                    />
                    <DetailRow
                      label='Collecting agents'
                      value={`${collectingAgents.length} agent${collectingAgents.length === 1 ? '' : 's'}`}
                    />
                    <DetailRow
                      label='Parents'
                      value={`${parents.length} linked account${parents.length === 1 ? '' : 's'}`}
                    />
                    <DetailRow
                      label='Children'
                      value={`${children.length} linked child${children.length === 1 ? '' : 'ren'}`}
                    />
                  </CardContent>
                </Card>

                <Card className='border-border/70'>
                  <CardHeader>
                    <CardTitle>Collecting agents</CardTitle>
                    <CardDescription>
                      Operational field agents visible for this school.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {collectingAgentsQuery.isLoading ? (
                      <div className='space-y-3'>
                        <Skeleton className='h-10 w-full' />
                        <Skeleton className='h-10 w-full' />
                      </div>
                    ) : collectingAgents.length === 0 ? (
                      <p className='text-sm text-muted-foreground'>
                        No collecting agents were returned for this school.
                      </p>
                    ) : (
                      <div className='space-y-3'>
                        {collectingAgents.map((agent) => (
                          <div
                            key={agent.id}
                            className='rounded-lg border bg-muted/20 p-3 text-sm'
                          >
                            <div className='font-medium'>
                              {buildFullName(agent.firstName, agent.lastName)}
                            </div>
                            <div className='text-muted-foreground'>
                              {agent.email}
                            </div>
                            <div className='mt-1 text-xs text-muted-foreground'>
                              {agent.assignedArea || 'No assigned area'} |
                              Status:{' '}
                              {getEntityStatusMeta(agent.statusId).label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle>Classes</CardTitle>
                  <CardDescription>
                    Create grade sections, review fees, and toggle availability
                    for assignments.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{sections.length} classes</Badge>
              </CardHeader>
              <CardContent>
                {sectionsQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : sections.length === 0 ? (
                  <EmptyState
                    title='No classes found'
                    description='Add the first class section for this school so children can be assigned to a grade.'
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className='text-right'>Actions</TableHead>
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
                              <TableCell>
                                {formatDateTime(
                                  section.modifiedOn ?? section.createdOn
                                )}
                              </TableCell>
                              <TableCell className='text-right'>
                                <div className='flex flex-wrap justify-end gap-2'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!canManageSections}
                                    onClick={() => {
                                      setEditingSection(section)
                                      setSectionForm(mapSectionToForm(section))
                                      setIsSectionDialogOpen(true)
                                    }}
                                  >
                                    <Pencil className='h-4 w-4' />
                                    Edit
                                  </Button>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={
                                      !canManageSections ||
                                      section.statusId === 5
                                    }
                                    onClick={() =>
                                      setPendingAction({
                                        type:
                                          section.statusId === 1
                                            ? 'disable'
                                            : 'enable',
                                        section,
                                      })
                                    }
                                  >
                                    <Power className='h-4 w-4' />
                                    {section.statusId === 1
                                      ? 'Disable'
                                      : 'Enable'}
                                  </Button>
                                  <Button
                                    variant='destructive'
                                    size='sm'
                                    disabled={
                                      !canManageSections ||
                                      section.statusId === 5
                                    }
                                    onClick={() =>
                                      setPendingAction({
                                        type: 'delete',
                                        section,
                                      })
                                    }
                                  >
                                    <Trash2 className='h-4 w-4' />
                                    Delete
                                  </Button>
                                </div>
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

            <section className='grid gap-4 xl:grid-cols-2'>
              <Card className='border-border/70'>
                <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <CardTitle className='flex items-center gap-2'>
                      <Users className='h-4 w-4 text-primary' />
                      Parents
                    </CardTitle>
                    <CardDescription>
                      Parent dependencies tied to this school.
                    </CardDescription>
                  </div>
                  <Badge variant='outline'>{parents.length} parents</Badge>
                </CardHeader>
                <CardContent>
                  {parentsQuery.isLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                    </div>
                  ) : parents.length === 0 ? (
                    <EmptyState
                      title='No parents found'
                      description='This school does not currently return any parent dependencies.'
                    />
                  ) : (
                    <div className='rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parent</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Children</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>
                              Details
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parents.map((parent) => {
                            const statusMeta = getEntityStatusMeta(
                              parent.statusId
                            )

                            return (
                              <TableRow key={parent.id}>
                                <TableCell>
                                  <div className='font-medium'>
                                    {buildFullName(
                                      parent.firstName,
                                      parent.lastName
                                    )}
                                  </div>
                                  <div className='text-xs text-muted-foreground'>
                                    {parent.fatherName || 'No father name'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>{parent.email || 'No email'}</div>
                                  <div className='text-xs text-muted-foreground'>
                                    +{parent.countryCode} {parent.phoneNumber}
                                  </div>
                                </TableCell>
                                <TableCell>{parent.childCount}</TableCell>
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
                                      to='/parent-details/$parentId'
                                      params={{ parentId: String(parent.id) }}
                                    >
                                      View details
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
                      <UserRound className='h-4 w-4 text-primary' />
                      Children
                    </CardTitle>
                    <CardDescription>
                      Child dependencies currently attached to this school.
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
                      description='This school does not currently return any child dependencies.'
                    />
                  ) : (
                    <div className='rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Child</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Date of birth</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>
                              Details
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {children.map((child) => {
                            const statusMeta = getEntityStatusMeta(
                              child.statusId
                            )

                            return (
                              <TableRow key={child.id}>
                                <TableCell>
                                  <div className='font-medium'>
                                    {buildFullName(
                                      child.firstName,
                                      child.lastName
                                    )}
                                  </div>
                                  <div className='text-xs text-muted-foreground'>
                                    {child.rejectionReason || 'No review notes'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {child.parentName || 'No parent linked'}
                                </TableCell>
                                <TableCell>
                                  {formatDateOnly(child.dateOfBirth)}
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
                                      View details
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
            </section>
          </>
        )}
      </PageShell>

      <Dialog
        open={isSectionDialogOpen}
        onOpenChange={(open) => {
          setIsSectionDialogOpen(open)
          if (!open) {
            setEditingSection(null)
            setSectionForm(createEmptySectionForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingSection ? 'Edit class' : 'Add class'}
            </DialogTitle>
            <DialogDescription>
              Configure the class name, fee, and term window for this school.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='class-name'>Class name</Label>
              <Input
                id='class-name'
                value={sectionForm.name}
                onChange={(event) =>
                  setSectionForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='class-description'>Description</Label>
              <Textarea
                id='class-description'
                rows={4}
                value={sectionForm.description}
                onChange={(event) =>
                  setSectionForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2'>
                <Label htmlFor='class-fee'>Fee</Label>
                <Input
                  id='class-fee'
                  inputMode='decimal'
                  value={sectionForm.fee}
                  onChange={(event) =>
                    setSectionForm((current) => ({
                      ...current,
                      fee: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='class-start'>Term start</Label>
                <Input
                  id='class-start'
                  type='date'
                  value={sectionForm.termStartDate}
                  onChange={(event) =>
                    setSectionForm((current) => ({
                      ...current,
                      termStartDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='class-end'>Term end</Label>
                <Input
                  id='class-end'
                  type='date'
                  value={sectionForm.termEndDate}
                  onChange={(event) =>
                    setSectionForm((current) => ({
                      ...current,
                      termEndDate: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsSectionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              disabled={
                saveSectionMutation.isPending ||
                sectionForm.name.trim().length === 0
              }
              onClick={() => saveSectionMutation.mutate()}
            >
              {editingSection ? 'Save changes' : 'Create class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === 'delete'
                ? 'Delete class?'
                : `${pendingAction?.type === 'enable' ? 'Enable' : 'Disable'} class?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'delete'
                ? 'This will mark the selected class as deleted in EduFrais.'
                : pendingAction?.type === 'enable'
                  ? 'This class will be available again for child assignments.'
                  : 'This class will stay visible but should no longer be used for active assignment.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => actionMutation.mutate()}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
