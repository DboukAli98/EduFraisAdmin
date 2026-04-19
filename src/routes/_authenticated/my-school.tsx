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
        title='My School'
        description='Manage your assigned school, classes, and payment cycles.'
      >
        <EmptyState
          title='No school is assigned'
          description='This account is not linked to a school yet.'
        />
      </PageShell>
    )
  }

  return <SchoolDetails schoolId={schoolId} />
}

export const Route = createFileRoute('/_authenticated/my-school')({
  component: MySchoolRouteComponent,
})
