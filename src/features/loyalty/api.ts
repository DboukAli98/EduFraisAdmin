import {
  api,
  readApiMessage,
  readArray,
  readBoolean,
  readNumber,
  readRecord,
  readString,
  readValue,
  type ApiRecord,
} from '@/lib/api'

export type LoyaltyMemberType = 'Parent' | 'CollectingAgent'
export type LoyaltyTriggerType =
  | 'SchoolFeePaymentProcessed'
  | 'MerchandisePaymentProcessed'
  | 'AgentCollectionProcessed'
  | 'ManualEnrollmentBonus'
  | 'ManualAdjustment'
export type LoyaltyRulePeriodType =
  | 'None'
  | 'Daily'
  | 'Weekly'
  | 'Monthly'
  | 'ProgramLifetime'
export type LoyaltyRewardType =
  | 'Merchandise'
  | 'SchoolFeeCredit'
  | 'CustomBenefit'
export type LoyaltyRedemptionStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Fulfilled'
  | 'Cancelled'
export type LoyaltyLifecycleAction = 'enable' | 'disable' | 'deleted'

export interface LoyaltyProgram {
  id: number
  schoolId: number
  programName: string
  programDescription: string | null
  pointsLabel: string
  welcomeBonusPoints: number
  minimumRedeemPoints: number
  autoApproveRedemptions: boolean
  allowParentParticipation: boolean
  allowAgentParticipation: boolean
  termsAndConditions: string | null
  startsOn: string | null
  endsOn: string | null
  statusId: number
  createdOn: string | null
  modifiedOn: string | null
}

export interface LoyaltyRule {
  id: number
  loyaltyProgramId: number
  ruleName: string
  ruleDescription: string | null
  memberType: LoyaltyMemberType
  triggerType: LoyaltyTriggerType
  pointsAwarded: number
  minimumAmount: number | null
  requiresOnTimePayment: boolean
  requiresFullPayment: boolean
  maxAwardsPerMember: number | null
  periodType: LoyaltyRulePeriodType
  executionOrder: number
  canStackWithOtherRules: boolean
  validFrom: string | null
  validTo: string | null
  statusId: number
  createdOn: string | null
  modifiedOn: string | null
}

export interface LoyaltyReward {
  id: number
  loyaltyProgramId: number
  rewardName: string
  rewardDescription: string | null
  rewardType: LoyaltyRewardType
  pointsCost: number
  monetaryValue: number | null
  schoolMerchandiseId: number | null
  schoolMerchandiseName: string | null
  stockQuantity: number | null
  maxRedeemPerMember: number | null
  requiresDirectorApproval: boolean
  fulfillmentInstructions: string | null
  validFrom: string | null
  validTo: string | null
  statusId: number
  createdOn: string | null
  modifiedOn: string | null
}

export interface LoyaltyMember {
  id: number
  loyaltyProgramId: number
  schoolId: number
  memberType: LoyaltyMemberType
  memberEntityId: number
  userId: string
  fullName: string
  email: string | null
  phoneNumber: string | null
  currentPointsBalance: number
  lifetimePointsEarned: number
  lifetimePointsRedeemed: number
  lastActivityOn: string | null
  statusId: number
  createdOn: string | null
  modifiedOn: string | null
}

export interface LoyaltyLedgerEntry {
  id: number
  loyaltyMemberId: number
  loyaltyRuleId: number | null
  paymentTransactionId: number | null
  loyaltyRedemptionId: number | null
  entryType: string
  referenceType: string
  pointsDelta: number
  balanceBefore: number
  balanceAfter: number
  monetaryAmount: number | null
  description: string | null
  createdByUserId: string | null
  createdOn: string | null
}

export interface LoyaltyRedemption {
  id: number
  loyaltyMemberId: number
  loyaltyRewardId: number
  rewardName: string
  rewardType: string
  memberType: LoyaltyMemberType
  memberFullName: string
  quantity: number
  pointsSpent: number
  status: LoyaltyRedemptionStatus
  requestNotes: string | null
  reviewNotes: string | null
  reviewedByUserId: string | null
  reviewedOn: string | null
  fulfillmentReference: string | null
  fulfilledOn: string | null
  createdOn: string | null
}

export interface LoyaltyRewardUsage {
  loyaltyRewardId: number
  rewardName: string
  redemptionCount: number
}

export interface LoyaltyDashboard {
  schoolId: number
  loyaltyProgramId: number | null
  programName: string | null
  activeMembers: number
  activeParents: number
  activeAgents: number
  totalPointsIssued: number
  totalPointsRedeemed: number
  currentOutstandingPoints: number
  pendingRedemptions: number
  fulfilledRedemptions: number
  topRewards: LoyaltyRewardUsage[]
}

export interface LoyaltyProgramMutationInput {
  programName: string
  programDescription: string
  pointsLabel: string
  welcomeBonusPoints: string
  minimumRedeemPoints: string
  autoApproveRedemptions: boolean
  allowParentParticipation: boolean
  allowAgentParticipation: boolean
  termsAndConditions: string
  startsOn: string
  endsOn: string
}

export interface LoyaltyRuleMutationInput {
  ruleName: string
  ruleDescription: string
  memberType: LoyaltyMemberType
  triggerType: LoyaltyTriggerType
  pointsAwarded: string
  minimumAmount: string
  requiresOnTimePayment: boolean
  requiresFullPayment: boolean
  maxAwardsPerMember: string
  periodType: LoyaltyRulePeriodType
  executionOrder: string
  canStackWithOtherRules: boolean
  validFrom: string
  validTo: string
}

export interface LoyaltyRewardMutationInput {
  rewardName: string
  rewardDescription: string
  rewardType: LoyaltyRewardType
  pointsCost: string
  monetaryValue: string
  schoolMerchandiseId: string
  stockQuantity: string
  maxRedeemPerMember: string
  requiresDirectorApproval: boolean
  fulfillmentInstructions: string
  validFrom: string
  validTo: string
}

export interface EnrollLoyaltyMemberInput {
  memberType: LoyaltyMemberType
  memberEntityId: number
}

export interface AdjustLoyaltyMemberPointsInput {
  pointsDelta: string
  reason: string
}

export interface FetchLoyaltyMembersInput {
  schoolId: number
  loyaltyProgramId?: number | null
  memberType?: LoyaltyMemberType | 'all'
  statusId?: number | null
  search?: string
}

export interface FetchLoyaltyRedemptionsInput {
  schoolId: number
  loyaltyProgramId?: number | null
  status?: LoyaltyRedemptionStatus | 'all'
  memberType?: LoyaltyMemberType | 'all'
  search?: string
}

function getEnvelopeData(record: unknown): unknown {
  return readValue(record, 'Data', 'data')
}

function getEnvelopeCount(record: unknown): number {
  return readNumber(record, 'TotalCount', 'totalCount') ?? 0
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseNullableInteger(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseNullableDecimal(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : null
}

function toNullableTrimmed(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toNullableDate(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

async function fetchAllPages<T>(
  fetchPage: (
    pageNumber: number,
    pageSize: number
  ) => Promise<{ items: T[]; totalCount: number }>
): Promise<T[]> {
  const items: T[] = []
  let pageNumber = 1
  const pageSize = 100

  while (true) {
    const page = await fetchPage(pageNumber, pageSize)
    items.push(...page.items)

    if (page.totalCount === 0 || page.items.length === 0) {
      break
    }

    if (items.length >= page.totalCount) {
      break
    }

    pageNumber += 1
  }

  return items
}

function mapProgram(record: ApiRecord | undefined): LoyaltyProgram | null {
  if (!record) {
    return null
  }

  return {
    id: readNumber(record, 'LoyaltyProgramId', 'loyaltyProgramId') ?? 0,
    schoolId: readNumber(record, 'SchoolId', 'schoolId') ?? 0,
    programName: readString(record, 'ProgramName', 'programName') ?? '',
    programDescription:
      readString(record, 'ProgramDescription', 'programDescription') ?? null,
    pointsLabel: readString(record, 'PointsLabel', 'pointsLabel') ?? 'Points',
    welcomeBonusPoints:
      readNumber(record, 'WelcomeBonusPoints', 'welcomeBonusPoints') ?? 0,
    minimumRedeemPoints:
      readNumber(record, 'MinimumRedeemPoints', 'minimumRedeemPoints') ?? 0,
    autoApproveRedemptions:
      readBoolean(
        record,
        'AutoApproveRedemptions',
        'autoApproveRedemptions'
      ) ?? false,
    allowParentParticipation:
      readBoolean(
        record,
        'AllowParentParticipation',
        'allowParentParticipation'
      ) ?? true,
    allowAgentParticipation:
      readBoolean(
        record,
        'AllowAgentParticipation',
        'allowAgentParticipation'
      ) ?? true,
    termsAndConditions:
      readString(record, 'TermsAndConditions', 'termsAndConditions') ?? null,
    startsOn: readString(record, 'StartsOn', 'startsOn') ?? null,
    endsOn: readString(record, 'EndsOn', 'endsOn') ?? null,
    statusId: readNumber(record, 'StatusId', 'statusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function mapRule(record: ApiRecord): LoyaltyRule {
  return {
    id: readNumber(record, 'LoyaltyRuleId', 'loyaltyRuleId') ?? 0,
    loyaltyProgramId:
      readNumber(record, 'LoyaltyProgramId', 'loyaltyProgramId') ?? 0,
    ruleName: readString(record, 'RuleName', 'ruleName') ?? 'Untitled rule',
    ruleDescription:
      readString(record, 'RuleDescription', 'ruleDescription') ?? null,
    memberType:
      (readString(record, 'MemberType', 'memberType') as LoyaltyMemberType) ??
      'Parent',
    triggerType:
      (readString(record, 'TriggerType', 'triggerType') as LoyaltyTriggerType) ??
      'SchoolFeePaymentProcessed',
    pointsAwarded: readNumber(record, 'PointsAwarded', 'pointsAwarded') ?? 0,
    minimumAmount:
      readNumber(record, 'MinimumAmount', 'minimumAmount') ?? null,
    requiresOnTimePayment:
      readBoolean(
        record,
        'RequiresOnTimePayment',
        'requiresOnTimePayment'
      ) ?? false,
    requiresFullPayment:
      readBoolean(record, 'RequiresFullPayment', 'requiresFullPayment') ?? false,
    maxAwardsPerMember:
      readNumber(record, 'MaxAwardsPerMember', 'maxAwardsPerMember') ?? null,
    periodType:
      (readString(record, 'PeriodType', 'periodType') as LoyaltyRulePeriodType) ??
      'None',
    executionOrder:
      readNumber(record, 'ExecutionOrder', 'executionOrder') ?? 0,
    canStackWithOtherRules:
      readBoolean(
        record,
        'CanStackWithOtherRules',
        'canStackWithOtherRules'
      ) ?? true,
    validFrom: readString(record, 'ValidFrom', 'validFrom') ?? null,
    validTo: readString(record, 'ValidTo', 'validTo') ?? null,
    statusId: readNumber(record, 'StatusId', 'statusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function mapReward(record: ApiRecord): LoyaltyReward {
  return {
    id: readNumber(record, 'LoyaltyRewardId', 'loyaltyRewardId') ?? 0,
    loyaltyProgramId:
      readNumber(record, 'LoyaltyProgramId', 'loyaltyProgramId') ?? 0,
    rewardName:
      readString(record, 'RewardName', 'rewardName') ?? 'Untitled reward',
    rewardDescription:
      readString(record, 'RewardDescription', 'rewardDescription') ?? null,
    rewardType:
      (readString(record, 'RewardType', 'rewardType') as LoyaltyRewardType) ??
      'CustomBenefit',
    pointsCost: readNumber(record, 'PointsCost', 'pointsCost') ?? 0,
    monetaryValue:
      readNumber(record, 'MonetaryValue', 'monetaryValue') ?? null,
    schoolMerchandiseId:
      readNumber(record, 'SchoolMerchandiseId', 'schoolMerchandiseId') ?? null,
    schoolMerchandiseName:
      readString(record, 'SchoolMerchandiseName', 'schoolMerchandiseName') ??
      null,
    stockQuantity: readNumber(record, 'StockQuantity', 'stockQuantity') ?? null,
    maxRedeemPerMember:
      readNumber(record, 'MaxRedeemPerMember', 'maxRedeemPerMember') ?? null,
    requiresDirectorApproval:
      readBoolean(
        record,
        'RequiresDirectorApproval',
        'requiresDirectorApproval'
      ) ?? true,
    fulfillmentInstructions:
      readString(
        record,
        'FulfillmentInstructions',
        'fulfillmentInstructions'
      ) ?? null,
    validFrom: readString(record, 'ValidFrom', 'validFrom') ?? null,
    validTo: readString(record, 'ValidTo', 'validTo') ?? null,
    statusId: readNumber(record, 'StatusId', 'statusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function mapMember(record: ApiRecord): LoyaltyMember {
  return {
    id: readNumber(record, 'LoyaltyMemberId', 'loyaltyMemberId') ?? 0,
    loyaltyProgramId:
      readNumber(record, 'LoyaltyProgramId', 'loyaltyProgramId') ?? 0,
    schoolId: readNumber(record, 'SchoolId', 'schoolId') ?? 0,
    memberType:
      (readString(record, 'MemberType', 'memberType') as LoyaltyMemberType) ??
      'Parent',
    memberEntityId:
      readNumber(record, 'MemberEntityId', 'memberEntityId') ?? 0,
    userId: readString(record, 'UserId', 'userId') ?? '',
    fullName: readString(record, 'FullName', 'fullName') ?? 'Unknown member',
    email: readString(record, 'Email', 'email') ?? null,
    phoneNumber: readString(record, 'PhoneNumber', 'phoneNumber') ?? null,
    currentPointsBalance:
      readNumber(record, 'CurrentPointsBalance', 'currentPointsBalance') ?? 0,
    lifetimePointsEarned:
      readNumber(record, 'LifetimePointsEarned', 'lifetimePointsEarned') ?? 0,
    lifetimePointsRedeemed:
      readNumber(record, 'LifetimePointsRedeemed', 'lifetimePointsRedeemed') ?? 0,
    lastActivityOn:
      readString(record, 'LastActivityOn', 'lastActivityOn') ?? null,
    statusId: readNumber(record, 'StatusId', 'statusId') ?? 0,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
    modifiedOn: readString(record, 'ModifiedOn', 'modifiedOn') ?? null,
  }
}

function mapLedgerEntry(record: ApiRecord): LoyaltyLedgerEntry {
  return {
    id: readNumber(record, 'LoyaltyPointLedgerId', 'loyaltyPointLedgerId') ?? 0,
    loyaltyMemberId:
      readNumber(record, 'LoyaltyMemberId', 'loyaltyMemberId') ?? 0,
    loyaltyRuleId:
      readNumber(record, 'LoyaltyRuleId', 'loyaltyRuleId') ?? null,
    paymentTransactionId:
      readNumber(record, 'PaymentTransactionId', 'paymentTransactionId') ?? null,
    loyaltyRedemptionId:
      readNumber(record, 'LoyaltyRedemptionId', 'loyaltyRedemptionId') ?? null,
    entryType: readString(record, 'EntryType', 'entryType') ?? 'Unknown',
    referenceType:
      readString(record, 'ReferenceType', 'referenceType') ?? 'Unknown',
    pointsDelta: readNumber(record, 'PointsDelta', 'pointsDelta') ?? 0,
    balanceBefore: readNumber(record, 'BalanceBefore', 'balanceBefore') ?? 0,
    balanceAfter: readNumber(record, 'BalanceAfter', 'balanceAfter') ?? 0,
    monetaryAmount:
      readNumber(record, 'MonetaryAmount', 'monetaryAmount') ?? null,
    description: readString(record, 'Description', 'description') ?? null,
    createdByUserId:
      readString(record, 'CreatedByUserId', 'createdByUserId') ?? null,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
  }
}

function mapRedemption(record: ApiRecord): LoyaltyRedemption {
  return {
    id: readNumber(record, 'LoyaltyRedemptionId', 'loyaltyRedemptionId') ?? 0,
    loyaltyMemberId:
      readNumber(record, 'LoyaltyMemberId', 'loyaltyMemberId') ?? 0,
    loyaltyRewardId:
      readNumber(record, 'LoyaltyRewardId', 'loyaltyRewardId') ?? 0,
    rewardName: readString(record, 'RewardName', 'rewardName') ?? 'Reward',
    rewardType: readString(record, 'RewardType', 'rewardType') ?? 'Unknown',
    memberType:
      (readString(record, 'MemberType', 'memberType') as LoyaltyMemberType) ??
      'Parent',
    memberFullName:
      readString(record, 'MemberFullName', 'memberFullName') ?? 'Unknown member',
    quantity: readNumber(record, 'Quantity', 'quantity') ?? 1,
    pointsSpent: readNumber(record, 'PointsSpent', 'pointsSpent') ?? 0,
    status:
      (readString(record, 'Status', 'status') as LoyaltyRedemptionStatus) ??
      'Pending',
    requestNotes: readString(record, 'RequestNotes', 'requestNotes') ?? null,
    reviewNotes: readString(record, 'ReviewNotes', 'reviewNotes') ?? null,
    reviewedByUserId:
      readString(record, 'ReviewedByUserId', 'reviewedByUserId') ?? null,
    reviewedOn: readString(record, 'ReviewedOn', 'reviewedOn') ?? null,
    fulfillmentReference:
      readString(record, 'FulfillmentReference', 'fulfillmentReference') ?? null,
    fulfilledOn: readString(record, 'FulfilledOn', 'fulfilledOn') ?? null,
    createdOn: readString(record, 'CreatedOn', 'createdOn') ?? null,
  }
}

function mapRewardUsage(record: ApiRecord): LoyaltyRewardUsage {
  return {
    loyaltyRewardId:
      readNumber(record, 'LoyaltyRewardId', 'loyaltyRewardId') ?? 0,
    rewardName: readString(record, 'RewardName', 'rewardName') ?? 'Reward',
    redemptionCount:
      readNumber(record, 'RedemptionCount', 'redemptionCount') ?? 0,
  }
}

function mapDashboard(record: ApiRecord | undefined, schoolId: number): LoyaltyDashboard {
  return {
    schoolId: readNumber(record, 'SchoolId', 'schoolId') ?? schoolId,
    loyaltyProgramId:
      readNumber(record, 'LoyaltyProgramId', 'loyaltyProgramId') ?? null,
    programName: readString(record, 'ProgramName', 'programName') ?? null,
    activeMembers: readNumber(record, 'ActiveMembers', 'activeMembers') ?? 0,
    activeParents: readNumber(record, 'ActiveParents', 'activeParents') ?? 0,
    activeAgents: readNumber(record, 'ActiveAgents', 'activeAgents') ?? 0,
    totalPointsIssued:
      readNumber(record, 'TotalPointsIssued', 'totalPointsIssued') ?? 0,
    totalPointsRedeemed:
      readNumber(record, 'TotalPointsRedeemed', 'totalPointsRedeemed') ?? 0,
    currentOutstandingPoints:
      readNumber(
        record,
        'CurrentOutstandingPoints',
        'currentOutstandingPoints'
      ) ?? 0,
    pendingRedemptions:
      readNumber(record, 'PendingRedemptions', 'pendingRedemptions') ?? 0,
    fulfilledRedemptions:
      readNumber(record, 'FulfilledRedemptions', 'fulfilledRedemptions') ?? 0,
    topRewards: readArray(record, 'TopRewards', 'topRewards').map(mapRewardUsage),
  }
}

export async function fetchLoyaltyProgram(
  schoolId: number
): Promise<LoyaltyProgram | null> {
  const { data } = await api.get('/api/Loyalty/GetSchoolProgram', {
    params: { SchoolId: schoolId },
  })

  return mapProgram(readRecord(getEnvelopeData(data)))
}

export async function fetchLoyaltyDashboard(
  schoolId: number
): Promise<LoyaltyDashboard> {
  const { data } = await api.get('/api/Loyalty/GetDashboard', {
    params: { SchoolId: schoolId },
  })

  return mapDashboard(readRecord(getEnvelopeData(data)), schoolId)
}

export async function createLoyaltyProgram(
  schoolId: number,
  input: LoyaltyProgramMutationInput
): Promise<LoyaltyProgram> {
  const { data } = await api.post('/api/Loyalty/CreateProgram', {
    SchoolId: schoolId,
    ProgramName: input.programName.trim(),
    ProgramDescription: toNullableTrimmed(input.programDescription),
    PointsLabel: toNullableTrimmed(input.pointsLabel) ?? 'Points',
    WelcomeBonusPoints: parseInteger(input.welcomeBonusPoints),
    MinimumRedeemPoints: parseInteger(input.minimumRedeemPoints),
    AutoApproveRedemptions: input.autoApproveRedemptions,
    AllowParentParticipation: input.allowParentParticipation,
    AllowAgentParticipation: input.allowAgentParticipation,
    TermsAndConditions: toNullableTrimmed(input.termsAndConditions),
    StartsOn: toNullableDate(input.startsOn),
    EndsOn: toNullableDate(input.endsOn),
  })

  const program = mapProgram(readRecord(getEnvelopeData(data)))
  if (!program) {
    throw new Error(readApiMessage(data, 'Program was not returned by the API.'))
  }

  return program
}

export async function updateLoyaltyProgram(
  loyaltyProgramId: number,
  statusId: number,
  input: LoyaltyProgramMutationInput
): Promise<LoyaltyProgram> {
  const { data } = await api.put('/api/Loyalty/UpdateProgram', {
    LoyaltyProgramId: loyaltyProgramId,
    ProgramName: input.programName.trim(),
    ProgramDescription: toNullableTrimmed(input.programDescription),
    PointsLabel: toNullableTrimmed(input.pointsLabel) ?? 'Points',
    WelcomeBonusPoints: parseInteger(input.welcomeBonusPoints),
    MinimumRedeemPoints: parseInteger(input.minimumRedeemPoints),
    AutoApproveRedemptions: input.autoApproveRedemptions,
    AllowParentParticipation: input.allowParentParticipation,
    AllowAgentParticipation: input.allowAgentParticipation,
    TermsAndConditions: toNullableTrimmed(input.termsAndConditions),
    StartsOn: toNullableDate(input.startsOn),
    EndsOn: toNullableDate(input.endsOn),
    StatusId: statusId,
  })

  const program = mapProgram(readRecord(getEnvelopeData(data)))
  if (!program) {
    throw new Error(readApiMessage(data, 'Program was not returned by the API.'))
  }

  return program
}

export async function setLoyaltyProgramStatus(
  loyaltyProgramId: number,
  actionType: LoyaltyLifecycleAction
): Promise<string> {
  const { data } = await api.post('/api/Loyalty/SetProgramStatus', {
    LoyaltyProgramId: loyaltyProgramId,
    ActionType: actionType,
  })

  return readApiMessage(data, 'Program status updated.')
}

export async function fetchLoyaltyRules(
  loyaltyProgramId: number
): Promise<LoyaltyRule[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Loyalty/GetRules', {
      params: {
        LoyaltyProgramId: loyaltyProgramId,
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: '',
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapRule),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function createLoyaltyRule(
  loyaltyProgramId: number,
  input: LoyaltyRuleMutationInput
): Promise<LoyaltyRule> {
  const { data } = await api.post('/api/Loyalty/AddRule', {
    LoyaltyProgramId: loyaltyProgramId,
    RuleName: input.ruleName.trim(),
    RuleDescription: toNullableTrimmed(input.ruleDescription),
    MemberType: input.memberType,
    TriggerType: input.triggerType,
    PointsAwarded: parseInteger(input.pointsAwarded),
    MinimumAmount: parseNullableDecimal(input.minimumAmount),
    RequiresOnTimePayment: input.requiresOnTimePayment,
    RequiresFullPayment: input.requiresFullPayment,
    MaxAwardsPerMember: parseNullableInteger(input.maxAwardsPerMember),
    PeriodType: input.periodType,
    ExecutionOrder: parseInteger(input.executionOrder),
    CanStackWithOtherRules: input.canStackWithOtherRules,
    ValidFrom: toNullableDate(input.validFrom),
    ValidTo: toNullableDate(input.validTo),
  })

  const rule = readRecord(getEnvelopeData(data))
  if (!rule) {
    throw new Error(readApiMessage(data, 'Rule was not returned by the API.'))
  }

  return mapRule(rule)
}

export async function updateLoyaltyRule(
  loyaltyRuleId: number,
  statusId: number,
  input: LoyaltyRuleMutationInput
): Promise<LoyaltyRule> {
  const { data } = await api.put('/api/Loyalty/UpdateRule', {
    LoyaltyRuleId: loyaltyRuleId,
    RuleName: input.ruleName.trim(),
    RuleDescription: toNullableTrimmed(input.ruleDescription),
    MemberType: input.memberType,
    TriggerType: input.triggerType,
    PointsAwarded: parseInteger(input.pointsAwarded),
    MinimumAmount: parseNullableDecimal(input.minimumAmount),
    RequiresOnTimePayment: input.requiresOnTimePayment,
    RequiresFullPayment: input.requiresFullPayment,
    MaxAwardsPerMember: parseNullableInteger(input.maxAwardsPerMember),
    PeriodType: input.periodType,
    ExecutionOrder: parseInteger(input.executionOrder),
    CanStackWithOtherRules: input.canStackWithOtherRules,
    ValidFrom: toNullableDate(input.validFrom),
    ValidTo: toNullableDate(input.validTo),
    StatusId: statusId,
  })

  const rule = readRecord(getEnvelopeData(data))
  if (!rule) {
    throw new Error(readApiMessage(data, 'Rule was not returned by the API.'))
  }

  return mapRule(rule)
}

export async function setLoyaltyRuleStatus(
  loyaltyRuleId: number,
  actionType: LoyaltyLifecycleAction
): Promise<string> {
  const { data } = await api.post('/api/Loyalty/SetRuleStatus', {
    LoyaltyRuleId: loyaltyRuleId,
    ActionType: actionType,
  })

  return readApiMessage(data, 'Rule status updated.')
}

export async function fetchLoyaltyRewards(
  loyaltyProgramId: number
): Promise<LoyaltyReward[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Loyalty/GetRewards', {
      params: {
        LoyaltyProgramId: loyaltyProgramId,
        PageNumber: pageNumber,
        PageSize: pageSize,
        Search: '',
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapReward),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function createLoyaltyReward(
  loyaltyProgramId: number,
  input: LoyaltyRewardMutationInput
): Promise<LoyaltyReward> {
  const { data } = await api.post('/api/Loyalty/AddReward', {
    LoyaltyProgramId: loyaltyProgramId,
    RewardName: input.rewardName.trim(),
    RewardDescription: toNullableTrimmed(input.rewardDescription),
    RewardType: input.rewardType,
    PointsCost: parseInteger(input.pointsCost),
    MonetaryValue: parseNullableDecimal(input.monetaryValue),
    SchoolMerchandiseId: parseNullableInteger(input.schoolMerchandiseId),
    StockQuantity: parseNullableInteger(input.stockQuantity),
    MaxRedeemPerMember: parseNullableInteger(input.maxRedeemPerMember),
    RequiresDirectorApproval: input.requiresDirectorApproval,
    FulfillmentInstructions: toNullableTrimmed(input.fulfillmentInstructions),
    ValidFrom: toNullableDate(input.validFrom),
    ValidTo: toNullableDate(input.validTo),
  })

  const reward = readRecord(getEnvelopeData(data))
  if (!reward) {
    throw new Error(readApiMessage(data, 'Reward was not returned by the API.'))
  }

  return mapReward(reward)
}

export async function updateLoyaltyReward(
  loyaltyRewardId: number,
  statusId: number,
  input: LoyaltyRewardMutationInput
): Promise<LoyaltyReward> {
  const { data } = await api.put('/api/Loyalty/UpdateReward', {
    LoyaltyRewardId: loyaltyRewardId,
    RewardName: input.rewardName.trim(),
    RewardDescription: toNullableTrimmed(input.rewardDescription),
    RewardType: input.rewardType,
    PointsCost: parseInteger(input.pointsCost),
    MonetaryValue: parseNullableDecimal(input.monetaryValue),
    SchoolMerchandiseId: parseNullableInteger(input.schoolMerchandiseId),
    StockQuantity: parseNullableInteger(input.stockQuantity),
    MaxRedeemPerMember: parseNullableInteger(input.maxRedeemPerMember),
    RequiresDirectorApproval: input.requiresDirectorApproval,
    FulfillmentInstructions: toNullableTrimmed(input.fulfillmentInstructions),
    ValidFrom: toNullableDate(input.validFrom),
    ValidTo: toNullableDate(input.validTo),
    StatusId: statusId,
  })

  const reward = readRecord(getEnvelopeData(data))
  if (!reward) {
    throw new Error(readApiMessage(data, 'Reward was not returned by the API.'))
  }

  return mapReward(reward)
}

export async function setLoyaltyRewardStatus(
  loyaltyRewardId: number,
  actionType: LoyaltyLifecycleAction
): Promise<string> {
  const { data } = await api.post('/api/Loyalty/SetRewardStatus', {
    LoyaltyRewardId: loyaltyRewardId,
    ActionType: actionType,
  })

  return readApiMessage(data, 'Reward status updated.')
}

export async function fetchLoyaltyMembers(
  input: FetchLoyaltyMembersInput
): Promise<LoyaltyMember[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Loyalty/GetMembers', {
      params: {
        SchoolId: input.schoolId,
        LoyaltyProgramId: input.loyaltyProgramId ?? undefined,
        MemberType:
          input.memberType && input.memberType !== 'all'
            ? input.memberType
            : undefined,
        StatusId: input.statusId ?? undefined,
        Search: input.search ?? '',
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapMember),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function enrollLoyaltyMember(
  loyaltyProgramId: number,
  input: EnrollLoyaltyMemberInput
): Promise<LoyaltyMember> {
  const { data } = await api.post('/api/Loyalty/EnrollMember', {
    LoyaltyProgramId: loyaltyProgramId,
    MemberType: input.memberType,
    MemberEntityId: input.memberEntityId,
  })

  const member = readRecord(getEnvelopeData(data))
  if (!member) {
    throw new Error(readApiMessage(data, 'Member was not returned by the API.'))
  }

  return mapMember(member)
}

export async function fetchLoyaltyMemberLedger(
  loyaltyMemberId: number
): Promise<LoyaltyLedgerEntry[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Loyalty/GetMemberLedger', {
      params: {
        LoyaltyMemberId: loyaltyMemberId,
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapLedgerEntry),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function adjustLoyaltyMemberPoints(
  loyaltyMemberId: number,
  input: AdjustLoyaltyMemberPointsInput
): Promise<LoyaltyMember> {
  const { data } = await api.post('/api/Loyalty/AdjustMemberPoints', {
    LoyaltyMemberId: loyaltyMemberId,
    PointsDelta: parseInteger(input.pointsDelta),
    Reason: input.reason.trim(),
  })

  const member = readRecord(getEnvelopeData(data))
  if (!member) {
    throw new Error(readApiMessage(data, 'Member was not returned by the API.'))
  }

  return mapMember(member)
}

export async function fetchLoyaltyRedemptions(
  input: FetchLoyaltyRedemptionsInput
): Promise<LoyaltyRedemption[]> {
  return fetchAllPages(async (pageNumber, pageSize) => {
    const { data } = await api.get('/api/Loyalty/GetRedemptions', {
      params: {
        SchoolId: input.schoolId,
        LoyaltyProgramId: input.loyaltyProgramId ?? undefined,
        Status:
          input.status && input.status !== 'all' ? input.status : undefined,
        MemberType:
          input.memberType && input.memberType !== 'all'
            ? input.memberType
            : undefined,
        Search: input.search ?? '',
        PageNumber: pageNumber,
        PageSize: pageSize,
      },
    })

    return {
      items: readArray(getEnvelopeData(data)).map(mapRedemption),
      totalCount: getEnvelopeCount(data),
    }
  })
}

export async function approveLoyaltyRedemption(
  loyaltyRedemptionId: number,
  reviewNotes: string
): Promise<LoyaltyRedemption> {
  const { data } = await api.post('/api/Loyalty/ApproveRedemption', {
    LoyaltyRedemptionId: loyaltyRedemptionId,
    ReviewNotes: toNullableTrimmed(reviewNotes),
  })

  const redemption = readRecord(getEnvelopeData(data))
  if (!redemption) {
    throw new Error(
      readApiMessage(data, 'Redemption was not returned by the API.')
    )
  }

  return mapRedemption(redemption)
}

export async function rejectLoyaltyRedemption(
  loyaltyRedemptionId: number,
  reviewNotes: string
): Promise<LoyaltyRedemption> {
  const { data } = await api.post('/api/Loyalty/RejectRedemption', {
    LoyaltyRedemptionId: loyaltyRedemptionId,
    ReviewNotes: reviewNotes.trim(),
  })

  const redemption = readRecord(getEnvelopeData(data))
  if (!redemption) {
    throw new Error(
      readApiMessage(data, 'Redemption was not returned by the API.')
    )
  }

  return mapRedemption(redemption)
}

export async function fulfillLoyaltyRedemption(
  loyaltyRedemptionId: number,
  input: { fulfillmentReference: string; reviewNotes: string }
): Promise<LoyaltyRedemption> {
  const { data } = await api.post('/api/Loyalty/FulfillRedemption', {
    LoyaltyRedemptionId: loyaltyRedemptionId,
    FulfillmentReference: toNullableTrimmed(input.fulfillmentReference),
    ReviewNotes: toNullableTrimmed(input.reviewNotes),
  })

  const redemption = readRecord(getEnvelopeData(data))
  if (!redemption) {
    throw new Error(
      readApiMessage(data, 'Redemption was not returned by the API.')
    )
  }

  return mapRedemption(redemption)
}
