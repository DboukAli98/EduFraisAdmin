import { useNavigate, useRouter } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export function ForbiddenError() {
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>403</h1>
        <span className='font-medium'>Acces interdit</span>
        <p className='text-center text-muted-foreground'>
          Vous n avez pas les autorisations necessaires <br />
          pour voir cette ressource.
        </p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            Retour
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>Retour accueil</Button>
        </div>
      </div>
    </div>
  )
}
