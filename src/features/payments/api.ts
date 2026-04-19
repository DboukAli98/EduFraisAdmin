import {
  api,
  readArray,
  readNumber,
  readRecord,
  readString,
  readValue,
  type ApiRecord,
} from '@/lib/api'
import { buildFullName } from '@/features/admin/utils'
import { fetchParents, type ParentRecord } from '@/features/users/api'

export interface MerchandiseLineItem {
  id: number
  merchandiseId: number
  name: string
  price: number
  quantity: number
  totalAmount: number
}

export interface SchoolFeePaymentRecord {
  id: number
  amountPaid: number
  paidDate: string | null
  paymentMethod: string
  transactionReference: string | null
  statusId: number
  userId: string
  parentName: string
  childName: string
  schoolName: string
  gradeName: string
  installmentAmount: number
  dueDate: string | null
  agentName: string | null
  processedByAgent: boolean
  collectionMethod: string | null
}

export interface MerchandisePaymentRecord {
  id: number
  amountPaid: number
  paidDate: string | null
  paymentMethod: string
  transactionReference: string | null
  statusId: number
  userId: string
  parentName: string
  totalItems: number
  totalQuantity: number
  agentName: string | null
  processedByAgent: boolean
  collectionMethod: string | null
  items: MerchandiseLineItem[]
}

export interface PaymentAggregationResult<T> {
  items: T[]
  totalParents: number
  scannedParents: number
  failedParents: number
}

export interface PaymentStatusLookup {
  transactionId: string
  status: string
  message: string
  amount: number
  currency: string
  country: string
}

interface PaginatedResult<T> {
  items: T[]
  totalCount: number
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

async function fetchAllPages<T>(
  fetchPage: (pageNumber: number, pageSize: number) => Promise<PaginatedResult<T>>
): Promise<T[]> {
  const items: T[] = []
  let pageNumber = 1
  const pageSize = 100

  while (true) {
    const result = await fetchPage(pageNumber, pageSize)
    items.push(...result.items)

    if (result.totalCount === 0 || result.items.length === 0) {
      break
    }

    if (items.length >= result.totalCount) {
      break
    }

    pageNumber += 1
  }

  return items
}

function mapSchoolFeePayment(
  record: ApiRecord,
  parentByUserId: Map<string, ParentRecord>
): SchoolFeePaymentRecord {
  const userId = readString(record, 'FK_UserId', 'fk_UserId') ?? ''
  const parent = parentByUserId.get(userId)

  return {
    id: readNumber(record, 'PaymentTransactionId', 'paymentTransactionId') ?? 0,
    amountPaid: readNumber(record, 'AmountPaid', 'amountPaid') ?? 0,
    paidDate: readString(record, 'PaidDate', 'paidDate') ?? null,
    paymentMethod: readString(record, 'PaymentMethod', 'paymentMethod') ?? 'Unknown',
    transactionReference:
      readString(record, 'TransactionReference', 'transactionReference') ?? null,
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    userId,
    parentName:
      parent != null
        ? buildFullName(parent.firstName, parent.lastName)
        : 'Unknown parent',
    childName: buildFullName(
      readString(record, 'FirstName', 'firstName'),
      readString(record, 'LastName', 'lastName')
    ),
    schoolName: readString(record, 'SchoolName', 'schoolName') ?? 'Unknown school',
    gradeName:
      readString(record, 'SchoolGradeName', 'schoolGradeName') ?? 'Unassigned',
    installmentAmount:
      readNumber(record, 'InstallmentAmount', 'installmentAmount') ?? 0,
    dueDate: readString(record, 'DueDate', 'dueDate') ?? null,
    agentName: buildFullName(
      readString(record, 'AgentFirstName', 'agentFirstName'),
      readString(record, 'AgentLastName', 'agentLastName')
    ) || null,
    processedByAgent:
      readValue(record, 'ProcessedByAgent', 'processedByAgent') === true,
    collectionMethod:
      readString(record, 'CollectionMethod', 'collectionMethod') ?? null,
  }
}

function parseMerchandiseItems(record: ApiRecord): MerchandiseLineItem[] {
  const rawJson =
    readString(record, 'MerchandiseItemsJson', 'merchandiseItemsJson') ?? '[]'

  try {
    const parsed = JSON.parse(rawJson)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((value): value is ApiRecord => Boolean(value) && typeof value === 'object')
      .map((item) => ({
        id: readNumber(item, 'TransactionItemId', 'transactionItemId') ?? 0,
        merchandiseId:
          readNumber(item, 'FK_SchoolMerchandiseId', 'fk_SchoolMerchandiseId') ?? 0,
        name:
          readString(
            item,
            'SchoolMerchandiseName',
            'schoolMerchandiseName'
          ) ?? 'Merchandise item',
        price:
          readNumber(
            item,
            'SchoolMerchandisePrice',
            'schoolMerchandisePrice'
          ) ?? 0,
        quantity: readNumber(item, 'Quantity', 'quantity') ?? 0,
        totalAmount: readNumber(item, 'TotalAmount', 'totalAmount') ?? 0,
      }))
  } catch {
    return []
  }
}

function mapMerchandisePayment(
  record: ApiRecord,
  parentByUserId: Map<string, ParentRecord>
): MerchandisePaymentRecord {
  const userId = readString(record, 'FK_UserId', 'fk_UserId') ?? ''
  const parent = parentByUserId.get(userId)

  return {
    id: readNumber(record, 'PaymentTransactionId', 'paymentTransactionId') ?? 0,
    amountPaid: readNumber(record, 'AmountPaid', 'amountPaid') ?? 0,
    paidDate: readString(record, 'PaidDate', 'paidDate') ?? null,
    paymentMethod: readString(record, 'PaymentMethod', 'paymentMethod') ?? 'Unknown',
    transactionReference:
      readString(record, 'TransactionReference', 'transactionReference') ?? null,
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    userId,
    parentName:
      parent != null
        ? buildFullName(parent.firstName, parent.lastName)
        : 'Unknown parent',
    totalItems: readNumber(record, 'TotalItems', 'totalItems') ?? 0,
    totalQuantity: readNumber(record, 'TotalQuantity', 'totalQuantity') ?? 0,
    agentName: buildFullName(
      readString(record, 'AgentFirstName', 'agentFirstName'),
      readString(record, 'AgentLastName', 'agentLastName')
    ) || null,
    processedByAgent:
      readValue(record, 'ProcessedByAgent', 'processedByAgent') === true,
    collectionMethod:
      readString(record, 'CollectionMethod', 'collectionMethod') ?? null,
    items: parseMerchandiseItems(record),
  }
}

async function fetchAllSchoolFeePaymentsForUser(userId: string): Promise<ApiRecord[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Payments/GetSchoolFeesPaymentHistory', {
      params: {
        UserId: userId,
        DateFilter: 'AllTime',
        StatusId: 0,
        PaymentType: 'SCHOOLFEE',
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)),
      totalCount: getEnvelopeCount(data),
    }
  })
}

async function fetchAllMerchandisePaymentsForUser(
  userId: string
): Promise<ApiRecord[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Payments/GetMerchandisePaymentHistory', {
      params: {
        UserId: userId,
        DateFilter: 'AllTime',
        StatusId: 0,
        PaymentType: 'MERCHANDISEFEE',
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)),
      totalCount: getEnvelopeCount(data),
    }
  })
}

function createParentMap(parents: ParentRecord[]): Map<string, ParentRecord> {
  return new Map(
    parents
      .filter((parent) => parent.userId.length > 0)
      .map((parent) => [parent.userId, parent] as const)
  )
}

export async function fetchSchoolFeePaymentsBySchool(
  schoolId: number
): Promise<PaymentAggregationResult<SchoolFeePaymentRecord>> {
  const parents = await fetchParents({ schoolId })
  const parentByUserId = createParentMap(parents)
  const userIds = [...parentByUserId.keys()]

  const results = await Promise.allSettled(
    userIds.map((userId) => fetchAllSchoolFeePaymentsForUser(userId))
  )

  const items = results
    .filter((result): result is PromiseFulfilledResult<ApiRecord[]> => {
      return result.status === 'fulfilled'
    })
    .flatMap((result) => result.value)
    .map((record) => mapSchoolFeePayment(record, parentByUserId))
    .sort((left, right) => {
      return (
        new Date(right.paidDate ?? 0).getTime() - new Date(left.paidDate ?? 0).getTime()
      )
    })

  return {
    items,
    totalParents: parents.length,
    scannedParents: userIds.length,
    failedParents: results.filter((result) => result.status === 'rejected').length,
  }
}

export async function fetchMerchandisePaymentsBySchool(
  schoolId: number
): Promise<PaymentAggregationResult<MerchandisePaymentRecord>> {
  const parents = await fetchParents({ schoolId })
  const parentByUserId = createParentMap(parents)
  const userIds = [...parentByUserId.keys()]

  const results = await Promise.allSettled(
    userIds.map((userId) => fetchAllMerchandisePaymentsForUser(userId))
  )

  const items = results
    .filter((result): result is PromiseFulfilledResult<ApiRecord[]> => {
      return result.status === 'fulfilled'
    })
    .flatMap((result) => result.value)
    .map((record) => mapMerchandisePayment(record, parentByUserId))
    .sort((left, right) => {
      return (
        new Date(right.paidDate ?? 0).getTime() - new Date(left.paidDate ?? 0).getTime()
      )
    })

  return {
    items,
    totalParents: parents.length,
    scannedParents: userIds.length,
    failedParents: results.filter((result) => result.status === 'rejected').length,
  }
}

export async function lookupPaymentStatus(
  transactionId: string
): Promise<PaymentStatusLookup> {
  const { data } = await api.get('/api/Payments/CheckPaymentStatus', {
    params: { TransactionId: transactionId },
  })

  const detail = readRecord(getEnvelopeData(data))

  if (!detail) {
    throw new Error('Payment status details were not returned by the API.')
  }

  return {
    transactionId: readString(detail, 'Id', 'id') ?? transactionId,
    status: readString(detail, 'Status', 'status') ?? 'Unknown',
    message: readString(detail, 'Message', 'message') ?? 'No message returned',
    amount: readNumber(detail, 'Amount', 'amount') ?? 0,
    currency: readString(detail, 'Currency', 'currency') ?? 'XAF',
    country: readString(detail, 'Country', 'country') ?? 'CG',
  }
}
