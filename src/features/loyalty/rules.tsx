import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, Save, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { getEntityStatusMeta } from '@/features/admin/utils'
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
  createLoyaltyRule,
  fetchLoyaltyProgram,
  fetchLoyaltyRules,
  setLoyaltyRuleStatus,
  updateLoyaltyRule,
  type LoyaltyLifecycleAction,
  type LoyaltyRule,
  type LoyaltyRuleMutationInput,
} from './api'
import {
  formatPoints,
  loyaltyMemberTypeOptions,
  loyaltyPeriodTypeOptions,
  loyaltyTriggerTypeOptions,
  toDateInputValue,
  useDirectorLoyaltyScope,
} from './utils'

type PendingRuleAction =
  | {
      rule: LoyaltyRule
      action: LoyaltyLifecycleAction
    }
  | null

function createEmptyRuleForm(rule?: LoyaltyRule | null): LoyaltyRuleMutationInput {
  return {
    ruleName: rule?.ruleName ?? '',
    ruleDescription: rule?.ruleDescription ?? '',
    memberType: rule?.memberType ?? 'Parent',
    triggerType: rule?.triggerType ?? 'SchoolFeePaymentProcessed',
    pointsAwarded: rule ? String(rule.pointsAwarded) : '0',
    minimumAmount:
      rule?.minimumAmount != null ? String(rule.minimumAmount) : '',
    requiresOnTimePayment: rule?.requiresOnTimePayment ?? false,
    requiresFullPayment: rule?.requiresFullPayment ?? false,
    maxAwardsPerMember:
      rule?.maxAwardsPerMember != null ? String(rule.maxAwardsPerMember) : '',
    periodType: rule?.periodType ?? 'None',
    executionOrder: rule ? String(rule.executionOrder) : '0',
    canStackWithOtherRules: rule?.canStackWithOtherRules ?? true,
    validFrom: toDateInputValue(rule?.validFrom),
    validTo: toDateInputValue(rule?.validTo),
  }
}

export function LoyaltyRulesManagementPage() {
  const queryClient = useQueryClient()
  const { isDirector, schoolId, hasAssignedSchool } = useDirectorLoyaltyScope()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null)
  const [form, setForm] = useState<LoyaltyRuleMutationInput>(
    createEmptyRuleForm()
  )
  const [pendingAction, setPendingAction] = useState<PendingRuleAction>(null)

  const programQuery = useQuery({
    queryKey: ['loyalty', 'program', schoolId],
    queryFn: () => fetchLoyaltyProgram(schoolId),
    enabled: hasAssignedSchool,
  })

  const program = programQuery.data

  const rulesQuery = useQuery({
    queryKey: ['loyalty', 'rules', program?.id],
    queryFn: () => fetchLoyaltyRules(program!.id),
    enabled: Boolean(program?.id),
  })

  useEffect(() => {
    if (!isDialogOpen) {
      setEditingRule(null)
      setForm(createEmptyRuleForm())
    }
  }, [isDialogOpen])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!program) {
        return
      }

      if (editingRule) {
        await updateLoyaltyRule(editingRule.id, editingRule.statusId, form)
        return
      }

      await createLoyaltyRule(program.id, form)
    },
    onSuccess: () => {
      toast.success(editingRule ? 'Rule updated.' : 'Rule created.')
      setIsDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Unable to save the loyalty rule.'))
    },
  })

  const actionMutation = useMutation({
    mutationFn: async () => {
      if (!pendingAction) {
        return ''
      }

      return setLoyaltyRuleStatus(pendingAction.rule.id, pendingAction.action)
    },
    onSuccess: (message) => {
      toast.success(message)
      setPendingAction(null)
      void queryClient.invalidateQueries({ queryKey: ['loyalty'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update the loyalty rule status.')
      )
    },
  })

  if (!isDirector) {
    return (
      <PageShell
        title='Loyalty Rules'
        description='Define which activities earn points and how often members can claim them.'
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
        title='Loyalty Rules'
        description='Define which activities earn points and how often members can claim them.'
      >
        <EmptyState
          title='No school assigned'
          description='This director account is not linked to a school yet.'
        />
      </PageShell>
    )
  }

  if (programQuery.isLoading) {
    return (
      <PageShell
        title='Loyalty Rules'
        description='Define which activities earn points and how often members can claim them.'
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
        title='Loyalty Rules'
        description='Define which activities earn points and how often members can claim them.'
      >
        <EmptyState
          title='Create the program first'
          description='Rules can only be configured after the school loyalty program is created.'
        />
      </PageShell>
    )
  }

  const allRules = rulesQuery.data ?? []
  const filteredRules = allRules.filter((rule) => {
    const normalizedSearch = search.trim().toLowerCase()

    if (!normalizedSearch) {
      return true
    }

    return (
      rule.ruleName.toLowerCase().includes(normalizedSearch) ||
      (rule.ruleDescription ?? '').toLowerCase().includes(normalizedSearch) ||
      rule.memberType.toLowerCase().includes(normalizedSearch) ||
      rule.triggerType.toLowerCase().includes(normalizedSearch)
    )
  })
  const activeRules = allRules.filter((rule) => rule.statusId === 1).length
  const canSave =
    form.ruleName.trim().length > 0 &&
    Number(form.pointsAwarded) > 0 &&
    !saveMutation.isPending

  return (
    <>
      <PageShell
        title='Loyalty Rules'
        description='Reward exactly the behaviors the school wants to encourage, from on-time fees to field collections.'
        actions={
          <Button
            onClick={() => {
              setEditingRule(null)
              setForm(createEmptyRuleForm())
              setIsDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Add rule
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-3'>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Program
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{program.programName}</div>
              <p className='text-sm text-muted-foreground'>
                {program.pointsLabel} earning logic for this school.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Active rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-semibold'>{formatPoints(activeRules)}</div>
              <p className='text-sm text-muted-foreground'>
                Rules currently enabled for earning logic.
              </p>
            </CardContent>
          </Card>
          <Card className='border-border/70'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>
                Search rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='relative'>
                <Search className='pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                <Input
                  className='pl-9'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder='Search by rule name, trigger, or member type'
                />
              </div>
            </CardContent>
          </Card>
        </section>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Configured earning rules</CardTitle>
            <CardDescription>
              Rules are evaluated in execution-order sequence and can optionally stack with other rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rulesQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : filteredRules.length === 0 ? (
              <EmptyState
                title='No loyalty rules found'
                description='Create the first rule to start awarding points automatically or manually.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRules
                      .slice()
                      .sort((left, right) => left.executionOrder - right.executionOrder)
                      .map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div className='font-medium'>{rule.ruleName}</div>
                            <div className='text-xs text-muted-foreground'>
                              Order {rule.executionOrder}
                              {rule.requiresOnTimePayment ? ' • On-time only' : ''}
                              {rule.requiresFullPayment ? ' • Full payment only' : ''}
                            </div>
                          </TableCell>
                          <TableCell>{rule.memberType}</TableCell>
                          <TableCell>{rule.triggerType}</TableCell>
                          <TableCell>{formatPoints(rule.pointsAwarded)}</TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className={getEntityStatusMeta(rule.statusId).className}
                            >
                              {getEntityStatusMeta(rule.statusId).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className='flex justify-end gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                  setEditingRule(rule)
                                  setForm(createEmptyRuleForm(rule))
                                  setIsDialogOpen(true)
                                }}
                              >
                                <Pencil className='h-4 w-4' />
                                Edit
                              </Button>
                              {rule.statusId !== 1 ? (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    setPendingAction({ rule, action: 'enable' })
                                  }
                                >
                                  <Power className='h-4 w-4' />
                                  Enable
                                </Button>
                              ) : (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    setPendingAction({ rule, action: 'disable' })
                                  }
                                >
                                  <Power className='h-4 w-4' />
                                  Disable
                                </Button>
                              )}
                              <Button
                                variant='destructive'
                                size='sm'
                                onClick={() =>
                                  setPendingAction({ rule, action: 'deleted' })
                                }
                              >
                                <Trash2 className='h-4 w-4' />
                                Delete
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-3xl'>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Edit loyalty rule' : 'Add loyalty rule'}
            </DialogTitle>
            <DialogDescription>
              Define who earns points, what activity triggers the award, and any redemption constraints.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='rule-name'>Rule name</Label>
              <Input
                id='rule-name'
                value={form.ruleName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruleName: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='rule-description'>Description</Label>
              <Textarea
                id='rule-description'
                rows={3}
                value={form.ruleDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruleDescription: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label>Member type</Label>
                <Select
                  value={form.memberType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      memberType: value as LoyaltyRuleMutationInput['memberType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyMemberTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label>Trigger type</Label>
                <Select
                  value={form.triggerType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      triggerType: value as LoyaltyRuleMutationInput['triggerType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyTriggerTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='grid gap-2'>
                <Label htmlFor='points-awarded'>Points awarded</Label>
                <Input
                  id='points-awarded'
                  inputMode='numeric'
                  value={form.pointsAwarded}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      pointsAwarded: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='minimum-amount'>Minimum amount</Label>
                <Input
                  id='minimum-amount'
                  inputMode='decimal'
                  value={form.minimumAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      minimumAmount: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='max-awards'>Max awards/member</Label>
                <Input
                  id='max-awards'
                  inputMode='numeric'
                  value={form.maxAwardsPerMember}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      maxAwardsPerMember: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='execution-order'>Execution order</Label>
                <Input
                  id='execution-order'
                  inputMode='numeric'
                  value={form.executionOrder}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      executionOrder: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-3'>
              <div className='grid gap-2'>
                <Label>Period cap</Label>
                <Select
                  value={form.periodType}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      periodType: value as LoyaltyRuleMutationInput['periodType'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {loyaltyPeriodTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='valid-from'>Valid from</Label>
                <Input
                  id='valid-from'
                  type='date'
                  value={form.validFrom}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      validFrom: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='valid-to'>Valid to</Label>
                <Input
                  id='valid-to'
                  type='date'
                  value={form.validTo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      validTo: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-3'>
              <div className='flex items-center justify-between rounded-xl border p-4'>
                <div>
                  <p className='font-medium'>On-time payment only</p>
                  <p className='text-sm text-muted-foreground'>
                    Restrict awards to on-time transactions.
                  </p>
                </div>
                <Switch
                  checked={form.requiresOnTimePayment}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      requiresOnTimePayment: checked,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between rounded-xl border p-4'>
                <div>
                  <p className='font-medium'>Full payment only</p>
                  <p className='text-sm text-muted-foreground'>
                    Only award when the full amount is settled.
                  </p>
                </div>
                <Switch
                  checked={form.requiresFullPayment}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      requiresFullPayment: checked,
                    }))
                  }
                />
              </div>
              <div className='flex items-center justify-between rounded-xl border p-4'>
                <div>
                  <p className='font-medium'>Stack with other rules</p>
                  <p className='text-sm text-muted-foreground'>
                    Multiple rules can reward the same activity.
                  </p>
                </div>
                <Switch
                  checked={form.canStackWithOtherRules}
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      canStackWithOtherRules: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDialogOpen(false)}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button disabled={!canSave} onClick={() => saveMutation.mutate()}>
              <Save className='h-4 w-4' />
              {saveMutation.isPending ? 'Saving...' : editingRule ? 'Update rule' : 'Create rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {pendingAction?.action === 'deleted'
                ? 'Delete this rule?'
                : pendingAction?.action === 'disable'
                  ? 'Disable this rule?'
                  : 'Enable this rule?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'deleted'
                ? 'The rule will be retained for history but removed from active loyalty calculations.'
                : pendingAction?.action === 'disable'
                  ? 'The rule will stop awarding points until it is enabled again.'
                  : 'The rule will become active in the loyalty engine again.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionMutation.mutate()}
              disabled={actionMutation.isPending}
            >
              {actionMutation.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
