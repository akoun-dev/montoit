'use client'

import { LayoutDashboard, Search, UserCheck, Eye, CreditCard, Building2, Users, MessageSquare, ClipboardCheck, MapPin, Scale, AlertTriangle, Activity, Settings } from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

interface BottomNavItem {
  id: string
  label: string
  icon: React.ElementType
}

const tenantItems: BottomNavItem[] = [
  { id: 'overview', label: 'Espace', icon: LayoutDashboard },
  { id: 'search-properties', label: 'Chercher', icon: Search },
  { id: 'applications', label: 'Dossiers', icon: UserCheck },
  { id: 'my-visits', label: 'Visites', icon: Eye },
  { id: 'payments', label: 'Paiements', icon: CreditCard },
]

const ownerItems: BottomNavItem[] = [
  { id: 'overview', label: 'Espace', icon: LayoutDashboard },
  { id: 'my-properties', label: 'Biens', icon: Building2 },
  { id: 'visit-requests', label: 'Visites', icon: Eye },
  { id: 'my-tenants', label: 'Locataires', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
]

const agenceItems: BottomNavItem[] = [
  { id: 'overview', label: 'Espace', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Biens', icon: Building2 },
  { id: 'candidatures', label: 'Candidats', icon: ClipboardCheck },
  { id: 'visits', label: 'Visites', icon: Eye },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
]

const tcItems: BottomNavItem[] = [
  { id: 'overview', label: 'Espace', icon: LayoutDashboard },
  { id: 'rental-files-queue', label: 'Dossiers', icon: ClipboardCheck },
  { id: 'messaging', label: 'Messages', icon: MessageSquare },
  { id: 'missions', label: 'Missions', icon: MapPin },
  { id: 'litiges', label: 'Litiges', icon: Scale },
]

const adminItems: BottomNavItem[] = [
  { id: 'overview', label: 'Espace', icon: LayoutDashboard },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'signalements', label: 'Alertes', icon: AlertTriangle },
  { id: 'system', label: 'Système', icon: Activity },
  { id: 'settings', label: 'Config', icon: Settings },
]

// Map detail view sections to their parent tab
const detailToParent: Record<string, string> = {
  // Locataire
  'payment-detail': 'payments',
  'application-detail': 'applications',
  'visit-detail': 'my-visits',
  'lease-detail': 'my-leases',
  // Propriétaire
  'property-detail': 'my-properties',
  'add-property': 'my-properties',
  'visit-request-detail': 'visit-requests',
  'tenant-detail': 'my-tenants',
  // Agence
  'mandats': 'portfolio',
  'contracts': 'portfolio',
  'team': 'overview',
  'finances': 'overview',
  'analytics': 'overview',
  'communication': 'messages',
  'marketing': 'messages',
  'client-files': 'candidatures',
  'settings': 'overview',
  'security': 'overview',
  'notifications': 'overview',
  // TC
  'rental-file-detail': 'rental-files-queue',
  'property-verifications': 'rental-files-queue',
  'property-verify-detail': 'rental-files-queue',
  'inventory-report-form': 'missions',
  'inventory-reports': 'missions',
  'owner-validations': 'rental-files-queue',
  'agency-validations': 'rental-files-queue',
  'oneci-verification': 'rental-files-queue',
  'certifications': 'overview',
  'sla-monitoring': 'litiges',
  'fraud-alerts': 'litiges',
  'documentation': 'missions',
  'agents': 'missions',
  'history': 'overview',
  // Admin
  'moderation': 'users',
  'trust-agents': 'users',
  'disputes': 'signalements',
  'reports': 'system',
  'backups': 'system',
  'config': 'settings',
}

export function MobileBottomNav() {
  const { dashboardSection, setDashboardSection, user } = useAuthStore()

  const effectiveRole = user?.activeRole || user?.role
  const navItems = effectiveRole === 'PROPRIETAIRE'
    ? ownerItems
    : effectiveRole === 'AGENCE'
      ? agenceItems
      : effectiveRole === 'TIERS_CONFIANCE'
        ? tcItems
        : effectiveRole === 'ADMIN'
          ? adminItems
          : tenantItems

  const handleNav = (id: string) => {
    setDashboardSection(id)
  }

  // Determine which tab is active (including detail views)
  const activeTab = detailToParent[dashboardSection] || dashboardSection

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                isActive ? 'text-brand-500' : 'text-neutral-400'
              )}
              aria-label={item.label}
            >
              <Icon className="size-5" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
