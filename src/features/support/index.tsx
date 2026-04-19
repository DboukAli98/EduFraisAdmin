import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LifeBuoy, MessageSquareWarning, ShieldAlert, Users } from 'lucide-react'
import { toast } from 'sonner'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { formatDateTime, getEntityStatusMeta } from '@/features/admin/utils'
import {
  fetchSupportRequestDetails,
  fetchSupportRequests,
  updateSupportRequestStatus,
  type SupportRequestRecord,
  type SupportSource,
} from '@/features/support/api'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface SummaryCardProps {
  title: string
  value: string
  description: string
}

interface StatusFormState {
  newStatusId: number
  message: string
  resultNotes: string
}

const supportSources: SupportSource[] = [
  'PARENT_TO_DIRECTOR',
  'PARENT_TO_AGENT',
  'AGENT_TO_DIRECTOR',
]

const supportedStatusActions = [
  { id: 6, label: 'Pending' },
  { id: 11, label: 'InProgress' },
  { id: 15, label: 'Stall' },
  { id: 14, label: 'Resolved' },
  { id: 9, label: 'Cancelled' },
]

function SummaryCard({ title, value, description }: SummaryCardProps) {
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
    <div className='space-y-1 border-b pb-3 last:border-b-0 last:pb-0'>
      <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
        {label}
      </p>
      <div className='text-sm'>{value}</div>
    </div>
  )
}

function formatSourceLabel(source: SupportSource): string {
  switch (source) {
    case 'PARENT_TO_DIRECTOR':
      return 'Parent -> Director'
    case 'PARENT_TO_AGENT':
      return 'Parent -> Agent'
    case 'AGENT_TO_DIRECTOR':
      return 'Agent -> Director'
  }
}

function createEmptyStatusForm(): StatusFormState {
  return {
    newStatusId: 11,
    message: '',
    resultNotes: '',
  }
}

export function SupportWorkspace() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const schoolId = currentUser?.schoolIds[0] ?? null

  const [source, setSource] = useState<SupportSource>('PARENT_TO_DIRECTOR')
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [statusForm, setStatusForm] = useState<StatusFormState>(createEmptyStatusForm())

  const sourceSummaryQueries = useQueries({
    queries: supportSources.map((item) => ({
      queryKey: ['support-workspace', 'summary', schoolId, item],
      queryFn: () => fetchSupportRequests(schoolId ?? 0, item, 1),
      enabled: isDirector && Boolean(schoolId),
    })),
  })

  const requestsQuery = useQuery({
    queryKey: ['support-workspace', 'requests', schoolId, source],
    queryFn: () => fetchSupportRequests(schoolId ?? 0, source),
    enabled: isDirector && Boolean(schoolId),
  })

  const requests = requestsQuery.data?.items ?? []

  useEffect(() => {
    if (!requests.length) {
      setSelectedRequestId(null)
      return
    }

    setSelectedRequestId((current) => {
      if (current && requests.some((request) => request.id === current)) {
        return current
      }

      return requests[0].id
    })
  }, [requests])

  const selectedRequest =
    requests.find((request) => request.id === selectedRequestId) ?? null

  const detailsQuery = useQuery({
    queryKey: ['support-workspace', 'details', selectedRequestId],
    queryFn: () => fetchSupportRequestDetails(selectedRequestId ?? 0),
    enabled: isDirector && Boolean(selectedRequestId),
  })

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRequestId) {
        return
      }

      await updateSupportRequestStatus({
        supportRequestId: selectedRequestId,
        newStatusId: statusForm.newStatusId,
        message: statusForm.message,
        resultNotes: statusForm.resultNotes,
      })
    },
    onSuccess: () => {
      toast.success('Support request status updated successfully.')
      setIsStatusDialogOpen(false)
      setStatusForm(createEmptyStatusForm())
      void queryClient.invalidateQueries({
        queryKey: ['support-workspace', 'requests', schoolId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['support-workspace', 'summary', schoolId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['support-workspace', 'details', selectedRequestId],
      })
    },
  })

  const sourceCounts = useMemo(() => {
    return supportSources.map((item, index) => ({
      source: item,
      totalCount: sourceSummaryQueries[index]?.data?.totalCount ?? 0,
    }))
  }, [sourceSummaryQueries])

  if (!isDirector) {
    return (
      <PageShell
        title='Support Requests'
        description='Director-operated support oversight workspace.'
      >
        <EmptyState
          title='Director workspace only'
          description='This support queue is tailored for directors handling family and collecting-agent requests within their own school.'
        />
      </PageShell>
    )
  }

  if (!schoolId) {
    return (
      <PageShell
        title='Support Requests'
        description='Director-operated support oversight workspace.'
      >
        <EmptyState
          title='No school assigned'
          description='The current director account is not linked to a school, so support requests cannot be loaded yet.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='Support Requests'
        description='Review parent and collecting-agent issues, follow the status timeline, and move requests through resolution.'
        actions={
          <Button
            variant='outline'
            disabled={!selectedRequest}
            onClick={() => {
              setStatusForm({
                newStatusId: selectedRequest?.statusId ?? 11,
                message: '',
                resultNotes: detailsQuery.data?.resultNotes ?? '',
              })
              setIsStatusDialogOpen(true)
            }}
          >
            Update status
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            title='Parent -> Director'
            value={String(sourceCounts.find((item) => item.source === 'PARENT_TO_DIRECTOR')?.totalCount ?? 0)}
            description='Requests raised directly to the director.'
          />
          <SummaryCard
            title='Parent -> Agent'
            value={String(sourceCounts.find((item) => item.source === 'PARENT_TO_AGENT')?.totalCount ?? 0)}
            description='Requests directed to collecting agents for oversight.'
          />
          <SummaryCard
            title='Agent -> Director'
            value={String(sourceCounts.find((item) => item.source === 'AGENT_TO_DIRECTOR')?.totalCount ?? 0)}
            description='Escalations raised by collecting agents.'
          />
          <SummaryCard
            title='Selected source'
            value={String(requests.length)}
            description='Requests currently loaded in the active view.'
          />
        </section>

        <section className='rounded-2xl border bg-card p-4'>
          <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-end'>
            <div>
              <p className='text-sm font-medium'>Request source</p>
              <p className='text-sm text-muted-foreground'>
                Switch between parent-director, parent-agent, and agent-director support flows.
              </p>
            </div>
            <Select value={source} onValueChange={(value) => setSource(value as SupportSource)}>
              <SelectTrigger className='w-full md:w-[240px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportSources.map((item) => (
                  <SelectItem key={item} value={item}>
                    {formatSourceLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className='grid gap-4 xl:grid-cols-[1.1fr_0.9fr]'>
          <Card className='border-border/70'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <MessageSquareWarning className='h-4 w-4 text-primary' />
                Requests
              </CardTitle>
              <CardDescription>
                All support requests returned for {formatSourceLabel(source)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                  <Skeleton className='h-12 w-full' />
                </div>
              ) : requests.length === 0 ? (
                <EmptyState
                  title='No support requests'
                  description='There are no support items for the selected source right now.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Request</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className='text-right'>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request: SupportRequestRecord) => (
                        <TableRow
                          key={`${request.source}-${request.id}`}
                          className={
                            selectedRequestId === request.id ? 'bg-muted/25' : undefined
                          }
                        >
                          <TableCell>
                            <div className='font-medium'>{request.title}</div>
                            <div className='text-xs text-muted-foreground'>
                              {request.parentName || request.agentName || request.supportRequestType}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant='outline'
                              className={getEntityStatusMeta(request.statusId).className}
                            >
                              {getEntityStatusMeta(request.statusId).label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant='outline'>{request.priority}</Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(request.createdOn)}</TableCell>
                          <TableCell className='text-right'>
                            <Button
                              variant='outline'
                              size='sm'
                              onClick={() => setSelectedRequestId(request.id)}
                            >
                              Open
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

          <Card className='border-border/70'>
            <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <LifeBuoy className='h-4 w-4 text-primary' />
                  Request details
                </CardTitle>
                <CardDescription>
                  Inspect the selected request, view its timeline, and push it to the next supported status.
                </CardDescription>
              </div>
              {selectedRequest ? (
                <Badge variant='outline'>{formatSourceLabel(selectedRequest.source)}</Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              {!selectedRequest ? (
                <EmptyState
                  title='No request selected'
                  description='Choose a request from the table to inspect its details and timeline.'
                />
              ) : detailsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-24 w-full' />
                  <Skeleton className='h-32 w-full' />
                </div>
              ) : detailsQuery.isError || !detailsQuery.data ? (
                <EmptyState
                  title='Unable to load details'
                  description='The selected support request did not return a detailed record from the backend.'
                />
              ) : (
                <div className='space-y-6'>
                  <div className='space-y-4'>
                    <DetailRow label='Title' value={detailsQuery.data.title} />
                    <DetailRow
                      label='Status'
                      value={
                        <Badge
                          variant='outline'
                          className={getEntityStatusMeta(detailsQuery.data.statusId).className}
                        >
                          {getEntityStatusMeta(detailsQuery.data.statusId).label}
                        </Badge>
                      }
                    />
                    <DetailRow
                      label='Participants'
                      value={
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2'>
                            <Users className='h-3.5 w-3.5 text-muted-foreground' />
                            <span>{selectedRequest.parentName || 'No parent linked'}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <ShieldAlert className='h-3.5 w-3.5 text-muted-foreground' />
                            <span>{selectedRequest.agentName || 'No agent linked'}</span>
                          </div>
                        </div>
                      }
                    />
                    <DetailRow
                      label='Description'
                      value={detailsQuery.data.description || 'No description'}
                    />
                    <DetailRow
                      label='Resolution notes'
                      value={detailsQuery.data.resultNotes || 'No resolution notes yet'}
                    />
                    <DetailRow
                      label='Meta'
                      value={
                        <div className='space-y-1'>
                          <div>Type: {detailsQuery.data.supportRequestType}</div>
                          <div>Priority: {detailsQuery.data.priority}</div>
                          <div>Created: {formatDateTime(detailsQuery.data.createdOn)}</div>
                          <div>
                            Expected resolution:{' '}
                            {formatDateTime(detailsQuery.data.expectedResolutionDate)}
                          </div>
                          <div>
                            Resolved: {formatDateTime(detailsQuery.data.resolvedDate)}
                          </div>
                        </div>
                      }
                    />
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <h4 className='font-medium'>Status timeline</h4>
                        <p className='text-sm text-muted-foreground'>
                          Logged status changes from the backend history.
                        </p>
                      </div>
                    </div>

                    {detailsQuery.data.statusLogs.length === 0 ? (
                      <EmptyState
                        title='No status logs'
                        description='This request does not have any status-log entries yet.'
                      />
                    ) : (
                      <div className='space-y-3'>
                        {detailsQuery.data.statusLogs.map((log) => (
                          <div
                            key={log.id}
                            className='rounded-xl border bg-muted/20 p-4 text-sm'
                          >
                            <div className='flex items-start justify-between gap-3'>
                              <Badge
                                variant='outline'
                                className={getEntityStatusMeta(log.statusId).className}
                              >
                                {getEntityStatusMeta(log.statusId).label}
                              </Badge>
                              <span className='text-xs text-muted-foreground'>
                                {formatDateTime(log.createdAt)}
                              </span>
                            </div>
                            <p className='mt-3'>{log.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </PageShell>

      <Dialog
        open={isStatusDialogOpen}
        onOpenChange={(open) => {
          setIsStatusDialogOpen(open)
          if (!open) {
            setStatusForm(createEmptyStatusForm())
          }
        }}
      >
        <DialogContent className='sm:max-w-xl'>
          <DialogHeader>
            <DialogTitle>Update support request status</DialogTitle>
            <DialogDescription>
              Use the supported backend statuses for director workflows: pending, in progress, stall, resolved, or cancelled.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='support-status'>New status</Label>
              <Select
                value={String(statusForm.newStatusId)}
                onValueChange={(value) =>
                  setStatusForm((current) => ({
                    ...current,
                    newStatusId: Number(value),
                  }))
                }
              >
                <SelectTrigger id='support-status'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedStatusActions.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='support-message'>Status message</Label>
              <Textarea
                id='support-message'
                rows={4}
                value={statusForm.message}
                onChange={(event) =>
                  setStatusForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='support-result-notes'>Resolution notes</Label>
              <Textarea
                id='support-result-notes'
                rows={4}
                value={statusForm.resultNotes}
                onChange={(event) =>
                  setStatusForm((current) => ({
                    ...current,
                    resultNotes: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => updateStatusMutation.mutate()} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? 'Saving...' : 'Update status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
