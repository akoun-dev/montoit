'use client'

import { 
  Home, FileText, Eye, FileSignature, MessageSquare, 
  Building2, PlusCircle, ClipboardCheck, Users, Shield, 
  BarChart3, Settings, AlertTriangle, Clock, BadgeCheck,
  LayoutDashboard, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuthStore, type AuthUser } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface SidebarItem {
  id: string
  label: string
  icon: React.ElementType
}

function getSidebarItems(role: AuthUser['role']): SidebarItem[] {
  switch (role) {
    case 'LOCATAIRE':
      return [
        { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'rental-file', label: 'Dossier locatif', icon: FileText },
        { id: 'my-visits', label: 'Mes visites', icon: Eye },
        { id: 'my-leases', label: 'Mes baux', icon: FileSignature },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
      ]
    case 'PROPRIETAIRE':
      return [
        { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'my-properties', label: 'Mes biens', icon: Building2 },
        { id: 'add-property', label: 'Ajouter un bien', icon: PlusCircle },
        { id: 'visit-requests', label: 'Demandes de visite', icon: Eye },
        { id: 'rental-files', label: 'Dossiers locatifs', icon: ClipboardCheck },
        { id: 'my-leases', label: 'Mes baux', icon: FileSignature },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
      ]
    case 'TIERS_CONFIANCE':
      return [
        { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'rental-files-queue', label: 'Dossiers à valider', icon: ClipboardCheck },
        { id: 'owner-validations', label: 'Validations propriétaires', icon: BadgeCheck },
        { id: 'agency-validations', label: 'Validations agences', icon: Building2 },
        { id: 'sla-monitoring', label: 'Suivi SLA', icon: Clock },
      ]
    case 'ADMIN':
      return [
        { id: 'overview', label: 'Tableau de bord', icon: LayoutDashboard },
        { id: 'users', label: 'Utilisateurs', icon: Users },
        { id: 'properties-moderation', label: 'Modération biens', icon: Building2 },
        { id: 'tc-management', label: 'Gestion TC', icon: Shield },
        { id: 'disputes', label: 'Litiges', icon: AlertTriangle },
        { id: 'reports', label: 'Rapports', icon: BarChart3 },
        { id: 'settings', label: 'Paramètres', icon: Settings },
      ]
    default:
      return []
  }
}

function getRoleLabel(role: AuthUser['role']): string {
  switch (role) {
    case 'LOCATAIRE': return 'Locataire'
    case 'PROPRIETAIRE': return 'Propriétaire'
    case 'TIERS_CONFIANCE': return 'Tiers de Confiance'
    case 'ADMIN': return 'Administration'
  }
}

function getRoleColor(role: AuthUser['role']): string {
  switch (role) {
    case 'LOCATAIRE': return 'bg-blue-100 text-blue-700'
    case 'PROPRIETAIRE': return 'bg-green-100 text-green-700'
    case 'TIERS_CONFIANCE': return 'bg-amber-100 text-amber-700'
    case 'ADMIN': return 'bg-purple-100 text-purple-700'
  }
}

export function Sidebar() {
  const { user, dashboardSection, setDashboardSection } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  if (!user) return null

  const items = getSidebarItems(user.role)

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-neutral-200 bg-white transition-all duration-300 h-full',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-neutral-200 shrink-0">
        <Home className="size-6 text-brand-500 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-brand-500 truncate">MON TOIT</span>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              getRoleColor(user.role)
            )}>
              {getRoleLabel(user.role)}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = dashboardSection === item.id
            return (
              <li key={item.id}>
                <button
                  onClick={() => setDashboardSection(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
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
      </nav>

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
