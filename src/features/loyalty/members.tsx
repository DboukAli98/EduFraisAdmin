import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpenText, Coins, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import {
  buildFullName,
  formatDateTime,
  getEntityStatusMeta,
} from '@/features/admin/utils'
import { fetchCollectingAgents } from '@/features/collecting-agents/api'
import { fetchParents } from '@/features/users/api'
import { getApiErrorMessage } from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'
import {
  adjustLoyaltyMemberPoints,
  enrollLoyaltyMember,
  fetchLoyaltyMemberLedger,
  fetchLoyaltyMembers,
  fetchLoyaltyProgram,
  type LoyaltyLedgerEntry,
  type LoyaltyMember,
  type LoyaltyMemberType,
} from './api'
import {
  formatPoints,
  getLoyaltyEntryTypeLabel,
  getLoyaltyMemberTypeLabel,
  getLoyaltyReferenceTypeLabel,
  loyaltyMemberTypeOptions,
  useDirectorLoyaltyScope,
} from './utils'

type EnrollmentForm = {
  memberType: LoyaltyMemberType
  memberEntityId: string
}

type AdjustmentForm = {
  pointsDelta: string
  reason: string
}

function createEmptyEnrollmentForm(): EnrollmentForm {
  return {
    memberType: 'Parent',
    memberEntityId: '',
  }
}

function createEmptyAdjustmentForm(): AdjustmentForm {
  return {
    pointsDelta: '',
    reason: '',
  }
}

function getLedgerTone(pointsDelta: number): string {
  if (pointsDelta > 0) {
    return 'text-emerald-600 dark:text-emerald-400'
  }

  if (pointsDelta < 0) {
    return 'text-rose-600 dark:text-rose-400'
  }

  return 'text-muted-foreground'
}

export function LoyaltyMembersManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [search, setSearch] = useState('')
  const [memberTypeFiltre, setMemberTypeFiltre] = useState<
    LoyaltyMemberType | 'all'
  >('all')
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false)
  const [enrollmentForm, setEnrollmentForm] = useState<EnrollmentForm>(
    createEmptyEnrollmentForm()
  )
  const [memberForAdjustment, setMemberForAdjustment] =
    useState<LoyaltyMember | null>(null)
  const [adjustmentForm, setAdjustmentForm] = useState<AdjustmentForm>(
    createEmptyAdjustmentForm()
  )
  const [memberForLedger, setMemberForLedger] = useState<LoyaltyMember | null>(null)

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  const membersQuery = useQuery({
    queryKey: ['loyalty', 'members', schoolId, program?.id],
    queryFn: () =>
      fetchLoyaltyMembers({
        schoolId,
        loyaltyProgramId: program?.id,
      }),
    enabled: hasAssignedSchool && Boolean(program?.id),
  })

  const parentsQuery = useQuery({
    queryKey: ['loyalty', 'members', 'parents', schoolId],
    queryFn: () => fetchParents({ schoolId }),
    enabled:
      hasAssignedSchool &&
      Boolean(program?.id) &&
      Boolean(program?.allowParentParticipation),
  })

  const agentsQuery = useQuery({
    queryKey: ['loyalty', 'members', 'agents', schoolId],
    queryFn: () => fetchCollectingAgents(schoolId),
    enabled:
      hasAssignedSchool &&
      Boolean(program?.id) &&
      Boolean(program?.allowAgentParticipation),
  })

  const ledgerQuery = useQuery({
    queryKey: ['loyalty', 'member-ledger', memberForLedger?.id],
    queryFn: () => fetchLoyaltyMemberLedger(memberForLedger!.id),
    enabled: Boolean(memberForLedger?.id),
  })

  useEffect(() => {
    if (!isEnrollDialogOpen) {
      setEnrollmentForm(createEmptyEnrollmentForm())
    }
  }, [isEnrollDialogOpen])

  useEffect(() => {
    if (!memberForAdjustment) {
      setAdjustmentForm(createEmptyAdjustmentForm())
    }
  }, [memberForAdjustment])

  useEffect(() => {
    if (!program) {
      return
    }

    if (
      enrollmentForm.memberType === 'Parent' &&
      !program.allowParentParticipation &&
      program.allowAgentParticipation
    ) {
      setEnrollmentForm((current) => ({
        ...current,
        memberType: 'CollectingAgent',
        memberEntityId: '',
      }))
    }

    if (
      enrollmentForm.memberType === 'CollectingAgent' &&
      !program.allowAgentParticipation &&
      program.allowParentParticipation
    ) {
      setEnrollmentForm((current) => ({
        ...current,
        memberType: 'Parent',
        memberEntityId: '',
      }))
    }
  }, [enrollmentForm.memberType, program])

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!program) {
        return
      }

      await enrollLoyaltyMember(program.id, {
        memberType: enrollmentForm.memberType,
        memberEntityId: Number(enrollmentForm.memberEntityId),
      })
    },
    onSuccess: () => {
      toast.success('Membre inscrit au programme de fidelite.')
      setIsEnrollDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Impossible d inscrire ce membre.')
      )
    },
  })

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!memberForAdjustment) {
        return
      }

      await adjustLoyaltyMemberPoints(memberForAdjustment.id, adjustmentForm)
    },
    onSuccess: () => {
      toast.success('Ajustement de points enregistre.')
      const ledgerMemberId = memberForAdjustment?.id
      setMemberForAdjustment(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
      if (ledgerMemberId) {
        void queryClient.invalidateQueries({
          queryKey: ['loyalty', 'member-ledger', ledgerMemberId],
        })
      }
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible d enregistrer l ajustement de points.'
        )
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Membres fidelite'
        description='Inscrivez des parents et des agents collecteurs, suivez les soldes et consultez l historique de chaque membre.'
      >
        <EmptyState
          title='Acces directeur requis'
          description='Cet espace fidelite est disponible depuis l experience directeur.'
        />
      </PageShell>
    )
  }

  if (!hasAssignedSchool) {
    return (
      <PageShell
        title='Membres fidelite'
        description='Inscrivez des parents et des agents collecteurs, suivez les soldes et consultez l historique de chaque membre.'
      >
        <EmptyState
          title='Aucune ecole affectee'
          description='Ce compte directeur n est pas encore lie a une ecole.'
        />
      </PageShell>
    )
  }

  if (programQuery.isLoading) {
    return (
      <PageShell
        title='Membres fidelite'
        description='Inscrivez des parents et des agents collecteurs, suivez les soldes et consultez l historique de chaque membre.'
      >
        <Card className='border-border/70'>
          <CardContent className='space-y-3 p-6'>
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
            <Skeleton className='h-12 w-full' />
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  if (!program) {
    return (
      <PageShell
        title='Membres fidelite'
        description='Inscrivez des parents et des agents collecteurs, suivez les soldes et consultez l historique de chaque membre.'
      >
        <EmptyState
          title='Creez d abord le programme'
          description='Les membres ne peuvent etre inscrits qu apres la creation du programme de fidelite de l ecole.'
        />
      </PageShell>
    )
  }

  const allMembres = membersQuery.data ?? []
  const normalizedSearch = search.trim().toLowerCase()
  const filteredMembres = allMembres.filter((member) => {
    if (memberTypeFiltre !== 'all' && member.memberType !== memberTypeFiltre) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return (
      member.fullName.toLowerCase().includes(normalizedSearch) ||
      (member.email ?? '').toLowerCase().includes(normalizedSearch) ||
      (member.phoneNumber ?? '').toLowerCase().includes(normalizedSearch)
    )
  })
  const parentMembres = allMembres.filter((member) => member.memberType === 'Parent')
  const agentMembres = allMembres.filter(
    (member) => member.memberType === 'CollectingAgent'
  )
  const outstandingPoints = allMembres.reduce(
    (sum, member) => sum + member.currentPointsBalance,
    0
  )

  const enrolledParentIds = new Set(
    allMembres
      .filter((member) => member.memberType === 'Parent' && member.statusId !== 5)
      .map((member) => member.memberEntityId)
  )
  const enrolledAgentIds = new Set(
    allMembres
      .filter(
        (member) => member.memberType === 'CollectingAgent' && member.statusId !== 5
      )
      .map((member) => member.memberEntityId)
  )

  const availableParents = (parentsQuery.data ?? []).filter(
    (parent) => !enrolledParentIds.has(parent.id)
  )
  const availableAgents = (agentsQuery.data ?? []).filter(
    (agent) => !enrolledAgentIds.has(agent.id)
  )

  const enrollmentOptions =
    enrollmentForm.memberType === 'Parent'
      ? availableParents.map((parent) => ({
          value: String(parent.id),
          label:
            buildFullName(parent.firstName, parent.lastName) || `Parent ${parent.id}`,
          meta: parent.email || `${parent.countryCode}${parent.phoneNumber}`,
        }))
      : availableAgents.map((agent) => ({
          value: String(agent.id),
          label:
            buildFullName(agent.firstName, agent.lastName) || `Agent ${agent.id}`,
          meta: agent.email || `${agent.countryCode}${agent.phoneNumber}`,
        }))

  const canOpenEnrollment =
    program.allowParentParticipation || program.allowAgentParticipation
  const canEnroll =
    enrollmentForm.memberEntityId.length > 0 && !enrollMutation.isPending
  const canAdjust =
    adjustmentForm.reason.trim().length > 0 &&
    Number(adjustmentForm.pointsDelta) !== 0 &&
    !adjustMutation.isPending
  const ledgerEntries: LoyaltyLedgerEntry[] = ledgerQuery.data ?? []

  return (
    <>
      <PageShell
        title='Membres fidelite'
        description='Integrez parents et agents collecteurs au programme de fidelite, suivez les soldes et appliquez des ajustements manuels si besoin.'
        actions={
          <Button
            onClick={() => setIsEnrollDialogOpen(true)}
            disabled={!canOpenEnrollment}
          >
            <Plus className='h-4 w-4' />
            Inscrire un membre
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-4'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Total des membres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(allMembres.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Membres actuellement inscrits dans {program.programName}.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Membres parents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(parentMembres.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Comptes fidelite parent lies a l ecole.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Membres agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(agentMembres.length)}</div>
              <p className='text-sm text-muted-foreground'>
                Agents collecteurs participant a ce programme.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Points en circulation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(outstandingPoints)}</div>
              <p className='text-sm text-muted-foreground'>
                Solde actuel de tous les membres inscrits.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className='grid gap-4 md:grid-cols-[1fr_220px]'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Rechercher des membres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Rechercher par nom, e-mail ou numero de telephone'
                />
              </div>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Filtre
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={memberTypeFiltre}
                onValueChange={(value) =>
                  setMemberTypeFiltre(value as LoyaltyMemberType | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tous les types de membres</SelectItem>
                  {loyaltyMemberTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Membres fidelite inscrits</CardTitle>
            <CardDescription>
              Verifiez les soldes, l activite et le statut de chaque membre avant d approuver les redemptions ou d appliquer des ajustements manuels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {membersQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredMembres.length === 0 ? (
              <EmptyState
                title='Aucun membre fidelite trouve'
                description='Inscrivez des parents ou des agents collecteurs pour commencer a suivre les soldes et les redemptions.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Solde actuel</TableHead>
                      <TableHead>Total cumule gagne</TableHead>
                      <TableHead>Derniere activite</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembres.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                            <div className='font-medium'>{member.fullName}</div>
                            <div className='text-xs text-muted-foreground'>
                              {member.email || member.phoneNumber || 'Aucune coordonnee'}
                            </div>
                          </TableCell>
                        <TableCell>{getLoyaltyMemberTypeLabel(member.memberType)}</TableCell>
                        <TableCell>{formatPoints(member.currentPointsBalance)}</TableCell>
                        <TableCell>{formatPoints(member.lifetimePointsEarned)}</TableCell>
                        <TableCell>{formatDateTime(member.lastActivityOn)}</TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={getEntityStatusMeta(member.statusId).className}
                          >
                            {getEntityStatusMeta(member.statusId).label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setMemberForLedger(member)}
                            >
                              <BookOpenText className='h-4 w-4' />
                              Historique
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setMemberForAdjustment(member)}
                            >
                              <Coins className='h-4 w-4' />
                              Ajuster les points
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </PageShell>

      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Inscrire un membre fidelite</DialogTitle>
            <DialogDescription>
              Ajoutez un parent ou un agent collecteur au programme de fidelite afin de suivre les points sur son compte.
            </DialogDescription>
          </DialogHeader>

          {!canOpenEnrollment ? (
              <EmptyState
                title='Participation desactivee'
                description='Activez la participation des parents ou des agents dans les parametres du programme avant d inscrire des membres.'
              />
          ) : (
            <div className='grid gap-4'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2'>
                  <Label>Type de membre</Label>
                  <Select
                    value={enrollmentForm.memberType}
                    onValueChange={(value) =>
                      setEnrollmentForm({
                        memberType: value as LoyaltyMemberType,
                        memberEntityId: '',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {program.allowParentParticipation ? (
                        <SelectItem value='Parent'>Parents</SelectItem>
                      ) : null}
                      {program.allowAgentParticipation ? (
                          <SelectItem value='CollectingAgent'>
                          Agents collecteurs
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>

                <div className='grid gap-2'>
                  <Label>Membre</Label>
                  <Select
                    value={enrollmentForm.memberEntityId || 'none'}
                    onValueChange={(value) =>
                      setEnrollmentForm((current) => ({
                        ...current,
                        memberEntityId: value === 'none' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Selectionnez un membre a inscrire' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='none'>Selectionnez un membre</SelectItem>
                      {enrollmentOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {enrollmentOptions.length === 0 ? (
                  <div className='rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground'>
                  Tous les profils de ce type sont deja inscrits, ou aucun enregistrement n est encore disponible.
                </div>
              ) : (
                <div className='rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground'>
                  {enrollmentOptions.find(
                    (option) => option.value === enrollmentForm.memberEntityId
                  )?.meta || 'Choisissez un membre pour consulter ses coordonnees.'}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsEnrollDialogOpen(false)}
              disabled={enrollMutation.isPending}
            >
              Annuler
            </Button>
            <Button disabled={!canEnroll} onClick={() => enrollMutation.mutate()}>
              <Plus className='h-4 w-4' />
              {enrollMutation.isPending ? 'Inscription...' : 'Inscrire un membre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberForAdjustment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberForAdjustment(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Ajuster les points</DialogTitle>
            <DialogDescription>
              Ajoutez ou retirez des points a{' '}
              <span className='font-medium'>{memberForAdjustment?.fullName}</span>.
              Utilisez un nombre negatif pour deduire des points.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='points-delta'>Variation des points</Label>
              <Input
                id='points-delta'
                inputMode='numeric'
                value={adjustmentForm.pointsDelta}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    pointsDelta: event.target.value,
                  }))
                }
                placeholder='Exemple : 50 ou -20'
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='adjustment-reason'>Motif</Label>
              <Textarea
                id='adjustment-reason'
                rows={4}
                value={adjustmentForm.reason}
                onChange={(event) =>
                  setAdjustmentForm((current) => ({
                    ...current,
                    reason: event.target.value,
                  }))
                }
                placeholder='Expliquez pourquoi cet ajustement manuel est applique.'
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setMemberForAdjustment(null)}
              disabled={adjustMutation.isPending}
            >
              Annuler
            </Button>
            <Button disabled={!canAdjust} onClick={() => adjustMutation.mutate()}>
              <SlidersHorizontal className='h-4 w-4' />
              {adjustMutation.isPending ? 'Enregistrement...' : 'Enregistrer l ajustement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberForLedger !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberForLedger(null)
          }
        }}
      >
        <DialogContent className='sm:max-w-5xl'>
          <DialogHeader>
            <DialogTitle>Historique fidelite</DialogTitle>
            <DialogDescription>
              Historique detaille des points pour{' '}
              <span className='font-medium'>{memberForLedger?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>

          {ledgerQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
              <Skeleton className='h-12 w-full' />
            </div>
          ) : ledgerEntries.length === 0 ? (
            <EmptyState
              title='Aucune ecriture historique'
              description='Ce membre n a encore gagne, utilise ou ajuste aucun point.'
            />
          ) : (
            <div className='rounded-lg border'>
              <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>Cree le</TableHead>
                      <TableHead>Entree</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Solde</TableHead>
                      <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDateTime(entry.createdOn)}</TableCell>
                      <TableCell>
                        <div className='font-medium'>
                          {getLoyaltyEntryTypeLabel(entry.entryType)}
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {entry.createdByUserId || 'Genere par le systeme'}
                        </div>
                      </TableCell>
                      <TableCell>{getLoyaltyReferenceTypeLabel(entry.referenceType)}</TableCell>
                      <TableCell className={getLedgerTone(entry.pointsDelta)}>
                        {entry.pointsDelta > 0 ? '+' : ''}
                        {formatPoints(entry.pointsDelta)}
                      </TableCell>
                      <TableCell>
                        {formatPoints(entry.balanceBefore)} a{' '}
                        {formatPoints(entry.balanceAfter)}
                      </TableCell>
                      <TableCell>{entry.description || 'Aucune description'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}


