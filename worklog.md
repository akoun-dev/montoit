---
Task ID: 1
Agent: Main
Task: Add detail views for Mes Paiements, Mes Candidatures, Mes Visites, Mes Baux + mobile bottom nav + responsive fixes

Work Log:
- Created mobile bottom tab navigation (MobileBottomNav) with 5 tabs: Espace, Chercher, Dossiers, Visites, Paiements
- Updated DashboardLayout to include bottom nav and mobile bottom padding (pb-20 lg:pb-6)
- Added safe-area-bottom CSS utility for iOS safe areas
- Added selectedItemId to auth store for detail view navigation
- Created 4 new detail view components:
  - PaymentDetail (payment-detail.tsx): Full payment details with lease info, property, owner, status
  - ApplicationDetail (application-detail.tsx): Full candidature details with timeline, documents, guarantor, TC comments
  - VisitDetail (visit-detail.tsx): Full visit details with date/time, counter-proposals, property info
  - LeaseDetail (lease-detail.tsx): Full lease details with metrics, contract details, signatures, payments, maintenance
- Created 4 new API routes for individual item details:
  - GET /api/payments/[id] - Single payment with full lease/property/owner data
  - GET /api/applications/[id] - Single rental file with timeline, documents, property
  - GET /api/visits/[id] - Single visit request with property details
  - GET /api/leases/[id] - Single lease with property, owner, payments, maintenance
- Updated list views to support onDetail callbacks for navigation:
  - Payments: Cards now clickable, show ChevronRight indicator
  - Applications: Cards now clickable, timeline hidden on mobile for space
  - MyVisits: Cards now clickable with ChevronRight
  - MyLeases: Cards now clickable with ChevronRight
- Updated LocataireDashboard switch to handle detail section routing
- Added detailToParent mapping in sidebar and bottom nav for correct active tab highlighting
- All views use responsive classes (grid-cols-1 sm:grid-cols-2, etc.)
- Updated dashboard-layout to include mobile bottom padding

Stage Summary:
- All 4 sections now have dedicated detail views (not modals)
- Mobile bottom navigation provides quick access to main sections
- Detail views use proper single-item API endpoints
- Sidebar and bottom nav correctly highlight parent section when viewing details
- All views are mobile responsive with proper spacing and layout
