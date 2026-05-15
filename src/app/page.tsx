'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { Header } from '@/components/home/header'
import { Hero } from '@/components/home/hero'
import { NosBiens } from '@/components/home/properties'
import { NosBiensView } from '@/components/home/nos-biens-view'
import { HowItWorks } from '@/components/home/how-it-works'
import { Roles } from '@/components/home/roles'
import { Trust } from '@/components/home/trust'
import { About } from '@/components/home/about'
import { Contact } from '@/components/home/contact'
import { Footer } from '@/components/home/footer'
import { LoginForm } from '@/components/auth/login-form'
import { OtpVerifyForm } from '@/components/auth/otp-verify-form'
import { RegisterForm } from '@/components/auth/register-form'
import { Dashboard } from '@/components/dashboard'
import { PropertyDetailView } from '@/components/home/property-detail-view'

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
  const { currentView, checkAuth, selectedPropertyId } = useAuthStore()

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

  if (currentView === 'otp-verify') {
    return <OtpVerifyForm />
  }

  if (currentView === 'register') {
    return <RegisterForm />
  }

  // Nos Biens — full page view with sidebar layout
  if (currentView === 'nos-biens') {
    return (
      <PageShell>
        <NosBiensView />
      </PageShell>
    )
  }

  // Property Detail — dedicated full-page view
  if (currentView === 'property-detail') {
    return (
      <PageShell>
        <PropertyDetailView propertyId={selectedPropertyId} />
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
