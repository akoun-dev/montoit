'use client'

import { useState } from 'react'
import { Home, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { useAuthStore, type AppView } from '@/lib/auth-store'

const navLinks: { label: string; view: AppView }[] = [
  { label: 'Accueil', view: 'home' },
  { label: 'Nos Biens', view: 'nos-biens' },
  { label: 'À Propos', view: 'a-propos' },
  { label: 'Nous Contacter', view: 'nous-contacter' },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const { currentView, setView, isAuthenticated, user, logout } = useAuthStore()

  const handleNavClick = (view: AppView) => {
    setOpen(false)
    setView(view)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = () => setView('login')
  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm border-b border-neutral-200 shadow-sm">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 shrink-0"
        >
          <Home className="size-6 text-brand-500" />
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
            <>
              <span className="text-sm text-neutral-600">
                {user.firstName} {user.lastName}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setView('dashboard')}
              >
                Tableau de bord
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-neutral-500"
              >
                Déconnexion
              </Button>
            </>
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
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Home className="size-5 text-brand-500" />
                <span className="text-brand-500 font-bold">MON TOIT</span>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
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
            <div className="flex flex-col gap-2 px-4 mt-4 pt-4 border-t border-neutral-200">
              {isAuthenticated && user ? (
                <>
                  <p className="text-sm text-neutral-600 px-3">{user.firstName} {user.lastName}</p>
                  <SheetClose asChild>
                    <Button variant="outline" className="w-full" onClick={() => { setOpen(false); setView('dashboard') }}>
                      Tableau de bord
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button variant="ghost" className="w-full text-neutral-500" onClick={handleLogout}>
                      Déconnexion
                    </Button>
                  </SheetClose>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
