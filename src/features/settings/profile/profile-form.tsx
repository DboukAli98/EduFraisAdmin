import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { buildFullName, getEntityStatusMeta } from '@/features/admin/utils'
import {
  fetchDirectorBySchoolId,
  updateDirector,
} from '@/features/users/api'
import { getApiErrorMessage } from '@/lib/api'
import { type AuthUser } from '@/lib/jwt'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
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
import { Skeleton } from '@/components/ui/skeleton'

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'Veuillez saisir le prenom.'),
  lastName: z.string().min(1, 'Veuillez saisir le nom.'),
  email: z.email('Veuillez saisir une adresse e-mail valide.'),
  countryCode: z.string().min(1, 'Veuillez saisir l indicatif du pays.'),
  phoneNumber: z.string().min(1, 'Veuillez saisir le numero de telephone.'),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

function updateAuthUserSnapshot(
  user: AuthUser | null,
  values: ProfileFormValues
): AuthUser | null {
  if (!user) {
    return user
  }

  return {
    ...user,
    name: buildFullName(values.firstName, values.lastName) || user.name,
    email: values.email,
    phoneNumber: values.phoneNumber,
  }
}

export function ProfileForm() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.auth.user)
  const setUser = useAuthStore((state) => state.auth.setUser)
  const schoolId = currentUser?.schoolIds[0] ?? 0
  const isDirector = currentUser?.roles.includes('Director') ?? false

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      countryCode: '242',
      phoneNumber: '',
    },
  })

  const directorQuery = useQuery({
    queryKey: ['settings', 'director-profile', schoolId],
    queryFn: () =>
      fetchDirectorBySchoolId({
        id: schoolId,
        name: `School ${schoolId}`,
      }),
    enabled: isDirector && schoolId > 0,
  })

  useEffect(() => {
    if (!directorQuery.data) {
      return
    }

    form.reset({
      firstName: directorQuery.data.firstName,
      lastName: directorQuery.data.lastName,
      email: directorQuery.data.email,
      countryCode: directorQuery.data.countryCode,
      phoneNumber: directorQuery.data.phoneNumber,
    })
  }, [directorQuery.data, form])

  const saveProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!directorQuery.data) {
        throw new Error('Le profil du directeur n a pas pu etre charge.')
      }

      await updateDirector(directorQuery.data.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        countryCode: values.countryCode,
        phoneNumber: values.phoneNumber,
        statusId: directorQuery.data.statusId,
      })

      return values
    },
    onSuccess: (values) => {
      setUser(updateAuthUserSnapshot(currentUser, values))
      toast.success('Profil mis a jour avec succes.')
      void queryClient.invalidateQueries({
        queryKey: ['settings', 'director-profile', schoolId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['users', 'director-by-school', schoolId],
      })
    },
    onError: (error) => {
      toast.error(
        getApiErrorMessage(error, 'Impossible de mettre a jour le profil pour le moment.')
      )
    },
  })

  if (!isDirector || schoolId === 0) {
    return (
      <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
        La modification du profil est disponible pour les comptes directeur relies a une ecole.
      </div>
    )
  }

  if (directorQuery.isLoading) {
    return (
      <div className='space-y-4'>
        <Skeleton className='h-24 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
        <Skeleton className='h-12 w-full' />
      </div>
    )
  }

  if (!directorQuery.data) {
    return (
      <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
        Le profil actuel du directeur n a pas pu etre charge depuis le backend.
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      <div className='grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2'>
        <div className='space-y-2'>
          <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
            Portee ecole
          </p>
          <p className='font-medium'>{directorQuery.data.schoolName}</p>
        </div>
        <div className='space-y-2'>
          <p className='text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase'>
            Statut
          </p>
          <Badge
            variant='outline'
            className={getEntityStatusMeta(directorQuery.data.statusId).className}
          >
            {getEntityStatusMeta(directorQuery.data.statusId).label}
          </Badge>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) =>
            saveProfileMutation.mutate(values)
          )}
          className='space-y-8'
        >
          <div className='grid gap-4 sm:grid-cols-2'>
            <FormField
              control={form.control}
              name='firstName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prenom</FormLabel>
                  <FormControl>
                    <Input placeholder='Prenom' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='lastName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder='Nom' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type='email' placeholder='name@example.com' {...field} />
              </FormControl>
              <FormDescription>
                  Cet e-mail est utilise pour les communications du compte et la reinitialisation du mot de passe par OTP.
              </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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
              name='phoneNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero de telephone</FormLabel>
                  <FormControl>
                    <Input placeholder='Numero de telephone' {...field} />
                  </FormControl>
                  <FormDescription>
                    Ce numero est aussi utilise lors de la reinitialisation du mot de passe via OTP WhatsApp.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button type='submit' disabled={saveProfileMutation.isPending}>
            {saveProfileMutation.isPending
              ? 'Enregistrement du profil...'
              : 'Mettre a jour le profil'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
