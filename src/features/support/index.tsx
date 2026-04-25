import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, LifeBuoy, MessageSquareWarning, ShieldAlert, Users } from 'lucide-react'
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
  { id: 6, label: 'En attente' },
  { id: 11, label: 'En cours' },
  { id: 15, label: 'Bloque' },
  { id: 14, label: 'Resolu' },
  { id: 9, label: 'Annule' },
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
      return 'Parent -> Directeur'
    case 'PARENT_TO_AGENT':
      return 'Parent -> Agent'
    case 'AGENT_TO_DIRECTOR':
      return 'Agent -> Directeur'
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
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
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

  function openSupportRequest(requestId: number) {
    setSelectedRequestId(requestId)
    setIsDetailsDialogOpen(true)
  }

  function openStatusDialog() {
    setStatusForm({
      newStatusId: selectedRequest?.statusId ?? 11,
      message: '',
      resultNotes: detailsQuery.data?.resultNotes ?? '',
    })
    setIsStatusDialogOpen(true)
  }

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
      toast.success('Statut de la demande de support mis a jour avec succes.')
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
        title='Demandes de support'
        description='Espace de suivi du support gere par le directeur.'
      >
        <EmptyState
          title='Espace reserve au directeur'
          description='Cette file de support est concue pour les directeurs qui gerent les demandes des familles et des agents collecteurs dans leur propre ecole.'
        />
      </PageShell>
    )
  }

  if (!schoolId) {
    return (
      <PageShell
        title='Demandes de support'
        description='Espace de suivi du support gere par le directeur.'
      >
        <EmptyState
          title='Aucune ecole affectee'
          description='Le compte directeur actuel n est lie a aucune ecole, les demandes de support ne peuvent donc pas encore etre chargees.'
        />
      </PageShell>
    )
  }

  return (
    <>
      <PageShell
        title='Demandes de support'
        description='Examinez les problemes des parents et des agents collecteurs, suivez l evolution des statuts et faites avancer les demandes jusqu a leur resolution.'
        actions={
          <Button
            variant='outline'
            disabled={!selectedRequest}
            onClick={openStatusDialog}
          >
            Mettre a jour le statut
          </Button>
        }
      >
        <section className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <SummaryCard
            title='Parent -> Directeur'
            value={String(sourceCounts.find((item) => item.source === 'PARENT_TO_DIRECTOR')?.totalCount ?? 0)}
            description='Demandes adressees directement au directeur.'
          />
          <SummaryCard
            title='Parent -> Agent'
            value={String(sourceCounts.find((item) => item.source === 'PARENT_TO_AGENT')?.totalCount ?? 0)}
            description='Demandes orientees vers les agents collecteurs pour suivi.'
          />
          <SummaryCard
            title='Agent -> Directeur'
            value={String(sourceCounts.find((item) => item.source === 'AGENT_TO_DIRECTOR')?.totalCount ?? 0)}
            description='Escalades creees par les agents collecteurs.'
          />
          <SummaryCard
            title='Source selectionnee'
            value={String(requests.length)}
            description='Demandes actuellement chargees dans la vue active.'
          />
        </section>

        <section className='rounded-2xl border bg-card p-4'>
          <div className='grid gap-4 md:grid-cols-[1fr_auto] md:items-end'>
            <div>
              <p className='text-sm font-medium'>Source de la demande</p>
              <p className='text-sm text-muted-foreground'>
                Basculez entre les flux parent-directeur, parent-agent et agent-directeur.
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
                Demandes
              </CardTitle>
              <CardDescription>
                Toutes les demandes de support renvoyees pour {formatSourceLabel(source)}.
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
                  title='Aucune demande de support'
                  description='Aucun element de support pour la source selectionnee pour le moment.'
                />
              ) : (
                <div className='rounded-lg border'>
                  <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Demande</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Priorite</TableHead>
                        <TableHead>Creation</TableHead>
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
                              onClick={() => openSupportRequest(request.id)}
                            >
                              <Eye className='h-4 w-4' />
                              Ouvrir
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
                  Details de la demande
                </CardTitle>
                <CardDescription>
                  Consultez la demande selectionnee, son historique et faites-la avancer vers le prochain statut pris en charge.
                </CardDescription>
              </div>
              {selectedRequest ? (
                <Badge variant='outline'>{formatSourceLabel(selectedRequest.source)}</Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              {!selectedRequest ? (
                <EmptyState
                  title='Aucune demande selectionnee'
                  description='Choisissez une demande dans le tableau pour consulter ses details et son historique.'
                />
              ) : detailsQuery.isLoading ? (
                <div className='space-y-3'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-24 w-full' />
                  <Skeleton className='h-32 w-full' />
                </div>
              ) : detailsQuery.isError || !detailsQuery.data ? (
                <EmptyState
                  title='Impossible de charger les details'
                  description='La demande de support selectionnee n a pas renvoye de fiche detaillee depuis le backend.'
                />
              ) : (
                <div className='space-y-6'>
                  <div className='space-y-4'>
                    <DetailRow label='Titre' value={detailsQuery.data.title} />
                    <DetailRow
                      label='Statut'
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
                            <span>{selectedRequest.parentName || 'Aucun parent lie'}</span>
                          </div>
                          <div className='flex items-center gap-2'>
                            <ShieldAlert className='h-3.5 w-3.5 text-muted-foreground' />
                            <span>{selectedRequest.agentName || 'Aucun agent lie'}</span>
                          </div>
                        </div>
                      }
                    />
                    <DetailRow
                      label='Description'
                      value={detailsQuery.data.description || 'Aucune description'}
                    />
                    <DetailRow
                      label='Notes de resolution'
                      value={detailsQuery.data.resultNotes || 'Aucune note de resolution pour le moment'}
                    />
                    <DetailRow
                      label='Metadonnees'
                      value={
                        <div className='space-y-1'>
                          <div>Type : {detailsQuery.data.supportRequestType}</div>
                          <div>Priorite : {detailsQuery.data.priority}</div>
                          <div>Cree le : {formatDateTime(detailsQuery.data.createdOn)}</div>
                          <div>
                            Resolution attendue :{' '}
                            {formatDateTime(detailsQuery.data.expectedResolutionDate)}
                          </div>
                          <div>
                            Resolue le : {formatDateTime(detailsQuery.data.resolvedDate)}
                          </div>
                        </div>
                      }
                    />
                  </div>

                  <div className='space-y-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <div>
                        <h4 className='font-medium'>Historique des statuts</h4>
                        <p className='text-sm text-muted-foreground'>
                          Changements de statut enregistres dans l historique backend.
                        </p>
                      </div>
                    </div>

                    {detailsQuery.data.statusLogs.length === 0 ? (
                      <EmptyState
                        title='Aucun historique de statut'
                        description='Cette demande ne contient encore aucune entree d historique de statut.'
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

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className='sm:max-w-4xl'>
          <DialogHeader>
            <DialogTitle>
              {selectedRequest?.title || 'Details de la demande'}
            </DialogTitle>
            <DialogDescription>
              {selectedRequest
                ? `${formatSourceLabel(selectedRequest.source)} | ${selectedRequest.parentName || selectedRequest.agentName || selectedRequest.supportRequestType}`
                : 'Consultez les informations de la demande de support selectionnee.'}
            </DialogDescription>
          </DialogHeader>

          {!selectedRequest ? (
            <EmptyState
              title='Aucune demande selectionnee'
              description='Selectionnez une demande dans la liste pour ouvrir sa fiche.'
            />
          ) : detailsQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-10 w-full' />
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-32 w-full' />
            </div>
          ) : detailsQuery.isError || !detailsQuery.data ? (
            <EmptyState
              title='Impossible de charger les details'
              description='La demande de support selectionnee n a pas renvoye de fiche detaillee depuis le backend.'
            />
          ) : (
            <div className='grid max-h-[70vh] gap-6 overflow-y-auto pr-1 xl:grid-cols-[1fr_0.9fr]'>
              <div className='space-y-4'>
                <DetailRow label='Titre' value={detailsQuery.data.title} />
                <DetailRow
                  label='Statut'
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
                        <span>{selectedRequest.parentName || 'Aucun parent lie'}</span>
                      </div>
                      <div className='flex items-center gap-2'>
                        <ShieldAlert className='h-3.5 w-3.5 text-muted-foreground' />
                        <span>{selectedRequest.agentName || 'Aucun agent lie'}</span>
                      </div>
                    </div>
                  }
                />
                <DetailRow
                  label='Description'
                  value={detailsQuery.data.description || 'Aucune description'}
                />
                <DetailRow
                  label='Notes de resolution'
                  value={detailsQuery.data.resultNotes || 'Aucune note de resolution pour le moment'}
                />
                <DetailRow
                  label='Metadonnees'
                  value={
                    <div className='space-y-1'>
                      <div>Type : {detailsQuery.data.supportRequestType}</div>
                      <div>Priorite : {detailsQuery.data.priority}</div>
                      <div>Cree le : {formatDateTime(detailsQuery.data.createdOn)}</div>
                      <div>
                        Resolution attendue :{' '}
                        {formatDateTime(detailsQuery.data.expectedResolutionDate)}
                      </div>
                      <div>Resolue le : {formatDateTime(detailsQuery.data.resolvedDate)}</div>
                    </div>
                  }
                />
              </div>

              <div className='space-y-3'>
                <div>
                  <h4 className='font-medium'>Historique des statuts</h4>
                  <p className='text-sm text-muted-foreground'>
                    Changements de statut enregistres dans l historique backend.
                  </p>
                </div>

                {detailsQuery.data.statusLogs.length === 0 ? (
                  <EmptyState
                    title='Aucun historique de statut'
                    description='Cette demande ne contient encore aucune entree d historique de statut.'
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

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setIsDetailsDialogOpen(false)}
            >
              Fermer
            </Button>
            <Button
              disabled={!selectedRequest || detailsQuery.isLoading}
              onClick={() => {
                setIsDetailsDialogOpen(false)
                openStatusDialog()
              }}
            >
              Mettre a jour le statut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <DialogTitle>Mettre a jour le statut de la demande</DialogTitle>
            <DialogDescription>
              Utilisez les statuts backend pris en charge pour le flux directeur : en attente, en cours, bloque, resolu ou annule.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='support-status'>Nouveau statut</Label>
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
              <Label htmlFor='support-message'>Message de statut</Label>
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
              <Label htmlFor='support-result-notes'>Notes de resolution</Label>
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
              Annuler
            </Button>
            <Button onClick={() => updateStatusMutation.mutate()} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? 'Enregistrement...' : 'Mettre a jour le statut'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
