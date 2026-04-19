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
      .min(6, 'Please enter the 6-digit code.')
      .max(6, 'Please enter the 6-digit code.'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
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
        throw new Error('Restart the forgot-password flow before verifying a code.')
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
        getApiErrorMessage(error, 'Unable to reset the password right now.')
      )
    },
  })

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!resetContext) {
        throw new Error('Restart the forgot-password flow before requesting a new code.')
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
        getApiErrorMessage(error, 'Unable to resend the verification code.')
      )
    },
  })

  if (!resetContext) {
    return (
      <div className='grid gap-4'>
        <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
          The reset session is missing. Start again from the forgot-password page.
        </div>
        <Button asChild variant='outline'>
          <Link to='/forgot-password'>Back to forgot password</Link>
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
          Enter the OTP sent to <span className='font-medium text-foreground'>{formatPasswordResetDestination(resetContext)}</span> and choose a new password.
        </div>

        <FormField
          control={form.control}
          name='otp'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification code</FormLabel>
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
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type='password' placeholder='New password' {...field} />
              </FormControl>
              <FormDescription>
                Choose a password with at least 6 characters.
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
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='Confirm new password'
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
            {verifyMutation.isPending ? 'Verifying...' : 'Verify and reset'}
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
            Resend code
          </Button>
        </div>
      </form>
    </Form>
  )
}
