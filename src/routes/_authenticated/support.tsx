import { createFileRoute } from '@tanstack/react-router'
import { SupportWorkspace } from '@/features/support'

export const Route = createFileRoute('/_authenticated/support')({
  component: SupportWorkspace,
})
