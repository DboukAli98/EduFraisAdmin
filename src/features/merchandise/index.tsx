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
        getApiErrorMessage(error, 'Impossible d enregistrer les articles scolaires.')
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
        getApiErrorMessage(error, 'Impossible de creer la categorie d article.')
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
        getApiErrorMessage(error, 'Impossible de mettre a jour le statut de l article.')
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
        title='Articles scolaires'
        description='Gerez les articles du catalogue scolaire.'
      >
        <EmptyState
          title='Acces directeur requis'
          description='La gestion des articles scolaires est disponible pour les directeurs et les comptes SuperAdmin.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='Articles scolaires'
        description='Gerez les articles scolaires, images, categories, prix et disponibilite.'
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
              Ajouter une categorie
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
              Ajouter un article
            </Button>
          </div>
        }
      >
        <section className='grid gap-4 md:grid-cols-4'>
          <SummaryCard
            title='Articles du catalogue'
            value={String(merchandises.length)}
            description='Articles retournes pour l ecole selectionnee.'
          />
          <SummaryCard
            title='Actifs'
            value={String(enabledMerchandises.length)}
            description='Articles actuellement disponibles a l achat pour les parents.'
          />
          <SummaryCard
            title='Inactifs'
            value={String(disabledMerchandises.length)}
            description='Articles suspendus mais conserves dans l historique.'
          />
          <SummaryCard
            title='Valeur active'
            value={formatCurrency(catalogValue)}
            description='Somme des prix des articles actifs du catalogue.'
          />
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ShoppingBag className='h-5 w-5 text-primary' />
              Filtres du catalogue
            </CardTitle>
            <CardDescription>
              Les directeurs restent limites a leur ecole ; les comptes
              SuperAdmin peuvent changer la portee de l ecole.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4 lg:grid-cols-[1fr_1fr_1.2fr]'>
            <div className='grid gap-2'>
              <Label>Ecole</Label>
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

            <div className='grid gap-2'>
              <Label>Categorie</Label>
              <Select
                value={String(selectedCategoryId)}
                onValueChange={(value) => setSelectedCategoryId(Number(value))}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Filtrer par categorie' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='0'>Toutes les categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='merchandise-search'>Recherche</Label>
              <div className='relative'>
                <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  id='merchandise-search'
                  className='ps-9'
                  placeholder='Rechercher par nom ou description'
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedSchool ? (
          <EmptyState
            title='Aucune ecole disponible'
            description='Aucune ecole n a ete trouvee pour ce compte directeur.'
          />
        ) : categoriesQuery.isLoading || merchandisesQuery.isLoading ? (
          <div className='space-y-3'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title='Creez d abord une categorie'
            description='L API des articles requiert une categorie avant de pouvoir ajouter des elements.'
          />
        ) : merchandises.length === 0 ? (
          <EmptyState
            title='Aucun article trouve'
            description='Ajoutez le premier article scolaire de ce catalogue.'
          />
        ) : (
          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle>{selectedSchool.name} - articles</CardTitle>
                <CardDescription>
                  Les articles sont charges depuis
                  <code>GetSchoolMerchandises</code> avec tous les statuts inclus.
                </CardDescription>
              </div>
              <Badge variant='outline'>{merchandises.length} articles</Badge>
            </CardHeader>
            <CardContent>
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Article</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Prix</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Mis a jour</TableHead>
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
                                  {item.description || 'Aucune description'}
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
                                Modifier
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
                                {item.statusId === 1 ? 'Desactiver' : 'Activer'}
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
                                Supprimer
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
              {editingMerchandise ? 'Modifier l article' : 'Ajouter un article'}
            </DialogTitle>
            <DialogDescription>
              Configurez l article affiche aux parents pour cette ecole.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='merchandise-name'>Nom</Label>
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
                <Label htmlFor='merchandise-price'>Prix</Label>
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
                <Label>Categorie</Label>
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
                    <SelectValue placeholder='Selectionner une categorie' />
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
                <Label>Statut</Label>
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
                    <SelectItem value='1'>Actif</SelectItem>
                    <SelectItem value='2'>Inactif</SelectItem>
                    <SelectItem value='5'>Supprime</SelectItem>
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
                    <p className='text-sm font-medium'>Supprimer le logo actuel</p>
                    <p className='text-xs text-muted-foreground'>
                      Le backend supprimera l image enregistree de l article
                      lorsque cette option est activee.
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
                Le prix doit etre superieur a 0.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsMerchandiseDialogOpen(false)}
              disabled={saveMerchandiseMutation.isPending}
            >
              Annuler
            </Button>
            <Button
              disabled={!canSaveMerchandise}
              onClick={() => saveMerchandiseMutation.mutate()}
            >
              {saveMerchandiseMutation.isPending
                ? 'Enregistrement...'
                : editingMerchandise
                  ? 'Enregistrer'
                  : 'Creer l article'}
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
            <DialogTitle>Ajouter une categorie d article</DialogTitle>
            <DialogDescription>
              Les categories sont partagees entre les articles et requises par
              le backend avant la creation des elements.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='category-name'>Nom</Label>
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
              Annuler
            </Button>
            <Button
              disabled={
                saveCategoryMutation.isPending ||
                categoryForm.name.trim().length === 0
              }
              onClick={() => saveCategoryMutation.mutate()}
            >
              {saveCategoryMutation.isPending
                ? 'Enregistrement...'
                : 'Creer la categorie'}
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
                ? 'Supprimer cet article ?'
                : `${pendingAction?.type === 'enable' ? 'Activer' : 'Desactiver'} cet article ?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === 'delete'
                ? 'Cela supprimera logiquement l article en changeant son statut en Supprime.'
                : pendingAction?.type === 'enable'
                  ? 'Cet article redeviendra disponible dans le catalogue.'
                  : 'Cet article restera dans l historique mais ne sera plus actif.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionMutation.isPending}
              onClick={(event) => {
                event.preventDefault()
                actionMutation.mutate()
              }}
            >
              {actionMutation.isPending ? 'Traitement...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
