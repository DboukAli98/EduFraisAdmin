import {
  api,
  readArray,
  readNumber,
  readRecord,
  readString,
  readValue,
  type ApiRecord,
} from '@/lib/api'

export type SupportSource =
  | 'PARENT_TO_DIRECTOR'
  | 'PARENT_TO_AGENT'
  | 'AGENT_TO_DIRECTOR'

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
}

export interface SupportRequestRecord {
  id: number
  title: string
  description: string
  resultNotes: string | null
  supportRequestType: string
  statusId: number
  schoolId: number
  parentId: number | null
  assignedCollectingAgentId: number | null
  directorId: number | null
  priority: string
  source: SupportSource
  parentName: string | null
  agentName: string | null
  createdOn: string | null
  expectedResolutionDate: string | null
  assignedToAgentDate: string | null
  resolvedDate: string | null
}

export interface SupportRequestStatusLogRecord {
  id: number
  supportRequestId: number
  statusId: number
  message: string
  createdAt: string | null
}

export interface SupportRequestDetailsRecord {
  id: number
  title: string
  description: string
  resultNotes: string | null
  supportRequestType: string
  statusId: number
  schoolId: number
  parentId: number | null
  assignedCollectingAgentId: number | null
  directorId: number | null
  priority: string
  createdOn: string | null
  expectedResolutionDate: string | null
  resolvedDate: string | null
  statusLogs: SupportRequestStatusLogRecord[]
}

function buildFullName(...parts: Array<string | null | undefined>): string | null {
  const fullName = parts
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(' ')

  return fullName.length > 0 ? fullName : null
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

function mapSupportRequest(
  record: ApiRecord,
  source: SupportSource
): SupportRequestRecord {
  const parent = readRecord(record, 'Parent', 'parent')
  const agent = readRecord(
    record,
    'AssignedCollectingAgent',
    'assignedCollectingAgent'
  )

  return {
    id: readNumber(record, 'SupportRequestId', 'supportRequestId') ?? 0,
    title: readString(record, 'Title', 'title') ?? 'Demande sans titre',
    description: readString(record, 'Description', 'description') ?? '',
    resultNotes: readString(record, 'ResultNotes', 'resultNotes') ?? null,
    supportRequestType:
      readString(record, 'SupportRequestType', 'supportRequestType') ?? 'General',
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    schoolId:
      readNumber(record, 'FK_SchoolId', 'fK_SchoolId', 'fk_SchoolId') ?? 0,
    parentId:
      readNumber(record, 'FK_ParentId', 'fK_ParentId', 'fk_ParentId') ?? null,
    assignedCollectingAgentId:
      readNumber(
        record,
        'FK_AssignedCollectingAgentId',
        'fK_AssignedCollectingAgentId',
        'fk_AssignedCollectingAgentId'
      ) ?? null,
    directorId:
      readNumber(record, 'FK_DirectorId', 'fK_DirectorId', 'fk_DirectorId') ??
      null,
    priority: readString(record, 'Priority', 'priority') ?? 'Moyenne',
    source,
    parentName: buildFullName(
      readString(parent, 'FirstName', 'firstName'),
      readString(parent, 'LastName', 'lastName')
    ),
    agentName: buildFullName(
      readString(agent, 'FirstName', 'firstName'),
      readString(agent, 'LastName', 'lastName')
    ),
    createdOn:
      readString(record, 'CreatedOn', 'createdOn') ??
      readString(record, 'CreatedAt', 'createdAt') ??
      null,
    expectedResolutionDate:
      readString(record, 'ExpectedResolutionDate', 'expectedResolutionDate') ??
      null,
    assignedToAgentDate:
      readString(record, 'AssignedToAgentDate', 'assignedToAgentDate') ?? null,
    resolvedDate: readString(record, 'ResolvedDate', 'resolvedDate') ?? null,
  }
}

function mapStatusLog(record: ApiRecord): SupportRequestStatusLogRecord {
  return {
    id:
      readNumber(
        record,
        'SupportRequestStatusLogId',
        'supportRequestStatusLogId'
      ) ?? 0,
    supportRequestId:
      readNumber(
        record,
        'FK_SupportRequestId',
        'fK_SupportRequestId',
        'fk_SupportRequestId'
      ) ?? 0,
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    message: readString(record, 'Message', 'message') ?? 'Aucun message',
    createdAt:
      readString(record, 'CreatedAt', 'createdAt') ??
      readString(record, 'CreatedOn', 'createdOn') ??
      null,
  }
}

function mapSupportRequestDetails(record: ApiRecord): SupportRequestDetailsRecord {
  return {
    id: readNumber(record, 'SupportRequestId', 'supportRequestId') ?? 0,
    title: readString(record, 'Title', 'title') ?? 'Demande sans titre',
    description: readString(record, 'Description', 'description') ?? '',
    resultNotes: readString(record, 'ResultNotes', 'resultNotes') ?? null,
    supportRequestType:
      readString(record, 'SupportRequestType', 'supportRequestType') ?? 'General',
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    schoolId:
      readNumber(record, 'FK_SchoolId', 'fK_SchoolId', 'fk_SchoolId') ?? 0,
    parentId:
      readNumber(record, 'FK_ParentId', 'fK_ParentId', 'fk_ParentId') ?? null,
    assignedCollectingAgentId:
      readNumber(
        record,
        'FK_AssignedCollectingAgentId',
        'fK_AssignedCollectingAgentId',
        'fk_AssignedCollectingAgentId'
      ) ?? null,
    directorId:
      readNumber(record, 'FK_DirectorId', 'fK_DirectorId', 'fk_DirectorId') ??
      null,
    priority: readString(record, 'Priority', 'priority') ?? 'Moyenne',
    createdOn:
      readString(record, 'CreatedAt', 'createdAt') ??
      readString(record, 'CreatedOn', 'createdOn') ??
      null,
    expectedResolutionDate:
      readString(record, 'ExpectedResolutionDate', 'expectedResolutionDate') ??
      null,
    resolvedDate: readString(record, 'ResolvedDate', 'resolvedDate') ?? null,
    statusLogs: readArray(record, 'StatusLogs', 'statusLogs').map(mapStatusLog),
  }
}

export async function fetchSupportRequests(
  schoolId: number,
  source: SupportSource,
  pageSize = 100
): Promise<PaginatedResult<SupportRequestRecord>> {
  const { data } = await api.get('/api/SupportRequest/GetAllSupportRequests', {
    params: {
      SchoolId: schoolId,
      Source: source,
      PageNumber: 1,
      PageSize: pageSize,
      Search: '',
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map((record) =>
      mapSupportRequest(record, source)
    ),
    totalCount: getEnvelopeCount(data),
  }
}

export async function fetchSupportRequestDetails(
  supportRequestId: number
): Promise<SupportRequestDetailsRecord> {
  const { data } = await api.get('/api/SupportRequest/GetSupportRequestById', {
    params: { SupportRequestId: supportRequestId },
  })

  const record = readRecord(getEnvelopeData(data))

  if (!record) {
    throw new Error('Les details de la demande de support n ont pas ete retournes par l API.')
  }

  return mapSupportRequestDetails(record)
}

export async function updateSupportRequestStatus(input: {
  supportRequestId: number
  newStatusId: number
  resultNotes: string
  message: string
}): Promise<void> {
  await api.put('/api/SupportRequest/UpdateSupportRequestStatus', {
    SupportRequestId: input.supportRequestId,
    NewStatusId: input.newStatusId,
    ResultNotes: input.resultNotes.trim() || null,
    Message: input.message.trim() || null,
  })
}
