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
  Settings,
  MessageSquare,
  Home,
  Briefcase,
  CheckCircle,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export interface NavigationItem {
  href: string;
  label: string;
  icon: any;
  badgeCount?: number;
  badgeColor?: 'red' | 'orange' | 'blue' | 'green';
  badgePulse?: boolean;
}

export function useNavigationItems() {
  const { user } = useAuth();
  const location = useLocation();

  // TODO: Fetch actual badge counts from API/database
  const badgeCounts = useMemo(() => ({
    pendingApplications: 0,
    pendingPayments: 0,
    overduePayments: 0,
    pendingReminders: 0,
  }), []);

  // Agent/Agency navigation items
  const agentItems: NavigationItem[] = useMemo(() => [
    {
      href: '/agences/dashboard',
      label: 'Tableau de bord',
      icon: LayoutDashboard,
    },
    {
      href: '/agences/biens',
      label: 'Biens immobiliers',
      icon: Building2,
    },
    {
      href: '/agences/mandats',
      label: 'Mes mandats',
      icon: Briefcase,
    },
    {
      href: '/agences/candidatures',
      label: 'Candidatures',
      icon: FileText,
      badgeCount: badgeCounts.pendingApplications,
      badgeColor: 'orange',
      badgePulse: badgeCounts.pendingApplications > 0,
    },
    {
      href: '/agences/contrats',
      label: 'Contrats',
      icon: CheckCircle,
    },
    {
      href: '/agences/paiements',
      label: 'Paiements & Charges',
      icon: Wallet,
      badgeCount: badgeCounts.pendingPayments + badgeCounts.overduePayments,
      badgeColor: badgeCounts.overduePayments > 0 ? 'red' : 'orange',
      badgePulse: badgeCounts.overduePayments > 0,
    },
    {
      href: '/agences/documents',
      label: 'Documents',
      icon: FolderOpen,
    },
    {
      href: '/agences/rappels',
      label: 'Rappels',
      icon: Bell,
      badgeCount: badgeCounts.pendingReminders,
      badgeColor: 'blue',
    },
    {
      href: '/agences/visites',
      label: 'Visites',
      icon: Calendar,
    },
    {
      href: '/agences/messages',
      label: 'Messages',
      icon: MessageSquare,
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
      label: 'Mon équipe',
      icon: Users,
    },
    {
      href: '/agences/commissions',
      label: 'Commissions',
      icon: TrendingUp,
    },
  ], [badgeCounts]);

  // Bottom navigation items (Profile, Settings, etc.)
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
