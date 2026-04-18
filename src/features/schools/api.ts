import {
  api,
  readArray,
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

export interface SchoolSummary {
  id: number
  name: string
  address: string
  email: string
  phoneNumber: string
  website: string | null
  establishedYear: number | null
  description: string | null
  logo: string | null
  statusId: number
}

export interface SchoolMutationInput {
  name: string
  address: string
  phoneNumber: string
  email: string
  establishedYear: string
  description: string
  webUrl: string
  logoFile: File | null
  removeLogo: boolean
}

export interface SchoolSection {
  id: number
  schoolId: number
  name: string
  description: string | null
  fee: number
  statusId: number
  termStartDate: string | null
  termEndDate: string | null
  createdOn: string | null
  modifiedOn: string | null
}

export interface SchoolSectionMutationInput {
  schoolId: number
  name: string
  description: string
  fee: string
  termStartDate: string
  termEndDate: string
}

function mapSchool(record: ApiRecord): SchoolSummary {
  return {
    id: readNumber(record, 'SchoolId', 'schoolId') ?? 0,
    name: readString(record, 'SchoolName', 'schoolName') ?? 'Unnamed school',
    address:
      readString(record, 'SchoolAddress', 'schoolAddress') ?? 'No address',
    email: readString(record, 'SchoolEmail', 'schoolEmail') ?? 'No email',
    phoneNumber:
      readString(record, 'SchoolPhoneNumber', 'schoolPhoneNumber') ??
      'No phone',
    website: readString(record, 'SchoolWebsite', 'schoolWebsite') ?? null,
    establishedYear:
      readNumber(record, 'SchoolEstablishedYear', 'schoolEstablishedYear') ??
      null,
    description:
      readString(record, 'SchoolDescription', 'schoolDescription') ?? null,
    logo: readString(record, 'SchoolLogo', 'schoolLogo') ?? null,
    statusId: readNumber(record, 'FK_StatusId', 'fk_StatusId') ?? 0,
  }
}

function mapSchoolSection(record: ApiRecord): SchoolSection {
  return {
    id: readNumber(record, 'SchoolGradeSectionId', 'schoolGradeSectionId') ?? 0,
    schoolId:
      readNumber(record, 'FK_SchoolId', 'fK_SchoolId', 'fk_SchoolId') ?? 0,
    name:
      readString(record, 'SchoolGradeName', 'schoolGradeName') ??
      'Unnamed class',
    description:
      readString(record, 'SchoolGradeDescription', 'schoolGradeDescription') ??
      null,
    fee: readNumber(record, 'SchoolGradeFee', 'schoolGradeFee') ?? 0,
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    termStartDate: readString(record, 'TermStartDate', 'termStartDate') ?? null,
    termEndDate: readString(record, 'TermEndDate', 'termEndDate') ?? null,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

function appendIfPresent(formData: FormData, key: string, value: string): void {
  if (value.trim().length > 0) {
    formData.append(key, value.trim())
  }
}

function createSchoolFormData(input: SchoolMutationInput): FormData {
  const formData = new FormData()
  formData.append('Name', input.name.trim())
  formData.append('Address', input.address.trim())
  formData.append('PhoneNumber', input.phoneNumber.trim())
  formData.append('Email', input.email.trim())
  appendIfPresent(formData, 'EstablishedYear', input.establishedYear)
  appendIfPresent(formData, 'Description', input.description)
  appendIfPresent(formData, 'WebUrl', input.webUrl)

  if (input.logoFile) {
    formData.append('Logo', input.logoFile)
  }

  return formData
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

export async function fetchSchoolDetails(
  schoolId: number
): Promise<SchoolSummary> {
  const { data } = await api.get('/api/School/GetSchoolDetails', {
    params: { SchoolId: schoolId },
  })

  const school = readRecord(getEnvelopeData(data))

  if (!school) {
    throw new Error('School details were not returned by the API.')
  }

  return mapSchool(school)
}

export async function fetchSchoolSections(
  schoolId: number
): Promise<PaginatedResult<SchoolSection>> {
  const { data } = await api.get('/api/School/GetSchoolGradesSections', {
    params: {
      SchoolId: schoolId,
      PageNumber: 1,
      PageSize: 200,
      Search: '',
      onlyEnabled: false,
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapSchoolSection),
    totalCount: getEnvelopeCount(data),
  }
}

export async function createSchoolSection(
  input: SchoolSectionMutationInput
): Promise<void> {
  await api.post('/api/School/AddSchoolSection', {
    SchoolGradeName: input.name.trim(),
    SchoolGradeDescription: input.description.trim() || null,
    SchoolGradeFee: Number(input.fee || 0),
    SchoolId: input.schoolId,
    TermStartDate: input.termStartDate || null,
    TermEndDate: input.termEndDate || null,
  })
}

export async function updateSchoolSection(
  sectionId: number,
  input: SchoolSectionMutationInput
): Promise<void> {
  await api.post('/api/School/EditSchoolSection', {
    SchoolGradeSectionId: sectionId,
    SchoolGradeName: input.name.trim(),
    SchoolGradeDescription: input.description.trim() || null,
    SchoolGradeFee: Number(input.fee || 0),
    SchoolId: input.schoolId,
    TermStartDate: input.termStartDate || null,
    TermEndDate: input.termEndDate || null,
  })
}

export async function alterSchoolSectionStatus(
  sectionIds: number[],
  actionType: 'enable' | 'disable' | 'deleted'
): Promise<void> {
  await api.post('/api/Common/AlterModuleStatus', {
    ModuleName: 'schoolgradesection',
    ActionType: actionType,
    ModuleItemsIds: sectionIds.join(','),
  })
}

export async function createSchool(input: SchoolMutationInput): Promise<void> {
  const formData = createSchoolFormData(input)

  await api.post('/api/School/AddNewSchool', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function updateSchool(
  schoolId: number,
  statusId: number,
  input: SchoolMutationInput
): Promise<void> {
  const formData = createSchoolFormData(input)
  formData.append('SchoolId', String(schoolId))
  formData.append('StatusId', String(statusId))
  formData.append('RemoveLogo', input.removeLogo ? 'true' : 'false')

  await api.put('/api/School/EditSchool', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export async function alterSchoolStatus(
  schoolIds: number[],
  actionType: 'enable' | 'disable' | 'deleted'
): Promise<void> {
  await api.post('/api/School/AlterSchoolStatus', {
    SchoolIds: schoolIds.join(','),
    ActionType: actionType,
  })
}

export async function deleteSchool(schoolId: number): Promise<void> {
  await api.delete('/api/School/DeleteSchool', {
    data: {
      SchoolId: schoolId,
    },
  })
}
