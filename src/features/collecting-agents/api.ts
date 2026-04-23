import {
  api,
  readArray,
  readBoolean,
  readNumber,
  readRecord,
  readString,
  readValue,
  type ApiRecord,
} from '@/lib/api'

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
}

export interface AgentRecord {
  id: number
  schoolId: number
  firstName: string
  lastName: string
  email: string
  countryCode: string
  phoneNumber: string
  assignedArea: string | null
  commissionPercentage: number | null
  statusId: number
  userId: string
  createdOn: string | null
  modifiedOn: string | null
}

export interface AgentMutationInput {
  schoolId: number
  firstName: string
  lastName: string
  email: string
  countryCode: string
  phoneNumber: string
  assignedArea: string
  commissionPercentage: string
}

export interface AgentAssignmentParent {
  id: number
  firstName: string
  lastName: string
  fatherName: string
  email: string
  countryCode: string
  phoneNumber: string
  statusId: number
  childCount: number
  userId: string
}

export interface PendingAgentRequestRecord {
  id: number
  collectingAgentId: number
  collectingAgentName: string | null
  parentId: number
  parentName: string | null
  approvalStatus: string | null
  isActive: boolean
  assignmentNotes: string | null
  approvalNotes: string | null
  requestedByParent: boolean
  createdOn: string | null
  modifiedOn: string | null
  reviewedDate: string | null
}

export type AgentActivityType =
  | 'PaymentCollected'
  | 'PaymentAttempted'
  | 'ParentContact'
  | 'SupportRequestHandled'
  | 'ParentAssigned'
  | 'ParentUnassigned'
  | 'FieldVisit'
  | 'PhoneCall'
  | 'Other'

export interface AgentActivityRecord {
  id: number
  collectingAgentId: number
  agentName: string | null
  parentId: number | null
  parentName: string | null
  activityType: AgentActivityType
  activityTypeDisplayName: string
  activityDescription: string
  notes: string | null
  relatedTransactionId: number | null
  relatedSupportRequestId: number | null
  activityDate: string | null
  createdOn: string | null
}

export interface AgentActivityMutationInput {
  collectingAgentId: number
  parentId: number | null
  activityType: AgentActivityType
  activityDescription: string
  notes: string
  relatedTransactionId: string
  relatedSupportRequestId: string
}

export interface AgentCommissionRecord {
  id: number
  collectingAgentId: number
  paymentTransactionId: number
  commissionAmount: number
  commissionRate: number
  isApproved: boolean
  approvedBy: string | null
  approvedDate: string | null
  description: string | null
  approvalNotes: string | null
  commissionType: string | null
  status: string | null
  createdOn: string | null
  modifiedOn: string | null
}

export interface CommissionMutationInput {
  paymentTransactionId: string
  commissionAmount: string
  commissionRate: string
  description: string
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

async function fetchAllPages<T>(
  fetchPage: (
    pageNumber: number,
    pageSize: number
  ) => Promise<PaginatedResult<T>>
): Promise<T[]> {
  const items: T[] = []
  let pageNumber = 1
  const pageSize = 100

  while (true) {
    const page = await fetchPage(pageNumber, pageSize)
    items.push(...page.items)

    if (page.items.length === 0 || page.totalCount === 0) {
      break
    }

    if (items.length >= page.totalCount) {
      break
    }

    pageNumber += 1
  }

  return items
}

function mapAgent(record: ApiRecord): AgentRecord {
  const countryCodeNumber = readNumber(record, 'CountryCode', 'countryCode')

  return {
    id: readNumber(record, 'CollectingAgentId', 'collectingAgentId') ?? 0,
    schoolId:
      readNumber(record, 'FK_SchoolId', 'fK_SchoolId', 'fk_SchoolId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    email: readString(record, 'Email', 'email') ?? '',
    countryCode:
      readString(record, 'CountryCode', 'countryCode') ??
      (countryCodeNumber != null ? String(countryCodeNumber) : '242'),
    phoneNumber: readString(record, 'PhoneNumber', 'phoneNumber') ?? '',
    assignedArea: readString(record, 'AssignedArea', 'assignedArea') ?? null,
    commissionPercentage:
      readNumber(record, 'CommissionPercentage', 'commissionPercentage') ?? null,
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    userId: readString(record, 'FK_UserId', 'fK_UserId', 'fk_UserId') ?? '',
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function mapParentLite(record: ApiRecord): AgentAssignmentParent {
  return {
    id: readNumber(record, 'ParentId', 'parentId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    fatherName: readString(record, 'FatherName', 'fatherName') ?? '',
    email: readString(record, 'Email', 'email') ?? '',
    countryCode: readString(record, 'CountryCode', 'countryCode') ?? '242',
    phoneNumber: readString(record, 'PhoneNumber', 'phoneNumber') ?? '',
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    childCount: readArray(record, 'Childrens', 'childrens').length,
    userId: readString(record, 'FK_UserId', 'fK_UserId', 'fk_UserId') ?? '',
  }
}

function mapPendingAgentRequest(record: ApiRecord): PendingAgentRequestRecord {
  const parent = readRecord(record, 'Parent', 'parent')
  const collectingAgent = readRecord(record, 'CollectingAgent', 'collectingAgent')

  return {
    id:
      readNumber(record, 'CollectingAgentParentId', 'collectingAgentParentId') ?? 0,
    collectingAgentId:
      readNumber(
        record,
        'FK_CollectingAgentId',
        'fK_CollectingAgentId',
        'fk_CollectingAgentId'
      ) ?? 0,
    collectingAgentName: buildFullName(
      readString(collectingAgent, 'FirstName', 'firstName'),
      readString(collectingAgent, 'LastName', 'lastName')
    ),
    parentId:
      readNumber(record, 'FK_ParentId', 'fK_ParentId', 'fk_ParentId') ?? 0,
    parentName: buildFullName(
      readString(parent, 'FirstName', 'firstName'),
      readString(parent, 'LastName', 'lastName')
    ),
    approvalStatus: readString(record, 'ApprovalStatus', 'approvalStatus') ?? null,
    isActive: readBoolean(record, 'IsActive', 'isActive') ?? false,
    assignmentNotes:
      readString(record, 'AssignmentNotes', 'assignmentNotes') ?? null,
    approvalNotes: readString(record, 'ApprovalNotes', 'approvalNotes') ?? null,
    requestedByParent:
      readBoolean(record, 'RequestedByParent', 'requestedByParent') ?? false,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
    reviewedDate: readString(record, 'ReviewedDate', 'reviewedDate') ?? null,
  }
}

function mapActivity(record: ApiRecord): AgentActivityRecord {
  const activityType =
    (readString(record, 'ActivityType', 'activityType') as AgentActivityType) ??
    'Other'

  return {
    id: readNumber(record, 'ActivityId', 'activityId') ?? 0,
    collectingAgentId:
      readNumber(record, 'CollectingAgentId', 'collectingAgentId') ?? 0,
    agentName: readString(record, 'AgentName', 'agentName') ?? null,
    parentId: readNumber(record, 'ParentId', 'parentId') ?? null,
    parentName: readString(record, 'ParentName', 'parentName') ?? null,
    activityType,
    activityTypeDisplayName:
      readString(record, 'ActivityTypeDisplayName', 'activityTypeDisplayName') ??
      activityType,
    activityDescription:
      readString(record, 'ActivityDescription', 'activityDescription') ??
      'Aucune description',
    notes: readString(record, 'Notes', 'notes') ?? null,
    relatedTransactionId:
      readNumber(record, 'RelatedTransactionId', 'relatedTransactionId') ?? null,
    relatedSupportRequestId:
      readNumber(
        record,
        'RelatedSupportRequestId',
        'relatedSupportRequestId'
      ) ?? null,
    activityDate: readString(record, 'ActivityDate', 'activityDate') ?? null,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
  }
}

function mapCommission(record: ApiRecord): AgentCommissionRecord {
  return {
    id: readNumber(record, 'CommissionId', 'commissionId') ?? 0,
    collectingAgentId:
      readNumber(
        record,
        'FK_CollectingAgentId',
        'fK_CollectingAgentId',
        'fk_CollectingAgentId'
      ) ?? 0,
    paymentTransactionId:
      readNumber(
        record,
        'FK_PaymentTransactionId',
        'fK_PaymentTransactionId',
        'fk_PaymentTransactionId'
      ) ?? 0,
    commissionAmount:
      readNumber(record, 'CommissionAmount', 'commissionAmount') ?? 0,
    commissionRate: readNumber(record, 'CommissionRate', 'commissionRate') ?? 0,
    isApproved: readBoolean(record, 'IsApproved', 'isApproved') ?? false,
    approvedBy: readString(record, 'ApprovedBy', 'approvedBy') ?? null,
    approvedDate: readString(record, 'ApprovedDate', 'approvedDate') ?? null,
    description: readString(record, 'Description', 'description') ?? null,
    approvalNotes:
      readString(record, 'ApprovalNotes', 'approvalNotes') ?? null,
    commissionType:
      readString(record, 'CommissionType', 'commissionType') ?? null,
    status: readString(record, 'Status', 'status') ?? null,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

export async function fetchCollectingAgents(schoolId: number): Promise<AgentRecord[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/CollectingAgent/GetCollectingAgents', {
      params: {
        SchoolId: schoolId,
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapAgent),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function createCollectingAgent(
  input: AgentMutationInput
): Promise<void> {
  await api.post('/api/CollectingAgent/AddCollectingAgentToSystem', {
    SchoolId: input.schoolId,
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    Email: input.email.trim(),
    CountryCode: input.countryCode.trim(),
    PhoneNumber: input.phoneNumber.trim(),
    AssignedArea: input.assignedArea.trim() || null,
    CommissionPercentage: input.commissionPercentage
      ? Number(input.commissionPercentage)
      : null,
  })
}

export async function updateCollectingAgent(
  collectingAgentId: number,
  statusId: number,
  input: AgentMutationInput
): Promise<void> {
  await api.put('/api/CollectingAgent/EditAgent', {
    CollectingAgentId: collectingAgentId,
    SchoolId: input.schoolId,
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    Email: input.email.trim(),
    CountryCode: input.countryCode.trim(),
    PhoneNumber: input.phoneNumber.trim(),
    AssignedArea: input.assignedArea.trim() || null,
    CommissionPercentage: input.commissionPercentage
      ? Number(input.commissionPercentage)
      : null,
    StatusId: statusId,
  })
}

export async function updateCollectingAgentStatus(
  agent: AgentRecord,
  statusId: number
): Promise<void> {
  await updateCollectingAgent(agent.id, statusId, {
    schoolId: agent.schoolId,
    firstName: agent.firstName,
    lastName: agent.lastName,
    email: agent.email,
    countryCode: agent.countryCode,
    phoneNumber: agent.phoneNumber,
    assignedArea: agent.assignedArea ?? '',
    commissionPercentage:
      agent.commissionPercentage != null ? String(agent.commissionPercentage) : '',
  })
}

export async function fetchCollectingAgentParents(
  collectingAgentId: number
): Promise<AgentAssignmentParent[]> {
  const { data } = await api.get('/api/CollectingAgent/GetCollectingAgentParents', {
    params: {
      CollectingAgentId: collectingAgentId,
      PageNumber: 1,
      PageSize: 200,
    },
  })

  return readArray(getEnvelopeData(data)).map(mapParentLite)
}

export async function assignCollectingAgentToParent(input: {
  collectingAgentId: number
  parentId: number
  directorId: number
  assignmentNotes: string
}): Promise<void> {
  await api.post('/api/CollectingAgent/AssignCollectingAgentToParent', {
    CollectingAgentId: input.collectingAgentId,
    ParentId: input.parentId,
    DirectorId: input.directorId,
    AssignmentNotes: input.assignmentNotes.trim() || null,
    IsActive: true,
  })
}

export async function unassignCollectingAgentFromParent(input: {
  collectingAgentId: number
  parentId: number
}): Promise<void> {
  await api.post('/api/CollectingAgent/UnassignCollectingAgentToParent', {
    CollectingAgentId: input.collectingAgentId,
    ParentId: input.parentId,
  })
}

export async function fetchPendingAgentRequests(
  schoolId: number
): Promise<PendingAgentRequestRecord[]> {
  const { data } = await api.get('/api/CollectingAgent/GetPendingAgentRequests', {
    params: {
      SchoolId: schoolId,
      PageNumber: 1,
      PageSize: 200,
    },
  })

  return readArray(getEnvelopeData(data)).map(mapPendingAgentRequest)
}

export async function approveAgentRequest(input: {
  collectingAgentParentId: number
  directorId: number
  approvalNotes: string
}): Promise<void> {
  await api.post('/api/CollectingAgent/ApproveAgentRequest', {
    CollectingAgentParentId: input.collectingAgentParentId,
    DirectorId: input.directorId,
    ApprovalNotes: input.approvalNotes.trim() || null,
  })
}

export async function rejectAgentRequest(input: {
  collectingAgentParentId: number
  directorId: number
  approvalNotes: string
}): Promise<void> {
  await api.post('/api/CollectingAgent/RejectAgentRequest', {
    CollectingAgentParentId: input.collectingAgentParentId,
    DirectorId: input.directorId,
    ApprovalNotes: input.approvalNotes.trim() || null,
  })
}

export async function fetchSchoolAgentActivities(options: {
  schoolId?: number | null
  collectingAgentId?: number | null
}): Promise<PaginatedResult<AgentActivityRecord>> {
  const { data } = await api.get('/api/Director/GetSchoolAgentActivities', {
    params: {
      SchoolId: options.schoolId ?? undefined,
      CollectingAgentId: options.collectingAgentId ?? undefined,
      PageNumber: 1,
      PageSize: 100,
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapActivity),
    totalCount: getEnvelopeCount(data),
  }
}

export async function logAgentActivity(
  input: AgentActivityMutationInput
): Promise<void> {
  await api.post('/api/Director/LogAgentActivity', {
    CollectingAgentId: input.collectingAgentId,
    ParentId: input.parentId || null,
    ActivityType: input.activityType,
    ActivityDescription: input.activityDescription.trim(),
    Notes: input.notes.trim() || null,
    RelatedTransactionId: input.relatedTransactionId
      ? Number(input.relatedTransactionId)
      : null,
    RelatedSupportRequestId: input.relatedSupportRequestId
      ? Number(input.relatedSupportRequestId)
      : null,
  })
}

export async function fetchAgentCommissions(
  collectingAgentId: number
): Promise<PaginatedResult<AgentCommissionRecord>> {
  const { data } = await api.get('/api/Director/GetAgentCommissions', {
    params: {
      CollectingAgentId: collectingAgentId,
      PageNumber: 1,
      PageSize: 100,
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapCommission),
    totalCount: getEnvelopeCount(data),
  }
}

export async function createAgentCommission(input: {
  collectingAgentId: number
  directorId: number
  paymentTransactionId: string
  commissionAmount: string
  commissionRate: string
  description: string
}): Promise<void> {
  await api.post('/api/Director/AddCommission', {
    CollectingAgentId: input.collectingAgentId,
    DirectorId: input.directorId,
    PaymentTransactionId: Number(input.paymentTransactionId),
    CommissionAmount: Number(input.commissionAmount),
    CommissionRate: Number(input.commissionRate || 0),
    Description: input.description.trim() || null,
  })
}
