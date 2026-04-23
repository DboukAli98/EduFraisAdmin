import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { buildFullName, formatDateTime } from '@/features/admin/utils'
import { fetchCollectingAgents } from '@/features/collecting-agents/api'
import {
  dispatchNotifications,
  fetchNotifications,
  markAllNotificationsAsRead,
  sendNotification,
} from '@/features/settings/api'
import { fetchParents } from '@/features/users/api'

const notificationTypes = [
  'General',
  'Reminder',
  'Marketing',
  'Announcement',
  'Payment',
  'Support',
  'Alert',
] as const

const audienceOptions = [
  {
    value: 'all_school_users',
    label: 'All school users',
    description:
      'Notify every enabled parent and collecting agent in the school.',
  },
  {
    value: 'parents',
    label: 'Parents only',
    description:
      'Target enabled parent accounts for reminders or announcements.',
  },
  {
    value: 'collecting_agents',
    label: 'Collecting agents only',
    description: 'Reach the field collection team with operational updates.',
  },
  {
    value: 'custom',
    label: 'Custom list',
    description:
      'Pick the exact parent and agent accounts that should receive it.',
  },
] as const

const deliveryModeOptions = [
  {
    value: 'scheduled',
    label: 'Schedule for later',
    description: 'Queue the notification for a specific date and time.',
  },
  {
    value: 'now',
    label: 'Send now',
    description: 'Dispatch the notification immediately.',
  },
] as const

const personalNotificationsFormSchema = z.object({
  type: z.string().min(1, 'Veuillez selectionner un type de notification.'),
  title: z.string().min(1, 'Veuillez saisir le titre de la notification.'),
  message: z.string().min(1, 'Veuillez saisir le message de la notification.'),
})

const outreachNotificationsFormSchema = z
  .object({
    audience: z.enum([
      'all_school_users',
      'parents',
      'collecting_agents',
      'custom',
    ]),
    type: z.string().min(1, 'Veuillez selectionner un type de campagne.'),
    title: z.string().min(1, 'Veuillez saisir le titre de la notification.'),
    message: z.string().min(1, 'Veuillez saisir le message de la notification.'),
    deliveryMode: z.enum(['scheduled', 'now']),
    scheduledFor: z.string().optional(),
    recipientIds: z.array(z.string()).default([]),
  })
  .superRefine((value, context) => {
    if (value.audience === 'custom' && value.recipientIds.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selectionnez au moins un destinataire pour une liste personnalisee.',
        path: ['recipientIds'],
      })
    }

    if (value.deliveryMode === 'scheduled') {
      if (!value.scheduledFor || value.scheduledFor.trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Veuillez choisir quand la notification doit etre envoyee.',
          path: ['scheduledFor'],
        })
        return
      }

      const scheduledDate = new Date(value.scheduledFor)
      if (Number.isNaN(scheduledDate.getTime())) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La date et l heure selectionnees ne sont pas valides.',
          path: ['scheduledFor'],
        })
        return
      }

      if (scheduledDate.getTime() <= Date.now()) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Veuillez choisir une date et une heure futures.',
          path: ['scheduledFor'],
        })
      }
    }
  })

type PersonalNotificationsFormValues = z.infer<
  typeof personalNotificationsFormSchema
>
type OutreachNotificationsFormInput = z.input<
  typeof outreachNotificationsFormSchema
>
type OutreachNotificationsFormValues = z.output<
  typeof outreachNotificationsFormSchema
>
type OutreachAudience = OutreachNotificationsFormValues['audience']

interface OutreachRecipientOption {
  userId: string
  label: string
  audience: 'Parent' | 'Collecting agent'
  details: string
}

function getDefaultScheduledForValue(): string {
  const date = new Date()
  date.setMinutes(date.getMinutes() + 60, 0, 0)

  const timezoneOffset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function toScheduledAtIso(value: string): string | null {
  if (!value.trim()) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

function buildRecipientDetails(input: {
  email: string
  countryCode: string
  phoneNumber: string
}): string {
  const formattedPhone = input.phoneNumber.trim()
    ? `+${input.countryCode.trim()} ${input.phoneNumber.trim()}`
    : ''

  const details = [input.email.trim(), formattedPhone].filter(
    (value) => value.length > 0
  )

  return details.join(' / ') || 'Aucun contact'
}

function getAudienceLabel(audience: OutreachAudience): string {
  return (
    audienceOptions.find((option) => option.value === audience)?.label ??
    'Custom audience'
  )
}

export function NotificationsForm() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const userId = currentUser?.userId ?? ''
  const isDirector = currentUser?.roles.includes('Director') ?? false
  const schoolId = currentUser?.schoolIds[0] ?? null

  const [recipientSearch, setRecipientSearch] = useState('')

  const personalForm = useForm<PersonalNotificationsFormValues>({
    resolver: zodResolver(personalNotificationsFormSchema),
    defaultValues: {
      type: 'General',
      title: '',
      message: '',
    },
  })

  const outreachForm = useForm<
    OutreachNotificationsFormInput,
    any,
    OutreachNotificationsFormValues
  >({
    resolver: zodResolver(outreachNotificationsFormSchema),
    defaultValues: {
      audience: 'all_school_users',
      type: 'Reminder',
      title: '',
      message: '',
      deliveryMode: 'scheduled',
      scheduledFor: getDefaultScheduledForValue(),
      recipientIds: [],
    },
  })

  const notificationsQuery = useQuery({
    queryKey: ['settings', 'notifications', userId],
    queryFn: () => fetchNotifications(userId),
    enabled: userId.length > 0,
  })

  const schoolParentsQuery = useQuery({
    queryKey: ['settings', 'notifications', 'parents', schoolId],
    queryFn: () => fetchParents({ schoolId }),
    enabled: isDirector && Boolean(schoolId),
  })

  const schoolAgentsQuery = useQuery({
    queryKey: ['settings', 'notifications', 'collecting-agents', schoolId],
    queryFn: () => fetchCollectingAgents(schoolId ?? 0),
    enabled: isDirector && Boolean(schoolId),
  })

  const sendMutation = useMutation({
    mutationFn: async (values: PersonalNotificationsFormValues) => {
      if (!userId) {
        throw new Error(
          'You need to sign in again before sending notifications.'
        )
      }

      return sendNotification({
        userId,
        title: values.title,
        message: values.message,
        type: values.type,
      })
    },
    onSuccess: (message) => {
      toast.success(message)
      personalForm.reset({
        type: 'General',
        title: '',
        message: '',
      })
      void queryClient.invalidateQueries({
        queryKey: ['settings', 'notifications', userId],
      })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to send the notification right now.')
      )
    },
  })

  const activeParents = useMemo(() => {
    return (schoolParentsQuery.data ?? []).filter(
      (parent) => parent.statusId === 1 && parent.userId.trim().length > 0
    )
  }, [schoolParentsQuery.data])

  const activeAgents = useMemo(() => {
    return (schoolAgentsQuery.data ?? []).filter(
      (agent) => agent.statusId === 1 && agent.userId.trim().length > 0
    )
  }, [schoolAgentsQuery.data])

  const recipientOptions = useMemo<OutreachRecipientOption[]>(() => {
    const parents = activeParents.map((parent) => ({
      userId: parent.userId,
      label:
        buildFullName(parent.firstName, parent.lastName) ||
        `Parent #${parent.id}`,
      audience: 'Parent' as const,
      details: buildRecipientDetails({
        email: parent.email,
        countryCode: parent.countryCode,
        phoneNumber: parent.phoneNumber,
      }),
    }))

    const agents = activeAgents.map((agent) => ({
      userId: agent.userId,
      label:
        buildFullName(agent.firstName, agent.lastName) ||
        `Agent collecteur #${agent.id}`,
      audience: 'Collecting agent' as const,
      details: buildRecipientDetails({
        email: agent.email,
        countryCode: agent.countryCode,
        phoneNumber: agent.phoneNumber,
      }),
    }))

    return [...parents, ...agents].sort((left, right) =>
      left.label.localeCompare(right.label)
    )
  }, [activeAgents, activeParents])

  const outreachAudience = outreachForm.watch('audience')
  const deliveryMode = outreachForm.watch('deliveryMode')
  const selectedRecipientIds = outreachForm.watch('recipientIds') ?? []

  const filteredRecipientOptions = useMemo(() => {
    const searchValue = recipientSearch.trim().toLowerCase()
    if (!searchValue) {
      return recipientOptions
    }

    return recipientOptions.filter((recipient) =>
      `${recipient.label} ${recipient.audience} ${recipient.details}`
        .toLowerCase()
        .includes(searchValue)
    )
  }, [recipientOptions, recipientSearch])

  const targetRecipients = useMemo(() => {
    switch (outreachAudience) {
      case 'parents':
        return recipientOptions.filter(
          (recipient) => recipient.audience === 'Parent'
        )
      case 'collecting_agents':
        return recipientOptions.filter(
          (recipient) => recipient.audience === 'Collecting agent'
        )
      case 'custom':
        return recipientOptions.filter((recipient) =>
          selectedRecipientIds.includes(recipient.userId)
        )
      case 'all_school_users':
      default:
        return recipientOptions
    }
  }, [outreachAudience, recipientOptions, selectedRecipientIds])

  const sendSchoolNotificationMutation = useMutation({
    mutationFn: async (values: OutreachNotificationsFormValues) => {
      if (!isDirector || !schoolId) {
        throw new Error(
          'Your director account is missing a linked school, so outreach is unavailable.'
        )
      }

      const targetUserIds = targetRecipients.map(
        (recipient) => recipient.userId
      )
      if (targetUserIds.length === 0) {
        throw new Error(
          'Select at least one active recipient before continuing.'
        )
      }

      const scheduledFor =
        values.deliveryMode === 'scheduled'
          ? toScheduledAtIso(values.scheduledFor ?? '')
          : null

      if (values.deliveryMode === 'scheduled' && !scheduledFor) {
        throw new Error('Choose a valid future date and time for the campaign.')
      }

      return dispatchNotifications({
        userIds: targetUserIds,
        title: values.title,
        message: values.message,
        type: values.type,
        scheduledFor,
      })
    },
    onSuccess: (message) => {
      toast.success(message)
      outreachForm.reset({
        audience: 'all_school_users',
        type: 'Reminder',
        title: '',
        message: '',
        deliveryMode: 'scheduled',
        scheduledFor: getDefaultScheduledForValue(),
        recipientIds: [],
      })
      setRecipientSearch('')
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Unable to schedule the school notification right now.'
        )
      )
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error(
          'You need to sign in again before updating notifications.'
        )
      }

      return markAllNotificationsAsRead(userId)
    },
    onSuccess: (message) => {
      toast.success(message)
      void queryClient.invalidateQueries({
        queryKey: ['settings', 'notifications', userId],
      })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(
          error,
          'Unable to mark the notifications as read right now.'
        )
      )
    },
  })

  const notifications = useMemo(() => {
    return [...(notificationsQuery.data?.items ?? [])].sort((left, right) => {
      const leftDate = new Date(left.createdAt ?? 0).getTime()
      const rightDate = new Date(right.createdAt ?? 0).getTime()
      return rightDate - leftDate
    })
  }, [notificationsQuery.data?.items])

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length

  const isDirectorRecipientsLoading =
    schoolParentsQuery.isLoading || schoolAgentsQuery.isLoading

  const scheduledPreview = outreachForm.watch('scheduledFor')
  const scheduledPreviewIso =
    deliveryMode === 'scheduled'
      ? toScheduledAtIso(scheduledPreview ?? '')
      : null

  if (!currentUser) {
    return (
      <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
        Your session is missing. Sign in again to manage notifications.
      </div>
    )
  }

  return (
    <Tabs
      defaultValue={isDirector ? 'director-outreach' : 'personal-inbox'}
      className='space-y-6'
    >
      <TabsList>
        {isDirector ? (
          <TabsTrigger value='director-outreach'>Diffusion directeur</TabsTrigger>
        ) : null}
        <TabsTrigger value='personal-inbox'>Ma boite</TabsTrigger>
      </TabsList>

      {isDirector ? (
        <TabsContent value='director-outreach' className='space-y-6'>
          {!schoolId ? (
            <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
              This director account is missing a linked school, so school
              outreach cannot be loaded yet.
            </div>
          ) : (
            <>
              <div className='grid gap-4 md:grid-cols-3'>
                <Card className='border-border/70'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Parents joignables
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-3xl font-semibold'>
                      {activeParents.length}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Enabled parent accounts in your school.
                    </p>
                  </CardContent>
                </Card>

                <Card className='border-border/70'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Reachable agents
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-3xl font-semibold'>
                      {activeAgents.length}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Enabled collecting agents with active user accounts.
                    </p>
                  </CardContent>
                </Card>

                <Card className='border-border/70'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium text-muted-foreground'>
                      Current audience
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='text-3xl font-semibold'>
                      {targetRecipients.length}
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      {getAudienceLabel(outreachAudience)} selected for this
                      send.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className='border-border/70'>
                <CardHeader>
                  <CardTitle>Planifier des notifications ecole</CardTitle>
                  <CardDescription>
                    Queue reminders, marketing campaigns, and operational
                    updates for parents and collecting agents using the EduFrais
                    notification pipeline.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {isDirectorRecipientsLoading ? (
                    <div className='space-y-3'>
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-12 w-full' />
                      <Skeleton className='h-48 w-full' />
                    </div>
                  ) : (
                    <Form {...outreachForm}>
                      <form
                        onSubmit={outreachForm.handleSubmit((values) =>
                          sendSchoolNotificationMutation.mutate(values)
                        )}
                        className='space-y-6'
                      >
                        <div className='grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
                          <div className='space-y-6'>
                            <FormField
                              control={outreachForm.control}
                              name='audience'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Audience</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {audienceOptions.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    {
                                      audienceOptions.find(
                                        (option) => option.value === field.value
                                      )?.description
                                    }
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={outreachForm.control}
                              name='type'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Campaign type</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {notificationTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={outreachForm.control}
                              name='deliveryMode'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Delivery</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {deliveryModeOptions.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    {
                                      deliveryModeOptions.find(
                                        (option) => option.value === field.value
                                      )?.description
                                    }
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {deliveryMode === 'scheduled' ? (
                              <FormField
                                control={outreachForm.control}
                                name='scheduledFor'
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Scheduled for</FormLabel>
                                    <FormControl>
                                      <Input
                                        type='datetime-local'
                                        {...field}
                                        value={field.value ?? ''}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      The schedule uses your current browser
                                      time and is sent to the backend as an ISO
                                      date.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            ) : null}

                            <div className='flex flex-wrap gap-2'>
                              <Badge variant='outline'>
                                {targetRecipients.length} recipient
                                {targetRecipients.length === 1 ? '' : 's'}
                              </Badge>
                              <Badge variant='outline'>
                                {getAudienceLabel(outreachAudience)}
                              </Badge>
                              <Badge variant='outline'>
                                {deliveryMode === 'scheduled' &&
                                scheduledPreviewIso
                                  ? `Scheduled ${formatDateTime(scheduledPreviewIso)}`
                                  : 'Immediate send'}
                              </Badge>
                            </div>
                          </div>

                          <div className='space-y-6'>
                            <FormField
                              control={outreachForm.control}
                              name='title'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Title</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder='Rappel des frais d examen'
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={outreachForm.control}
                              name='message'
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Message</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      rows={7}
                                      placeholder='Saisissez le message qui doit apparaitre dans la boite utilisateur.'
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Useful for fee reminders, collection
                                    follow-up, transport alerts, or school
                                    marketing campaigns.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        {outreachAudience === 'custom' ? (
                          <div className='space-y-4 rounded-xl border border-dashed p-4'>
                            <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                              <div>
                                <p className='font-medium'>Custom recipients</p>
                                <p className='text-sm text-muted-foreground'>
                                  Pick the exact parent and collecting-agent
                                  accounts that should receive this
                                  notification.
                                </p>
                              </div>
                              <div className='flex flex-wrap gap-2'>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() => {
                                    const nextRecipients = Array.from(
                                      new Set([
                                        ...selectedRecipientIds,
                                        ...filteredRecipientOptions.map(
                                          (recipient) => recipient.userId
                                        ),
                                      ])
                                    )
                                    outreachForm.setValue(
                                      'recipientIds',
                                      nextRecipients,
                                      {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                      }
                                    )
                                  }}
                                  disabled={
                                    filteredRecipientOptions.length === 0
                                  }
                                >
                                  Select visible
                                </Button>
                                <Button
                                  type='button'
                                  variant='outline'
                                  size='sm'
                                  onClick={() =>
                                    outreachForm.setValue('recipientIds', [], {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    })
                                  }
                                  disabled={selectedRecipientIds.length === 0}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>

                            <div className='grid gap-2'>
                              <Label htmlFor='recipient-search'>
                                Search users
                              </Label>
                              <Input
                                id='recipient-search'
                                placeholder='Search by name, role, email, or phone'
                                value={recipientSearch}
                                onChange={(event) =>
                                  setRecipientSearch(event.target.value)
                                }
                              />
                            </div>

                            <ScrollArea className='h-72 rounded-lg border'>
                              <div className='divide-y'>
                                {filteredRecipientOptions.length === 0 ? (
                                  <div className='p-4 text-sm text-muted-foreground'>
                                    No matching recipients were found for the
                                    current search.
                                  </div>
                                ) : (
                                  filteredRecipientOptions.map((recipient) => {
                                    const isChecked =
                                      selectedRecipientIds.includes(
                                        recipient.userId
                                      )

                                    return (
                                      <label
                                        key={recipient.userId}
                                        className='flex cursor-pointer items-start gap-3 p-4'
                                      >
                                        <Checkbox
                                          checked={isChecked}
                                          onCheckedChange={(checked) => {
                                            const nextRecipients = checked
                                              ? Array.from(
                                                  new Set([
                                                    ...selectedRecipientIds,
                                                    recipient.userId,
                                                  ])
                                                )
                                              : selectedRecipientIds.filter(
                                                  (value) =>
                                                    value !== recipient.userId
                                                )

                                            outreachForm.setValue(
                                              'recipientIds',
                                              nextRecipients,
                                              {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                              }
                                            )
                                          }}
                                        />
                                        <div className='space-y-1'>
                                          <div className='flex flex-wrap items-center gap-2'>
                                            <span className='font-medium'>
                                              {recipient.label}
                                            </span>
                                            <Badge variant='outline'>
                                              {recipient.audience}
                                            </Badge>
                                          </div>
                                          <div className='text-sm text-muted-foreground'>
                                            {recipient.details}
                                          </div>
                                        </div>
                                      </label>
                                    )
                                  })
                                )}
                              </div>
                            </ScrollArea>

                            {outreachForm.formState.errors.recipientIds ? (
                              <p className='text-sm font-medium text-destructive'>
                                {
                                  outreachForm.formState.errors.recipientIds
                                    .message
                                }
                              </p>
                            ) : null}
                          </div>
                        ) : null}

                        <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 p-4'>
                          <div className='space-y-1'>
                            <p className='font-medium'>Ready to dispatch</p>
                            <p className='text-sm text-muted-foreground'>
                              {deliveryMode === 'scheduled'
                                ? 'The director campaign will be queued and each recipient will receive it at the scheduled time.'
                                : 'The director campaign will be delivered immediately to the selected audience.'}
                            </p>
                          </div>
                          <Button
                            type='submit'
                            disabled={
                              sendSchoolNotificationMutation.isPending ||
                              targetRecipients.length === 0
                            }
                          >
                            {sendSchoolNotificationMutation.isPending
                              ? deliveryMode === 'scheduled'
                                ? 'Scheduling...'
                                : 'Sending...'
                              : deliveryMode === 'scheduled'
                                ? 'Schedule notification'
                                : 'Send notification now'}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      ) : null}

      <TabsContent value='personal-inbox' className='space-y-6'>
        <div className='grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2'>
          <div className='space-y-1'>
            <p className='text-sm font-medium'>Notification inbox</p>
            <p className='text-sm text-muted-foreground'>
              Review in-app notifications stored for your account.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
            <Badge variant='outline'>{notifications.length} total</Badge>
            <Badge variant='outline'>{unreadCount} unread</Badge>
            <Button
              variant='outline'
              size='sm'
              disabled={
                markAllAsReadMutation.isPending || notifications.length === 0
              }
              onClick={() => markAllAsReadMutation.mutate()}
            >
              {markAllAsReadMutation.isPending
                ? 'Updating...'
                : 'Mark all as read'}
            </Button>
          </div>
        </div>

        <Card className='border-border/70'>
          <CardHeader>
            <CardTitle>Send a notification to yourself</CardTitle>
            <CardDescription>
              Useful for testing the inbox and verifying the notification
              pipeline on your own account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...personalForm}>
              <form
                onSubmit={personalForm.handleSubmit((values) =>
                  sendMutation.mutate(values)
                )}
                className='space-y-6'
              >
                <FormField
                  control={personalForm.control}
                  name='type'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {notificationTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name='title'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder='Notification title' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={personalForm.control}
                  name='message'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder='What should this notification say?'
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This uses the existing `SendNotification` endpoint.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type='submit' disabled={sendMutation.isPending}>
                  {sendMutation.isPending
                    ? 'Sending notification...'
                    : 'Send notification'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className='space-y-4'>
          <div>
            <h4 className='font-medium'>Recent notifications</h4>
            <p className='text-sm text-muted-foreground'>
              Latest notifications stored in the EduFrais notification table for
              this account.
            </p>
          </div>

          {notificationsQuery.isLoading ? (
            <div className='space-y-3'>
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-24 w-full' />
              <Skeleton className='h-24 w-full' />
            </div>
          ) : notifications.length === 0 ? (
            <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
              No notifications were returned for this account yet.
            </div>
          ) : (
            <div className='space-y-3'>
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className='rounded-xl border bg-muted/20 p-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='font-medium'>{notification.title}</div>
                      <div className='text-sm text-muted-foreground'>
                        {notification.message}
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Badge variant='outline'>{notification.type}</Badge>
                      <Badge
                        variant={notification.isRead ? 'outline' : 'default'}
                      >
                        {notification.isRead ? 'Read' : 'Unread'}
                      </Badge>
                    </div>
                  </div>
                  <div className='mt-3 text-xs text-muted-foreground'>
                    Created {formatDateTime(notification.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
