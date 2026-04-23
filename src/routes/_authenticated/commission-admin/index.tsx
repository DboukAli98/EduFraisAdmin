import { createFileRoute } from '@tanstack/react-router'
import { CommissionOverview } from '@/features/commissions'

export const Route = createFileRoute('/_authenticated/commission-admin/')({
  component: CommissionOverview,
})
