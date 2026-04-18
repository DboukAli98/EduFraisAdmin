import { createFileRoute } from '@tanstack/react-router'
import { ChildDetails } from '@/features/users/child-details'

export const Route = createFileRoute('/_authenticated/child-details/$childId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { childId } = Route.useParams()

  return <ChildDetails childId={Number.parseInt(childId, 10)} />
}
