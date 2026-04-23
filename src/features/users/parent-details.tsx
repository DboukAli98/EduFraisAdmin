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
        title='Details du parent'
        description='Consultez les ecoles liees, les enfants et les dependances de paiement.'
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
          title='Parent invalide'
          description='La page a ete ouverte sans identifiant parent valide.'
        />
      </PageShell>
    )
  }

  const parent = parentQuery.data
  const schools = schoolsQuery.data ?? []
  const resolvedSchoolIds = schools
    .map((school) => school.schoolId)
    .filter((schoolId) => schoolId > 0)
  const resolvedSchoolNames =
    schools.length > 0
      ? schools.map((school) => school.schoolName).filter(Boolean)
      : parent?.schoolNames ?? []
  const children = childrenQuery.data ?? []
  const installments = installmentsQuery.data ?? []
  const unpaidInstallments = installments.filter(
    (installment) => !installment.isPaid
  )
  const outstandingAmount = unpaidInstallments.reduce((total, installment) => {
    return total + installment.amount + (installment.lateFee ?? 0)
  }, 0)
  const parentSchoolIds =
    resolvedSchoolIds.length > 0 ? resolvedSchoolIds : (parent?.schoolIds ?? [])
  const isResolvingDirectorAccess =
    isDirector && schoolsQuery.isLoading && parentSchoolIds.length === 0
  const hasAccess =
    !isDirector ||
    parentSchoolIds.some((schoolId) =>
      (currentUser?.schoolIds ?? []).includes(schoolId)
    )

  return (
    <PageShell
      title={
        parent
          ? buildFullName(parent.firstName, parent.lastName)
          : 'Details du parent'
      }
      description='Consultez le profil du parent, les ecoles liees, les enfants et l historique des echeances.'
      actions={
        <Button variant='outline' asChild>
          <Link to='/users'>
            <ArrowLeft className='h-4 w-4' />
            Retour aux utilisateurs
          </Link>
        </Button>
      }
    >
      {parentQuery.isLoading || isResolvingDirectorAccess ? (
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
          title='Impossible de charger le parent'
          description='Le backend n a pas retourne de fiche parent exploitable pour cette page.'
        />
      ) : !hasAccess ? (
        <EmptyState
          title='Acces limite'
          description='Ce parent est lie a une ecole hors de la portee actuelle du directeur.'
        />
      ) : (
        <>
          <section className='grid gap-4 md:grid-cols-4'>
            <SummaryCard
              title='Statut'
              value={getEntityStatusMeta(parent.statusId).label}
              description='Cycle de vie actuel du compte parent.'
            />
            <SummaryCard
              title='Ecoles'
              value={String(schools.length)}
              description='Ecoles actuellement liees a ce parent.'
            />
            <SummaryCard
              title='Enfants'
              value={String(children.length)}
              description='Enfants actuellement rattaches a ce parent.'
            />
            <SummaryCard
              title='Impayes'
              value={formatCurrency(outstandingAmount)}
              description={`${unpaidInstallments.length} echeance${unpaidInstallments.length === 1 ? '' : 's'} impayee${unpaidInstallments.length === 1 ? '' : 's'} dans l historique.`}
            />
          </section>

          <section className='grid gap-4 xl:grid-cols-[0.95fr_1.05fr]'>
            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <UserRound className='h-5 w-5 text-primary' />
                    Profil du parent
                  </CardTitle>
                  <CardDescription>
                    Coordonnees et informations d identite retournees par la
                    fiche parent EduFrais.
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
                  label='Nom complet'
                  value={buildFullName(parent.firstName, parent.lastName)}
                />
                <DetailRow
                  label='Nom du pere'
                  value={parent.fatherName || 'Aucun nom du pere'}
                />
                <DetailRow
                  label='ID civil'
                  value={parent.civilId || 'Aucun ID civil'}
                />
                <DetailRow label='Email' value={parent.email || 'Aucun email'} />
                <DetailRow
                  label='Numero de telephone'
                  value={`+${parent.countryCode} ${parent.phoneNumber || 'Aucun numero de telephone'}`}
                />
                <DetailRow
                  label='Cree le'
                  value={formatDateTime(parent.createdOn)}
                />
                <DetailRow
                  label='Ecoles liees'
                  value={
                    resolvedSchoolNames.length > 0
                      ? resolvedSchoolNames.join(', ')
                      : 'Aucune ecole'
                  }
                />
              </CardContent>
            </Card>

            <Card className='border-border/70'>
              <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle className='flex items-center gap-2'>
                    <Building2 className='h-5 w-5 text-primary' />
                    Dependances ecoles
                  </CardTitle>
                  <CardDescription>
                    Toutes les ecoles actuellement associees a ce parent.
                  </CardDescription>
                </div>
                <Badge variant='outline'>{schools.length} ecoles</Badge>
              </CardHeader>
              <CardContent>
                {schoolsQuery.isLoading ? (
                  <div className='space-y-3'>
                    <Skeleton className='h-12 w-full' />
                    <Skeleton className='h-12 w-full' />
                  </div>
                ) : schools.length === 0 ? (
                  <EmptyState
                    title='Aucune ecole trouvee'
                    description='Le point de terminaison des dependances ecoles du parent a retourne une liste vide.'
                  />
                ) : (
                  <div className='rounded-lg border'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ecole</TableHead>
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
                                  Voir l ecole
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
                    Enfants
                  </CardTitle>
                  <CardDescription>
                    Enfants lies a ce parent, avec leur ecole et leur classe
                    actuelle.
                  </CardDescription>
                </div>
              <Badge variant='outline'>{children.length} enfants</Badge>
            </CardHeader>
            <CardContent>
              {childrenQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : children.length === 0 ? (
                <EmptyState
                  title='Aucun enfant trouve'
                  description='Le point de terminaison des dependances enfants du parent a retourne une liste vide.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enfant</TableHead>
                        <TableHead>Ecole</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Statut</TableHead>
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
                              {child.schoolGradeName || 'Aucune classe assignee'}
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
                                  Voir l enfant
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
                    Echeances
                  </CardTitle>
                  <CardDescription>
                    Historique des frais scolaires retourne pour ce parent et
                    ses enfants.
                  </CardDescription>
                </div>
              <Badge variant='outline'>
                {installments.length} echeances
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
                  title='Aucune echeance trouvee'
                  description='Le point de terminaison de l historique de paiement n a retourne aucune echeance pour ce parent.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Enfant</TableHead>
                        <TableHead>Ecole</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Date d echeance</TableHead>
                        <TableHead>Statut</TableHead>
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
                                  Penalite de retard {formatCurrency(installment.lateFee)}
                                </div>
                              ) : null}
                            </TableCell>
                            <TableCell>
                              <div>{formatDateOnly(installment.dueDate)}</div>
                              <div className='text-xs text-muted-foreground'>
                                Paye le {formatDateOnly(installment.paidDate)}
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
