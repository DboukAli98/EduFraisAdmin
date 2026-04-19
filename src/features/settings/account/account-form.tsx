import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { changePassword } from '@/features/auth/api'
import { getApiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
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

const accountFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Please enter your current password.'),
    newPassword: z
      .string()
      .min(6, 'New password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm the new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type AccountFormValues = z.infer<typeof accountFormSchema>

export function AccountForm() {
  const currentUser = useAuthStore((state) => state.auth.user)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      if (!currentUser?.userId) {
        throw new Error('You need to sign in again before changing your password.')
      }

      return changePassword({
        userId: currentUser.userId,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
    },
    onSuccess: (message) => {
      toast.success(message)
      form.reset()
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Unable to update your password right now.')
      )
    },
  })

  if (!currentUser) {
    return (
      <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
        Your session is missing. Sign in again to change your password.
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          changePasswordMutation.mutate(values)
        )}
        className='space-y-8'
      >
        <FormField
          control={form.control}
          name='currentPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <Input type='password' placeholder='Current password' {...field} />
              </FormControl>
              <FormDescription>
                Enter the password you currently use to sign in.
              </FormDescription>
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
              <FormDescription>
                If you no longer know the current password, use the{' '}
                <Link
                  to='/forgot-password'
                  className='underline underline-offset-4 hover:text-primary'
                >
                  forgot password
                </Link>{' '}
                flow instead.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type='submit' disabled={changePasswordMutation.isPending}>
          {changePasswordMutation.isPending
            ? 'Updating password...'
            : 'Update password'}
        </Button>
      </form>
    </Form>
  )
}
