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
import { ThemeToggle, LiveClock } from '@/components/theme-toggle'
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
      <header className="h-16 border-b border-border bg-background flex items-center justify-between px-4 sm:px-6 shrink-0">
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
            <Menu className="size-5 text-muted-foreground" />
          </Button>

          <button
            onClick={() => setView('home')}
            className="flex items-center gap-2 text-muted-foreground hover:text-brand-500 transition-colors"
            title="Retour à l'accueil"
          >
            <Home className="size-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-sm text-muted-foreground">
              Bienvenue, <span className="font-medium text-foreground">{user.firstName}</span>
            </p>
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <LiveClock />
          <ThemeToggle />

          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell className="size-5 text-muted-foreground" />
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
                <span className="hidden sm:inline text-sm font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="text-sm text-muted-foreground cursor-default">
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
        <div className="border-t border-border p-3 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
          >
            <LogOut className="size-5 shrink-0" />
            <span>Déconnexion</span>
          </button>
        </div>
      </AnimatedSheet>
    </>
  )
}
