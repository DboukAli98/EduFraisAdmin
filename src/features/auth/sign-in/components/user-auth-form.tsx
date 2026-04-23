import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { login } from '@/features/auth/api'
import { handleServerError } from '@/lib/handle-server-error'
import { hasAdminAccess } from '@/lib/jwt'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  countryCode: z
    .string()
    .min(1, 'Veuillez saisir votre indicatif pays.')
    .regex(/^\d+$/, 'L indicatif pays doit contenir uniquement des chiffres.'),
  mobileNumber: z
    .string()
    .min(1, 'Veuillez saisir votre numero mobile.')
    .regex(/^\d+$/, 'Le numero mobile doit contenir uniquement des chiffres.'),
  password: z
    .string()
    .min(1, 'Veuillez saisir votre mot de passe.')
    .min(6, 'Le mot de passe doit contenir au moins 6 caracteres.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      countryCode: '242',
      mobileNumber: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const result = await login(data)

      if (!result.success || !result.token) {
        throw new Error(result.message || 'Connexion impossible.')
      }

      if (result.mustChangePassword) {
        throw new Error(
          'Le changement de mot de passe est requis avant d ouvrir le panneau admin.'
        )
      }

      auth.setAccessToken(result.token)

      const currentUser = useAuthStore.getState().auth.user
      if (!hasAdminAccess(currentUser)) {
        auth.reset()
        throw new Error(
          'Ce compte n a pas acces au panneau administrateur EduFrais.'
        )
      }

      toast.success(`Bon retour, ${currentUser?.name || data.mobileNumber}.`)

      navigate({ to: redirectTo || '/', replace: true })
    } catch (error) {
      handleServerError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='countryCode'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Indicatif pays</FormLabel>
              <FormControl>
                <Input placeholder='242' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='mobileNumber'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numero mobile</FormLabel>
              <FormControl>
                <Input placeholder='065123456' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
              >
                Mot de passe oublie ?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Connexion
        </Button>
      </form>
    </Form>
  )
}
