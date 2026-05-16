'use client'

import { LayoutDashboard, Search, UserCheck, Eye, CreditCard } from 'lucide-react'
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

// Map detail view sections to their parent tab
const detailToParent: Record<string, string> = {
  'payment-detail': 'payments',
  'application-detail': 'applications',
  'visit-detail': 'my-visits',
  'lease-detail': 'my-leases',
}

export function MobileBottomNav() {
  const { dashboardSection, setDashboardSection } = useAuthStore()

  const handleNav = (id: string) => {
    setDashboardSection(id)
  }

  // Determine which tab is active (including detail views)
  const activeTab = detailToParent[dashboardSection] || dashboardSection

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tenantItems.map((item) => {
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
