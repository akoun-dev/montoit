'use client'

import { 
  FileText, Eye, FileSignature, MessageSquare, 
  Building2, PlusCircle, ClipboardCheck, Users, Shield, 
  BarChart3, Settings, AlertTriangle, Clock, BadgeCheck,
  LayoutDashboard, ChevronLeft, ChevronRight,
  Search, Heart, UserCheck, CreditCard, Bell, Star, Wrench, History, ShieldCheck
} from 'lucide-react'
import Image from 'next/image'
import { useAuthStore, type AuthUser } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface SidebarItem {
  id: string
  label: string
  icon: React.ElementType
}

interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

export function getSidebarSections(role: AuthUser['role']): SidebarSection[] {
  switch (role) {
    case 'LOCATAIRE':
      return [
        {
          items: [
            { id: 'overview', label: 'Mon Espace', icon: LayoutDashboard },
          ],
        },
        {
          title: 'LOCATION',
          items: [
            { id: 'search-properties', label: 'Chercher un bien', icon: Search },
            { id: 'favorites', label: 'Mes favoris', icon: Heart },
            { id: 'applications', label: 'Mes Candidatures', icon: UserCheck },
            { id: 'my-visits', label: 'Mes Visites', icon: Eye },
            { id: 'my-leases', label: 'Mes Contrats', icon: FileSignature },
            { id: 'payments', label: 'Mes Paiements', icon: CreditCard },
          ],
        },
        {
          title: 'MESSAGES',
          items: [
            { id: 'messages', label: 'Mes messages', icon: MessageSquare },
            { id: 'notifications', label: 'Mes notifications', icon: Bell },
          ],
        },
        {
          title: 'COMPTE',
          items: [
            { id: 'trust-score', label: 'Trust Score', icon: ShieldCheck },
            { id: 'reviews', label: 'Mes avis', icon: Star },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'history', label: 'Historique', icon: History },
            { id: 'settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]
    case 'PROPRIETAIRE':
      return [
        {
          items: [
            { id: 'overview', label: 'Mon Espace', icon: LayoutDashboard },
          ],
        },
        {
          title: 'MES BIENS',
          items: [
            { id: 'my-properties', label: 'Mes biens', icon: Building2 },
            { id: 'add-property', label: 'Ajouter un bien', icon: PlusCircle },
          ],
        },
        {
          title: 'LOCATION',
          items: [
            { id: 'visit-requests', label: 'Demandes de visite', icon: Eye },
            { id: 'rental-files', label: 'Dossiers locatifs', icon: ClipboardCheck },
            { id: 'my-leases', label: 'Mes baux', icon: FileSignature },
            { id: 'payments', label: 'Paiements', icon: CreditCard },
          ],
        },
        {
          title: 'MESSAGES',
          items: [
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ],
        },
        {
          title: 'COMPTE',
          items: [
            { id: 'reviews', label: 'Avis reçus', icon: Star },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'history', label: 'Historique', icon: History },
            { id: 'settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]
    case 'AGENCE':
      return [
        {
          items: [
            { id: 'overview', label: 'Mon Espace', icon: LayoutDashboard },
          ],
        },
        {
          title: 'NOS BIENS',
          items: [
            { id: 'my-properties', label: 'Nos biens', icon: Building2 },
            { id: 'add-property', label: 'Ajouter un bien', icon: PlusCircle },
          ],
        },
        {
          title: 'LOCATION',
          items: [
            { id: 'visit-requests', label: 'Demandes de visite', icon: Eye },
            { id: 'rental-files', label: 'Dossiers locatifs', icon: ClipboardCheck },
            { id: 'my-leases', label: 'Nos baux', icon: FileSignature },
            { id: 'payments', label: 'Paiements', icon: CreditCard },
          ],
        },
        {
          title: 'MESSAGES',
          items: [
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ],
        },
        {
          title: 'COMPTE',
          items: [
            { id: 'reviews', label: 'Avis', icon: Star },
            { id: 'maintenance', label: 'Maintenance', icon: Wrench },
            { id: 'history', label: 'Historique', icon: History },
            { id: 'settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]
    case 'TIERS_CONFIANCE':
      return [
        {
          items: [
            { id: 'overview', label: 'Mon Espace', icon: LayoutDashboard },
          ],
        },
        {
          title: 'VALIDATION',
          items: [
            { id: 'rental-files-queue', label: 'Dossiers à valider', icon: ClipboardCheck },
            { id: 'owner-validations', label: 'Validations propriétaires', icon: BadgeCheck },
            { id: 'agency-validations', label: 'Validations agences', icon: Building2 },
          ],
        },
        {
          title: 'SUIVI',
          items: [
            { id: 'sla-monitoring', label: 'Suivi SLA', icon: Clock },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ],
        },
        {
          title: 'COMPTE',
          items: [
            { id: 'history', label: 'Historique', icon: History },
            { id: 'settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]
    case 'ADMIN':
      return [
        {
          items: [
            { id: 'overview', label: 'Mon Espace', icon: LayoutDashboard },
          ],
        },
        {
          title: 'GESTION',
          items: [
            { id: 'users', label: 'Utilisateurs', icon: Users },
            { id: 'properties-moderation', label: 'Modération biens', icon: Building2 },
            { id: 'tc-management', label: 'Gestion TC', icon: Shield },
          ],
        },
        {
          title: 'SUPERVISION',
          items: [
            { id: 'disputes', label: 'Litiges', icon: AlertTriangle },
            { id: 'reports', label: 'Rapports', icon: BarChart3 },
            { id: 'notifications', label: 'Notifications', icon: Bell },
          ],
        },
        {
          title: 'COMPTE',
          items: [
            { id: 'settings', label: 'Paramètres', icon: Settings },
          ],
        },
      ]
    default:
      return []
  }
}

export function getRoleLabel(role: AuthUser['role']): string {
  switch (role) {
    case 'LOCATAIRE': return 'Locataire'
    case 'PROPRIETAIRE': return 'Propriétaire'
    case 'AGENCE': return 'Agence'
    case 'TIERS_CONFIANCE': return 'Tiers de Confiance'
    case 'ADMIN': return 'Administration'
    default: return role
  }
}

function getRoleColor(role: AuthUser['role']): string {
  switch (role) {
    case 'LOCATAIRE': return 'bg-amber-100 text-amber-700'
    case 'PROPRIETAIRE': return 'bg-emerald-100 text-emerald-700'
    case 'AGENCE': return 'bg-teal-100 text-teal-700'
    case 'TIERS_CONFIANCE': return 'bg-orange-100 text-orange-700'
    case 'ADMIN': return 'bg-rose-100 text-rose-700'
    default: return 'bg-neutral-100 text-neutral-700'
  }
}

// ─── Reusable sidebar navigation content ────────────────────────────────────
// Used by both the desktop Sidebar and the mobile Sheet menu

interface SidebarContentProps {
  collapsed?: boolean
  onNavigate?: () => void  // called after clicking a nav item (to close mobile Sheet)
}

export function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  const { user, dashboardSection, setDashboardSection } = useAuthStore()

  if (!user) return null

  const sections = getSidebarSections(user.role)

  const handleItemClick = (id: string) => {
    setDashboardSection(id)
    onNavigate?.()
  }

  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-neutral-200 shrink-0">
        <Image
          src="/favicon-96x96.png"
          alt="Mon Toit"
          width={24}
          height={24}
          className="shrink-0"
        />
        {!collapsed && (
          <span className="text-lg font-bold text-brand-500 truncate">MON TOIT</span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-neutral-100">
          <span className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            getRoleColor(user.role)
          )}>
            {getRoleLabel(user.role)}
          </span>
        </div>
      )}

      {/* Navigation with sections */}
      <ScrollArea className="flex-1">
        <nav className="py-2 px-2">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={sIdx > 0 ? 'mt-3' : ''}>
              {/* Section title */}
              {section.title && !collapsed && (
                <p className="px-3 mb-1 text-[10px] font-bold tracking-widest text-neutral-400 uppercase">
                  {section.title}
                </p>
              )}
              {/* Section items */}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = dashboardSection === item.id
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handleItemClick(item.id)}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900',
                          collapsed && 'justify-center px-0'
                        )}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className={cn('size-5 shrink-0', isActive ? 'text-brand-500' : 'text-neutral-400')} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </>
  )
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r border-neutral-200 bg-white transition-all duration-300 h-full',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent collapsed={collapsed} />

      {/* Collapse button */}
      <div className="border-t border-neutral-200 p-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center"
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </Button>
      </div>
    </aside>
  )
}
