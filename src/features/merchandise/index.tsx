import { useDeferredValue, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ImageOff,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  formatCurrency,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchSchools } from '@/features/schools/api'
import { getApiErrorMessage, toApiUrl } from '@/lib/api'
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
import {
  alterSchoolMerchandiseStatus,
  createMerchandiseCategory,
  createSchoolMerchandise,
  fetchMerchandiseCategories,
  fetchSchoolMerchandises,
  updateSchoolMerchandise,
  type MerchandiseMutationInput,
  type SchoolMerchandise,
} from './api'

interface MerchandiseFormState {
  name: string
  description: string
  price: string
  categoryId: string
  statusId: string
  logoFile: File | null
  removeLogo: boolean
}

interface CategoryFormState {
  name: string
  description: string
}

type MerchandiseAction =
  | {
      type: 'enable' | 'disable' | 'delete'
      merchandise: SchoolMerchandise
    }
  | null

function createEmptyMerchandiseForm(
  merchandise?: SchoolMerchandise | null
): MerchandiseFormState {
  return {
    name: merchandise?.name ?? '',
    description: merchandise?.description ?? '',
    price: merchandise?.price ? String(merchandise.price) : '',
    categoryId: merchandise?.categoryId ? String(merchandise.categoryId) : '',
    statusId: merchandise?.statusId ? String(merchandise.statusId) : '1',
    logoFile: null,
    removeLogo: false,
  }
}

function createEmptyCategoryForm(): CategoryFormState {
  return {
    name: '',
    description: '',
  }
}

function isValidPrice(value: string): boolean {
  const price = Number(value)
  return Number.isFinite(price) && price > 0
}

function getMerchandiseLogoUrl(merchandise: SchoolMerchandise): string | null {
  if (!merchandise.logo) {
    return null
  }

  return toApiUrl(
    `/uploads/merchandises/${merchandise.schoolId}/${merchandise.logo}`
  )
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

export function SchoolMerchandiseManagement() {
  const queryClient = useQueryClient()
  const { auth } = useAuthStore()
  const currentUser = auth.user
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false
  const hasAccess = isDirector || isSuperAdmin

  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(
    currentUser?.schoolIds[0] ?? null
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const [isMerchandiseDialogOpen, setIsMerchandiseDialogOpen] =
    useState(false)
  const [editingMerchandise, setEditingMerchandise] =
    useState<SchoolMerchandise | null>(null)
  const [merchandiseForm, setMerchandiseForm] =
    useState<MerchandiseFormState>(createEmptyMerchandiseForm)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(
    createEmptyCategoryForm
  )
  const [pendingAction, setPendingAction] = useState<MerchandiseAction>(null)

  const schoolsQuery = useQuery({
    queryKey: ['schools'],
    queryFn: fetchSchools,
    enabled: hasAccess,
  })

  const categoriesQuery = useQuery({
    queryKey: ['school-merchandise-categories'],
    queryFn: fetchMerchandiseCategories,
    enabled: hasAccess,
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
  const categories = categoriesQuery.data?.items ?? []

  const merchandisesQuery = useQuery({
    queryKey: [
      'school-merchandises',
      selectedSchoolId,
      selectedCategoryId,
      deferredSearchTerm,
    ],
    queryFn: () =>
      fetchSchoolMerchandises({
        schoolId: selectedSchoolId ?? 0,
        categoryId: selectedCategoryId,
        search: deferredSearchTerm,
        includeAll: true,
      }),
    enabled: hasAccess && Boolean(selectedSchoolId),
  })

  const merchandises = merchandisesQuery.data?.items ?? []
  const enabledMerchandises = merchandises.filter((item) => item.statusId === 1)
  const disabledMerchandises = merchandises.filter(
    (item) => item.statusId === 2
  )
  const catalogValue = enabledMerchandises.reduce(
    (sum, item) => sum + item.price,
    0
  )

  const saveMerchandiseMutation = useMutation({
    mutationFn: async () => {
      const payload: MerchandiseMutationInput = {
        schoolId: selectedSchoolId ?? 0,
        categoryId: Number(merchandiseForm.categoryId),
        name: merchandiseForm.name,
        description: merchandiseForm.description,
        price: merchandiseForm.price,
        statusId: Number(merchandiseForm.statusId || 1),
        logoFile: merchandiseForm.logoFile,
        removeLogo: merchandiseForm.removeLogo,
      }

      if (editingMerchandise) {
        return updateSchoolMerchandise(editingMerchandise.id, payload)
      }

      return createSchoolMerchandise(payload)
    },
    onSuccess: (message) => {
      toast.success(message)
      setIsMerchandiseDialogOpen(false)
      setEditingMerchandise(null)
      setMerchandiseForm(createEmptyMerchandiseForm())
      void queryClient.invalidateQueries({ queryKey: ['school-merchandises'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to save school merchandise.')
      )
    },
  })

  const saveCategoryMutation = useMutation({
    mutationFn: () => createMerchandiseCategory(categoryForm),
    onSuccess: (message) => {
      toast.success(message)
      setIsCategoryDialogOpen(false)
      setCategoryForm(createEmptyCategoryForm())
      void queryClient.invalidateQueries({
        queryKey: ['school-merchandise-categories'],
      })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to create merchandise category.')
      )
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return ''
      }

      return alterSchoolMerchandiseStatus(
        [pendingAction.merchandise.id],
        pendingAction.type === 'delete' ? 'deleted' : pendingAction.type
      )
    },
    onSuccess: (message) => {
      toast.success(message)
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['school-merchandises'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update merchandise status.')
      )
    },
  })

  const canSaveMerchandise =
    Boolean(selectedSchoolId) &&
    merchandiseForm.name.trim().length > 0 &&
    isValidPrice(merchandiseForm.price) &&
    Number(merchandiseForm.categoryId) > 0 &&
    !saveMerchandiseMutation.isPending

  if (!hasAccess) {
    return (
      <PageShell
        title='School Merchandise'
        description='Manage school merchandise catalog items.'
      >
        <EmptyState
          title='Director access required'
          description='School merchandise management is available to directors and SuperAdmin accounts.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='School Merchandise'
        description='Manage school merchandise items, images, categories, prices, and availability.'
        actions={
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              onClick={() => {
                setCategoryForm(createEmptyCategoryForm())
                setIsCategoryDialogOpen(true)
              }}
            >
              <Plus className='h-4 w-4' />
              Add category
            </Button>
            <Button
              disabled={!selectedSchoolId || categories.length === 0}
              onClick={() => {
                setEditingMerchandise(null)
                setMerchandiseForm(
                  createEmptyMerchandiseForm({
                    id: 0,
                    schoolId: selectedSchoolId ?? 0,
                    categoryId: categories[0]?.id ?? 0,
                    categoryName: categories[0]?.name ?? '',
                    name: '',
                    description: null,
                    price: 0,
                    logo: null,
                    statusId: 1,
                    createdOn: null,
                    modifiedOn: null,
                  })
                )
                setIsMerchandiseDialogOpen(true)
              }}
            >
              <PackagePlus className='h-4 w-4' />
              Add merchandise
            </Button>
          </div>
        }
      >
        <section className='grid gap-4 md:grid-cols-4'>
          <SummaryCard
            title='Catalog items'
            value={String(merchandises.length)}
            description='Merchandise returned for the selected school.'
          />
          <SummaryCard
            title='Enabled'
            value={String(enabledMerchandises.length)}
            description='Items currently available for parent purchase.'
          />
          <SummaryCard
            title='Disabled'
            value={String(disabledMerchandises.length)}
            description='Items paused but still kept in history.'
          />
          <SummaryCard
            title='Enabled value'
            value={formatCurrency(catalogValue)}
            description='Sum of enabled item prices in the catalog.'
          />
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShoppingBag className='h-5 w-5 text-primary' />
              Catalog controls
            </CardTitle>
            <CardDescription>
              Directors are scoped to their school; SuperAdmin accounts can
              switch school scope.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]'>
            <div className='grid gap-2'>
              <Label>School</Label>
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
            </div>

            <div className='grid gap-2'>
              <Label>Category</Label>
              <Select
                value={String(selectedCategoryId)}
                onValueChange={(value) => setSelectedCategoryId(Number(value))}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Filter by category' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='0'>All categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='merchandise-search'>Search</Label>
              <div className='relative'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='merchandise-search'
                  className='ps-9'
                  placeholder='Search by name or description'
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedSchool ? (
          <EmptyState
            title='No school available'
            description='No school was found for this director account.'
          />
        ) : categoriesQuery.isLoading || merchandisesQuery.isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title='Create a category first'
            description='The merchandise API requires a category before items can be added.'
          />
        ) : merchandises.length === 0 ? (
          <EmptyState
            title='No merchandise found'
            description='Add the first school merchandise item for this catalog.'
          />
        ) : (
          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle>{selectedSchool.name} merchandise</CardTitle>
                <CardDescription>
                  Items are loaded from <code>GetSchoolMerchandises</code> with
                  all statuses included.
                </CardDescription>
              </div>
              <Badge variant='outline'>{merchandises.length} items</Badge>
            </CardHeader>
            <CardContent>
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchandise</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchandises.map((item) => {
                      const statusMeta = getEntityStatusMeta(item.statusId)
                      const logoUrl = getMerchandiseLogoUrl(item)

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className='flex items-center gap-3'>
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt=''
                                  className='h-11 w-11 rounded-xl border object-cover'
                                />
                              ) : (
                                <div className='flex h-11 w-11 items-center justify-center rounded-xl border bg-muted text-muted-foreground'>
                                  <ImageOff className='h-4 w-4' />
                                </div>
                              )}
                              <div>
                                <div className='font-medium'>{item.name}</div>
                                <div className='text-xs text-muted-foreground'>
                                  {item.description || 'No description'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.categoryName}</TableCell>
                          <TableCell>{formatCurrency(item.price)}</TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className={statusMeta.className}
                            >
                              {statusMeta.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(item.modifiedOn ?? item.createdOn)}
                          </TableCell>
                          <TableCell className='text-right'>
                            <div className='flex flex-wrap justify-end gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setEditingMerchandise(item)
                                  setMerchandiseForm(
                                    createEmptyMerchandiseForm(item)
                                  )
                                  setIsMerchandiseDialogOpen(true)
                                }}
                              >
                                <Pencil className='h-4 w-4' />
                                Edit
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                disabled={item.statusId === 5}
                                onClick={() =>
                                  setPendingAction({
                                    type:
                                      item.statusId === 1
                                        ? 'disable'
                                        : 'enable',
                                    merchandise: item,
                                  })
                                }
                              >
                                <Power className='h-4 w-4' />
                                {item.statusId === 1 ? 'Disable' : 'Enable'}
                              </Button>
                              <Button
                                variant='destructive'
                                size='sm'
                                disabled={item.statusId === 5}
                                onClick={() =>
                                  setPendingAction({
                                    type: 'delete',
                                    merchandise: item,
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
            </CardContent>
          </Card>
        )}
      </PageShell>

      <Dialog
        open={isMerchandiseDialogOpen}
        onOpenChange={(open) => {
          setIsMerchandiseDialogOpen(open)
          if (!open) {
            setEditingMerchandise(null)
            setMerchandiseForm(createEmptyMerchandiseForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingMerchandise ? 'Edit merchandise' : 'Add merchandise'}
            </DialogTitle>
            <DialogDescription>
              Configure the merchandise item shown to parents for this school.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='merchandise-name'>Name</Label>
                <Input
                  id='merchandise-name'
                  value={merchandiseForm.name}
                  onChange={(event) =>
                    setMerchandiseForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='merchandise-price'>Price</Label>
                <Input
                  id='merchandise-price'
                  inputMode='decimal'
                  value={merchandiseForm.price}
                  onChange={(event) =>
                    setMerchandiseForm((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label>Category</Label>
                <Select
                  value={merchandiseForm.categoryId}
                  onValueChange={(value) =>
                    setMerchandiseForm((current) => ({
                      ...current,
                      categoryId: value,
                    }))
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Status</Label>
                <Select
                  value={merchandiseForm.statusId}
                  onValueChange={(value) =>
                    setMerchandiseForm((current) => ({
                      ...current,
                      statusId: value,
                    }))
                  }
                  disabled={!editingMerchandise}
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='1'>Enabled</SelectItem>
                    <SelectItem value='2'>Disabled</SelectItem>
                    <SelectItem value='5'>Deleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='merchandise-description'>Description</Label>
              <Textarea
                id='merchandise-description'
                rows={4}
                value={merchandiseForm.description}
                onChange={(event) =>
                  setMerchandiseForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-3'>
              <div className='grid gap-2'>
                <Label htmlFor='merchandise-logo'>Logo</Label>
                <Input
                  id='merchandise-logo'
                  type='file'
                  accept='image/*'
                  onChange={(event) =>
                    setMerchandiseForm((current) => ({
                      ...current,
                      logoFile: event.target.files?.[0] ?? null,
                      removeLogo: event.target.files?.[0]
                        ? false
                        : current.removeLogo,
                    }))
                  }
                />
              </div>

              {editingMerchandise?.logo ? (
                <div className='flex items-center justify-between rounded-lg border px-3 py-2'>
                  <div>
                    <p className='text-sm font-medium'>Remove current logo</p>
                    <p className='text-xs text-muted-foreground'>
                      The backend will delete the saved merchandise image when
                      this is enabled.
                    </p>
                  </div>
                  <Switch
                    checked={merchandiseForm.removeLogo}
                    onCheckedChange={(checked) =>
                      setMerchandiseForm((current) => ({
                        ...current,
                        removeLogo: checked,
                        logoFile: checked ? null : current.logoFile,
                      }))
                    }
                  />
                </div>
              ) : null}
            </div>

            {!isValidPrice(merchandiseForm.price) &&
            merchandiseForm.price.length > 0 ? (
              <p className='text-sm font-medium text-destructive'>
                Price must be greater than 0.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsMerchandiseDialogOpen(false)}
              disabled={saveMerchandiseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!canSaveMerchandise}
              onClick={() => saveMerchandiseMutation.mutate()}
            >
              {saveMerchandiseMutation.isPending
                ? 'Saving...'
                : editingMerchandise
                  ? 'Save changes'
                  : 'Create merchandise'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={(open) => {
          setIsCategoryDialogOpen(open)
          if (!open) {
            setCategoryForm(createEmptyCategoryForm())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add merchandise category</DialogTitle>
            <DialogDescription>
              Categories are shared by merchandise items and required by the
              backend before creating items.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='category-name'>Name</Label>
              <Input
                id='category-name'
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='category-description'>Description</Label>
              <Textarea
                id='category-description'
                rows={4}
                value={categoryForm.description}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsCategoryDialogOpen(false)}
              disabled={saveCategoryMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={
                saveCategoryMutation.isPending ||
                categoryForm.name.trim().length === 0
              }
              onClick={() => saveCategoryMutation.mutate()}
            >
              {saveCategoryMutation.isPending
                ? 'Saving...'
                : 'Create category'}
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
                ? 'Delete merchandise?'
                : `${pendingAction?.type === 'enable' ? 'Enable' : 'Disable'} merchandise?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'delete'
                ? 'This will soft-delete the item by changing its status to Deleted.'
                : pendingAction?.type === 'enable'
                  ? 'This item will become available again in the merchandise catalog.'
                  : 'This item will remain in history but stop being active.'}
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
