// Pages exportées par module avec alias pour éviter les conflits

// Admin pages
export { default as AdminDashboardPage } from './admin/DashboardPage';
export { default as UsersPage } from './admin/UsersPage';
export { default as UserRolesPage } from './admin/UserRolesPage';
export { default as ApiKeysPage } from './admin/ApiKeysPage';
export { default as BusinessRulesPage } from './admin/BusinessRulesPage';
export { default as CEVManagementPage } from './admin/CEVManagementPage';
export { default as TrustAgentsPage } from './admin/TrustAgentsPage';
export { default as AnalyticsPage } from './admin/AnalyticsPage';
export { default as PropertiesPage } from './admin/PropertiesPage';
export { default as TransactionsPage } from './admin/TransactionsPage';
export { default as ServiceMonitoringPage } from './admin/ServiceMonitoringPage';
export { default as LogsPage } from './admin/LogsPage';
export { default as ServiceProvidersPage } from './admin/ServiceProvidersPage';
export { default as ServiceConfigurationPage } from './admin/ServiceConfigurationPage';
export { default as DataGeneratorPage } from './admin/DataGeneratorPage';
export { default as FeatureFlagsPage } from './admin/FeatureFlagsPage';

// Agency pages
export { default as AgencyDashboardPage } from './agency/DashboardPage';
export { default as MandateDetailPage } from './agency/MandateDetailPage';
export { default as MyMandatesPage } from './agency/MyMandatesPage';
export { default as SignMandatePage } from './agency/SignMandatePage';

// Auth pages
export { default as AboutPage } from './auth/AboutPage';
export { default as CallbackPage } from './auth/CallbackPage';
export { default as ForgotPasswordPage } from './auth/ForgotPasswordPage';
export { default as HowItWorksPage } from './auth/HowItWorksPage';
export { default as ModernAuthPage } from './auth/ModernAuthPage';
export { default as PrivacyPolicyPage } from './auth/PrivacyPolicyPage';
export { default as ProfileSelectionPage } from './auth/ProfileSelectionPage';
export { default as TermsOfServicePage } from './auth/TermsOfServicePage';

// Dashboard pages
export { default as UnifiedDashboardPage } from './dashboard/UnifiedDashboardPage';

// Messaging pages
export { default as MessagesPage } from './messaging/MessagesPage';

// Owner pages
export { default as OwnerDashboardPage } from './owner/DashboardPage';
export { default as AddPropertyPage } from './owner/AddPropertyPage';
export { default as CreateContractPage } from './owner/CreateContractPage';
export { default as OwnerApplicationsPage } from './owner/OwnerApplicationsPage';
export { default as OwnerContractsPage } from './owner/OwnerContractsPage';

// Public pages (located in auth folder)
export { default as ContactPage } from './auth/ContactPage';
export { default as FAQPage } from './auth/FAQPage';
export { default as HelpPage } from './auth/HelpPage';
// Note: AddPropertyPage est déjà exporté depuis owner, donc on l'omet ici

// Tenant pages
export { default as TenantDashboardPage } from './tenant/DashboardPage';
export { default as CalendarPage } from './tenant/CalendarPage';
export { default as MyApplicationsPage } from './tenant/MyApplicationsPage';
export { default as MyContractsPage } from './tenant/MyContractsPage';
export { default as MyVisitsPage } from './tenant/MyVisitsPage';
export { default as PaymentHistoryPage } from './tenant/PaymentHistoryPage';
export { default as ProfilePage } from './tenant/ProfilePage';
export { default as PropertyDetailPage } from './tenant/PropertyDetailPage';
export { default as ScheduleVisitPage } from './tenant/ScheduleVisitPage';
export { default as ScorePage } from './tenant/ScorePage';
export { default as SearchPropertiesPage } from './tenant/SearchPropertiesPage';

// Trust Agent pages
export { default as TrustAgentDashboardPage } from './trust-agent/DashboardPage';
export { default as TrustAgentCalendarPage } from './trust-agent/CalendarPage';
export { default as CertificationHistoryPage } from './trust-agent/CertificationHistoryPage';
export { default as DocumentValidationPage } from './trust-agent/DocumentValidationPage';
export { default as EtatDesLieuxPage } from './trust-agent/EtatDesLieuxPage';
export { default as MissionDetailPage } from './trust-agent/MissionDetailPage';
export { default as MissionsListPage } from './trust-agent/MissionsListPage';
export { default as PhotoVerificationPage } from './trust-agent/PhotoVerificationPage';
export { default as PropertyCertificationPage } from './trust-agent/PropertyCertificationPage';
export { default as UserCertificationPage } from './trust-agent/UserCertificationPage';
