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
import { OtpVerifyForm } from '@/components/auth/otp-verify-form'
import { RegisterForm } from '@/components/auth/register-form'
import { Dashboard } from '@/components/dashboard'

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

  if (currentView === 'otp-verify') {
    return <OtpVerifyForm />
  }

  if (currentView === 'register') {
    return <RegisterForm />
  }

  // Home view — default landing page
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div id="accueil">
          <Hero />
        </div>
        <div id="nos-biens">
          <NosBiens />
        </div>
        <HowItWorks />
        <Roles />
        <Trust />
        <div id="a-propos">
          <About />
        </div>
        <div id="nous-contacter">
          <Contact />
        </div>
      </main>
      <Footer />
    </div>
  )
}
