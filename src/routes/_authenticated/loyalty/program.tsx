import { createFileRoute } from '@tanstack/react-router'
import { LoyaltyProgramManagementPage } from '@/features/loyalty'

export const Route = createFileRoute('/_authenticated/loyalty/program')({
  component: LoyaltyProgramManagementPage,
})
