import { createFileRoute } from '@tanstack/react-router'
import { Schools } from '@/features/schools'

export const Route = createFileRoute('/_authenticated/schools')({
  component: Schools,
})
