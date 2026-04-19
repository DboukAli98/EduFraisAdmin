import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  CheckCheck,
  Eye,
  Pencil,
  Plus,
  Power,
  Trash2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatDateOnly,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchSchools } from '@/features/schools/api'
import {
  alterChildStatus,
  alterParentStatus,
  approveChild,
  createChild,
  createDirector,
  createParent,
  fetchChildDetails,
  fetchChildren,
  fetchDirectors,
  fetchParents,
  rejectChild,
  updateChild,
  updateDirector,
  updateDirectorStatus,
  updateParent,
  type ChildRecord,
  type DirectorRecord,
  type ParentRecord,
} from './api'

interface ParentFormState {
  firstName: string
  lastName: string
  fatherName: string
  civilId: string
  countryCode: string
  phoneNumber: string
  email: string
}

interface DirectorFormState {
  firstName: string
  lastName: string
  fatherName: string
  civilId: string
  countryCode: string
  phoneNumber: string
  email: string
}

interface ChildFormState {
  firstName: string
  lastName: string
  fatherName: string
  dateOfBirth: string
  parentId: number
}

type UsersAction =
  | {
      entity: 'parent'
      type: 'enable' | 'disable' | 'delete'
      item: ParentRecord
    }
  | {
      entity: 'director'
      type: 'enable' | 'disable' | 'delete'
      item: DirectorRecord
    }
  | {
      entity: 'child'
      type: 'enable' | 'disable' | 'delete'
      item: ChildRecord
    }
  | null

function createEmptyParentForm(): ParentFormState {
  return {
    firstName: '',
    lastName: '',
    fatherName: '',
    civilId: '',
    countryCode: '242',
    phoneNumber: '',
    email: '',
  }
}

function mapParentToForm(parent: ParentRecord): ParentFormState {
  return {
    firstName: parent.firstName,
    lastName: parent.lastName,
    fatherName: parent.fatherName,
    civilId: parent.civilId,
    countryCode: parent.countryCode || '242',
    phoneNumber: parent.phoneNumber,
    email: parent.email,
  }
}

function createEmptyDirectorForm(): DirectorFormState {
  return {
    firstName: '',
    lastName: '',
    fatherName: '',
    civilId: '',
    countryCode: '242',
    phoneNumber: '',
    email: '',
  }
}

function mapDirectorToForm(director: DirectorRecord): DirectorFormState {
  return {
    firstName: director.firstName,
    lastName: director.lastName,
    fatherName: '',
    civilId: '',
    countryCode: director.countryCode || '242',
    phoneNumber: director.phoneNumber,
    email: director.email,
  }
}

function normalizeDateInput(value: string | null): string {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function createEmptyChildForm(): ChildFormState {
  return {
    firstName: '',
    lastName: '',
    fatherName: '',
    dateOfBirth: '',
    parentId: 0,
  }
}

function mapChildToForm(child: ChildRecord): ChildFormState {
  return {
    firstName: child.firstName,
    lastName: child.lastName,
    fatherName: child.fatherName,
    dateOfBirth: normalizeDateInput(child.dateOfBirth),
    parentId: child.parentId,
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

function buildActionDialogText(action: UsersAction): {
  title: string
  description: string
} {
  if (!action) {
    return {
      title: 'Confirm action',
      description: 'Choose an action to continue.',
    }
  }

  const name =
    action.entity === 'child'
      ? buildFullName(action.item.firstName, action.item.lastName)
      : buildFullName(action.item.firstName, action.item.lastName)

  if (action.type === 'delete') {
    return {
      title: `Delete ${action.entity}?`,
      description: `This will mark ${name || action.entity} as deleted in EduFrais.`,
    }
  }

  return {
    title: `${action.type === 'enable' ? 'Enable' : 'Disable'} ${action.entity}?`,
    description:
      action.type === 'enable'
        ? `This will restore ${name || action.entity} to enabled status.`
        : `This will pause ${name || action.entity} until it is enabled again.`,
  }
}

export function Users() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false
  const canManageParents = isDirector || isSuperAdmin
  const canManageChildren = isDirector || isSuperAdmin
  const canManageDirectors = isSuperAdmin

  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(
    currentUser?.schoolIds[0] ?? null
  )
  const [pendingAction, setPendingAction] = useState<UsersAction>(null)

  const [isParentDialogOpen, setIsParentDialogOpen] = useState(false)
  const [editingParent, setEditingParent] = useState<ParentRecord | null>(null)
  const [parentForm, setParentForm] = useState<ParentFormState>(
    createEmptyParentForm
  )

  const [isDirectorDialogOpen, setIsDirectorDialogOpen] = useState(false)
  const [editingDirector, setEditingDirector] = useState<DirectorRecord | null>(
    null
  )
  const [directorForm, setDirectorForm] = useState<DirectorFormState>(
    createEmptyDirectorForm
  )

  const [isChildDialogOpen, setIsChildDialogOpen] = useState(false)
  const [editingChild, setEditingChild] = useState<ChildRecord | null>(null)
  const [childForm, setChildForm] =
    useState<ChildFormState>(createEmptyChildForm)

  const [rejectingChild, setRejectingChild] = useState<ChildRecord | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

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

  const parentsQuery = useQuery({
    queryKey: ['users', 'parents', selectedSchoolId],
    queryFn: () => fetchParents({ schoolId: selectedSchoolId }),
    enabled: Boolean(selectedSchoolId),
  })

  const directorsQuery = useQuery({
    queryKey: [
      'users',
      'directors',
      accessibleSchools.map((school) => school.id).join(','),
    ],
    queryFn: () => fetchDirectors(accessibleSchools),
    enabled: accessibleSchools.length > 0,
  })

  const childrenQuery = useQuery({
    queryKey: ['users', 'children', selectedSchoolId],
    queryFn: () => fetchChildren({ schoolId: selectedSchoolId }),
    enabled: Boolean(selectedSchoolId),
  })

  const childDetailsQuery = useQuery({
    queryKey: ['users', 'child-details', editingChild?.id],
    queryFn: () => fetchChildDetails(editingChild?.id ?? 0),
    enabled: Boolean(editingChild?.id),
  })

  useEffect(() => {
    if (!editingChild?.id || !isChildDialogOpen || !childDetailsQuery.data) {
      return
    }

    setChildForm(mapChildToForm(childDetailsQuery.data))
  }, [childDetailsQuery.data, editingChild?.id, isChildDialogOpen])

  const directorsForSelectedSchool = (directorsQuery.data ?? []).filter(
    (director) =>
      selectedSchoolId ? director.schoolId === selectedSchoolId : true
  )

  const selectedSchoolHasDirector = directorsForSelectedSchool.length > 0

  const parentSaveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchoolId) {
        throw new Error('Select a school before saving a parent.')
      }

      if (editingParent) {
        await updateParent(
          editingParent.id,
          {
            ...parentForm,
            schoolId: selectedSchoolId,
          },
          editingParent.statusId
        )
        return
      }

      await createParent({
        ...parentForm,
        schoolId: selectedSchoolId,
      })
    },
    onSuccess: () => {
      toast.success(
        editingParent
          ? 'Parent updated successfully.'
          : 'Parent created successfully.'
      )
      setIsParentDialogOpen(false)
      setEditingParent(null)
      setParentForm(createEmptyParentForm())
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const directorSaveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchoolId) {
        throw new Error('Select a school before saving a director.')
      }

      if (editingDirector) {
        await updateDirector(editingDirector.id, {
          firstName: directorForm.firstName,
          lastName: directorForm.lastName,
          countryCode: directorForm.countryCode,
          phoneNumber: directorForm.phoneNumber,
          email: directorForm.email,
          statusId: editingDirector.statusId,
        })
        return
      }

      await createDirector({
        ...directorForm,
        schoolId: selectedSchoolId,
      })
    },
    onSuccess: () => {
      toast.success(
        editingDirector
          ? 'Director updated successfully.'
          : 'Director created successfully.'
      )
      setIsDirectorDialogOpen(false)
      setEditingDirector(null)
      setDirectorForm(createEmptyDirectorForm())
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const childSaveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSchoolId) {
        throw new Error('Select a school before saving a child.')
      }

      if (editingChild) {
        await updateChild(editingChild.id, {
          ...childForm,
          schoolId: selectedSchoolId,
        })
        return
      }

      await createChild({
        ...childForm,
        schoolId: selectedSchoolId,
      })
    },
    onSuccess: () => {
      toast.success(
        editingChild
          ? 'Child updated successfully.'
          : 'Child created successfully.'
      )
      setIsChildDialogOpen(false)
      setEditingChild(null)
      setChildForm(createEmptyChildForm())
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return
      }

      if (pendingAction.entity === 'parent') {
        await alterParentStatus(
          [pendingAction.item.id],
          pendingAction.type === 'delete' ? 'deleted' : pendingAction.type
        )
        return
      }

      if (pendingAction.entity === 'child') {
        await alterChildStatus(
          [pendingAction.item.id],
          pendingAction.type === 'delete' ? 'deleted' : pendingAction.type
        )
        return
      }

      await updateDirectorStatus(
        pendingAction.item,
        pendingAction.type === 'delete'
          ? 5
          : pendingAction.type === 'enable'
            ? 1
            : 2
      )
    },
    onSuccess: () => {
      if (!pendingAction) {
        return
      }

      toast.success(
        `${pendingAction.entity} ${
          pendingAction.type === 'delete'
            ? 'deleted'
            : pendingAction.type === 'enable'
              ? 'enabled'
              : 'disabled'
        } successfully.`
      )
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (childId: number) => approveChild(childId),
    onSuccess: () => {
      toast.success('Child approved successfully.')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectingChild) {
        return
      }

      await rejectChild(rejectingChild.id, rejectionReason)
    },
    onSuccess: () => {
      toast.success('Child rejected successfully.')
      setRejectingChild(null)
      setRejectionReason('')
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const activeParents = (parentsQuery.data ?? []).filter(
    (parent) => parent.statusId === 1
  )
  const activeDirectors = (directorsQuery.data ?? []).filter(
    (director) => director.statusId === 1
  )
  const pendingChildren = (childrenQuery.data ?? []).filter(
    (child) => child.statusId === 6
  )
  const selectedSchoolParents = parentsQuery.data ?? []
  const selectedSchoolChildren = childrenQuery.data ?? []
  const actionDialogText = buildActionDialogText(pendingAction)

  return (
    <>
      <PageShell
        title={isDirector ? 'Family Management' : 'User Management'}
        description={
          isDirector
            ? 'Manage parents and children in your school with director-scoped EduFrais workflows.'
            : 'Manage parents, directors, and children with live EduFrais API workflows.'
        }
        actions={
          <Badge variant='outline'>
            {isSuperAdmin ? 'Super Admin scope' : 'Director scope'}
          </Badge>
        }
      >
        <section className='grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[1.2fr_0.8fr]'>
          <div>
            <p className='text-sm font-medium'>School scope</p>
            <p className='text-sm text-muted-foreground'>
              Parents, directors, and children are managed within the selected
              school. Directors stay locked to their assigned school.
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

        <section className='grid gap-4 md:grid-cols-3'>
          <SummaryCard
            title='Enabled parents'
            value={String(activeParents.length)}
            description='Enabled parent accounts in the selected school.'
          />
          <SummaryCard
            title={isDirector ? 'Children in school' : 'Directors in scope'}
            value={String(
              isDirector
                ? selectedSchoolChildren.length
                : selectedSchoolId
                  ? directorsForSelectedSchool.length
                  : activeDirectors.length
            )}
            description={
              isDirector
                ? 'Children currently linked to the selected school.'
                : 'Director assignments returned from the backend.'
            }
          />
          <SummaryCard
            title='Pending child approvals'
            value={String(pendingChildren.length)}
            description='Children waiting for director or super admin review.'
          />
        </section>

        {!selectedSchool ? (
          <EmptyState
            title='No school selected yet'
            description='Choose a school first so the users page can load parents, directors, and children.'
          />
        ) : (
          <Tabs defaultValue='parents' className='space-y-4'>
            <div className='overflow-x-auto pb-2'>
              <TabsList>
                <TabsTrigger value='parents'>Parents</TabsTrigger>
                {isSuperAdmin ? (
                  <TabsTrigger value='directors'>Directors</TabsTrigger>
                ) : null}
                <TabsTrigger value='children'>Children</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value='parents' className='space-y-4'>
              <Card className='border-border/70'>
                <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <CardTitle>Parents</CardTitle>
                    <CardDescription>
                      Add, edit, enable, disable, and delete parent accounts for{' '}
                      {selectedSchool.name}.
                    </CardDescription>
                  </div>
                  <Button
                    disabled={!canManageParents || !selectedSchoolId}
                    onClick={() => {
                      setEditingParent(null)
                      setParentForm(createEmptyParentForm())
                      setIsParentDialogOpen(true)
                    }}
                  >
                    <Plus className='h-4 w-4' />
                    Add parent
                  </Button>
                </CardHeader>
                <CardContent>
                  {parentsQuery.isLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                    </div>
                  ) : selectedSchoolParents.length === 0 ? (
                    <EmptyState
                      title='No parents found'
                      description='This school does not have any parent accounts yet.'
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
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSchoolParents.map((parent) => {
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
                                    {parent.civilId || 'No civil ID'} •{' '}
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
                                  <div className='flex justify-end gap-2'>
                                    <Button variant='outline' size='sm' asChild>
                                      <Link
                                        to='/parent-details/$parentId'
                                        params={{ parentId: String(parent.id) }}
                                      >
                                        <Eye className='h-4 w-4' />
                                        Details
                                      </Link>
                                    </Button>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      disabled={!canManageParents}
                                      onClick={() => {
                                        setEditingParent(parent)
                                        setParentForm(mapParentToForm(parent))
                                        setIsParentDialogOpen(true)
                                      }}
                                    >
                                      <Pencil className='h-4 w-4' />
                                      Edit
                                    </Button>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      disabled={
                                        !canManageParents ||
                                        parent.statusId === 5
                                      }
                                      onClick={() =>
                                        setPendingAction({
                                          entity: 'parent',
                                          type:
                                            parent.statusId === 1
                                              ? 'disable'
                                              : 'enable',
                                          item: parent,
                                        })
                                      }
                                    >
                                      <Power className='h-4 w-4' />
                                      {parent.statusId === 1
                                        ? 'Disable'
                                        : 'Enable'}
                                    </Button>
                                    <Button
                                      variant='destructive'
                                      size='sm'
                                      disabled={
                                        !canManageParents ||
                                        parent.statusId === 5
                                      }
                                      onClick={() =>
                                        setPendingAction({
                                          entity: 'parent',
                                          type: 'delete',
                                          item: parent,
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
            </TabsContent>

            <TabsContent value='directors' className='space-y-4'>
              <Card className='border-border/70'>
                <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <CardTitle>Directors</CardTitle>
                    <CardDescription>
                      One school-scoped director record is fetched per
                      accessible school.
                    </CardDescription>
                  </div>
                  <Button
                    disabled={
                      !canManageDirectors ||
                      !selectedSchoolId ||
                      selectedSchoolHasDirector
                    }
                    onClick={() => {
                      setEditingDirector(null)
                      setDirectorForm(createEmptyDirectorForm())
                      setIsDirectorDialogOpen(true)
                    }}
                  >
                    <Plus className='h-4 w-4' />
                    Add director
                  </Button>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {!canManageDirectors ? (
                    <div className='rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground'>
                      Directors can inspect assignments here, but only Super
                      Admin sessions can create or update director accounts.
                    </div>
                  ) : null}
                  {canManageDirectors && selectedSchoolHasDirector ? (
                    <div className='rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground'>
                      {selectedSchool.name} already has a director assignment.
                      Edit the existing record instead of creating another one.
                    </div>
                  ) : null}
                  {directorsQuery.isLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                    </div>
                  ) : directorsForSelectedSchool.length === 0 ? (
                    <EmptyState
                      title='No directors found'
                      description='The selected school does not currently return a director record.'
                    />
                  ) : (
                    <div className='rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Director</TableHead>
                            <TableHead>School</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {directorsForSelectedSchool.map((director) => {
                            const statusMeta = getEntityStatusMeta(
                              director.statusId
                            )

                            return (
                              <TableRow key={director.id}>
                                <TableCell>
                                  <div className='font-medium'>
                                    {buildFullName(
                                      director.firstName,
                                      director.lastName
                                    )}
                                  </div>
                                  <div className='text-xs text-muted-foreground'>
                                    Created {formatDateTime(director.createdOn)}
                                  </div>
                                </TableCell>
                                <TableCell>{director.schoolName}</TableCell>
                                <TableCell>
                                  <div>{director.email || 'No email'}</div>
                                  <div className='text-xs text-muted-foreground'>
                                    +{director.countryCode}{' '}
                                    {director.phoneNumber}
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
                                <TableCell className='text-right'>
                                  <div className='flex justify-end gap-2'>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      disabled={!canManageDirectors}
                                      onClick={() => {
                                        setEditingDirector(director)
                                        setDirectorForm(
                                          mapDirectorToForm(director)
                                        )
                                        setIsDirectorDialogOpen(true)
                                      }}
                                    >
                                      <Pencil className='h-4 w-4' />
                                      Edit
                                    </Button>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      disabled={
                                        !canManageDirectors ||
                                        director.statusId === 5
                                      }
                                      onClick={() =>
                                        setPendingAction({
                                          entity: 'director',
                                          type:
                                            director.statusId === 1
                                              ? 'disable'
                                              : 'enable',
                                          item: director,
                                        })
                                      }
                                    >
                                      <Power className='h-4 w-4' />
                                      {director.statusId === 1
                                        ? 'Disable'
                                        : 'Enable'}
                                    </Button>
                                    <Button
                                      variant='destructive'
                                      size='sm'
                                      disabled={
                                        !canManageDirectors ||
                                        director.statusId === 5
                                      }
                                      onClick={() =>
                                        setPendingAction({
                                          entity: 'director',
                                          type: 'delete',
                                          item: director,
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
            </TabsContent>

            <TabsContent value='children' className='space-y-4'>
              <Card className='border-border/70'>
                <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <CardTitle>Children</CardTitle>
                    <CardDescription>
                      Review student records, approval state, and school
                      assignment for {selectedSchool.name}.
                    </CardDescription>
                  </div>
                  <Button
                    disabled={!canManageChildren || !selectedSchoolId}
                    onClick={() => {
                      setEditingChild(null)
                      setChildForm(createEmptyChildForm())
                      setIsChildDialogOpen(true)
                    }}
                  >
                    <Plus className='h-4 w-4' />
                    Add child
                  </Button>
                </CardHeader>
                <CardContent>
                  {childrenQuery.isLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                    </div>
                  ) : selectedSchoolChildren.length === 0 ? (
                    <EmptyState
                      title='No children found'
                      description='The selected school does not have any student records yet.'
                    />
                  ) : (
                    <div className='rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Date of birth</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className='text-right'>
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSchoolChildren.map((child) => {
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
                                    {child.rejectionReason ||
                                      child.schoolName ||
                                      'No notes'}
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
                                <TableCell>
                                  {formatDateTime(child.createdOn)}
                                </TableCell>
                                <TableCell className='text-right'>
                                  <div className='flex flex-wrap justify-end gap-2'>
                                    <Button variant='outline' size='sm' asChild>
                                      <Link
                                        to='/child-details/$childId'
                                        params={{ childId: String(child.id) }}
                                      >
                                        <Eye className='h-4 w-4' />
                                        Details
                                      </Link>
                                    </Button>
                                    {child.statusId === 6 ? (
                                      <>
                                        <Button
                                          size='sm'
                                          disabled={
                                            !canManageChildren ||
                                            approveMutation.isPending
                                          }
                                          onClick={() =>
                                            approveMutation.mutate(child.id)
                                          }
                                        >
                                          <CheckCheck className='h-4 w-4' />
                                          Approve
                                        </Button>
                                        <Button
                                          variant='outline'
                                          size='sm'
                                          disabled={!canManageChildren}
                                          onClick={() => {
                                            setRejectingChild(child)
                                            setRejectionReason('')
                                          }}
                                        >
                                          <XCircle className='h-4 w-4' />
                                          Reject
                                        </Button>
                                      </>
                                    ) : null}
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      disabled={!canManageChildren}
                                      onClick={() => {
                                        setEditingChild(child)
                                        setChildForm(mapChildToForm(child))
                                        setIsChildDialogOpen(true)
                                      }}
                                    >
                                      <Pencil className='h-4 w-4' />
                                      Edit
                                    </Button>
                                    <Button
                                      variant='outline'
                                      size='sm'
                                      disabled={
                                        !canManageChildren ||
                                        child.statusId === 5
                                      }
                                      onClick={() =>
                                        setPendingAction({
                                          entity: 'child',
                                          type:
                                            child.statusId === 1
                                              ? 'disable'
                                              : 'enable',
                                          item: child,
                                        })
                                      }
                                    >
                                      <Power className='h-4 w-4' />
                                      {child.statusId === 1
                                        ? 'Disable'
                                        : 'Enable'}
                                    </Button>
                                    <Button
                                      variant='destructive'
                                      size='sm'
                                      disabled={
                                        !canManageChildren ||
                                        child.statusId === 5
                                      }
                                      onClick={() =>
                                        setPendingAction({
                                          entity: 'child',
                                          type: 'delete',
                                          item: child,
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
            </TabsContent>
          </Tabs>
        )}
      </PageShell>

      <Dialog
        open={isParentDialogOpen}
        onOpenChange={(open) => {
          setIsParentDialogOpen(open)
          if (!open) {
            setEditingParent(null)
            setParentForm(createEmptyParentForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingParent ? 'Edit parent' : 'Add parent'}
            </DialogTitle>
            <DialogDescription>
              {selectedSchool
                ? `This parent will be managed under ${selectedSchool.name}.`
                : 'Choose a school first.'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='parent-first-name'>First name</Label>
                <Input
                  id='parent-first-name'
                  value={parentForm.firstName}
                  onChange={(event) =>
                    setParentForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='parent-last-name'>Last name</Label>
                <Input
                  id='parent-last-name'
                  value={parentForm.lastName}
                  onChange={(event) =>
                    setParentForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='parent-father-name'>Father name</Label>
                <Input
                  id='parent-father-name'
                  value={parentForm.fatherName}
                  onChange={(event) =>
                    setParentForm((current) => ({
                      ...current,
                      fatherName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='parent-civil-id'>Civil ID</Label>
                <Input
                  id='parent-civil-id'
                  value={parentForm.civilId}
                  onChange={(event) =>
                    setParentForm((current) => ({
                      ...current,
                      civilId: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-[0.35fr_0.65fr]'>
              <div className='grid gap-2'>
                <Label htmlFor='parent-country-code'>Country code</Label>
                <Input
                  id='parent-country-code'
                  value={parentForm.countryCode}
                  onChange={(event) =>
                    setParentForm((current) => ({
                      ...current,
                      countryCode: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='parent-phone'>Phone number</Label>
                <Input
                  id='parent-phone'
                  value={parentForm.phoneNumber}
                  onChange={(event) =>
                    setParentForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='parent-email'>Email</Label>
              <Input
                id='parent-email'
                type='email'
                value={parentForm.email}
                onChange={(event) =>
                  setParentForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsParentDialogOpen(false)}
              disabled={parentSaveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => parentSaveMutation.mutate()}
              disabled={
                parentSaveMutation.isPending ||
                !selectedSchoolId ||
                parentForm.firstName.trim().length === 0 ||
                parentForm.lastName.trim().length === 0 ||
                parentForm.countryCode.trim().length === 0 ||
                parentForm.phoneNumber.trim().length === 0
              }
            >
              {parentSaveMutation.isPending
                ? 'Saving...'
                : editingParent
                  ? 'Save changes'
                  : 'Create parent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDirectorDialogOpen}
        onOpenChange={(open) => {
          setIsDirectorDialogOpen(open)
          if (!open) {
            setEditingDirector(null)
            setDirectorForm(createEmptyDirectorForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingDirector ? 'Edit director' : 'Add director'}
            </DialogTitle>
            <DialogDescription>
              {selectedSchool
                ? `Director record for ${selectedSchool.name}.`
                : 'Choose a school first.'}
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='director-first-name'>First name</Label>
                <Input
                  id='director-first-name'
                  value={directorForm.firstName}
                  onChange={(event) =>
                    setDirectorForm((current) => ({
                      ...current,
                      firstName: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='director-last-name'>Last name</Label>
                <Input
                  id='director-last-name'
                  value={directorForm.lastName}
                  onChange={(event) =>
                    setDirectorForm((current) => ({
                      ...current,
                      lastName: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {!editingDirector ? (
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='director-father-name'>Father name</Label>
                  <Input
                    id='director-father-name'
                    value={directorForm.fatherName}
                    onChange={(event) =>
                      setDirectorForm((current) => ({
                        ...current,
                        fatherName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='director-civil-id'>Civil ID</Label>
                  <Input
                    id='director-civil-id'
                    value={directorForm.civilId}
                    onChange={(event) =>
                      setDirectorForm((current) => ({
                        ...current,
                        civilId: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className='grid gap-4 sm:grid-cols-[0.35fr_0.65fr]'>
              <div className='grid gap-2'>
                <Label htmlFor='director-country-code'>Country code</Label>
                <Input
                  id='director-country-code'
                  value={directorForm.countryCode}
                  onChange={(event) =>
                    setDirectorForm((current) => ({
                      ...current,
                      countryCode: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='director-phone'>Phone number</Label>
                <Input
                  id='director-phone'
                  value={directorForm.phoneNumber}
                  onChange={(event) =>
                    setDirectorForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='director-email'>Email</Label>
              <Input
                id='director-email'
                type='email'
                value={directorForm.email}
                onChange={(event) =>
                  setDirectorForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDirectorDialogOpen(false)}
              disabled={directorSaveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => directorSaveMutation.mutate()}
              disabled={
                directorSaveMutation.isPending ||
                !selectedSchoolId ||
                directorForm.firstName.trim().length === 0 ||
                directorForm.lastName.trim().length === 0 ||
                directorForm.countryCode.trim().length === 0 ||
                directorForm.phoneNumber.trim().length === 0
              }
            >
              {directorSaveMutation.isPending
                ? 'Saving...'
                : editingDirector
                  ? 'Save changes'
                  : 'Create director'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isChildDialogOpen}
        onOpenChange={(open) => {
          setIsChildDialogOpen(open)
          if (!open) {
            setEditingChild(null)
            setChildForm(createEmptyChildForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingChild ? 'Edit child' : 'Add child'}
            </DialogTitle>
            <DialogDescription>
              {selectedSchool
                ? `Child record for ${selectedSchool.name}.`
                : 'Choose a school first.'}
            </DialogDescription>
          </DialogHeader>
          {editingChild && childDetailsQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
            </div>
          ) : (
            <div className='grid gap-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='child-first-name'>First name</Label>
                  <Input
                    id='child-first-name'
                    value={childForm.firstName}
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='child-last-name'>Last name</Label>
                  <Input
                    id='child-last-name'
                    value={childForm.lastName}
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='child-father-name'>Father name</Label>
                  <Input
                    id='child-father-name'
                    value={childForm.fatherName}
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        fatherName: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='child-date-of-birth'>Date of birth</Label>
                  <Input
                    id='child-date-of-birth'
                    type='date'
                    value={childForm.dateOfBirth}
                    onChange={(event) =>
                      setChildForm((current) => ({
                        ...current,
                        dateOfBirth: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='child-parent'>Parent</Label>
                <Select
                  value={
                    childForm.parentId ? String(childForm.parentId) : undefined
                  }
                  onValueChange={(value) =>
                    setChildForm((current) => ({
                      ...current,
                      parentId: Number(value),
                    }))
                  }
                >
                  <SelectTrigger id='child-parent'>
                    <SelectValue placeholder='Select a parent' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSchoolParents.map((parent) => (
                      <SelectItem key={parent.id} value={String(parent.id)}>
                        {buildFullName(parent.firstName, parent.lastName)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsChildDialogOpen(false)}
              disabled={childSaveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => childSaveMutation.mutate()}
              disabled={
                childSaveMutation.isPending ||
                childDetailsQuery.isLoading ||
                !selectedSchoolId ||
                childForm.firstName.trim().length === 0 ||
                childForm.lastName.trim().length === 0 ||
                childForm.dateOfBirth.trim().length === 0 ||
                childForm.parentId === 0
              }
            >
              {childSaveMutation.isPending
                ? 'Saving...'
                : editingChild
                  ? 'Save changes'
                  : 'Create child'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(rejectingChild)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectingChild(null)
            setRejectionReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject child request</DialogTitle>
            <DialogDescription>
              Explain why this child record should be rejected so the parent can
              act on it.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-2'>
            <Label htmlFor='rejection-reason'>Reason</Label>
            <Textarea
              id='rejection-reason'
              rows={4}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setRejectingChild(null)
                setRejectionReason('')
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => rejectMutation.mutate()}
              disabled={
                rejectMutation.isPending || rejectionReason.trim().length === 0
              }
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject child'}
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
            <AlertDialogTitle>{actionDialogText.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialogText.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                actionMutation.mutate()
              }}
            >
              {actionMutation.isPending ? 'Working...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
