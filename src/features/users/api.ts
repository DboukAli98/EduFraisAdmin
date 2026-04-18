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
import { type SchoolSummary } from '@/features/schools/api'

export interface ParentRecord {
  id: number
  firstName: string
  lastName: string
  fatherName: string
  email: string
  civilId: string
  countryCode: string
  phoneNumber: string
  statusId: number
  userId: string
  childCount: number
  createdOn: string | null
  schoolIds: number[]
  schoolNames: string[]
}

export interface ParentMutationInput {
  firstName: string
  lastName: string
  fatherName: string
  schoolId: number
  civilId: string
  countryCode: string
  phoneNumber: string
  email: string
}

export interface DirectorRecord {
  id: number
  firstName: string
  lastName: string
  email: string
  countryCode: string
  phoneNumber: string
  statusId: number
  userId: string
  schoolId: number
  schoolName: string
  createdOn: string | null
}

export interface DirectorCreateInput {
  firstName: string
  lastName: string
  fatherName: string
  schoolId: number
  civilId: string
  countryCode: string
  phoneNumber: string
  email: string
}

export interface DirectorUpdateInput {
  firstName: string
  lastName: string
  countryCode: string
  phoneNumber: string
  email: string
  statusId: number
}

export interface ChildRecord {
  id: number
  firstName: string
  lastName: string
  fatherName: string
  dateOfBirth: string | null
  parentId: number
  parentName: string | null
  schoolId: number
  schoolName: string | null
  statusId: number
  rejectionReason: string | null
  createdOn: string | null
}

export interface ChildMutationInput {
  firstName: string
  lastName: string
  fatherName: string
  dateOfBirth: string
  parentId: number
  schoolId: number
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

function mapParentSchools(record: ApiRecord): { schoolIds: number[]; schoolNames: string[] } {
  const parentSchools = readArray(record, 'ParentSchools', 'parentSchools')

  const schoolIds = parentSchools
    .map((item) => readNumber(item, 'FK_SchoolId', 'fk_SchoolId'))
    .filter((value): value is number => value != null)

  const schoolNames = parentSchools
    .map((item) =>
      readString(
        readRecord(item, 'School', 'school'),
        'SchoolName',
        'schoolName'
      )
    )
    .filter((value): value is string => Boolean(value))

  return { schoolIds, schoolNames }
}

function mapParent(record: ApiRecord): ParentRecord {
  const schools = mapParentSchools(record)

  return {
    id: readNumber(record, 'ParentId', 'parentId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    fatherName: readString(record, 'FatherName', 'fatherName') ?? '',
    email: readString(record, 'Email', 'email') ?? '',
    civilId: readString(record, 'CivilId', 'civilId') ?? '',
    countryCode: readString(record, 'CountryCode', 'countryCode') ?? '242',
    phoneNumber: readString(record, 'PhoneNumber', 'phoneNumber') ?? '',
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    userId: readString(record, 'FK_UserId', 'fk_UserId') ?? '',
    childCount: readArray(record, 'Childrens', 'childrens').length,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    schoolIds: schools.schoolIds,
    schoolNames: schools.schoolNames,
  }
}

function mapDirector(record: ApiRecord, school: SchoolSummary): DirectorRecord {
  const countryCodeAsNumber = readNumber(record, 'CountryCode', 'countryCode')

  return {
    id: readNumber(record, 'DirectorId', 'directorId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    email: readString(record, 'Email', 'email') ?? '',
    countryCode:
      readString(record, 'CountryCode', 'countryCode') ??
      (countryCodeAsNumber != null ? String(countryCodeAsNumber) : '242'),
    phoneNumber: readString(record, 'PhoneNumber', 'phoneNumber') ?? '',
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    userId: readString(record, 'FK_UserId', 'fk_UserId') ?? '',
    schoolId: school.id,
    schoolName: school.name,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
  }
}

function mapChild(record: ApiRecord): ChildRecord {
  const parent = readRecord(record, 'Parent', 'parent')
  const school = readRecord(record, 'School', 'school')

  return {
    id: readNumber(record, 'ChildId', 'childId') ?? 0,
    firstName: readString(record, 'FirstName', 'firstName') ?? '',
    lastName: readString(record, 'LastName', 'lastName') ?? '',
    fatherName: readString(record, 'FatherName', 'fatherName') ?? '',
    dateOfBirth: readString(record, 'DateOfBirth', 'dateOfBirth') ?? null,
    parentId: readNumber(record, 'FK_ParentId', 'fk_ParentId') ?? 0,
    parentName:
      buildFullName(
        readString(parent, 'FirstName', 'firstName'),
        readString(parent, 'LastName', 'lastName')
      ) || null,
    schoolId: readNumber(record, 'FK_SchoolId', 'fk_SchoolId') ?? 0,
    schoolName:
      readString(record, 'SchoolName', 'schoolName') ??
      readString(school, 'SchoolName', 'schoolName') ??
      null,
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
    rejectionReason:
      readString(record, 'RejectionReason', 'rejectionReason') ?? null,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
  }
}

async function alterModuleStatus(
  moduleName: string,
  ids: number[],
  actionType: 'enable' | 'disable' | 'deleted'
): Promise<void> {
  await api.post('/api/Common/AlterModuleStatus', {
    ModuleName: moduleName,
    ActionType: actionType,
    ModuleItemsIds: ids.join(','),
  })
}

export async function fetchParents(options?: {
  schoolId?: number | null
  search?: string
}): Promise<ParentRecord[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Parents/GetParentsListing', {
      params: {
        SchoolId: options?.schoolId ?? undefined,
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: options?.search ?? '',
        onlyEnabled: false,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapParent),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function createParent(input: ParentMutationInput): Promise<void> {
  await api.post('/api/Parents/AddParent', {
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    FatherName: input.fatherName.trim(),
    SchoolId: input.schoolId,
    CivilId: input.civilId.trim(),
    CountryCode: input.countryCode.trim(),
    PhoneNumber: input.phoneNumber.trim(),
    Email: input.email.trim(),
  })
}

export async function updateParent(
  parentId: number,
  input: ParentMutationInput,
  statusId?: number
): Promise<void> {
  await api.put('/api/Parents/UpdateParent', {
    ParentId: parentId,
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    FatherName: input.fatherName.trim(),
    CivilId: input.civilId.trim(),
    CountryCode: input.countryCode.trim(),
    PhoneNumber: input.phoneNumber.trim(),
    Email: input.email.trim(),
    StatusId: statusId,
  })
}

export async function alterParentStatus(
  ids: number[],
  actionType: 'enable' | 'disable' | 'deleted'
): Promise<void> {
  await alterModuleStatus('schoolparentssection', ids, actionType)
}

export async function fetchDirectors(
  schools: SchoolSummary[]
): Promise<DirectorRecord[]> {
  const results = await Promise.allSettled(
    schools.map(async (school) => {
      const { data } = await api.get('/api/Director/GetSchoolDirector', {
        params: { SchoolId: school.id },
      })

      const director = readRecord(data, 'Director', 'director')
      return director ? mapDirector(director, school) : null
    })
  )

  return results
    .filter((result): result is PromiseFulfilledResult<DirectorRecord | null> => {
      return result.status === 'fulfilled'
    })
    .map((result) => result.value)
    .filter((director): director is DirectorRecord => Boolean(director))
}

export async function createDirector(input: DirectorCreateInput): Promise<void> {
  await api.post('/api/Director/AddDirector', {
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    FatherName: input.fatherName.trim(),
    SchoolId: input.schoolId,
    CivilId: input.civilId.trim(),
    CountryCode: input.countryCode.trim(),
    PhoneNumber: input.phoneNumber.trim(),
    Email: input.email.trim(),
  })
}

export async function updateDirector(
  directorId: number,
  input: DirectorUpdateInput
): Promise<void> {
  await api.put('/api/Director/UpdateDirector', {
    DirectorId: directorId,
    Firstname: input.firstName.trim(),
    Lastname: input.lastName.trim(),
    CountryCode: input.countryCode.trim(),
    PhoneNumber: input.phoneNumber.trim(),
    Email: input.email.trim(),
    StatusId: input.statusId,
  })
}

export async function updateDirectorStatus(
  director: DirectorRecord,
  statusId: number
): Promise<void> {
  await updateDirector(director.id, {
    firstName: director.firstName,
    lastName: director.lastName,
    countryCode: director.countryCode,
    phoneNumber: director.phoneNumber,
    email: director.email,
    statusId,
  })
}

export async function fetchChildren(options?: {
  schoolId?: number | null
  parentId?: number | null
  search?: string
}): Promise<ChildRecord[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Children/GetChildrensListing', {
      params: {
        SchoolId: options?.schoolId ?? undefined,
        ParentId: options?.parentId ?? undefined,
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: options?.search ?? '',
        onlyEnabled: false,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapChild),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function fetchChildDetails(childId: number): Promise<ChildRecord> {
  const { data } = await api.get('/api/Children/GetSingleChildren', {
    params: { ChildrenId: childId },
  })

  const child = readRecord(getEnvelopeData(data))

  if (!child) {
    throw new Error('Child details were not returned by the API.')
  }

  return mapChild(child)
}

export async function createChild(input: ChildMutationInput): Promise<void> {
  await api.post('/api/Children/AddChildren', {
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    FatherName: input.fatherName.trim(),
    DateOfBirth: input.dateOfBirth,
    ParentId: input.parentId,
    SchoolId: input.schoolId,
  })
}

export async function updateChild(
  childId: number,
  input: ChildMutationInput
): Promise<void> {
  await api.put('/api/Children/UpdateChildrenDetails', {
    ChildrenId: childId,
    FirstName: input.firstName.trim(),
    LastName: input.lastName.trim(),
    FatherName: input.fatherName.trim(),
    DateOfBirth: input.dateOfBirth,
    ParentId: input.parentId,
    SchoolId: input.schoolId,
  })
}

export async function alterChildStatus(
  ids: number[],
  actionType: 'enable' | 'disable' | 'deleted'
): Promise<void> {
  await alterModuleStatus('schoolchildrensection', ids, actionType)
}

export async function approveChild(childId: number): Promise<void> {
  await api.post('/api/Director/ApproveChildren', null, {
    params: { childId },
  })
}

export async function rejectChild(
  childId: number,
  reason: string
): Promise<void> {
  await api.post('/api/Director/RejectChildren', {
    ChildId: childId,
    Reason: reason.trim(),
  })
}
