---
Task ID: 1
Agent: Main
Task: Add Modalités, Commodités, Localisation sections and auth-gated actions to property detail view

Work Log:
- Read and analyzed existing property-detail-view.tsx (~900 lines) with tabs: Détails, Contacter, Visiter, Avis
- Read nos-biens-view.tsx, auth-store.ts, prisma schema, page.tsx for context
- Completely rewrote property-detail-view.tsx with 6 tabs: Détails, Commodités, Modalités, Contacter, Visiter, Avis
- Added Commodités tab with categorized amenities (Confort, Cuisine, Technologie, Espaces extérieurs, Stationnement, Rangements, Divers)
- Added Modalités tab with financial conditions (loyer, caution, charges incluses/non incluses, modes paiement), bail duration, conditions d'entrée, état des lieux
- Enhanced Localisation section in Détails tab with embedded Leaflet mini-map showing property marker + Google Maps directions link
- Added auth-gated actions: favorites (heart button), visit scheduling (Visiter tab), candidature submission (Soumettre ma candidature button)
- Created AuthGateDialog component for prompting login when auth-required actions are attempted
- Created ApplyDialog component for property application with employment type, income, and motivation letter
- Added MiniMap component with Leaflet integration for location display
- Updated nos-biens-view.tsx to add auth checks on favorite buttons (PropertyCard, PropertyListItem, MapListItem)
- All auth-gated actions redirect to login page or show auth dialog

Stage Summary:
- property-detail-view.tsx fully rewritten with all new sections
- 6 tabs: Détails (features + description + map), Commodités (amenities), Modalités (rental terms), Contacter (owner contact), Visiter (physical/virtual visit), Avis (reviews)
- Auth-gated: favorites, visit scheduling, candidature submission
- Mini-map with Leaflet showing property location + directions link
- nos-biens-view.tsx updated with auth checks on favorite buttons
- Lint passes clean, dev server running correctly
