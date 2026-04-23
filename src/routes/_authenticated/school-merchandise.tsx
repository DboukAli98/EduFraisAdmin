import { createFileRoute } from '@tanstack/react-router'
import { SchoolMerchandiseManagement } from '@/features/merchandise'

export const Route = createFileRoute('/_authenticated/school-merchandise')({
  component: SchoolMerchandiseManagement,
})
