'use client'

import { useAuthStore } from '@/lib/auth-store'
import { DashboardLayout } from './dashboard-layout'
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
import { ProprietaireRentalFiles } from './proprietaire/rental-files'
import { ProprietaireLeases } from './proprietaire/my-leases'
import { ProprietaireMessages } from './proprietaire/messages'
import { TcOverview } from './tc/overview'
import { RentalFilesQueue } from './tc/rental-files-queue'
import { OwnerValidations } from './tc/owner-validations'
import { AgencyValidations } from './tc/agency-validations'
import { SlaMonitoring } from './tc/sla-monitoring'
import { AdminOverview } from './admin/overview'
import { AdminUsers } from './admin/users'
import { PropertiesModeration } from './admin/properties-moderation'
import { TcManagement } from './admin/tc-management'
import { Disputes } from './admin/disputes'
import { Reports } from './admin/reports'
import { AdminSettings } from './admin/settings'

function LocataireDashboard({ section }: { section: string }) {
  const { selectedItemId, setDashboardSection, setSelectedItemId } = useAuthStore()

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

  switch (section) {
    case 'overview': return <LocataireOverview />
    case 'search-properties': return <SearchProperties />
    case 'favorites': return <Favorites />
    case 'applications': return <Applications onDetail={goToApplicationDetail} />
    case 'application-detail': return <ApplicationDetail applicationId={selectedItemId} onBack={goBackToApplications} onEditRentalFile={goToRentalFile} />
    case 'rental-file': return <RentalFileForm />
    case 'my-visits': return <MyVisits onDetail={goToVisitDetail} />
    case 'visit-detail': return <VisitDetail visitId={selectedItemId} onBack={goBackToVisits} />
    case 'my-leases': return <MyLeases onDetail={goToLeaseDetail} />
    case 'lease-detail': return <LeaseDetail leaseId={selectedItemId} onBack={goBackToLeases} />
    case 'payments': return <Payments onDetail={goToPaymentDetail} />
    case 'payment-detail': return <PaymentDetail paymentId={selectedItemId} onBack={goBackToPayments} />
    case 'messages': return <Messages />
    case 'notifications': return <Notifications />
    case 'reviews': return <Reviews />
    case 'maintenance': return <Maintenance />
    case 'history': return <ActivityHistory />
    case 'trust-score': return <TrustScore />
    case 'settings': return <SettingsSection />
    default: return <LocataireOverview />
  }
}

function ProprietaireDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <ProprietaireOverview />
    case 'my-properties': return <MyProperties />
    case 'visit-requests': return <VisitRequests />
    case 'rental-files': return <ProprietaireRentalFiles />
    case 'my-leases': return <ProprietaireLeases />
    case 'payments': return <Payments onDetail={() => {}} />
    case 'messages': return <ProprietaireMessages />
    case 'notifications': return <Notifications />
    case 'reviews': return <Reviews />
    case 'maintenance': return <Maintenance />
    case 'history': return <ActivityHistory />
    case 'settings': return <SettingsSection />
    default: return <ProprietaireOverview />
  }
}

function TcDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <TcOverview />
    case 'rental-files-queue': return <RentalFilesQueue />
    case 'owner-validations': return <OwnerValidations />
    case 'agency-validations': return <AgencyValidations />
    case 'sla-monitoring': return <SlaMonitoring />
    case 'notifications': return <Notifications />
    case 'history': return <ActivityHistory />
    case 'settings': return <SettingsSection />
    default: return <TcOverview />
  }
}

function AdminDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <AdminOverview />
    case 'users': return <AdminUsers />
    case 'properties-moderation': return <PropertiesModeration />
    case 'tc-management': return <TcManagement />
    case 'disputes': return <Disputes />
    case 'reports': return <Reports />
    case 'notifications': return <Notifications />
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
      {(effectiveRole === 'PROPRIETAIRE' || effectiveRole === 'AGENCE') && <ProprietaireDashboard section={dashboardSection} />}
      {effectiveRole === 'TIERS_CONFIANCE' && <TcDashboard section={dashboardSection} />}
      {effectiveRole === 'ADMIN' && <AdminDashboard section={dashboardSection} />}
    </DashboardLayout>
  )
}
