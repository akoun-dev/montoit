'use client'

import { useState } from 'react'
import {
  Menu,
  LayoutDashboard,
  Heart,
  Eye,
  FileSignature,
  MessageSquare,
  UserCircle,
  LogOut,
  Building2,
  PlusCircle,
  ClipboardCheck,
  CreditCard,
  Bell,
  Star,
  Settings,
  Users,
  Shield,
  AlertTriangle,
  BarChart3,
  Search,
  UserCheck,
  Wrench,
  History,
  BadgeCheck,
  Clock,
} from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { useAuthStore, type AppView, type AuthUser } from '@/lib/auth-store'
import { cn } from '@/lib/utils'

const navLinks: { label: string; view: AppView }[] = [
  { label: 'Accueil', view: 'home' },
  { label: 'Nos Biens', view: 'nos-biens' },
  { label: 'À Propos', view: 'a-propos' },
  { label: 'Nous Contacter', view: 'nous-contacter' },
]

// ─── Role label & color helpers ──────────────────────────────────────────────

function getRoleLabel(role: AuthUser['role']): string {
  switch (role) {
    case 'LOCATAIRE': return 'Locataire'
    case 'PROPRIETAIRE': return 'Propriétaire'
    case 'AGENCE': return 'Agence'
    case 'TIERS_CONFIANCE': return 'Tiers de Confiance'
    case 'ADMIN': return 'Administration'
    default: return role
  }
}

function getRoleBadgeStyle(role: AuthUser['role']): string {
  switch (role) {
    case 'LOCATAIRE': return 'bg-amber-100 text-amber-700 border-amber-200'
    case 'PROPRIETAIRE': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'AGENCE': return 'bg-teal-100 text-teal-700 border-teal-200'
    case 'TIERS_CONFIANCE': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'ADMIN': return 'bg-rose-100 text-rose-700 border-rose-200'
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200'
  }
}

// ─── Dropdown menu items per role ────────────────────────────────────────────

interface UserMenuItem {
  id: string
  label: string
  icon: React.ElementType
  section: string
}

function getUserMenuItems(role: AuthUser['role']): UserMenuItem[] {
  switch (role) {
    case 'LOCATAIRE':
      return [
        { id: 'dashboard', label: 'Mon Espace', icon: LayoutDashboard, section: 'overview' },
        { id: 'favorites', label: 'Mes favoris', icon: Heart, section: 'favorites' },
        { id: 'visits', label: 'Mes visites', icon: Eye, section: 'my-visits' },
        { id: 'leases', label: 'Mes contrats', icon: FileSignature, section: 'my-leases' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, section: 'messages' },
        { id: 'profile', label: 'Mon profil', icon: UserCircle, section: 'settings' },
      ]
    case 'PROPRIETAIRE':
      return [
        { id: 'dashboard', label: 'Mon Espace', icon: LayoutDashboard, section: 'overview' },
        { id: 'properties', label: 'Mes biens', icon: Building2, section: 'my-properties' },
        { id: 'add-property', label: 'Ajouter un bien', icon: PlusCircle, section: 'add-property' },
        { id: 'visits', label: 'Demandes de visite', icon: Eye, section: 'visit-requests' },
        { id: 'rental-files', label: 'Dossiers locatifs', icon: ClipboardCheck, section: 'rental-files' },
        { id: 'leases', label: 'Mes baux', icon: FileSignature, section: 'my-leases' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, section: 'messages' },
        { id: 'profile', label: 'Mon profil', icon: UserCircle, section: 'settings' },
      ]
    case 'AGENCE':
      return [
        { id: 'dashboard', label: 'Mon Espace', icon: LayoutDashboard, section: 'overview' },
        { id: 'properties', label: 'Nos biens', icon: Building2, section: 'my-properties' },
        { id: 'add-property', label: 'Ajouter un bien', icon: PlusCircle, section: 'add-property' },
        { id: 'visits', label: 'Demandes de visite', icon: Eye, section: 'visit-requests' },
        { id: 'rental-files', label: 'Dossiers locatifs', icon: ClipboardCheck, section: 'rental-files' },
        { id: 'leases', label: 'Nos baux', icon: FileSignature, section: 'my-leases' },
        { id: 'messages', label: 'Messages', icon: MessageSquare, section: 'messages' },
        { id: 'profile', label: 'Profil agence', icon: UserCircle, section: 'settings' },
      ]
    case 'TIERS_CONFIANCE':
      return [
        { id: 'dashboard', label: 'Mon Espace', icon: LayoutDashboard, section: 'overview' },
        { id: 'rental-files', label: 'Dossiers à valider', icon: ClipboardCheck, section: 'rental-files-queue' },
        { id: 'validations', label: 'Validations', icon: BadgeCheck, section: 'owner-validations' },
        { id: 'sla', label: 'Suivi SLA', icon: Clock, section: 'sla-monitoring' },
        { id: 'profile', label: 'Mon profil', icon: UserCircle, section: 'settings' },
      ]
    case 'ADMIN':
      return [
        { id: 'dashboard', label: 'Mon Espace', icon: LayoutDashboard, section: 'overview' },
        { id: 'users', label: 'Utilisateurs', icon: Users, section: 'users' },
        { id: 'properties', label: 'Modération biens', icon: Building2, section: 'properties-moderation' },
        { id: 'tc', label: 'Gestion TC', icon: Shield, section: 'tc-management' },
        { id: 'disputes', label: 'Litiges', icon: AlertTriangle, section: 'disputes' },
        { id: 'reports', label: 'Rapports', icon: BarChart3, section: 'reports' },
        { id: 'profile', label: 'Paramètres', icon: Settings, section: 'settings' },
      ]
    default:
      return []
  }
}

// ─── User Avatar Dropdown (Desktop) ─────────────────────────────────────────

function UserDropdown() {
  const { user, setView, setDashboardSection, logout } = useAuthStore()
  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
  const menuItems = getUserMenuItems(user.role)

  const handleMenuItem = (item: UserMenuItem) => {
    if (item.id === 'dashboard' || item.section === 'overview') {
      setDashboardSection('overview')
      setView('dashboard')
    } else {
      setDashboardSection(item.section)
      setView('dashboard')
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full" aria-label="Menu utilisateur">
          <Avatar className="h-9 w-9 border-2 border-brand-200 hover:border-brand-400 transition-colors">
            <AvatarFallback className="bg-brand-100 text-brand-700 text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0 overflow-hidden">
        {/* Profile header */}
        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-100">
          <p className="text-sm font-semibold text-neutral-900 truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-neutral-500 truncate mt-0.5">
            {user.email || user.phone}
          </p>
          <Badge
            variant="outline"
            className={cn(
              'mt-2 text-[10px] font-medium px-2 py-0 h-5 border',
              getRoleBadgeStyle(user.role)
            )}
          >
            {getRoleLabel(user.role)}
          </Badge>
        </div>

        {/* Menu items */}
        <div className="py-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => handleMenuItem(item)}
                className="px-3 py-2 cursor-pointer gap-3 text-sm text-neutral-700 focus:bg-brand-50 focus:text-brand-700"
              >
                <Icon className="size-4 text-neutral-400 shrink-0" />
                <span>{item.label}</span>
              </DropdownMenuItem>
            )
          })}
        </div>

        <DropdownMenuSeparator className="bg-neutral-100" />

        {/* Logout */}
        <div className="py-1">
          <DropdownMenuItem
            onClick={handleLogout}
            className="px-3 py-2 cursor-pointer gap-3 text-sm text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <LogOut className="size-4 shrink-0" />
            <span>Déconnexion</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Main Header ─────────────────────────────────────────────────────────────

export function Header() {
  const [open, setOpen] = useState(false)
  const { currentView, setView, isAuthenticated, user, setDashboardSection, logout } = useAuthStore()

  const handleNavClick = (view: AppView) => {
    setOpen(false)
    setView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = () => setView('login')

  // Mobile: navigate to dashboard section
  const handleMobileDashboardItem = (section: string) => {
    setOpen(false)
    setDashboardSection(section)
    setView('dashboard')
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 shrink-0"
        >
          <Image
            src="/favicon-96x96.png"
            alt="Mon Toit"
            width={32}
            height={32}
            className="shrink-0"
            priority
          />
          <span className="text-xl font-bold tracking-tight text-brand-500">
            MON TOIT
          </span>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = currentView === link.view
            return (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.view)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'text-brand-500 bg-brand-50'
                    : 'text-neutral-700 hover:text-brand-500 hover:bg-brand-50'
                }`}
              >
                {link.label}
              </button>
            )
          })}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-3">
          {isAuthenticated && user ? (
            <UserDropdown />
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleLogin}>
                Se connecter
              </Button>
              <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" onClick={handleLogin}>
                S&apos;inscrire
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0">
            <SheetHeader className="px-4 pt-4">
              <SheetTitle className="flex items-center gap-2">
                <Image
                  src="/favicon-96x96.png"
                  alt="Mon Toit"
                  width={24}
                  height={24}
                  className="shrink-0"
                />
                <span className="text-brand-500 font-bold">MON TOIT</span>
              </SheetTitle>
            </SheetHeader>

            {/* Navigation links */}
            <nav className="flex flex-col gap-1 px-4 pt-2">
              {navLinks.map((link) => {
                const isActive = currentView === link.view
                return (
                  <SheetClose asChild key={link.label}>
                    <button
                      onClick={() => handleNavClick(link.view)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-md transition-colors text-left ${
                        isActive
                          ? 'text-brand-500 bg-brand-50'
                          : 'text-neutral-700 hover:text-brand-500 hover:bg-brand-50'
                      }`}
                    >
                      {link.label}
                    </button>
                  </SheetClose>
                )
              })}
            </nav>

            {/* User section in mobile menu */}
            <div className="px-4 mt-4">
              {isAuthenticated && user ? (
                <>
                  <Separator className="mb-3" />
                  {/* Profile info */}
                  <div className="px-3 py-2 mb-2">
                    <p className="text-sm font-semibold text-neutral-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-neutral-500 truncate">
                      {user.email || user.phone}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-1.5 text-[10px] font-medium px-2 py-0 h-5 border',
                        getRoleBadgeStyle(user.role)
                      )}
                    >
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>

                  {/* Quick menu items */}
                  <div className="space-y-0.5">
                    {getUserMenuItems(user.role).slice(0, 5).map((item) => {
                      const Icon = item.icon
                      return (
                        <SheetClose asChild key={item.id}>
                          <button
                            onClick={() => handleMobileDashboardItem(item.section)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 rounded-md hover:bg-brand-50 hover:text-brand-700 transition-colors text-left"
                          >
                            <Icon className="size-4 text-neutral-400 shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        </SheetClose>
                      )
                    })}
                  </div>

                  <Separator className="my-2" />

                  <SheetClose asChild>
                    <button
                      onClick={async () => { setOpen(false); await logout() }}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="size-4 shrink-0" />
                      <span>Déconnexion</span>
                    </button>
                  </SheetClose>
                </>
              ) : (
                <>
                  <Separator className="mb-3" />
                  <div className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button variant="outline" className="w-full" onClick={handleLogin}>
                        Se connecter
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button className="w-full bg-brand-500 hover:bg-brand-600 text-white" onClick={handleLogin}>
                        S&apos;inscrire
                      </Button>
                    </SheetClose>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
