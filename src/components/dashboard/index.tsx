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
import { ProprietaireOverview } from './proprietaire/overview'
import { MyProperties } from './proprietaire/my-properties'
import { AddProperty } from './proprietaire/add-property'
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
  switch (section) {
    case 'overview': return <LocataireOverview />
    case 'search-properties': return <SearchProperties />
    case 'favorites': return <Favorites />
    case 'applications': return <Applications />
    case 'rental-file': return <RentalFileForm />
    case 'my-visits': return <MyVisits />
    case 'my-leases': return <MyLeases />
    case 'payments': return <Payments />
    case 'messages': return <Messages />
    case 'notifications': return <Notifications />
    case 'reviews': return <Reviews />
    case 'maintenance': return <Maintenance />
    case 'history': return <ActivityHistory />
    case 'settings': return <SettingsSection />
    default: return <LocataireOverview />
  }
}

function ProprietaireDashboard({ section }: { section: string }) {
  switch (section) {
    case 'overview': return <ProprietaireOverview />
    case 'my-properties': return <MyProperties />
    case 'add-property': return <AddProperty />
    case 'visit-requests': return <VisitRequests />
    case 'rental-files': return <ProprietaireRentalFiles />
    case 'my-leases': return <ProprietaireLeases />
    case 'payments': return <Payments />
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

  return (
    <DashboardLayout>
      {user.role === 'LOCATAIRE' && <LocataireDashboard section={dashboardSection} />}
      {(user.role === 'PROPRIETAIRE' || user.role === 'AGENCE') && <ProprietaireDashboard section={dashboardSection} />}
      {user.role === 'TIERS_CONFIANCE' && <TcDashboard section={dashboardSection} />}
      {user.role === 'ADMIN' && <AdminDashboard section={dashboardSection} />}
    </DashboardLayout>
  )
}
