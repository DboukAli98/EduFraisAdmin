import {
  api,
  readApiMessage,
  readArray,
  readBoolean,
  readNumber,
  readString,
  readValue,
  type ApiRecord,
} from '@/lib/api'

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
}

export interface NotificationRecord {
  id: number
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string | null
  scheduledFor: string | null
  relatedEntityId: number | null
  relatedEntityType: string | null
}

export interface NotificationMutationInput {
  userId: string
  title: string
  message: string
  type: string
}

export interface NotificationDispatchInput {
  userIds: string[]
  title: string
  message: string
  type: string
  scheduledFor?: string | null
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

function mapNotification(record: ApiRecord): NotificationRecord {
  return {
    id: readNumber(record, 'NotificationId', 'notificationId') ?? 0,
    userId: readString(record, 'UserId', 'userId') ?? '',
    title: readString(record, 'Title', 'title') ?? 'Untitled notification',
    message: readString(record, 'Message', 'message') ?? '',
    type: readString(record, 'Type', 'type') ?? 'General',
    isRead: readBoolean(record, 'IsRead', 'isRead') ?? false,
    createdAt: readString(record, 'CreatedAt', 'createdAt') ?? null,
    scheduledFor: readString(record, 'ScheduledFor', 'scheduledFor') ?? null,
    relatedEntityId:
      readNumber(record, 'RelatedEntityId', 'relatedEntityId') ?? null,
    relatedEntityType:
      readString(record, 'RelatedEntityType', 'relatedEntityType') ?? null,
  }
}

export async function fetchNotifications(
  userId: string
): Promise<PaginatedResult<NotificationRecord>> {
  const { data } = await api.get('/api/Notifications/GetNotifications', {
    params: {
      UserId: userId,
      PageNumber: 1,
      PageSize: 100,
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapNotification),
    totalCount: getEnvelopeCount(data),
  }
}

export async function sendNotification(
  input: NotificationMutationInput
): Promise<string> {
  const { data } = await api.post('/api/Notifications/SendNotification', {
    UserId: input.userId,
    Title: input.title.trim(),
    Message: input.message.trim(),
    Type: input.type.trim(),
    IsRead: false,
  })

  return readApiMessage(data, 'Notification sent successfully.')
}

export async function dispatchNotifications(
  input: NotificationDispatchInput
): Promise<string> {
  const { data } = await api.post('/api/Notifications/DispatchNotifications', {
    UserIds: input.userIds,
    Title: input.title.trim(),
    Message: input.message.trim(),
    Type: input.type.trim(),
    IsRead: false,
    ScheduledFor: input.scheduledFor ?? null,
  })

  return readApiMessage(data, 'Notifications dispatched successfully.')
}

export async function markAllNotificationsAsRead(
  userId: string
): Promise<string> {
  const { data } = await api.post('/api/Notifications/MarkAllAsRead', {
    UserId: userId,
    Type: null,
  })

  return readApiMessage(data, 'Notifications marked as read.')
}
