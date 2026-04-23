import { createFileRoute } from '@tanstack/react-router'
import { LoyaltyRewardsManagementPage } from '@/features/loyalty'

export const Route = createFileRoute('/_authenticated/loyalty/rewards')({
  component: LoyaltyRewardsManagementPage,
})
