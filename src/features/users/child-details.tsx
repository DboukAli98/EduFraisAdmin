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
        throw new Error('Selectionnez une classe valide avant d enregistrer.')
      }

      if (grade?.id) {
        await updateChildGradeRecord(grade.id, child.id, schoolGradeSectionId)
        return
      }

      await createChildGrade(child.id, schoolGradeSectionId)
    },
    onSuccess: () => {
      toast.success(
        grade
          ? 'Affectation de classe mise a jour.'
          : 'Classe affectee avec succes.'
      )
      void queryClient.invalidateQueries({
        queryKey: ['users', 'child-details', childId, 'grade'],
      })
    },
  })

  if (!hasValidChildId) {
    return (
      <PageShell
        title='Details de l enfant'
        description='Consultez les dependances scolaires et gerez l affectation de classe.'
        actions={
          <Button variant='outline' asChild>
            <Link to='/users'>
              <ArrowLeft className='h-4 w-4' />
              Retour aux utilisateurs
            </Link>
          </Button>
        }
      >
        <EmptyState
          title='Enfant invalide'
          description='La page a ete ouverte sans identifiant enfant valide.'
        />
      </PageShell>
    )
  }

  return (
    <PageShell
      title={
        child ? buildFullName(child.firstName, child.lastName) : 'Details de l enfant'
      }
      description='Consultez les dependances de l enfant et gerez l affectation de classe pour cet eleve.'
      actions={
        <Button variant='outline' asChild>
          <Link to='/users'>
            <ArrowLeft className='h-4 w-4' />
            Retour aux utilisateurs
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
          title='Impossible de charger l enfant'
          description='Le backend n a pas retourne de fiche enfant exploitable pour cette page.'
        />
      ) : !hasAccess ? (
        <EmptyState
          title='Acces limite'
          description='Cet enfant appartient a une ecole hors de la portee actuelle du directeur.'
        />
      ) : (
        <>
          <section className='grid gap-4 md:grid-cols-4'>
            <SummaryCard
              title='Statut'
              value={getEntityStatusMeta(child.statusId).label}
              description='Etat actuel de revue et de cycle de vie de l enfant.'
            />
            <SummaryCard
              title='Classe actuelle'
              value={grade?.schoolGradeName || 'Non assignee'}
              description='La classe scolaire active pour cet enfant.'
            />
            <SummaryCard
              title='Frais de la classe'
              value={
                grade?.schoolGradeFee
                  ? formatCurrency(grade.schoolGradeFee)
                  : 'N/D'
              }
              description='Frais configures sur la classe actuellement assignee.'
            />
            <SummaryCard
              title='Classes disponibles'
              value={String(sections.length)}
              description='Classes actuellement disponibles dans l ecole de cet enfant.'
            />
          </section>

          <section className='grid gap-4 xl:grid-cols-[0.95fr_1.05fr]'>
            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <UserRound className='h-5 w-5 text-primary' />
                    Profil de l enfant
                  </CardTitle>
                  <CardDescription>
                    Informations d identite et de revue retournees par l API.
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
                  label='Nom complet'
                  value={buildFullName(child.firstName, child.lastName)}
                />
                <DetailRow
                  label='Nom du pere'
                  value={child.fatherName || 'Aucun nom du pere'}
                />
                <DetailRow
                  label='Date de naissance'
                  value={formatDateOnly(child.dateOfBirth)}
                />
                <DetailRow
                  label='Cree le'
                  value={formatDateTime(child.createdOn)}
                />
                <DetailRow
                  label='Notes de revue'
                  value={child.rejectionReason || 'Aucun motif de rejet'}
                />
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>Dependances</CardTitle>
                <CardDescription>
                  Fiches parent et ecole actuellement liees a cet enfant.
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
                        {parent.email || 'Aucun email'} | +{parent.countryCode}{' '}
                        {parent.phoneNumber}
                      </div>
                      <Button variant='outline' size='sm' asChild>
                        <Link
                          to='/parent-details/$parentId'
                          params={{ parentId: String(parent.id) }}
                        >
                          Voir le parent
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className='mt-3 text-sm text-muted-foreground'>
                      Aucun detail parent n a ete retourne pour cet enfant.
                    </p>
                  )}
                </div>

                <div className='rounded-lg border bg-muted/20 p-4'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <Building2 className='h-4 w-4 text-primary' />
                    Ecole
                  </div>
                  {schoolQuery.isLoading ? (
                    <Skeleton className='mt-3 h-16 w-full' />
                  ) : school ? (
                    <div className='mt-3 space-y-2'>
                      <div className='font-medium'>{school.name}</div>
                      <div className='text-sm text-muted-foreground'>
                        {school.address || 'Aucune adresse'}
                      </div>
                      <Button variant='outline' size='sm' asChild>
                        <Link
                          to='/school-details/$schoolId'
                          params={{ schoolId: String(school.id) }}
                        >
                          Voir l ecole
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className='mt-3 text-sm text-muted-foreground'>
                      Aucun detail d ecole n a ete retourne pour cet enfant.
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
                  Affectation actuelle
                </CardTitle>
                <CardDescription>
                  Consultez la classe actuelle, les frais et les dates de
                  periode pour cet enfant.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-4'>
                <DetailRow
                  label='Classe actuelle'
                  value={grade?.schoolGradeName || 'Aucune classe assignee'}
                />
                <DetailRow
                  label='Description'
                  value={
                    grade?.schoolGradeDescription || 'Aucune description de classe'
                  }
                />
                <DetailRow
                  label='Frais'
                  value={
                    grade?.schoolGradeFee
                      ? formatCurrency(grade.schoolGradeFee)
                      : 'N/D'
                  }
                />
                <DetailRow
                  label='Periode'
                  value={
                    grade?.termStartDate || grade?.termEndDate
                      ? `${formatDateOnly(grade?.termStartDate)} au ${formatDateOnly(grade?.termEndDate)}`
                      : 'Aucune date de periode'
                  }
                />
                <DetailRow
                  label='Statut de l affectation'
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
                      'Aucune affectation pour l instant'
                    )
                  }
                />
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader>
                <CardTitle>Affecter une classe</CardTitle>
                <CardDescription>
                  Choisissez l une des classes configurees et enregistrez-la
                  dans la fiche de cet enfant.
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
                    title='Aucune classe disponible'
                    description='Ajoutez des classes dans les details de l ecole avant d en affecter une a cet enfant.'
                  />
                ) : (
                  <>
                    <div className='grid gap-2'>
                      <Select
                        value={selectedSectionId || undefined}
                        onValueChange={setSelectedSectionId}
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Selectionner une classe' />
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
                        {grade ? 'Mettre a jour l affectation' : 'Affecter la classe'}
                      </Button>
                      {school ? (
                        <Button variant='outline' asChild>
                          <Link
                            to='/school-details/$schoolId'
                            params={{ schoolId: String(school.id) }}
                          >
                            Gerer les classes de l ecole
                          </Link>
                        </Button>
                      ) : null}
                    </div>

                    <div className='rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Classe</TableHead>
                            <TableHead>Frais</TableHead>
                            <TableHead>Periode</TableHead>
                            <TableHead>Statut</TableHead>
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
                                    {section.description || 'Aucune description'}
                                </div>
                              </TableCell>
                                <TableCell>
                                  {formatCurrency(section.fee)}
                                </TableCell>
                                <TableCell>
                                  {section.termStartDate || section.termEndDate
                                    ? `${formatDateOnly(section.termStartDate)} au ${formatDateOnly(section.termEndDate)}`
                                    : 'Aucune date de periode'}
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
