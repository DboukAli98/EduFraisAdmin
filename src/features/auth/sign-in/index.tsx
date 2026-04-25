import { useSearch } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            EduFrais Portal
          </CardTitle>
          <CardDescription>
            Connectez-vous avec le meme indicatif, numero mobile et mot de passe
            utilises dans la plateforme EduFrais. Les comptes Directeur et
            Super Admin peuvent acceder ici au suivi et au pilotage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            Les comptes parent et agent collecteur doivent continuer a utiliser
            l application mobile. Ce panneau est reserve a l administration.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
