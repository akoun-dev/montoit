'use client'

import { useState } from 'react'
import { Bell, LogOut, Home, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AnimatedSheet } from '@/components/ui/sheet'
import { useAuthStore } from '@/lib/auth-store'
import { SidebarContent } from './sidebar'
import { toast } from 'sonner'

export function DashboardHeader() {
  const { user, logout, setView } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const handleLogout = async () => {
    setMobileMenuOpen(false)
    await logout()
    toast.success('Déconnexion réussie')
  }

  return (
    <>
      <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-5 text-neutral-700" />
          </Button>

          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-neutral-400 hover:text-brand-500 transition-colors"
            title="Retour à l'accueil"
          >
            <Home className="size-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-sm text-neutral-500">
              Bienvenue, <span className="font-medium text-neutral-900">{user.firstName}</span>
            </p>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5 text-neutral-500" />
            <Badge className="absolute -top-0.5 -right-0.5 size-4 p-0 flex items-center justify-center bg-brand-500 text-white text-[10px]">
              3
            </Badge>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="size-8">
                  {user.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                  )}
                  <AvatarFallback className="bg-brand-100 text-brand-700 text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium text-neutral-700">
                  {user.firstName} {user.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-sm text-neutral-500 cursor-default">
                {user.email || user.phone}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 cursor-pointer">
                <LogOut className="size-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ─── Mobile Drawer sidebar (framer-motion powered) ──────────── */}
      <AnimatedSheet
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        side="left"
        className="w-72 p-0"
        showCloseButton={false}
      >
        <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />

        {/* Bottom logout */}
        <div className="border-t border-neutral-200 p-3 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="size-5 shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </AnimatedSheet>
    </>
  )
}
