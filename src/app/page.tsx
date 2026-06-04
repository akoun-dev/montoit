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
import { FAQ } from '@/components/home/faq'
import { Contact } from '@/components/home/contact'
import { CguPage } from '@/components/home/legal/cgu'
import { PrivacyPage } from '@/components/home/legal/privacy'
import { LegalNoticePage } from '@/components/home/legal/legal-notice'
import { CookiesPage } from '@/components/home/legal/cookies'
import { CookieConsentBanner } from '@/components/home/cookie-consent-banner'
import { Footer } from '@/components/home/footer'
import { LoginForm } from '@/components/auth/login-form'
import { OtpVerifyForm } from '@/components/auth/otp-verify-form'
import { RegisterForm } from '@/components/auth/register-form'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { EmailVerifyForm } from '@/components/auth/email-verify-form'
import { Dashboard } from '@/components/dashboard'
import { PropertyDetailView } from '@/components/home/property-detail-view'

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <div className="hidden sm:block">
        <Footer />
      </div>
      <CookieConsentBanner />
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-brand-500" />
        <p className="text-sm text-neutral-500">Chargement...</p>
      </div>
    </div>
  )
}

export default function Home() {
  const { currentView, checkAuth, isInitialized, selectedPropertyId } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Wait for first auth check to complete before rendering anything
  // This prevents flash of wrong view (home page → dashboard) on refresh
  if (!isInitialized) {
    return <LoadingScreen />
  }

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

  if (currentView === 'forgot-password') {
    return <ForgotPasswordForm />
  }

  if (currentView === 'email-verify') {
    return <EmailVerifyForm />
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

  // FAQ — full page view
  if (currentView === 'faq') {
    return (
      <PageShell>
        <FAQ />
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

  // CGU — full page view
  if (currentView === 'cgu') {
    return (
      <PageShell>
        <CguPage />
      </PageShell>
    )
  }

  // Confidentialité — full page view
  if (currentView === 'confidentialite') {
    return (
      <PageShell>
        <PrivacyPage />
      </PageShell>
    )
  }

  // Mentions légales — full page view
  if (currentView === 'mentions-legales') {
    return (
      <PageShell>
        <LegalNoticePage />
      </PageShell>
    )
  }

  // Cookies — full page view
  if (currentView === 'cookies') {
    return (
      <PageShell>
        <CookiesPage />
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
    </PageShell>
  )
}
