import { createFileRoute } from '@tanstack/react-router'
import { PaymentProvidersManagement } from '@/features/commissions'

export const Route = createFileRoute(
  '/_authenticated/commission-admin/providers'
)({
  component: PaymentProvidersManagement,
})
