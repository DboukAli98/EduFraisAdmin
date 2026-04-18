import { createFileRoute } from '@tanstack/react-router'
import { ParentDetails } from '@/features/users/parent-details'

export const Route = createFileRoute(
  '/_authenticated/parent-details/$parentId'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { parentId } = Route.useParams()

  return <ParentDetails parentId={Number.parseInt(parentId, 10)} />
}
