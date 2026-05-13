import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Wallet,
  FolderOpen,
  Bell,
  Calendar,
  Users,
  TrendingUp,
  MessageSquare,
  Home,
  Briefcase,
  CheckCircle,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useMenuCounters } from '@/hooks/useMenuCounters';

export interface NavigationItem {
  href: string;
  label: string;
  icon: unknown;
  badgeCount?: number;
  badgeColor?: 'red' | 'orange' | 'blue' | 'green';
  badgePulse?: boolean;
}

export function useNavigationItems() {
  const location = useLocation();
  const { counters } = useMenuCounters();

  // Agent/Agency navigation items
  const agentItems: NavigationItem[] = useMemo(() => [
    {
      href: '/agences/dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: '/agences/biens',
      label: 'Biens',
      icon: Building2,
    },
    {
      href: '/agences/mandats',
      label: 'Mandats',
      icon: Briefcase,
    },
    {
      href: '/agences/candidatures',
      label: 'Candidatures',
      icon: FileText,
      badgeCount: counters.pendingApplications,
      badgeColor: 'orange',
      badgePulse: counters.pendingApplications > 0,
    },
    {
      href: '/agences/contrats',
      label: 'Contrats',
      icon: CheckCircle,
    },
    {
      href: '/agences/visites',
      label: 'Visites',
      icon: Calendar,
      badgeCount: counters.pendingVisits,
      badgeColor: 'blue',
      badgePulse: counters.pendingVisits > 0,
    },
    {
      href: '/agences/messages',
      label: 'Messages',
      icon: MessageSquare,
      badgeCount: counters.unreadMessages,
      badgeColor: 'green',
      badgePulse: counters.unreadMessages > 0,
    },
    {
      href: '/agences/notifications',
      label: 'Notifications',
      icon: Bell,
      badgeCount: counters.unreadNotifications,
      badgeColor: 'orange',
      badgePulse: counters.unreadNotifications > 0,
    },
    {
      href: '/agences/paiements',
      label: 'Paiements',
      icon: Wallet,
    },
    {
      href: '/agences/documents',
      label: 'Documents',
      icon: FolderOpen,
    },
    {
      href: '/agences/analytics',
      label: 'Analytics',
      icon: BarChart3,
    },
    {
      href: '/agences/calendrier',
      label: 'Calendrier',
      icon: Calendar,
    },
    {
      href: '/agences/equipe',
      label: 'Équipe',
      icon: Users,
    },
    {
      href: '/agences/commissions',
      label: 'Commissions',
      icon: TrendingUp,
    },
    {
      href: '/agences/parametres',
      label: 'Paramètres',
      icon: Settings,
    },
  ], [counters]);

  // Bottom navigation items (Profile, etc.)
  const bottomItems: NavigationItem[] = useMemo(() => [
    {
      href: '/agences/profil',
      label: 'Mon profil',
      icon: Users,
    },
  ], []);

  // Owner navigation items
  const ownerItems: NavigationItem[] = useMemo(() => [
    {
      href: '/proprietaire/tableau-de-bord',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: '/proprietaire/biens',
      label: 'Mes biens',
      icon: Home,
    },
    {
      href: '/proprietaire/locataires',
      label: 'Mes locataires',
      icon: Users,
    },
    {
      href: '/proprietaire/mandats',
      label: 'Mes mandats',
      icon: Briefcase,
    },
    {
      href: '/proprietaire/candidatures',
      label: 'Candidatures',
      icon: FileText,
    },
    {
      href: '/proprietaire/visites',
      label: 'Visites',
      icon: Calendar,
    },
    {
      href: '/proprietaire/contrats',
      label: 'Contrats',
      icon: CheckCircle,
    },
    {
      href: '/proprietaire/paiements',
      label: 'Paiements & Charges',
      icon: Wallet,
    },
    {
      href: '/proprietaire/documents',
      label: 'Documents',
      icon: FolderOpen,
    },
    {
      href: '/proprietaire/rappels',
      label: 'Rappels',
      icon: Bell,
    },
  ], []);

  // Tenant navigation items
  const tenantItems: NavigationItem[] = useMemo(() => [
    {
      href: '/locataire/tableau-de-bord',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: '/locataire/biens',
      label: 'Rechercher un bien',
      icon: Home,
    },
    {
      href: '/locataire/mes-visites',
      label: 'Mes visites',
      icon: Calendar,
    },
    {
      href: '/locataire/mes-contrats',
      label: 'Mes contrats',
      icon: FileText,
    },
    {
      href: '/locataire/mes-avis',
      label: 'Mes avis',
      icon: MessageSquare,
    },
    {
      href: '/locataire/parametres',
      label: 'Paramètres',
      icon: Settings,
    },
  ], []);

  // Determine which items to return based on current path
  const pathname = location.pathname;

  if (pathname.startsWith('/agences')) {
    return { agentItems, bottomItems };
  } else if (pathname.startsWith('/proprietaire')) {
    return { ownerItems, bottomItems: [] };
  } else if (pathname.startsWith('/locataire')) {
    return { tenantItems, bottomItems: [] };
  }

  // Default fallback
  return { agentItems, bottomItems };
}
