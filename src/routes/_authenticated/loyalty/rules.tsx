import { createFileRoute } from '@tanstack/react-router'
import { LoyaltyRulesManagementPage } from '@/features/loyalty'

export const Route = createFileRoute('/_authenticated/loyalty/rules')({
  component: LoyaltyRulesManagementPage,
})
