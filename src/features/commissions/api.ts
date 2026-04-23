import {
  api,
  readApiMessage,
  readArray,
  readBoolean,
  readNumber,
  readRecord,
  readString,
  type ApiRecord,
} from '@/lib/api'

export interface PlatformFeeSetting {
  id: number
  feePercentage: number
  isActive: boolean
  note: string | null
  createdOn: string | null
}

export interface PaymentProvider {
  id: number
  name: string
  code: string
  feePercentage: number
  isActive: boolean
  displayOrder: number
  logoUrl: string | null
}

export interface CommissionSettings {
  platformFee: PlatformFeeSetting | null
  providers: PaymentProvider[]
}

export interface PlatformFeeMutationInput {
  feePercentage: string
  note: string
}

export interface PaymentProviderMutationInput {
  name: string
  code: string
  feePercentage: string
  isActive: boolean
  displayOrder: string
  logoUrl: string
}

function mapPlatformFee(record: ApiRecord | undefined): PlatformFeeSetting | null {
  if (!record) {
    return null
  }

  return {
    id: readNumber(record, 'platformFeeSettingId', 'PlatformFeeSettingId') ?? 0,
    feePercentage: readNumber(record, 'feePercentage', 'FeePercentage') ?? 0,
    isActive: readBoolean(record, 'isActive', 'IsActive') ?? false,
    note: readString(record, 'note', 'Note') ?? null,
    createdOn: readString(record, 'createdOn', 'CreatedOn') ?? null,
  }
}

function mapProvider(record: ApiRecord): PaymentProvider {
  return {
    id: readNumber(record, 'paymentProviderId', 'PaymentProviderId') ?? 0,
    name: readString(record, 'name', 'Name') ?? 'Unnamed provider',
    code: readString(record, 'code', 'Code') ?? '',
    feePercentage: readNumber(record, 'feePercentage', 'FeePercentage') ?? 0,
    isActive: readBoolean(record, 'isActive', 'IsActive') ?? false,
    displayOrder: readNumber(record, 'displayOrder', 'DisplayOrder') ?? 0,
    logoUrl: readString(record, 'logoUrl', 'LogoUrl') ?? null,
  }
}

function getEnvelopeData(record: unknown): ApiRecord | undefined {
  return readRecord(record, 'data', 'Data')
}

function parsePercentage(value: string): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return Number.NaN
  }

  return Number(parsed.toFixed(2))
}

function parseDisplayOrder(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchCommissionSettings(): Promise<CommissionSettings> {
  const { data } = await api.get('/api/Admin/GetCommissionSettings')

  return {
    platformFee: mapPlatformFee(
      readRecord(data, 'platformFee', 'PlatformFee')
    ),
    providers: readArray(data, 'providers', 'Providers').map(mapProvider),
  }
}

export async function updatePlatformFee(
  input: PlatformFeeMutationInput
): Promise<PlatformFeeSetting> {
  const { data } = await api.put('/api/Admin/UpdatePlatformFee', {
    FeePercentage: parsePercentage(input.feePercentage),
    Note: input.note.trim() || null,
  })

  return mapPlatformFee(getEnvelopeData(data)) ?? {
    id: 0,
    feePercentage: parsePercentage(input.feePercentage),
    isActive: true,
    note: input.note.trim() || null,
    createdOn: null,
  }
}

export async function addPaymentProvider(
  input: PaymentProviderMutationInput
): Promise<PaymentProvider> {
  const { data } = await api.post('/api/Admin/AddPaymentProvider', {
    Name: input.name.trim(),
    Code: input.code.trim().toUpperCase(),
    FeePercentage: parsePercentage(input.feePercentage),
    IsActive: input.isActive,
    DisplayOrder: parseDisplayOrder(input.displayOrder),
    LogoUrl: input.logoUrl.trim() || null,
  })

  const provider = readRecord(data, 'data', 'Data')

  if (!provider) {
    throw new Error(readApiMessage(data, 'Provider was not returned by the API.'))
  }

  return mapProvider(provider)
}

export async function updatePaymentProvider(
  paymentProviderId: number,
  input: PaymentProviderMutationInput
): Promise<PaymentProvider> {
  const { data } = await api.put('/api/Admin/UpdatePaymentProvider', {
    PaymentProviderId: paymentProviderId,
    Name: input.name.trim(),
    Code: input.code.trim().toUpperCase(),
    FeePercentage: parsePercentage(input.feePercentage),
    IsActive: input.isActive,
    DisplayOrder: parseDisplayOrder(input.displayOrder),
    LogoUrl: input.logoUrl.trim() || null,
  })

  const provider = readRecord(data, 'data', 'Data')

  if (!provider) {
    throw new Error(readApiMessage(data, 'Provider was not returned by the API.'))
  }

  return mapProvider(provider)
}

export async function setPaymentProviderActive(input: {
  paymentProviderId: number
  isActive: boolean
}): Promise<string> {
  const { data } = await api.put('/api/Admin/SetPaymentProviderActive', {
    PaymentProviderId: input.paymentProviderId,
    IsActive: input.isActive,
  })

  return readApiMessage(
    data,
    input.isActive ? 'Provider activated.' : 'Provider deactivated.'
  )
}
