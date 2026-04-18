import {
  Building2,
  ChartColumnBig,
  Command,
  HelpCircle,
  LayoutDashboard,
  Settings,
  Shield,
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
            title: 'Reporting',
            url: '/',
            icon: ChartColumnBig,
          },
          {
            title: 'Schools',
            url: '/',
            icon: Building2,
          },
          {
            title: 'Access',
            url: '/settings',
            icon: Shield,
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
