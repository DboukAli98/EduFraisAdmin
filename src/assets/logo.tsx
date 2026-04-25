import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='edufrais-portal-logo'
      viewBox='0 0 32 32'
      xmlns='http://www.w3.org/2000/svg'
      height='32'
      width='32'
      fill='none'
      className={cn('size-6', className)}
      {...props}
    >
      <title>EduFrais Portal</title>
      <defs>
        <linearGradient id='edufrais-logo-gradient' x1='4' y1='4' x2='28' y2='28'>
          <stop offset='0%' stopColor='#2563eb' />
          <stop offset='100%' stopColor='#7c3aed' />
        </linearGradient>
      </defs>
      <rect width='32' height='32' rx='8' fill='url(#edufrais-logo-gradient)' />
      <text
        x='16'
        y='17'
        fill='#ffffff'
        fontFamily='Manrope, Inter, sans-serif'
        fontSize='12'
        fontWeight='800'
        letterSpacing='0'
        textAnchor='middle'
        dominantBaseline='middle'
      >
        EF
      </text>
    </svg>
  )
}
