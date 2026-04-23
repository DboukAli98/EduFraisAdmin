import { createFileRoute } from '@tanstack/react-router'
import { LoyaltyMembersManagementPage } from '@/features/loyalty'

export const Route = createFileRoute('/_authenticated/loyalty/members')({
  component: LoyaltyMembersManagementPage,
})
