import {
  Award,
  Building2,
  CreditCard,
  HandCoins,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  Percent,
  School2,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { Logo } from '@/assets/logo'
import { type AuthUser } from '@/lib/jwt'
import { type SidebarData } from '../types'

export function getSidebarData(user: AuthUser | null): SidebarData {
  const isSuperAdmin = user?.roles.includes('SuperAdmin') ?? false
  const isDirectorOnly = !isSuperAdmin && (user?.roles.includes('Director') ?? false)

  if (isDirectorOnly) {
    return {
      user: {
        name: user?.name || 'Directeur EduFrais',
        email: user?.email || 'Aucun e-mail renseigne',
        avatar: '',
      },
      teams: [
        {
          name: 'EduFrais Portal',
          logo: Logo,
          plan: 'Direction',
        },
      ],
      navGroups: [
        {
          title: 'Direction',
          items: [
            {
              title: 'Vue generale',
              url: '/',
              icon: LayoutDashboard,
            },
            {
              title: 'Mon ecole',
              url: '/my-school',
              icon: School2,
            },
            {
              title: 'Articles',
              url: '/school-merchandise',
              icon: ShoppingBag,
            },
            {
              title: 'Parents et enfants',
              url: '/users',
              icon: Users,
            },
            {
              title: 'Paiements',
              url: '/payments',
              icon: HandCoins,
            },
            {
              title: 'Fidelite',
              icon: Award,
              items: [
                {
                  title: 'Vue generale',
                  url: '/loyalty',
                  icon: LayoutDashboard,
                },
                {
                  title: 'Programme',
                  url: '/loyalty/program',
                  icon: Settings,
                },
                {
                  title: 'Regles',
                  url: '/loyalty/rules',
                  icon: ListChecks,
                },
                {
                  title: 'Recompenses',
                  url: '/loyalty/rewards',
                  icon: ShoppingBag,
                },
                {
                  title: 'Membres',
                  url: '/loyalty/members',
                  icon: Users,
                },
                {
                  title: 'Redemptions',
                  url: '/loyalty/redemptions',
                  icon: CreditCard,
                },
              ],
            },
            {
              title: 'Agents collecteurs',
              url: '/collecting-agents',
              icon: ShieldCheck,
            },
            {
              title: 'Demandes support',
              url: '/support',
              icon: HelpCircle,
            },
          ],
        },
        {
          title: 'Preferences',
          items: [
            {
              title: 'Parametres',
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
      name: user?.name || 'Utilisateur EduFrais',
      email: user?.email || 'Aucun e-mail renseigne',
      avatar: '',
    },
    teams: [
      {
        name: 'EduFrais Portal',
        logo: Logo,
        plan: 'Super administration',
      },
    ],
    navGroups: [
      {
        title: 'Espace de travail',
        items: [
          {
            title: 'Tableau de bord',
            url: '/',
            icon: LayoutDashboard,
          },
          {
            title: 'Ecoles',
            url: '/schools',
            icon: Building2,
          },
          {
            title: 'Utilisateurs',
            url: '/users',
            icon: Users,
          },
          {
            title: 'Paiements',
            url: '/payments',
            icon: HandCoins,
          },
          {
            title: 'Administration des commissions',
            icon: Percent,
            items: [
              {
                title: 'Vue generale',
                url: '/commission-admin',
                icon: LayoutDashboard,
              },
              {
                title: 'Frais plateforme',
                url: '/commission-admin/platform-fee',
                icon: SlidersHorizontal,
              },
              {
                title: 'Prestataires de paiement',
                url: '/commission-admin/providers',
                icon: CreditCard,
              },
            ],
          },
        ],
      },
      {
        title: 'Assistance',
        items: [
          {
            title: 'Parametres',
            url: '/settings',
            icon: Settings,
          },
          {
            title: 'Centre aide',
            url: '/help-center',
            icon: HelpCircle,
          },
        ],
      },
    ],
  }
}
