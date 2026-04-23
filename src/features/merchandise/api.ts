import {
  api,
  readApiMessage,
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

export interface MerchandiseCategory {
  id: number
  name: string
  description: string | null
  statusId: number
  createdOn: string | null
  modifiedOn: string | null
}

export interface SchoolMerchandise {
  id: number
  schoolId: number
  categoryId: number
  categoryName: string
  name: string
  description: string | null
  price: number
  logo: string | null
  statusId: number
  createdOn: string | null
  modifiedOn: string | null
}

export interface MerchandiseMutationInput {
  schoolId: number
  categoryId: number
  name: string
  description: string
  price: string
  statusId: number
  logoFile: File | null
  removeLogo: boolean
}

export interface MerchandiseCategoryMutationInput {
  name: string
  description: string
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

function mapCategory(record: ApiRecord): MerchandiseCategory {
  return {
    id:
      readNumber(
        record,
        'SchoolMerchandiseCategoryId',
        'schoolMerchandiseCategoryId'
      ) ?? 0,
    name:
      readString(
        record,
        'SchoolMerchandiseCategoryName',
        'schoolMerchandiseCategoryName'
      ) ?? 'Uncategorized',
    description:
      readString(
        record,
        'SchoolMerchandiseCategoryDescription',
        'schoolMerchandiseCategoryDescription'
      ) ?? null,
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function mapMerchandise(record: ApiRecord): SchoolMerchandise {
  const category = readRecord(
    record,
    'SchoolMerchandiseCategory',
    'schoolMerchandiseCategory'
  )
  const categoryId =
    readNumber(
      record,
      'FK_SchoolMerchandiseCategory',
      'fK_SchoolMerchandiseCategory',
      'fk_SchoolMerchandiseCategory'
    ) ??
    readNumber(
      category,
      'SchoolMerchandiseCategoryId',
      'schoolMerchandiseCategoryId'
    ) ??
    0

  return {
    id:
      readNumber(record, 'SchoolMerchandiseId', 'schoolMerchandiseId') ?? 0,
    schoolId:
      readNumber(record, 'FK_SchoolId', 'fK_SchoolId', 'fk_SchoolId') ?? 0,
    categoryId,
    categoryName:
      readString(
        category,
        'SchoolMerchandiseCategoryName',
        'schoolMerchandiseCategoryName'
      ) ?? `Category ${categoryId || '-'}`,
    name:
      readString(record, 'SchoolMerchandiseName', 'schoolMerchandiseName') ??
      'Unnamed merchandise',
    description:
      readString(
        record,
        'SchoolMerchandiseDescription',
        'schoolMerchandiseDescription'
      ) ?? null,
    price:
      readNumber(record, 'SchoolMerchandisePrice', 'schoolMerchandisePrice') ??
      0,
    logo:
      readString(record, 'SchoolMerchandiseLogo', 'schoolMerchandiseLogo') ??
      null,
    statusId:
      readNumber(record, 'FK_StatusId', 'fK_StatusId', 'fk_StatusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function appendIfPresent(formData: FormData, key: string, value: string): void {
  if (value.trim().length > 0) {
    formData.append(key, value.trim())
  }
}

function createMerchandiseFormData(
  input: MerchandiseMutationInput
): FormData {
  const formData = new FormData()
  formData.append('SchoolMerchandiseName', input.name.trim())
  formData.append('SchoolMerchandisePrice', String(Number(input.price || 0)))
  formData.append('FK_SchoolId', String(input.schoolId))
  formData.append('FK_SchoolMerchandiseCategory', String(input.categoryId))
  appendIfPresent(formData, 'SchoolMerchandiseDescription', input.description)

  if (input.logoFile) {
    formData.append('Logo', input.logoFile)
  }

  return formData
}

export async function fetchMerchandiseCategories(): Promise<
  PaginatedResult<MerchandiseCategory>
> {
  const { data } = await api.get('/api/School/GetMerchaniseCategories', {
    params: {
      PageNumber: 1,
      PageSize: 200,
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapCategory),
    totalCount: getEnvelopeCount(data),
  }
}

export async function createMerchandiseCategory(
  input: MerchandiseCategoryMutationInput
): Promise<string> {
  const { data } = await api.post('/api/School/AddSchoolMerchandiseCategory', {
    SchoolMerchandiseCategoryName: input.name.trim(),
    SchoolMerchandiseCategoryDescription: input.description.trim() || null,
  })

  return readApiMessage(data, 'Merchandise category created.')
}

export async function fetchSchoolMerchandises({
  schoolId,
  categoryId = 0,
  search = '',
  includeAll = true,
}: {
  schoolId: number
  categoryId?: number
  search?: string
  includeAll?: boolean
}): Promise<PaginatedResult<SchoolMerchandise>> {
  const { data } = await api.get('/api/School/GetSchoolMerchandises', {
    params: {
      SchoolId: String(schoolId),
      CategoryId: categoryId,
      Search: search,
      PageNumber: 1,
      PageSize: 200,
      all: includeAll,
    },
  })

  return {
    items: readArray(getEnvelopeData(data)).map(mapMerchandise),
    totalCount: getEnvelopeCount(data),
  }
}

export async function createSchoolMerchandise(
  input: MerchandiseMutationInput
): Promise<string> {
  const formData = createMerchandiseFormData(input)
  const { data } = await api.post('/api/School/AddSchoolMerchandise', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return readApiMessage(data, 'Merchandise created.')
}

export async function updateSchoolMerchandise(
  merchandiseId: number,
  input: MerchandiseMutationInput
): Promise<string> {
  const formData = createMerchandiseFormData(input)
  formData.append('SchoolMerchandiseId', String(merchandiseId))
  formData.append('FK_StatusId', String(input.statusId))
  formData.append('RemoveLogo', input.removeLogo ? 'true' : 'false')

  const { data } = await api.put('/api/School/UpdateSchoolMerchandise', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return readApiMessage(data, 'Merchandise updated.')
}

export async function alterSchoolMerchandiseStatus(
  merchandiseIds: number[],
  actionType: 'enable' | 'disable' | 'deleted'
): Promise<string> {
  const { data } = await api.post('/api/Common/AlterModuleStatus', {
    ModuleName: 'schoolmerchandisessection',
    ActionType: actionType,
    ModuleItemsIds: merchandiseIds.join(','),
  })

  return readApiMessage(data, 'Merchandise status updated.')
}
