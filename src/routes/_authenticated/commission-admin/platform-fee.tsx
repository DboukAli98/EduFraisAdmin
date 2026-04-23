import { createFileRoute } from '@tanstack/react-router'
import { PlatformFeeManagement } from '@/features/commissions'

export const Route = createFileRoute(
  '/_authenticated/commission-admin/platform-fee'
)({
  component: PlatformFeeManagement,
})
