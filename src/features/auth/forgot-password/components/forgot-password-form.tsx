import { useState, type HTMLAttributes } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { initPasswordReset } from '@/features/auth/api'
import { writePasswordResetContext } from '@/features/auth/password-reset'

const forgotPasswordSchema = z
  .object({
    channel: z.enum(['email', 'whatsapp']),
    email: z.string().default(''),
    countryCode: z.string().default('242'),
    mobileNumber: z.string().default(''),
  })
  .superRefine((values, ctx) => {
    if (values.channel === 'email') {
      const email = values.email.trim()

      if (email.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Veuillez saisir votre e-mail.',
        })
        return
      }

      const emailCheck = z.email().safeParse(email)

      if (!emailCheck.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'Veuillez saisir un e-mail valide.',
        })
      }

      return
    }

    if (values.countryCode.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['countryCode'],
        message: 'Veuillez saisir l indicatif pays.',
      })
    }

    if (values.mobileNumber.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['mobileNumber'],
        message: 'Veuillez saisir le numero mobile.',
      })
    }
  })

type ForgotPasswordFormInput = z.input<typeof forgotPasswordSchema>
type ForgotPasswordFormValues = z.output<typeof forgotPasswordSchema>

export function ForgotPasswordForm({
  className,
  ...props
}: HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('email')

  const form = useForm<ForgotPasswordFormInput, any, ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      channel: 'email',
      email: '',
      countryCode: '242',
      mobileNumber: '',
    },
  })

  const resetInitMutation = useMutation({
    mutationFn: async (values: ForgotPasswordFormValues) => {
      await initPasswordReset({
        channel: values.channel,
        email: values.channel === 'email' ? values.email : undefined,
        countryCode:
          values.channel === 'whatsapp' ? values.countryCode : undefined,
        mobileNumber:
          values.channel === 'whatsapp' ? values.mobileNumber : undefined,
      })

      writePasswordResetContext({
        channel: values.channel,
        email: values.channel === 'email' ? values.email.trim() : undefined,
        countryCode:
          values.channel === 'whatsapp' ? values.countryCode.trim() : undefined,
        mobileNumber:
          values.channel === 'whatsapp'
            ? values.mobileNumber.trim()
            : undefined,
      })
    },
    onSuccess: () => {
      toast.success('Code de verification envoye avec succes.')
      navigate({ to: '/otp' })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Impossible d envoyer le code de reinitialisation pour le moment.')
      )
    },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          resetInitMutation.mutate(values)
        )}
        className={cn('grid gap-4', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='channel'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Methode de reception</FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  const nextValue = value as 'email' | 'whatsapp'
                  field.onChange(nextValue)
                  setChannel(nextValue)
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='email'>OTP par e-mail</SelectItem>
                  <SelectItem value='whatsapp'>WhatsApp OTP</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Choisissez si le code de reinitialisation doit etre envoye par
                e-mail ou via WhatsApp.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {channel === 'email' ? (
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail enregistre</FormLabel>
                <FormControl>
                  <Input placeholder='name@example.com' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className='grid gap-4 sm:grid-cols-[120px_1fr]'>
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
                  <FormLabel>Numero WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder='Numero mobile' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <Button className='mt-2' disabled={resetInitMutation.isPending}>
          {resetInitMutation.isPending ? 'Envoi du code...' : 'Continuer'}
          {resetInitMutation.isPending ? (
            <Loader2 className='animate-spin' />
          ) : (
            <ArrowRight />
          )}
        </Button>
      </form>
    </Form>
  )
}
