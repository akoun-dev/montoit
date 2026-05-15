'use client'

import { Bell, LogOut, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'sonner'

export function DashboardHeader() {
  const { user, logout, setView } = useAuthStore()

  if (!user) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  const handleLogout = async () => {
    await logout()
    toast.success('Déconnexion réussie')
  }

  return (
    <header className="h-16 border-b border-neutral-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0">
      {/* Left - Page title area */}
      <div className="flex items-center gap-3">
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
              {user.phone}
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
  )
}
