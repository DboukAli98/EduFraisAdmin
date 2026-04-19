import { createFileRoute } from '@tanstack/react-router'
import { CollectingAgents } from '@/features/collecting-agents'

export const Route = createFileRoute('/_authenticated/collecting-agents')({
  component: CollectingAgents,
})
