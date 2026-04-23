import { createFileRoute } from '@tanstack/react-router'
import { EmptyState } from '@/features/admin/components/empty-state'
import { PageShell } from '@/features/admin/components/page-shell'
import { SchoolDetails } from '@/features/schools/details'
import { useAuthStore } from '@/stores/auth-store'

function MySchoolRouteComponent() {
  const schoolId = useAuthStore((state) => state.auth.user?.schoolIds[0] ?? 0)

  if (!schoolId) {
    return (
      <PageShell
        title='Mon ecole'
        description='Gerez votre ecole assignee, ses classes et ses cycles de paiement.'
      >
        <EmptyState
          title='Aucune ecole assignee'
          description='Ce compte n est pas encore lie a une ecole.'
        />
      </PageShell>
    )
  }

  return <SchoolDetails schoolId={schoolId} />
}

export const Route = createFileRoute('/_authenticated/my-school')({
  component: MySchoolRouteComponent,
})
