import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { formatDateTime, getEntityStatusMeta } from '@/features/admin/utils'
import { getApiErrorMessage } from '@/lib/api'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  createLoyaltyProgram,
  fetchLoyaltyProgram,
  setLoyaltyProgramStatus,
  updateLoyaltyProgram,
  type LoyaltyLifecycleAction,
  type LoyaltyProgramMutationInput,
} from './api'
import { toDateInputValue, useDirectorLoyaltyScope } from './utils'

type StatusAction = LoyaltyLifecycleAction | null

function createEmptyProgrammeForm(): LoyaltyProgramMutationInput {
  return {
    programName: '',
    programDescription: '',
    pointsLabel: 'Points',
    welcomeBonusPoints: '0',
    minimumRedeemPoints: '0',
    autoApproveRedemptions: false,
    allowParentParticipation: true,
    allowAgentParticipation: true,
    termsAndConditions: '',
    startsOn: '',
    endsOn: '',
  }
}

export function LoyaltyProgramManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [form, setForm] = useState<LoyaltyProgramMutationInput>(
    createEmptyProgrammeForm()
  )
  const [pendingAction, setPendingAction] = useState<StatusAction>(null)

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  useEffect(() => {
    if (!program) {
      setForm(createEmptyProgrammeForm())
      return
    }

    setForm({
      programName: program.programName,
      programDescription: program.programDescription ?? '',
      pointsLabel: program.pointsLabel || 'Points',
      welcomeBonusPoints: String(program.welcomeBonusPoints),
      minimumRedeemPoints: String(program.minimumRedeemPoints),
      autoApproveRedemptions: program.autoApproveRedemptions,
      allowParentParticipation: program.allowParentParticipation,
      allowAgentParticipation: program.allowAgentParticipation,
      termsAndConditions: program.termsAndConditions ?? '',
      startsOn: toDateInputValue(program.startsOn),
      endsOn: toDateInputValue(program.endsOn),
    })
  }, [program])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (program) {
        await updateLoyaltyProgram(program.id, program.statusId, form)
        return
      }

      await createLoyaltyProgram(schoolId, form)
    },
    onSuccess: () => {
      toast.success(
        program
          ? 'Programme de fidelite mis a jour.'
          : 'Programme de fidelite cree.'
      )
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible d enregistrer le programme de fidelite pour le moment.'
        )
      )
    },
  })

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!program || !pendingAction) {
        return ''
      }

      return setLoyaltyProgramStatus(program.id, pendingAction)
    },
    onSuccess: (message) => {
      toast.success(message)
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de mettre a jour le statut du programme pour le moment.'
        )
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Programme fidelite'
        description='Configurez le fonctionnement du programme de fidelite de l ecole.'
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
        title='Programme fidelite'
        description='Configurez le fonctionnement du programme de fidelite de l ecole.'
      >
        <EmptyState
          title='Aucune ecole affectee'
          description='Ce compte directeur n est pas encore lie a une ecole.'
        />
      </PageShell>
    )
  }

  const canSave = form.programName.trim().length > 0 && !saveMutation.isPending

  return (
    <>
      <PageShell
        title='Programme fidelite'
        description='Creez le programme de fidelite de l ecole, choisissez les participants et definissez la politique de redemption de base.'
        actions={
          program ? (
            <div className='flex flex-wrap gap-2'>
              <Badge
                variant='outline'
                className={getEntityStatusMeta(program.statusId).className}
              >
                {getEntityStatusMeta(program.statusId).label}
              </Badge>
              {program.statusId !== 1 ? (
                <Button
                  variant='outline'
                  onClick={() => setPendingAction('enable')}
                >
                  <ShieldCheck className='h-4 w-4' />
                  Activer
                </Button>
              ) : null}
              {program.statusId !== 2 ? (
                <Button
                  variant='outline'
                  onClick={() => setPendingAction('disable')}
                >
                  Desactiver
                </Button>
              ) : null}
              {program.statusId !== 5 ? (
                <Button
                  variant='destructive'
                  onClick={() => setPendingAction('deleted')}
                >
                  <Trash2 className='h-4 w-4' />
                  Supprimer
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        <section className='grid gap-4 xl:grid-cols-[0.85fr_1.15fr]'>
          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>Etat actuel du programme</CardTitle>
              <CardDescription>
                Apercu du programme actif de l ecole retourne par l API fidelite.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {programQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-10 w-48' />
                  <Skeleton className='h-5 w-full' />
                  <Skeleton className='h-5 w-2/3' />
                </div>
              ) : !program ? (
                <EmptyState
                  title='Aucun programme de fidelite cree'
                  description='Utilisez le formulaire pour creer le premier programme de recompenses de cette ecole.'
                />
              ) : (
                <div className='space-y-4'>
                  <div>
                    <div className='text-3xl font-semibold'>{program.programName}</div>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {program.programDescription || 'Aucune description du programme pour le moment.'}
                    </p>
                  </div>
                  <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
                    <p>Libelle des points : {program.pointsLabel}</p>
                    <p>Bonus de bienvenue : {program.welcomeBonusPoints}</p>
                    <p>Minimum de redemption : {program.minimumRedeemPoints}</p>
                    <p>
                      Approbation automatique des redemptions :{' '}
                      {program.autoApproveRedemptions ? 'Oui' : 'Non'}
                    </p>
                    <p>
                      Participation des parents :{' '}
                      {program.allowParentParticipation ? 'Activee' : 'Desactivee'}
                    </p>
                    <p>
                      Participation des agents :{' '}
                      {program.allowAgentParticipation ? 'Activee' : 'Desactivee'}
                    </p>
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Cree le {formatDateTime(program.createdOn)} et mis a jour pour la
                    derniere fois le {formatDateTime(program.modifiedOn)}.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>
                {program
                  ? 'Mettre a jour le programme de fidelite'
                  : 'Creer le programme de fidelite'}
              </CardTitle>
              <CardDescription>
                Ceci definit les parametres de fidelite de l ecole que les regles, recompenses, membres et redemptions utilisent.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2 sm:col-span-2'>
                  <Label htmlFor='program-name'>Nom du programme</Label>
                  <Input
                    id='program-name'
                    value={form.programName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        programName: event.target.value,
                      }))
                    }
                    placeholder='EduFrais Recompenses'
                  />
                </div>

                <div className='grid gap-2 sm:col-span-2'>
                  <Label htmlFor='program-description'>Description</Label>
                  <Textarea
                    id='program-description'
                    rows={4}
                    value={form.programDescription}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        programDescription: event.target.value,
                      }))
                    }
                    placeholder='Expliquez comment ce programme de fidelite doit fonctionner pour les parents et les agents.'
                  />
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='points-label'>Libelle des points</Label>
                  <Input
                    id='points-label'
                    value={form.pointsLabel}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        pointsLabel: event.target.value,
                      }))
                    }
                    placeholder='Points'
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='welcome-bonus'>Points de bonus de bienvenue</Label>
                  <Input
                    id='welcome-bonus'
                    inputMode='numeric'
                    value={form.welcomeBonusPoints}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        welcomeBonusPoints: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='minimum-redeem'>Points minimum de redemption</Label>
                  <Input
                    id='minimum-redeem'
                    inputMode='numeric'
                    value={form.minimumRedeemPoints}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        minimumRedeemPoints: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className='grid gap-2'>
                  <Label htmlFor='starts-on'>Date de debut</Label>
                  <Input
                    id='starts-on'
                    type='date'
                    value={form.startsOn}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startsOn: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='ends-on'>Date de fin</Label>
                  <Input
                    id='ends-on'
                    type='date'
                    value={form.endsOn}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endsOn: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className='grid gap-2 sm:col-span-2'>
                  <Label htmlFor='terms'>Conditions generales</Label>
                  <Textarea
                    id='terms'
                    rows={5}
                    value={form.termsAndConditions}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        termsAndConditions: event.target.value,
                      }))
                    }
                    placeholder='Conditions de redemption, notes d expiration ou politique de l ecole, si necessaire.'
                  />
                </div>
              </div>

              <div className='grid gap-3'>
                <div className='flex items-center justify-between rounded-xl border p-4'>
                  <div>
                    <p className='font-medium'>Approbation automatique des redemptions</p>
                    <p className='text-sm text-muted-foreground'>
                      Si desactive, les redemptions restent en attente jusqu a la revue du directeur.
                    </p>
                  </div>
                  <Switch
                    checked={form.autoApproveRedemptions}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        autoApproveRedemptions: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between rounded-xl border p-4'>
                  <div>
                    <p className='font-medium'>Autoriser la participation des parents</p>
                    <p className='text-sm text-muted-foreground'>
                      Les parents peuvent etre inscrits et gagner des points grace a l activite scolaire.
                    </p>
                  </div>
                  <Switch
                    checked={form.allowParentParticipation}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        allowParentParticipation: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between rounded-xl border p-4'>
                  <div>
                    <p className='font-medium'>Autoriser la participation des agents collecteurs</p>
                    <p className='text-sm text-muted-foreground'>
                      Les agents peuvent rejoindre le programme de fidelite et suivre leurs propres points.
                    </p>
                  </div>
                  <Switch
                    checked={form.allowAgentParticipation}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        allowAgentParticipation: checked,
                      }))
                    }
                  />
                </div>
              </div>

              <Button disabled={!canSave} onClick={() => saveMutation.mutate()}>
                <Save className='h-4 w-4' />
                {saveMutation.isPending
                  ? 'Enregistrement...'
                  : program
                    ? 'Mettre a jour le programme'
                    : 'Creer le programme'}
              </Button>
            </CardContent>
          </Card>
        </section>
      </PageShell>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'deleted'
                ? 'Supprimer le programme de fidelite ?'
                : pendingAction === 'disable'
                  ? 'Desactiver le programme de fidelite ?'
                  : 'Activer le programme de fidelite ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'deleted'
                ? 'Le programme sera marque comme supprime et retire de l usage actif.'
                : pendingAction === 'disable'
                  ? 'Le programme restera dans l historique mais les nouvelles activites devront s arreter.'
                  : 'Le programme redeviendra le programme de fidelite actif de l ecole.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Mise a jour...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}


