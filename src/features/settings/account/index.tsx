import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection
      title='Account'
      desc='Change your password while signed in.'
    >
      <AccountForm />
    </ContentSection>
  )
}
