import {
  Building2,
  Command,
  HandCoins,
  HelpCircle,
  LayoutDashboard,
  School2,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { type AuthUser } from '@/lib/jwt'
import { type SidebarData } from '../types'

export function getSidebarData(user: AuthUser | null): SidebarData {
  const isSuperAdmin = user?.roles.includes('SuperAdmin') ?? false
  const isDirectorOnly = !isSuperAdmin && (user?.roles.includes('Director') ?? false)

  if (isDirectorOnly) {
    return {
      user: {
        name: user?.name || 'EduFrais Director',
        email: user?.email || 'No email on file',
        avatar: '',
      },
      teams: [
        {
          name: 'EduFrais Director',
          logo: Command,
          plan: 'School Operations',
        },
      ],
      navGroups: [
        {
          title: 'Director',
          items: [
            {
              title: 'Overview',
              url: '/',
              icon: LayoutDashboard,
            },
            {
              title: 'My School',
              url: '/my-school',
              icon: School2,
            },
            {
              title: 'Parents & Children',
              url: '/users',
              icon: Users,
            },
            {
              title: 'Payments',
              url: '/payments',
              icon: HandCoins,
            },
            {
              title: 'Collecting Agents',
              url: '/collecting-agents',
              icon: ShieldCheck,
            },
            {
              title: 'Support Requests',
              url: '/support',
              icon: HelpCircle,
            },
          ],
        },
        {
          title: 'Preferences',
          items: [
            {
              title: 'Settings',
              url: '/settings',
              icon: Settings,
            },
          ],
        },
      ],
    }
  }

  return {
    user: {
      name: user?.name || 'EduFrais User',
      email: user?.email || 'No email on file',
      avatar: '',
    },
    teams: [
      {
        name: 'EduFrais Admin',
        logo: Command,
        plan: 'Reporting Console',
      },
    ],
    navGroups: [
      {
        title: 'Workspace',
        items: [
          {
            title: 'Dashboard',
            url: '/',
            icon: LayoutDashboard,
          },
          {
            title: 'Schools',
            url: '/schools',
            icon: Building2,
          },
          {
            title: 'Users',
            url: '/users',
            icon: Users,
          },
          {
            title: 'Payments',
            url: '/payments',
            icon: HandCoins,
          },
        ],
      },
      {
        title: 'Support',
        items: [
          {
            title: 'Settings',
            url: '/settings',
            icon: Settings,
          },
          {
            title: 'Help Center',
            url: '/help-center',
            icon: HelpCircle,
          },
        ],
      },
    ],
  }
}
