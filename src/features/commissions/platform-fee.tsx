import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Percent, Save } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { formatDateTime } from '@/features/admin/utils'
import { getApiErrorMessage } from '@/lib/api'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { fetchCommissionSettings, updatePlatformFee } from './api'

function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

function isValidPercentage(value: string): boolean {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
}

export function PlatformFeeManagement() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const isSuperAdmin = currentUser?.roles.includes('SuperAdmin') ?? false
  const [feePercentage, setFeePercentage] = useState('')
  const [note, setNote] = useState('')

  const settingsQuery = useQuery({
    queryKey: ['commission-settings'],
    queryFn: fetchCommissionSettings,
    enabled: isSuperAdmin,
  })

  const platformFee = settingsQuery.data?.platformFee ?? null

  useEffect(() => {
    if (!platformFee) {
      return
    }

    setFeePercentage(platformFee.feePercentage.toFixed(2))
    setNote(platformFee.note ?? '')
  }, [platformFee])

  const updateMutation = useMutation({
    mutationFn: () =>
      updatePlatformFee({
        feePercentage,
        note,
      }),
    onSuccess: () => {
      toast.success('Platform fee updated')
      void queryClient.invalidateQueries({ queryKey: ['commission-settings'] })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update the platform fee right now.')
      )
    },
  })

  if (!isSuperAdmin) {
    return (
      <PageShell
        title='Platform Fee'
        description='Update EduFrais platform commission percentage.'
      >
        <EmptyState
          title='SuperAdmin access required'
          description='Platform fee management is restricted to SuperAdmin accounts.'
        />
      </PageShell>
    )
  }

  const canSave = isValidPercentage(feePercentage) && !updateMutation.isPending

  return (
    <PageShell
      title='Platform Fee'
      description='Set the active EduFrais platform commission rate. Previous rates stay available for backend history.'
      actions={
        <Button asChild variant='outline'>
          <Link to='/commission-admin'>
            <ArrowLeft className='h-4 w-4' />
            Overview
          </Link>
        </Button>
      }
    >
      <section className='grid gap-4 xl:grid-cols-[0.85fr_1.15fr]'>
        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Percent className='h-5 w-5' />
              Current active fee
            </CardTitle>
            <CardDescription>
              This is the platform fee currently returned by
              <code> GetCommissionSettings</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsQuery.isLoading ? (
              <div className='space-y-3'>
                <Skeleton className='h-10 w-32' />
                <Skeleton className='h-5 w-full' />
                <Skeleton className='h-5 w-2/3' />
              </div>
            ) : !platformFee ? (
              <EmptyState
                title='No platform fee configured'
                description='Use the form to create the first active platform fee setting.'
              />
            ) : (
              <div className='space-y-4'>
                <div className='flex flex-wrap items-end justify-between gap-3'>
                  <div>
                    <div className='text-4xl font-semibold'>
                      {formatPercentage(platformFee.feePercentage)}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Created {formatDateTime(platformFee.createdOn)}
                    </p>
                  </div>
                  <Badge variant={platformFee.isActive ? 'default' : 'outline'}>
                    {platformFee.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className='rounded-xl border bg-muted/20 p-4 text-sm'>
                  {platformFee.note || 'No note was recorded for this rate.'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Update platform fee</CardTitle>
            <CardDescription>
              The API creates a new active fee row and deactivates the previous
              one. Percentages are stored as percent values, so <code>1</code>
              means 1%.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='grid gap-2'>
              <Label htmlFor='platform-fee'>Fee percentage</Label>
              <Input
                id='platform-fee'
                inputMode='decimal'
                placeholder='1.00'
                value={feePercentage}
                onChange={(event) => setFeePercentage(event.target.value)}
              />
              {!isValidPercentage(feePercentage) && feePercentage.length > 0 ? (
                <p className='text-sm font-medium text-destructive'>
                  Enter a percentage between 0 and 100.
                </p>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Supports up to two decimal places. Example: 1.25 = 1.25%.
                </p>
              )}
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='platform-note'>Note</Label>
              <Textarea
                id='platform-note'
                rows={5}
                placeholder='Reason for this rate change'
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>

            <Button disabled={!canSave} onClick={() => updateMutation.mutate()}>
              <Save className='h-4 w-4' />
              {updateMutation.isPending ? 'Saving...' : 'Update platform fee'}
            </Button>
          </CardContent>
        </Card>
      </section>
    </PageShell>
  )
}
