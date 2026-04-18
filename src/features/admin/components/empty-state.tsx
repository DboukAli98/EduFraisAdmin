interface EmptyStateProps {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className='flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center'>
      <p className='font-medium'>{title}</p>
      <p className='mt-1 max-w-lg text-sm text-muted-foreground'>{description}</p>
    </div>
  )
}
