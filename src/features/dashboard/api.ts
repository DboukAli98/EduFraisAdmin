import {
  api,
  readArray,
  readNumber,
  readRecord,
  readString,
  readValue,
  type ApiRecord,
} from '@/lib/api'

export type ReportingPeriod = 'week' | 'month' | 'quarter' | 'year'
export type SupportSource =
  | 'PARENT_TO_DIRECTOR'
  | 'PARENT_TO_AGENT'
  | 'AGENT_TO_DIRECTOR'

export interface SchoolSummary {
  id: number
  name: string
  address: string
  email: string
  phoneNumber: string
  website: string | null
  establishedYear: number | null
  statusId: number
}

export interface MetricWidget {
  total: number
  count: number | null
  growthPercentage: number
}

export interface TrendPoint {
  label: string
  totalAmount: number
  totalTransactions: number
}

export interface PaymentMethodPoint {
  paymentMethod: string
  totalAmount: number
  totalTransactions: number
  percentage: number
}

export interface AgentCollectionPoint {
  collectingAgentId: number
  agentName: string
  totalCollectedAmount: number
  totalTransactions: number
  sharePercentage: number
}

export interface AgentSummary {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  assignedArea: string | null
  commissionPercentage: number | null
  statusId: number
}

export interface PendingChild {
  id: number
  firstName: string
  lastName: string
  statusId: number
  createdOn: string | null
  parentName: string | null
}

export interface SupportRequestSummary {
  id: number
  title: string
  statusId: number
  priority: string
  supportRequestType: string
  createdOn: string | null
  expectedResolutionDate: string | null
  source: SupportSource
  parentName: string | null
  agentName: string | null
}

export interface PaginatedResult<T> {
  items: T[]
  totalCount: number
}

function mapSchool(record: ApiRecord): SchoolSummary {
  return {
    id: readNumber(record, 'SchoolId', 'schoolId') ?? 0,
    name: readString(record, 'SchoolName', 'schoolName') ?? 'Unnamed school',
    address: readString(record, 'SchoolAddress', 'schoolAddress') ?? 'No address',
    email: readString(record, 'SchoolEmail', 'schoolEmail') ?? 'No email',
    phoneNumber:
      readString(record, 'SchoolPhoneNumber', 'schoolPhoneNumber') ?? 'No phone',
    website: readString(record, 'SchoolWebsite', 'schoolWebsite') ?? null,
    establishedYear:
      readNumber(record, 'SchoolEstablishedYear', 'schoolEstablishedYear') ?? null,
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
  }
}

function mapMetricWidget(
  record: ApiRecord | undefined,
  options: { totalKeys: string[]; countKeys?: string[] }
): MetricWidget {
  return {
    total:
      (options.totalKeys.length > 0
        ? readNumber(record, ...options.totalKeys)
        : undefined) ?? 0,
    count: options.countKeys ? readNumber(record, ...options.countKeys) ?? null : null,
    growthPercentage:
      readNumber(record, 'GrowthPercentage', 'growthPercentage') ?? 0,
  }
}

function mapTrendPoint(record: ApiRecord): TrendPoint {
  return {
    label: readString(record, 'Label', 'label') ?? 'Unknown',
    totalAmount: readNumber(record, 'TotalAmount', 'totalAmount') ?? 0,
    totalTransactions:
      readNumber(record, 'TotalTransactions', 'totalTransactions') ?? 0,
  }
}

function mapPaymentMethodPoint(record: ApiRecord): PaymentMethodPoint {
  return {
    paymentMethod:
      readString(record, 'PaymentMethod', 'paymentMethod') ?? 'Unknown',
    totalAmount: readNumber(record, 'TotalAmount', 'totalAmount') ?? 0,
    totalTransactions:
      readNumber(record, 'TotalTransactions', 'totalTransactions') ?? 0,
    percentage: readNumber(record, 'Percentage', 'percentage') ?? 0,
  }
}

function mapAgentCollectionPoint(record: ApiRecord): AgentCollectionPoint {
  return {
    collectingAgentId:
      readNumber(record, 'CollectingAgentId', 'collectingAgentId') ?? 0,
    agentName: readString(record, 'AgentName', 'agentName') ?? 'Unknown',
    totalCollectedAmount:
      readNumber(record, 'TotalCollectedAmount', 'totalCollectedAmount') ?? 0,
    totalTransactions:
      readNumber(record, 'TotalTransactions', 'totalTransactions') ?? 0,
    sharePercentage:
      readNumber(record, 'SharePercentage', 'sharePercentage') ?? 0,
  }
}

function mapAgentSummary(record: ApiRecord): AgentSummary {
  return {
    id: readNumber(record, 'CollectingAgentId', 'collectingAgentId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    email: readString(record, 'Email', 'email') ?? 'No email',
    phoneNumber: readString(record, 'PhoneNumber', 'phoneNumber') ?? 'No phone',
    assignedArea: readString(record, 'AssignedArea', 'assignedArea') ?? null,
    commissionPercentage:
      readNumber(record, 'CommissionPercentage', 'commissionPercentage') ?? null,
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
  }
}

function buildPersonName(record: ApiRecord | undefined): string | null {
  if (!record) {
    return null
  }

  const firstName = readString(record, 'FirstName', 'firstName') ?? ''
  const lastName = readString(record, 'LastName', 'lastName') ?? ''
  const fullName = `${firstName} ${lastName}`.trim()

  return fullName.length > 0 ? fullName : null
}

function mapPendingChild(record: ApiRecord): PendingChild {
  return {
    id: readNumber(record, 'ChildId', 'childId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    parentName: buildPersonName(readRecord(record, 'Parent', 'parent')),
  }
}

function mapSupportRequest(
  record: ApiRecord,
  source: SupportSource
): SupportRequestSummary {
  return {
    id: readNumber(record, 'SupportRequestId', 'supportRequestId') ?? 0,
    title: readString(record, 'Title', 'title') ?? 'Untitled request',
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    priority: readString(record, 'Priority', 'priority') ?? 'Medium',
    supportRequestType:
      readString(record, 'SupportRequestType', 'supportRequestType') ?? 'General',
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    expectedResolutionDate:
      readString(record, 'ExpectedResolutionDate', 'expectedResolutionDate') ??
      null,
    source,
    parentName: buildPersonName(readRecord(record, 'Parent', 'parent')),
    agentName: buildPersonName(
      readRecord(record, 'AssignedCollectingAgent', 'assignedCollectingAgent')
    ),
  }
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

export async function fetchSchools(): Promise<PaginatedResult<SchoolSummary>> {
  const { data } = await api.post('/api/School/SchoolsListing', {
    PageNumber: 1,
    PageSize: 200,
    Search: '',
    onlyEnabled: false,
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapSchool),
    totalCount: getEnvelopeCount(data),
  }
}

export async function fetchStudentMetrics(schoolId: number): Promise<MetricWidget> {
  const { data } = await api.get('/api/Reports/GetStudentCountBySchool', {
    params: { SchoolId: schoolId, StatusId: 1 },
  })

  return mapMetricWidget(readRecord(getEnvelopeData(data)), {
    totalKeys: ['TotalStudents', 'totalStudents', 'ActiveStudents', 'activeStudents'],
  })
}

export async function fetchParentMetrics(schoolId: number): Promise<MetricWidget> {
  const { data } = await api.get('/api/Reports/GetTotalActiveParentInSchool', {
    params: { SchoolId: schoolId, StatusId: 1 },
  })

  return mapMetricWidget(readRecord(getEnvelopeData(data)), {
    totalKeys: ['TotalParents', 'totalParents', 'TotalActiveParents', 'totalActiveParents'],
  })
}

export async function fetchPaidInstallmentsMetrics(
  schoolId: number
): Promise<MetricWidget> {
  const { data } = await api.get('/api/Reports/GetTotalPaidInstallmentsBySchool', {
    params: { SchoolId: schoolId, StatusId: 8 },
  })

  return mapMetricWidget(readRecord(getEnvelopeData(data)), {
    totalKeys: ['TotalAmount', 'totalAmount', 'TotalPaidAmount', 'totalPaidAmount'],
    countKeys: ['TotalPaidCount', 'totalPaidCount'],
  })
}

export async function fetchPendingInstallmentsMetrics(
  schoolId: number
): Promise<MetricWidget> {
  const { data } = await api.get(
    '/api/Reports/GetInstallmentsPendingPaymentsTotal',
    {
      params: { SchoolId: schoolId, ExcludedStatus: 8 },
    }
  )

  return mapMetricWidget(readRecord(getEnvelopeData(data)), {
    totalKeys: ['TotalAmount', 'totalAmount', 'TotalPendingAmount', 'totalPendingAmount'],
    countKeys: ['TotalPendingCount', 'totalPendingCount'],
  })
}

export async function fetchPaymentTrend(
  schoolId: number,
  period: ReportingPeriod
): Promise<TrendPoint[]> {
  const { data } = await api.get('/api/Reports/GetSchoolPaymentTrend', {
    params: { SchoolId: schoolId, Period: period, StatusId: 8 },
  })

  return readArray(getEnvelopeData(data)).map(mapTrendPoint)
}

export async function fetchPaymentMethodBreakdown(
  schoolId: number,
  period: ReportingPeriod
): Promise<PaymentMethodPoint[]> {
  const { data } = await api.get(
    '/api/Reports/GetSchoolPaymentMethodBreakdown',
    {
      params: { SchoolId: schoolId, Period: period, StatusId: 8 },
    }
  )

  return readArray(getEnvelopeData(data)).map(mapPaymentMethodPoint)
}

export async function fetchAgentCollectionSummary(
  schoolId: number,
  period: ReportingPeriod
): Promise<AgentCollectionPoint[]> {
  const { data } = await api.get(
    '/api/Reports/GetSchoolAgentCollectionSummary',
    {
      params: { SchoolId: schoolId, Period: period, StatusId: 8 },
    }
  )

  return readArray(getEnvelopeData(data)).map(mapAgentCollectionPoint)
}

export async function fetchCollectingAgents(
  schoolId: number
): Promise<PaginatedResult<AgentSummary>> {
  const { data } = await api.get('/api/CollectingAgent/GetCollectingAgents', {
    params: { SchoolId: schoolId, PageNumber: 1, PageSize: 8 },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapAgentSummary),
    totalCount: getEnvelopeCount(data),
  }
}

export async function fetchPendingChildren(
  schoolId: number
): Promise<PaginatedResult<PendingChild>> {
  const { data } = await api.get('/api/Director/GetPendingChildren', {
    params: { SchoolId: schoolId, PageNumber: 1, PageSize: 8 },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapPendingChild),
    totalCount: getEnvelopeCount(data),
  }
}

export async function fetchSupportRequests(
  schoolId: number,
  source: SupportSource
): Promise<PaginatedResult<SupportRequestSummary>> {
  const { data } = await api.get('/api/SupportRequest/GetAllSupportRequests', {
    params: {
      SchoolId: schoolId,
      Source: source,
      PageNumber: 1,
      PageSize: 5,
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
