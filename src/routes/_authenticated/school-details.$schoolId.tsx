import { createFileRoute } from '@tanstack/react-router'
import { SchoolDetails } from '@/features/schools/details'

export const Route = createFileRoute(
  '/_authenticated/school-details/$schoolId'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { schoolId } = Route.useParams()

  return <SchoolDetails schoolId={Number.parseInt(schoolId, 10)} />
}
