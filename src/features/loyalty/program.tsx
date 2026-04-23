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

function createEmptyProgramForm(): LoyaltyProgramMutationInput {
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
    createEmptyProgramForm()
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
      setForm(createEmptyProgramForm())
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
      toast.success(program ? 'Loyalty program updated.' : 'Loyalty program created.')
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to save the loyalty program right now.')
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
        getApiErrorMessage(error, 'Unable to update the program status right now.')
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Loyalty Program'
        description='Configure how the school loyalty program works.'
      >
        <EmptyState
          title='Director access required'
          description='This loyalty workspace is available from the director experience.'
        />
      </PageShell>
    )
  }

  if (!hasAssignedSchool) {
    return (
      <PageShell
        title='Loyalty Program'
        description='Configure how the school loyalty program works.'
      >
        <EmptyState
          title='No school assigned'
          description='This director account is not linked to a school yet.'
        />
      </PageShell>
    )
  }

  const canSave = form.programName.trim().length > 0 && !saveMutation.isPending

  return (
    <>
      <PageShell
        title='Loyalty Program'
        description='Create the school loyalty program, decide who can participate, and define the base redemption policy.'
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
                  Enable
                </Button>
              ) : null}
              {program.statusId !== 2 ? (
                <Button
                  variant='outline'
                  onClick={() => setPendingAction('disable')}
                >
                  Disable
                </Button>
              ) : null}
              {program.statusId !== 5 ? (
                <Button
                  variant='destructive'
                  onClick={() => setPendingAction('deleted')}
                >
                  <Trash2 className='h-4 w-4' />
                  Delete
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
      >
        <section className='grid gap-4 xl:grid-cols-[0.85fr_1.15fr]'>
          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>Current program state</CardTitle>
              <CardDescription>
                Snapshot of the active school program currently returned by the loyalty API.
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
                  title='No loyalty program created'
                  description='Use the form to create the first rewards program for this school.'
                />
              ) : (
                <div className='space-y-4'>
                  <div>
                    <div className='text-3xl font-semibold'>{program.programName}</div>
                    <p className='mt-1 text-sm text-muted-foreground'>
                      {program.programDescription || 'No program description yet.'}
                    </p>
                  </div>
                  <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
                    <p>Points label: {program.pointsLabel}</p>
                    <p>Welcome bonus: {program.welcomeBonusPoints}</p>
                    <p>Minimum redeem points: {program.minimumRedeemPoints}</p>
                    <p>
                      Auto-approve redemptions:{' '}
                      {program.autoApproveRedemptions ? 'Yes' : 'No'}
                    </p>
                    <p>
                      Parent participation:{' '}
                      {program.allowParentParticipation ? 'Enabled' : 'Disabled'}
                    </p>
                    <p>
                      Agent participation:{' '}
                      {program.allowAgentParticipation ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div className='text-sm text-muted-foreground'>
                    Created {formatDateTime(program.createdOn)} and last updated{' '}
                    {formatDateTime(program.modifiedOn)}.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle>{program ? 'Update loyalty program' : 'Create loyalty program'}</CardTitle>
              <CardDescription>
                This defines the school-wide loyalty settings that rules, rewards, members, and redemptions inherit from.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='grid gap-2 sm:col-span-2'>
                  <Label htmlFor='program-name'>Program name</Label>
                  <Input
                    id='program-name'
                    value={form.programName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        programName: event.target.value,
                      }))
                    }
                    placeholder='EduFrais Rewards'
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
                    placeholder='Explain how this loyalty program should feel for parents and agents.'
                  />
                </div>

                <div className='grid gap-2'>
                  <Label htmlFor='points-label'>Points label</Label>
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
                  <Label htmlFor='welcome-bonus'>Welcome bonus points</Label>
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
                  <Label htmlFor='minimum-redeem'>Minimum redeem points</Label>
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
                  <Label htmlFor='starts-on'>Start date</Label>
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
                  <Label htmlFor='ends-on'>End date</Label>
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
                  <Label htmlFor='terms'>Terms and conditions</Label>
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
                    placeholder='Optional redemption conditions, expiry notes, or school policy language.'
                  />
                </div>
              </div>

              <div className='grid gap-3'>
                <div className='flex items-center justify-between rounded-xl border p-4'>
                  <div>
                    <p className='font-medium'>Auto-approve redemptions</p>
                    <p className='text-sm text-muted-foreground'>
                      If disabled, redemptions stay pending until the director reviews them.
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
                    <p className='font-medium'>Allow parent participation</p>
                    <p className='text-sm text-muted-foreground'>
                      Parents can be enrolled and earn points through school activity.
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
                    <p className='font-medium'>Allow collecting agent participation</p>
                    <p className='text-sm text-muted-foreground'>
                      Agents can join the loyalty program and track their own points.
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
                  ? 'Saving...'
                  : program
                    ? 'Update program'
                    : 'Create program'}
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
                ? 'Delete loyalty program?'
                : pendingAction === 'disable'
                  ? 'Disable loyalty program?'
                  : 'Enable loyalty program?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'deleted'
                ? 'The program will be marked as deleted and hidden from active use.'
                : pendingAction === 'disable'
                  ? 'The program will remain in history but new activity should stop.'
                  : 'The program will become the active school loyalty program again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => statusMutation.mutate()}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
