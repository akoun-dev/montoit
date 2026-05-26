'use client'

export interface ProfileData {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  gender: string | null
  city: string | null
  address: string | null
  avatarUrl: string | null
  birthDate: string | null
  nni: string | null
  neofaceVerified: boolean
  neofaceVerifiedAt: string | null
  kycDocumentId: string | null
  oneciVerified: boolean
  oneciVerifiedAt: string | null
  isEmailVerified: boolean
  isPhoneVerified: boolean
  passwordUpdatedAt: string | null
  role: string
  createdAt: string
}

export interface ProfileField {
  key: string
  label: string
  filled: boolean
}

export interface ScoringBreakdown {
  profile: { score: number; max: number; weight: number; fields: ProfileField[] }
  neoface: { score: number; max: number; weight: number; verified: boolean; label: string; description: string }
  oneci: { score: number; max: number; weight: number; verified: boolean; label: string; description: string }
  roleSpecific: { score: number; max: number; weight: number; approved: boolean; hasFile: boolean; label: string; description: string }
}

export interface Recommendation {
  id: string
  title: string
  description: string
  impact: number
  action: string
  actionLabel: string
  completed: boolean
}

export interface ScoringData {
  score: number
  status: 'approuve' | 'sous_conditions' | 'non_recommande'
  statusLabel: string
  statusColor: string
  roleLabel: string
  breakdown: ScoringBreakdown
  recommendations: Recommendation[]
}

export interface SessionInfo {
  id: string
  isCurrent: boolean
  createdAt: string
  expiresAt: string
}

export interface NotificationPreferences {
  id: string
  messages: boolean
  dossierUpdates: boolean
  visitReminders: boolean
  paymentAlerts: boolean
  promotions: boolean
}

export type SettingsTab = 'profil' | 'scoring' | 'securite' | 'notifications' | 'reviews' | 'maintenance' | 'history'
