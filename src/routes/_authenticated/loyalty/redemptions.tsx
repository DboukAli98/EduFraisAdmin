import { createFileRoute } from '@tanstack/react-router'
import { LoyaltyRedemptionsManagementPage } from '@/features/loyalty'

export const Route = createFileRoute('/_authenticated/loyalty/redemptions')({
  component: LoyaltyRedemptionsManagementPage,
})
