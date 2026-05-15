'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { Header } from '@/components/home/header'
import { Hero } from '@/components/home/hero'
import { NosBiens } from '@/components/home/properties'
import { HowItWorks } from '@/components/home/how-it-works'
import { Roles } from '@/components/home/roles'
import { Trust } from '@/components/home/trust'
import { About } from '@/components/home/about'
import { Contact } from '@/components/home/contact'
import { Footer } from '@/components/home/footer'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { Dashboard } from '@/components/dashboard'

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}

export default function Home() {
  const { currentView, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Dashboard view — full screen, no homepage chrome
  if (currentView === 'dashboard') {
    return <Dashboard />
  }

  // Auth views — centered card layouts
  if (currentView === 'login') {
    return <LoginForm />
  }

  if (currentView === 'register') {
    return <RegisterForm />
  }

  // Nos Biens — full page view
  if (currentView === 'nos-biens') {
    return (
      <PageShell>
        <NosBiens />
      </PageShell>
    )
  }

  // À Propos — full page view
  if (currentView === 'a-propos') {
    return (
      <PageShell>
        <About />
      </PageShell>
    )
  }

  // Nous Contacter — full page view
  if (currentView === 'nous-contacter') {
    return (
      <PageShell>
        <Contact />
      </PageShell>
    )
  }

  // Home view — default landing page with all sections
  return (
    <PageShell>
      <Hero />
      <NosBiens />
      <HowItWorks />
      <Roles />
      <Trust />
      <About />
      <Contact />
    </PageShell>
  )
}
