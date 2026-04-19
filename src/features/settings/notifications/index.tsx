import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'
import { useAuthStore } from '@/stores/auth-store'

export function SettingsNotifications() {
  const currentUser = useAuthStore((state) => state.auth.user)
  const isDirector = currentUser?.roles.includes('Director') ?? false

  return (
    <ContentSection
      title='Notifications'
      desc={
        isDirector
          ? 'Review your inbox and schedule outreach to parents or collecting agents in your school.'
          : 'Review your in-app notifications and send a notification to your own account for testing.'
      }
      contentClassName='lg:max-w-none'
    >
      <NotificationsForm />
    </ContentSection>
  )
}
