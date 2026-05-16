'use client'

import { useState } from 'react'
import { Bell, LogOut, Home, Menu, ArrowLeftRight, Building2, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { AnimatedSheet } from '@/components/ui/sheet'
import { useAuthStore } from '@/lib/auth-store'
import { cn } from '@/lib/utils'
import { SidebarContent, getRoleLabel, getRoleColor } from './sidebar'
import { ThemeToggle, LiveClock } from '@/components/theme-toggle'
import { toast } from 'sonner'

export function DashboardHeader() {
  const { user, logout, setView, switchRole } = useAuthStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [switchingRole, setSwitchingRole] = useState(false)

  if (!user) return null

  const effectiveRole = user.activeRole || user.role
  const canSwitchRole = ['LOCATAIRE', 'PROPRIETAIRE', 'AGENCE'].includes(user.role) || ['LOCATAIRE', 'PROPRIETAIRE', 'AGENCE'].includes(user.activeRole || user.role)
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const handleSwitchRole = async (newRole: 'LOCATAIRE' | 'PROPRIETAIRE') => {
    setSwitchingRole(true)
    try {
      await switchRole(newRole)
      toast.success(`Mode ${getRoleLabel(newRole)} activé`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du changement de rôle')
    } finally {
      setSwitchingRole(false)
    }
  }

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

          {/* Role Switch Button */}
          {canSwitchRole && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwitchRole(effectiveRole === 'LOCATAIRE' ? 'PROPRIETAIRE' : 'LOCATAIRE')}
              disabled={switchingRole}
              className="hidden sm:flex items-center gap-1.5 h-8 px-2.5 text-xs border-brand-200 text-brand-600 hover:bg-brand-50 hover:text-brand-700"
            >
              <ArrowLeftRight className="size-3.5" />
              {switchingRole ? '...' : effectiveRole === 'LOCATAIRE' ? 'Mode Propriétaire' : 'Mode Locataire'}
            </Button>
          )}

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
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className={cn('text-[10px] font-medium leading-tight', getRoleColor(effectiveRole))}>
                    {getRoleLabel(effectiveRole)}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="text-sm text-muted-foreground cursor-default">
                {user.email || user.phone}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Role switch options */}
              {canSwitchRole && (
                <>
                  {effectiveRole !== 'LOCATAIRE' && (
                    <DropdownMenuItem onClick={() => handleSwitchRole('LOCATAIRE')} disabled={switchingRole} className="cursor-pointer">
                      <UserIcon className="size-4 mr-2" />
                      Passer en mode Locataire
                    </DropdownMenuItem>
                  )}
                  {effectiveRole !== 'PROPRIETAIRE' && (
                    <DropdownMenuItem onClick={() => handleSwitchRole('PROPRIETAIRE')} disabled={switchingRole} className="cursor-pointer">
                      <Building2 className="size-4 mr-2" />
                      Passer en mode Propriétaire
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                </>
              )}
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

        {/* Role switch in mobile sidebar */}
        {canSwitchRole && (
          <div className="border-t border-border px-3 py-2 shrink-0">
            <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase px-3 mb-1.5">Changer de rôle</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => { handleSwitchRole('LOCATAIRE'); setMobileMenuOpen(false) }}
                disabled={switchingRole}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                  effectiveRole === 'LOCATAIRE'
                    ? 'bg-amber-100 text-amber-700'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <UserIcon className="size-3.5" />
                Locataire
              </button>
              <button
                onClick={() => { handleSwitchRole('PROPRIETAIRE'); setMobileMenuOpen(false) }}
                disabled={switchingRole}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-colors',
                  effectiveRole === 'PROPRIETAIRE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                <Building2 className="size-3.5" />
                Propriétaire
              </button>
            </div>
          </div>
        )}

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
