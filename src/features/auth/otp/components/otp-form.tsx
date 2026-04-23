import { useMemo, type HTMLAttributes } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import {
  initPasswordReset,
  resetPassword,
} from '@/features/auth/api'
import {
  clearPasswordResetContext,
  formatPasswordResetDestination,
  readPasswordResetContext,
} from '@/features/auth/password-reset'
import { getApiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

const otpFormSchema = z
  .object({
    otp: z
      .string()
      .min(6, 'Veuillez saisir le code a 6 chiffres.')
      .max(6, 'Veuillez saisir le code a 6 chiffres.'),
    newPassword: z
      .string()
      .min(6, 'Le nouveau mot de passe doit contenir au moins 6 caracteres.'),
    confirmPassword: z.string().min(1, 'Veuillez confirmer le nouveau mot de passe.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  })

type OtpFormValues = z.infer<typeof otpFormSchema>
type OtpFormProps = HTMLAttributes<HTMLFormElement>

export function OtpForm({ className, ...props }: OtpFormProps) {
  const navigate = useNavigate()
  const resetContext = useMemo(() => readPasswordResetContext(), [])

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: {
      otp: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const otp = form.watch('otp')

  const verifyMutation = useMutation({
    mutationFn: async (values: OtpFormValues) => {
      if (!resetContext) {
        throw new Error('Relancez le parcours mot de passe oublie avant de verifier un code.')
      }

      return resetPassword({
        token: values.otp,
        newPassword: values.newPassword,
        email: resetContext.email,
        countryCode: resetContext.countryCode,
        mobileNumber: resetContext.mobileNumber,
      })
    },
    onSuccess: (message) => {
      clearPasswordResetContext()
      toast.success(message)
      navigate({ to: '/sign-in' })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Impossible de reinitialiser le mot de passe pour le moment.')
      )
    },
  })

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!resetContext) {
        throw new Error('Relancez le parcours mot de passe oublie avant de demander un nouveau code.')
      }

      return initPasswordReset({
        channel: resetContext.channel,
        email: resetContext.email,
        countryCode: resetContext.countryCode,
        mobileNumber: resetContext.mobileNumber,
      })
    },
    onSuccess: (message) => {
      toast.success(message)
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Impossible de renvoyer le code de verification.')
      )
    },
  })

  if (!resetContext) {
    return (
      <div className='grid gap-4'>
        <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
          La session de reinitialisation est absente. Recommencez depuis la page mot de passe oublie.
        </div>
        <Button asChild variant='outline'>
          <Link to='/forgot-password'>Retour a mot de passe oublie</Link>
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => verifyMutation.mutate(values))}
        className={cn('grid gap-4', className)}
        {...props}
      >
        <div className='rounded-lg border bg-muted/20 p-3 text-sm text-muted-foreground'>
          Saisissez le code OTP envoye a <span className='font-medium text-foreground'>{formatPasswordResetDestination(resetContext)}</span> puis choisissez un nouveau mot de passe.
        </div>

        <FormField
          control={form.control}
          name='otp'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code de verification</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  {...field}
                  containerClassName='justify-between sm:[&>[data-slot="input-otp-group"]>div]:w-12'
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='newPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nouveau mot de passe</FormLabel>
              <FormControl>
                <Input type='password' placeholder='Nouveau mot de passe' {...field} />
              </FormControl>
              <FormDescription>
                Choisissez un mot de passe contenant au moins 6 caracteres.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='Confirmer le nouveau mot de passe'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='flex flex-col gap-2 sm:flex-row'>
          <Button
            className='flex-1'
            disabled={otp.length < 6 || verifyMutation.isPending}
          >
            {verifyMutation.isPending ? 'Verification...' : 'Verifier et reinitialiser'}
            {verifyMutation.isPending ? (
              <Loader2 className='animate-spin' />
            ) : null}
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
          >
            {resendMutation.isPending ? (
              <Loader2 className='animate-spin' />
            ) : (
              <RotateCcw />
            )}
            Renvoyer le code
          </Button>
        </div>
      </form>
    </Form>
  )
}
