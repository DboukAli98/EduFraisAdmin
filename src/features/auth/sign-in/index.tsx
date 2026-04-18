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
            EduFrais Admin
          </CardTitle>
          <CardDescription>
            Sign in with the same country code, mobile number, and password
            used in the EduFrais platform. Director and Super Admin accounts
            can access reporting and monitoring here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            Parent and collecting-agent accounts should keep using the mobile
            app. This panel is reserved for administration workflows.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
