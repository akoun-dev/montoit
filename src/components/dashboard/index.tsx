'use client'

import { useAuthStore } from '@/lib/auth-store'
import { DashboardLayout } from './dashboard-layout'
import { useBackHandler } from '@/hooks/use-back-handler'
import { type ReactNode } from 'react'
import { LocataireOverview } from './locataire/overview'
import { RentalFileForm } from './locataire/rental-file'
import { MyVisits } from './locataire/my-visits'
import { MyLeases } from './locataire/my-leases'
import { Messages } from './locataire/messages'
import { SearchProperties } from './locataire/search-properties'
import { Favorites } from './locataire/favorites'
import { Applications } from './locataire/applications'
import { Payments } from './locataire/payments'
import { Notifications } from './locataire/notifications'
import { Reviews } from './locataire/reviews'
import { Maintenance } from './locataire/maintenance'
import { MyDisputes } from './shared/my-disputes'
import { ActivityHistory } from './locataire/history'
import { SettingsSection } from './locataire/settings'
import { TrustScore } from './locataire/trust-score'
import { PaymentDetail } from './locataire/payment-detail'
import { ApplicationDetail } from './locataire/application-detail'
import { VisitDetail } from './locataire/visit-detail'
import { LeaseDetail } from './locataire/lease-detail'
import { ProprietaireOverview } from './proprietaire/overview'
import { MyProperties } from './proprietaire/my-properties'
import { VisitRequests } from './proprietaire/visit-requests'
import { EnhancedRentalFiles } from './proprietaire/enhanced-rental-files'
import { EnhancedLeases } from './proprietaire/enhanced-leases'
import { ProprietaireMessages } from './proprietaire/messages'
import { OwnerFileForm } from './proprietaire/owner-file'
import { TenantsList } from './proprietaire/my-tenants'
import { TenantDetail } from './proprietaire/tenant-detail'
import { OwnerFinances } from './proprietaire/finances'
import { OwnerAnalytics } from './proprietaire/analytics'
import { ProprietaireMandats } from './proprietaire/mandats'
import { OwnerReviews } from './proprietaire/owner-reviews'
import { OwnerMaintenance } from './proprietaire/owner-maintenance'
import { OwnerSettings } from './proprietaire/owner-settings'
import { OwnerSecurity } from './proprietaire/security'
import { TcOverview } from './tc/overview'
import { DossierValidations } from './tc/dossier-validations'
import { RentalFilesQueue } from './tc/rental-files-queue'
import { RentalFileDetail } from './tc/rental-file-detail'
import { OwnerValidations } from './tc/owner-validations'
import { OwnerDossierValidations } from './tc/owner-dossier-validations'
import { AgencyValidations } from './tc/agency-validations'
import { SlaMonitoring } from './tc/sla-monitoring'
import { PropertyVerifications } from './tc/property-verifications'
import { PropertyVerifyDetail } from './tc/property-verify-detail'
import { InventoryReportForm } from './tc/inventory-report-form'
import { InventoryReportsList } from './tc/inventory-reports-list'
import { AgentsManagement } from './tc/agents'
import { MissionsManagement } from './tc/missions'
import { LitigesManagement } from './tc/litiges'
import { TcSettings } from './tc/settings'
import { TcMessaging } from './tc/messaging'
import { CertificationsManagement } from './tc/certifications'
import { OneciVerification } from './tc/oneci-verification'
import { FraudAlertsManagement } from './tc/fraud-alerts'
import { DocumentationCenter } from './tc/documentation'
import { AllProperties } from './tc/all-properties'
import { TcUsers } from './tc/users'
import { AdminOverview } from './admin/overview'
import { AdminUsers } from './admin/users'
import { PropertiesModeration } from './admin/properties-moderation'
import { TcManagement } from './admin/tc-management'
import { Disputes } from './admin/disputes'
import { Reports } from './admin/reports'
import { AdminSettings } from './admin/settings'
import { AdminModeration } from './admin/moderation'
import { AdminSignalements } from './admin/signalements'
import { AdminTrustAgents } from './admin/trust-agents'
import { AdminSystem } from './admin/system'
import { AdminSecurity } from './admin/security'
import { AdminConfig } from './admin/config'
import { AdminBackups } from './admin/backups'
import { AdminNotifications } from './admin/notifications'
import { AgenceOverview } from './agence/overview'
import { TeamManagement } from './agence/team'
import { Portfolio } from './agence/portfolio'
import { AgenceMandats } from './agence/mandats'
import { Candidatures } from './agence/candidatures'
import { AgenceFinances } from './agence/finances'
import { AgenceVisits } from './agence/visits'
import { AgenceAnalytics } from './agence/analytics'
import { AgenceContracts } from './agence/contracts'
import { AgenceCommunication } from './agence/communication'
import { AgenceMarketing } from './agence/marketing'
import { ClientFiles } from './agence/client-files'
import { AgenceSettings } from './agence/settings'
import { AgenceSecurity } from './agence/security'

function BackableSection({ sectionKey, onBack, children }: { sectionKey: string; onBack: () => void; children: ReactNode }) {
  useBackHandler(sectionKey, onBack)
  return <>{children}</>
}

function LocataireDashboard({ section }: { section: string }) {
  const { selectedItemId, setDashboardSection, setSelectedItemId, settingsDefaultTab, setSettingsDefaultTab } = useAuthStore()

  const goToPaymentDetail = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('payment-detail')
  }

  const goToApplicationDetail = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('application-detail')
  }

  const goToVisitDetail = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('visit-detail')
  }

  const goToLeaseDetail = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('lease-detail')
  }

  const goBackToList = (listSection: string) => {
    setSelectedItemId('')
    setDashboardSection(listSection)
  }

  const goBackToPayments = () => goBackToList('payments')
  const goBackToApplications = () => goBackToList('applications')
  const goBackToVisits = () => goBackToList('my-visits')
  const goBackToLeases = () => goBackToList('my-leases')

  const goToRentalFile = () => setDashboardSection('rental-file')

  const goBackFromRentalFile = () => setDashboardSection('settings')

  switch (section) {
    case 'overview': return <LocataireOverview />
    case 'search-properties': return <SearchProperties />
    case 'favorites': return <Favorites />
    case 'applications': return <Applications onDetail={goToApplicationDetail} />
    case 'application-detail': return <BackableSection sectionKey="application-detail" onBack={goBackToApplications}><ApplicationDetail applicationId={selectedItemId} onBack={goBackToApplications} /></BackableSection>
    case 'rental-file': return <BackableSection sectionKey="rental-file" onBack={goBackFromRentalFile}><RentalFileForm onBack={goBackFromRentalFile} onSubmitSuccess={() => { setSettingsDefaultTab('verification'); setDashboardSection('settings') }} /></BackableSection>
    case 'my-visits': return <MyVisits onDetail={goToVisitDetail} />
    case 'visit-detail': return <BackableSection sectionKey="visit-detail" onBack={goBackToVisits}><VisitDetail visitId={selectedItemId} onBack={goBackToVisits} /></BackableSection>
    case 'my-leases': return <MyLeases onDetail={goToLeaseDetail} />
    case 'lease-detail': return <BackableSection sectionKey="lease-detail" onBack={goBackToLeases}><LeaseDetail leaseId={selectedItemId} onBack={goBackToLeases} /></BackableSection>
    case 'payments': return <Payments onDetail={goToPaymentDetail} />
    case 'payment-detail': return <BackableSection sectionKey="payment-detail" onBack={goBackToPayments}><PaymentDetail paymentId={selectedItemId} onBack={goBackToPayments} /></BackableSection>
    case 'messages': return <Messages />
    case 'notifications': return <Notifications />
    case 'reviews': return <Reviews />
    case 'disputes': return <MyDisputes />
    case 'maintenance': return <Maintenance />
    case 'history': return <ActivityHistory />
    case 'trust-score': return <TrustScore />
    case 'settings': return <SettingsSection defaultTab={settingsDefaultTab} onTabConsumed={() => setSettingsDefaultTab('')} />
    default: return <LocataireOverview />
  }
}

function ProprietaireDashboard({ section }: { section: string }) {
  const { selectedItemId, setDashboardSection, setSelectedItemId, settingsDefaultTab, setSettingsDefaultTab } = useAuthStore()

  const goToTenantDetail = (id: string) => {
    setSelectedItemId(id)
    setDashboardSection('tenant-detail')
  }

  const goBackToTenants = () => {
    setSelectedItemId('')
    setDashboardSection('my-tenants')
  }

  switch (section) {
    case 'overview': return <ProprietaireOverview />
    case 'my-properties': return <MyProperties />
    case 'my-tenants': return <TenantsList onDetail={goToTenantDetail} />
    case 'tenant-detail': return <BackableSection sectionKey="tenant-detail" onBack={goBackToTenants}><TenantDetail tenantId={selectedItemId} onBack={goBackToTenants} /></BackableSection>
    case 'visit-requests': return <VisitRequests />
    case 'candidatures': return <EnhancedRentalFiles />
    case 'disputes': return <MyDisputes />
    case 'my-leases': return <EnhancedLeases />
    case 'mandats': return <ProprietaireMandats />
    case 'owner-file': return <BackableSection sectionKey="owner-file" onBack={() => { setSelectedItemId(''); setDashboardSection('candidatures') }}><OwnerFileForm /></BackableSection>
    case 'payments': return <OwnerFinances />
    case 'payment-detail': return <OwnerFinances />
    case 'finances': return <OwnerFinances />
    case 'analytics': return <OwnerAnalytics />
    case 'inventory-report-form': return <InventoryReportForm />
    case 'messages': return <ProprietaireMessages />
    case 'notifications': return <Notifications />
    case 'trust-score': return <TrustScore />
    case 'reviews': return <OwnerReviews />
    case 'maintenance': return <OwnerMaintenance />
    case 'history': return <ActivityHistory />
    case 'settings': return <OwnerSettings defaultTab={settingsDefaultTab} onTabConsumed={() => setSettingsDefaultTab('')} />
    default: return <ProprietaireOverview />
  }
}

function TcDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <TcOverview />
    case 'all-properties': return <AllProperties />
    case 'users': return <TcUsers />
    case 'property-verifications': return <PropertyVerifications />
    case 'property-verify-detail': return <PropertyVerifyDetail />
    case 'inventory-report-form': return <InventoryReportForm />
    case 'dossier-validations': return <DossierValidations />
    case 'rental-files-queue': return <RentalFilesQueue />
    case 'rental-file-detail': return <RentalFileDetail />
    case 'owner-validations': return <OwnerValidations />
    case 'owner-dossiers': return <OwnerDossierValidations />
    case 'agency-validations': return <AgencyValidations />
    case 'inventory-reports': return <InventoryReportsList />
    case 'sla-monitoring': return <SlaMonitoring />
    case 'agents': return <AgentsManagement />
    case 'missions': return <MissionsManagement />
    case 'litiges': return <LitigesManagement />
    case 'messaging': return <TcMessaging />
    case 'certifications': return <CertificationsManagement />
    case 'oneci-verification': return <OneciVerification />
    case 'fraud-alerts': return <FraudAlertsManagement />
    case 'documentation': return <DocumentationCenter />
    case 'notifications': return <Notifications />
    case 'history': return <ActivityHistory />
    case 'settings': return <TcSettings />
    default: return <TcOverview />
  }
}

function AgenceDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <AgenceOverview />
    case 'team': return <TeamManagement />
    case 'portfolio': return <Portfolio />
    case 'mandats': return <AgenceMandats />
    case 'candidatures': return <Candidatures />
    case 'finances': return <AgenceFinances />
    case 'disputes': return <MyDisputes />
    case 'visits': return <AgenceVisits />
    case 'analytics': return <AgenceAnalytics />
    case 'contracts': return <AgenceContracts />
    case 'communication': return <AgenceCommunication />
    case 'marketing': return <AgenceMarketing />
    case 'client-files': return <ClientFiles />
    case 'notifications': return <Notifications />
    case 'settings': return <AgenceSettings />
    case 'security': return <AgenceSecurity />
    default: return <AgenceOverview />
  }
}

function AdminDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <AdminOverview />
    case 'users': return <AdminUsers />
    case 'properties-moderation': return <PropertiesModeration />
    case 'moderation': return <AdminModeration />
    case 'tc-management': return <TcManagement />
    case 'trust-agents': return <AdminTrustAgents />
    case 'signalements': return <AdminSignalements />
    case 'disputes': return <Disputes />
    case 'notifications': return <AdminNotifications />
    case 'reports': return <Reports />
    case 'system': return <AdminSystem />
    case 'security': return <AdminSecurity />
    case 'config': return <AdminConfig />
    case 'backups': return <AdminBackups />
    case 'settings': return <AdminSettings />
    default: return <AdminOverview />
  }
}

export function Dashboard() {
  const { user, dashboardSection } = useAuthStore()

  if (!user) return null

  // Use activeRole for dashboard rendering (allows role switching)
  const effectiveRole = user.activeRole || user.role

  return (
    <DashboardLayout>
      {effectiveRole === 'LOCATAIRE' && <LocataireDashboard section={dashboardSection} />}
      {effectiveRole === 'PROPRIETAIRE' && <ProprietaireDashboard section={dashboardSection} />}
      {effectiveRole === 'AGENCE' && <AgenceDashboard section={dashboardSection} />}
      {effectiveRole === 'TIERS_CONFIANCE' && <TcDashboard section={dashboardSection} />}
      {effectiveRole === 'ADMIN' && <AdminDashboard section={dashboardSection} />}
    </DashboardLayout>
  )
}
