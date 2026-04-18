import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'
import { hasAdminAccess } from '@/lib/jwt'
import { useAuthStore } from '@/stores/auth-store'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    const { auth } = useAuthStore.getState()

    if (!auth.accessToken || !auth.user) {
      return
    }

    if (hasAdminAccess(auth.user)) {
      throw redirect({
        to: search.redirect || '/',
        replace: true,
      })
    }

    throw redirect({ to: '/403' })
  },
})
