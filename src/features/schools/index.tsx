import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Building2,
  ExternalLink,
  Eye,
  Pencil,
  Plus,
  Power,
  Trash2,
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
import { Switch } from '@/components/ui/switch'
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
import { formatDateOnly, getEntityStatusMeta } from '@/features/admin/utils'
import {
  alterSchoolStatus,
  createSchool,
  deleteSchool,
  fetchSchoolDetails,
  fetchSchools,
  updateSchool,
  type SchoolMutationInput,
  type SchoolSummary,
} from './api'

interface SchoolFormState {
  name: string
  address: string
  phoneNumber: string
  email: string
  establishedYear: string
  description: string
  webUrl: string
  logoFile: File | null
  removeLogo: boolean
}

type SchoolAction =
  | { type: 'enable' | 'disable'; school: SchoolSummary }
  | { type: 'delete'; school: SchoolSummary }
  | null

function createEmptySchoolForm(): SchoolFormState {
  return {
    name: '',
    address: '',
    phoneNumber: '',
    email: '',
    establishedYear: '',
    description: '',
    webUrl: '',
    logoFile: null,
    removeLogo: false,
  }
}

function mapSchoolToForm(school: SchoolSummary): SchoolFormState {
  return {
    name: school.name,
    address: school.address,
    phoneNumber: school.phoneNumber,
    email: school.email,
    establishedYear:
      school.establishedYear != null ? String(school.establishedYear) : '',
    description: school.description ?? '',
    webUrl: school.website ?? '',
    logoFile: null,
    removeLogo: false,
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

export function Schools() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const canManageSchools = currentUser?.roles.includes('SuperAdmin') ?? false

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingSchoolId, setEditingSchoolId] = useState<number | null>(null)
  const [formState, setFormState] = useState<SchoolFormState>(
    createEmptySchoolForm
  )
  const [pendingAction, setPendingAction] = useState<SchoolAction>(null)

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

  const editingSchool =
    accessibleSchools.find((school) => school.id === editingSchoolId) ?? null

  const schoolDetailsQuery = useQuery({
    queryKey: ['schools', 'details', editingSchoolId],
    queryFn: () => fetchSchoolDetails(editingSchoolId ?? 0),
    enabled: Boolean(editingSchoolId),
  })

  useEffect(() => {
    if (!editingSchoolId || !schoolDetailsQuery.data || !isFormOpen) {
      return
    }

    setFormState(mapSchoolToForm(schoolDetailsQuery.data))
  }, [editingSchoolId, isFormOpen, schoolDetailsQuery.data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: SchoolMutationInput = {
        name: formState.name,
        address: formState.address,
        phoneNumber: formState.phoneNumber,
        email: formState.email,
        establishedYear: formState.establishedYear,
        description: formState.description,
        webUrl: formState.webUrl,
        logoFile: formState.logoFile,
        removeLogo: formState.removeLogo,
      }

      if (editingSchoolId) {
        await updateSchool(
          editingSchoolId,
          schoolDetailsQuery.data?.statusId ?? editingSchool?.statusId ?? 1,
          payload
        )
        return
      }

      await createSchool(payload)
    },
    onSuccess: () => {
      toast.success(
        editingSchoolId
          ? 'School updated successfully.'
          : 'School created successfully.'
      )
      setIsFormOpen(false)
      setEditingSchoolId(null)
      setFormState(createEmptySchoolForm())
      void queryClient.invalidateQueries({ queryKey: ['schools'] })
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return
      }

      if (pendingAction.type === 'delete') {
        await deleteSchool(pendingAction.school.id)
        return
      }

      await alterSchoolStatus([pendingAction.school.id], pendingAction.type)
    },
    onSuccess: () => {
      if (!pendingAction) {
        return
      }

      toast.success(
        pendingAction.type === 'delete'
          ? 'School deleted successfully.'
          : `School ${pendingAction.type}d successfully.`
      )
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['schools'] })
    },
  })

  const activeSchools = accessibleSchools.filter(
    (school) => school.statusId === 1
  )
  const disabledSchools = accessibleSchools.filter(
    (school) => school.statusId === 2
  )

  const currentLogo = schoolDetailsQuery.data?.logo

  return (
    <>
      <PageShell
        title='School Management'
        description='Create, edit, disable, enable, and retire schools from the EduFrais admin panel.'
        actions={
          canManageSchools ? (
            <Button
              onClick={() => {
                setEditingSchoolId(null)
                setFormState(createEmptySchoolForm())
                setIsFormOpen(true)
              }}
            >
              <Plus className='h-4 w-4' />
              Add school
            </Button>
          ) : (
            <Badge variant='outline'>Read-only for directors</Badge>
          )
        }
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <SummaryCard
            title='Accessible schools'
            value={String(accessibleSchools.length)}
            description='Schools available in the current admin scope.'
          />
          <SummaryCard
            title='Enabled schools'
            value={String(activeSchools.length)}
            description='Status id 1 and ready for operations.'
          />
          <SummaryCard
            title='Disabled schools'
            value={String(disabledSchools.length)}
            description='Paused schools that can be re-enabled later.'
          />
        </section>

        {!canManageSchools ? (
          <Card className='border-border/70'>
            <CardContent className='pt-6 text-sm text-muted-foreground'>
              Directors can inspect their assigned school here, but only Super
              Admin sessions can create, edit, enable, disable, or delete
              schools.
            </CardContent>
          </Card>
        ) : null}

        <Card className='border-border/70'>
          <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <CardTitle>School directory</CardTitle>
              <CardDescription>
                Backend data from <code>/api/School</code> with direct lifecycle
                actions.
              </CardDescription>
            </div>
            <Badge variant='outline'>{accessibleSchools.length} schools</Badge>
          </CardHeader>
          <CardContent>
            {schoolsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : accessibleSchools.length === 0 ? (
              <EmptyState
                title='No schools found'
                description='The School listing endpoint returned an empty result for this account.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Established</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessibleSchools.map((school) => {
                      const statusMeta = getEntityStatusMeta(school.statusId)

                      return (
                        <TableRow key={school.id}>
                          <TableCell>
                            <div className='flex items-start gap-3'>
                              <div className='rounded-full bg-primary/10 p-2 text-primary'>
                                <Building2 className='h-4 w-4' />
                              </div>
                              <div>
                                <div className='font-medium'>{school.name}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {school.address}
                                </div>
                              </div>
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
                          <TableCell>
                            <div>{school.email}</div>
                            <div className='text-xs text-muted-foreground'>
                              {school.phoneNumber}
                            </div>
                          </TableCell>
                          <TableCell>
                            {school.establishedYear
                              ? formatDateOnly(
                                  `${school.establishedYear.toString()}-01-01`
                                )
                                  .split(' ')
                                  .slice(-2)
                                  .join(' ')
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {school.website ? (
                              <a
                                href={school.website}
                                target='_blank'
                                rel='noreferrer'
                                className='inline-flex items-center gap-1 text-primary hover:underline'
                              >
                                Open
                                <ExternalLink className='h-3.5 w-3.5' />
                              </a>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex justify-end gap-2'>
                              <Button variant='outline' size='sm' asChild>
                                <Link
                                  to='/school-details/$schoolId'
                                  params={{ schoolId: String(school.id) }}
                                >
                                  <Eye className='h-4 w-4' />
                                  Details
                                </Link>
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                disabled={!canManageSchools}
                                onClick={() => {
                                  setEditingSchoolId(school.id)
                                  setFormState(mapSchoolToForm(school))
                                  setIsFormOpen(true)
                                }}
                              >
                                <Pencil className='h-4 w-4' />
                                Edit
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                disabled={
                                  !canManageSchools || school.statusId === 5
                                }
                                onClick={() =>
                                  setPendingAction({
                                    type:
                                      school.statusId === 1
                                        ? 'disable'
                                        : 'enable',
                                    school,
                                  })
                                }
                              >
                                <Power className='h-4 w-4' />
                                {school.statusId === 1 ? 'Disable' : 'Enable'}
                              </Button>
                              <Button
                                variant='destructive'
                                size='sm'
                                disabled={
                                  !canManageSchools || school.statusId === 5
                                }
                                onClick={() =>
                                  setPendingAction({
                                    type: 'delete',
                                    school,
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
      </PageShell>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) {
            setEditingSchoolId(null)
            setFormState(createEmptySchoolForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingSchoolId ? 'Edit school' : 'Add new school'}
            </DialogTitle>
            <DialogDescription>
              {editingSchoolId
                ? 'Update the school profile and keep its reporting scope current.'
                : 'Register a new school so its users and payments can be managed from EduFrais.'}
            </DialogDescription>
          </DialogHeader>

          {editingSchoolId && schoolDetailsQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-28 w-full' />
            </div>
          ) : (
            <div className='grid gap-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='school-name'>School name</Label>
                  <Input
                    id='school-name'
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='school-year'>Established year</Label>
                  <Input
                    id='school-year'
                    inputMode='numeric'
                    value={formState.establishedYear}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        establishedYear: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='school-address'>Address</Label>
                <Input
                  id='school-address'
                  value={formState.address}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      address: event.target.value,
                    }))
                  }
                />
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label htmlFor='school-email'>Email</Label>
                  <Input
                    id='school-email'
                    type='email'
                    value={formState.email}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='school-phone'>Phone number</Label>
                  <Input
                    id='school-phone'
                    value={formState.phoneNumber}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='school-website'>Website</Label>
                <Input
                  id='school-website'
                  placeholder='https://example.com'
                  value={formState.webUrl}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      webUrl: event.target.value,
                    }))
                  }
                />
              </div>

              <div className='grid gap-2'>
                <Label htmlFor='school-description'>Description</Label>
                <Textarea
                  id='school-description'
                  rows={4}
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>

              <div className='grid gap-3'>
                <div className='grid gap-2'>
                  <Label htmlFor='school-logo'>Logo</Label>
                  <Input
                    id='school-logo'
                    type='file'
                    accept='image/*'
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        logoFile: event.target.files?.[0] ?? null,
                        removeLogo: event.target.files?.[0]
                          ? false
                          : current.removeLogo,
                      }))
                    }
                  />
                </div>

                {editingSchoolId && currentLogo ? (
                  <div className='rounded-lg border bg-muted/30 p-3 text-sm'>
                    <p className='font-medium'>Current logo</p>
                    <a
                      href={toApiUrl(`/uploads/schools/${currentLogo}`)}
                      target='_blank'
                      rel='noreferrer'
                      className='mt-1 inline-flex items-center gap-1 text-primary hover:underline'
                    >
                      Open existing logo
                      <ExternalLink className='h-3.5 w-3.5' />
                    </a>
                  </div>
                ) : null}

                {editingSchoolId ? (
                  <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
                    <div>
                      <p className='text-sm font-medium'>Remove current logo</p>
                      <p className='text-xs text-muted-foreground'>
                        Clear the saved logo if the school should no longer
                        display one.
                      </p>
                    </div>
                    <Switch
                      checked={formState.removeLogo}
                      onCheckedChange={(checked) =>
                        setFormState((current) => ({
                          ...current,
                          removeLogo: checked,
                          logoFile: checked ? null : current.logoFile,
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsFormOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                schoolDetailsQuery.isLoading ||
                formState.name.trim().length === 0 ||
                formState.address.trim().length === 0 ||
                formState.phoneNumber.trim().length === 0 ||
                formState.email.trim().length === 0
              }
            >
              {saveMutation.isPending
                ? 'Saving...'
                : editingSchoolId
                  ? 'Save changes'
                  : 'Create school'}
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
                ? 'Delete school?'
                : pendingAction?.type === 'disable'
                  ? 'Disable school?'
                  : 'Enable school?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction
                ? pendingAction.type === 'delete'
                  ? `This will mark ${pendingAction.school.name} as deleted in EduFrais.`
                  : pendingAction.type === 'disable'
                    ? `This will stop ${pendingAction.school.name} from operating as an enabled school.`
                    : `This will restore ${pendingAction.school.name} to enabled status.`
                : 'Choose an action.'}
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
