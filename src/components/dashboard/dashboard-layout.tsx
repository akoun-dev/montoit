'use client'

import { Sidebar } from './sidebar'
import { DashboardHeader } from './dashboard-header'
import { MobileBottomNav } from './mobile-bottom-nav'
import { useAuthStore } from '@/lib/auth-store'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (!user) return null

  return (
    <div className="h-screen flex overflow-hidden bg-neutral-50">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  )
}
