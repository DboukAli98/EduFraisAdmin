import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus, Power, Save } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { getApiErrorMessage } from '@/lib/api'
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
import {
  addPaymentProvider,
  fetchCommissionSettings,
  setPaymentProviderActive,
  updatePaymentProvider,
  type PaymentProvider,
  type PaymentProviderMutationInput,
} from './api'

interface ProviderFormState extends PaymentProviderMutationInput {}

type ToggleAction =
  | {
      provider: PaymentProvider
      isActive: boolean
    }
  | null

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

function createEmptyProviderForm(provider?: PaymentProvider | null): ProviderFormState {
  return {
    name: provider?.name ?? '',
    code: provider?.code ?? '',
    feePercentage:
      provider?.feePercentage != null ? provider.feePercentage.toFixed(2) : '',
    isActive: provider?.isActive ?? true,
    displayOrder:
      provider?.displayOrder != null ? String(provider.displayOrder) : '0',
    logoUrl: provider?.logoUrl ?? '',
  }
}

function isValidPercentage(value: string): boolean {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
}

function isValidProviderForm(form: ProviderFormState): boolean {
  return (
    form.name.trim().length > 0 &&
    form.code.trim().length > 0 &&
    isValidPercentage(form.feePercentage)
  )
}

export function PaymentProvidersManagement() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<PaymentProvider | null>(
    null
  )
  const [providerForm, setProviderForm] = useState<ProviderFormState>(
    createEmptyProviderForm()
  )
  const [toggleAction, setToggleAction] = useState<ToggleAction>(null)

  const settingsQuery = useQuery({
    queryKey: ['commission-settings'],
    queryFn: fetchCommissionSettings,
    enabled: isSuperAdmin,
  })

  const providers = [...(settingsQuery.data?.providers ?? [])].sort(
    (left, right) => left.displayOrder - right.displayOrder
  )

  const saveProviderMutation = useMutation({
    mutationFn: async () => {
      if (editingProvider) {
        await updatePaymentProvider(editingProvider.id, providerForm)
        return
      }

      await addPaymentProvider(providerForm)
    },
    onSuccess: () => {
      toast.success(
        editingProvider ? 'Provider updated successfully.' : 'Provider added.'
      )
      setIsDialogOpen(false)
      setEditingProvider(null)
      setProviderForm(createEmptyProviderForm())
      void queryClient.invalidateQueries({ queryKey: ['commission-settings'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to save the provider right now.')
      )
    },
  })

  const toggleProviderMutation = useMutation({
    mutationFn: async () => {
      if (!toggleAction) {
        return ''
      }

      return setPaymentProviderActive({
        paymentProviderId: toggleAction.provider.id,
        isActive: toggleAction.isActive,
      })
    },
    onSuccess: (message) => {
      toast.success(message)
      setToggleAction(null)
      void queryClient.invalidateQueries({ queryKey: ['commission-settings'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update the provider status.')
      )
    },
  })

  if (!isSuperAdmin) {
    return (
      <PageShell
        title='Payment Providers'
        description='Manage payment-provider commission settings.'
      >
        <EmptyState
          title='SuperAdmin access required'
          description='Payment provider management is restricted to SuperAdmin accounts.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='Payment Providers'
        description='Add providers, update provider fee percentages, and toggle active status.'
        actions={
          <div className='flex flex-wrap gap-2'>
            <Button asChild variant='outline'>
              <Link to='/commission-admin'>
                <ArrowLeft className='h-4 w-4' />
                Overview
              </Link>
            </Button>
            <Button
              onClick={() => {
                setEditingProvider(null)
                setProviderForm(createEmptyProviderForm())
                setIsDialogOpen(true)
              }}
            >
              <Plus className='h-4 w-4' />
              Add provider
            </Button>
          </div>
        }
      >
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Provider commission settings</CardTitle>
            <CardDescription>
              Provider codes are sent uppercase and must be unique. Disable a
              provider instead of deleting it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
                <Skeleton className='h-12 w-full' />
              </div>
            ) : providers.length === 0 ? (
              <EmptyState
                title='No payment providers yet'
                description='Add the first provider to define its commission percentage and display order.'
              />
            ) : (
              <div className='rounded-lg border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          <div className='flex items-center gap-3'>
                            {provider.logoUrl ? (
                              <img
                                src={provider.logoUrl}
                                alt=''
                                className='h-9 w-9 rounded-lg border object-cover'
                              />
                            ) : (
                              <div className='flex h-9 w-9 items-center justify-center rounded-lg border bg-muted text-xs font-semibold'>
                                {provider.code.slice(0, 2) || 'PP'}
                              </div>
                            )}
                            <div>
                              <div className='font-medium'>{provider.name}</div>
                              <div className='text-xs text-muted-foreground'>
                                Provider ID {provider.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{provider.code}</TableCell>
                        <TableCell>{formatPercentage(provider.feePercentage)}</TableCell>
                        <TableCell>{provider.displayOrder}</TableCell>
                        <TableCell>
                          <Badge variant={provider.isActive ? 'default' : 'outline'}>
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => {
                                setEditingProvider(provider)
                                setProviderForm(createEmptyProviderForm(provider))
                                setIsDialogOpen(true)
                              }}
                            >
                              <Pencil className='h-4 w-4' />
                              Edit
                            </Button>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() =>
                                setToggleAction({
                                  provider,
                                  isActive: !provider.isActive,
                                })
                              }
                            >
                              <Power className='h-4 w-4' />
                              {provider.isActive ? 'Deactivate' : 'Activate'}
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

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setEditingProvider(null)
            setProviderForm(createEmptyProviderForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editingProvider ? 'Edit payment provider' : 'Add payment provider'}
            </DialogTitle>
            <DialogDescription>
              Send the full provider payload expected by the commission admin API.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='provider-name'>Name</Label>
                <Input
                  id='provider-name'
                  value={providerForm.name}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='provider-code'>Code</Label>
                <Input
                  id='provider-code'
                  value={providerForm.code}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      code: event.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='grid gap-2'>
                <Label htmlFor='provider-fee'>Fee percentage</Label>
                <Input
                  id='provider-fee'
                  inputMode='decimal'
                  value={providerForm.feePercentage}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      feePercentage: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='provider-order'>Display order</Label>
                <Input
                  id='provider-order'
                  inputMode='numeric'
                  value={providerForm.displayOrder}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      displayOrder: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='provider-logo'>Logo URL</Label>
              <Input
                id='provider-logo'
                placeholder='https://...'
                value={providerForm.logoUrl}
                onChange={(event) =>
                  setProviderForm((current) => ({
                    ...current,
                    logoUrl: event.target.value,
                  }))
                }
              />
            </div>

            <div className='flex items-center justify-between gap-4 rounded-xl border p-4'>
              <div>
                <p className='font-medium'>Provider active</p>
                <p className='text-sm text-muted-foreground'>
                  Inactive providers are retained but hidden from active
                  commission rules.
                </p>
              </div>
              <Switch
                checked={providerForm.isActive}
                onCheckedChange={(checked) =>
                  setProviderForm((current) => ({
                    ...current,
                    isActive: checked,
                  }))
                }
              />
            </div>

            {!isValidPercentage(providerForm.feePercentage) &&
            providerForm.feePercentage.length > 0 ? (
              <p className='text-sm font-medium text-destructive'>
                Fee percentage must be between 0 and 100.
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                saveProviderMutation.isPending ||
                !isValidProviderForm(providerForm)
              }
              onClick={() => saveProviderMutation.mutate()}
            >
              <Save className='h-4 w-4' />
              {saveProviderMutation.isPending ? 'Saving...' : 'Save provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(toggleAction)}
        onOpenChange={(open) => {
          if (!open) {
            setToggleAction(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleAction?.isActive ? 'Activate provider?' : 'Deactivate provider?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleAction?.isActive
                ? 'This provider will become available for active commission rules again.'
                : 'This soft-disables the provider without deleting its commission history.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleProviderMutation.mutate()}>
              {toggleProviderMutation.isPending ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
