import {
  Building2,
  Command,
  HandCoins,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'
import { type AuthUser } from '@/lib/jwt'
import { type SidebarData } from '../types'

export function getSidebarData(user: AuthUser | null): SidebarData {
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
