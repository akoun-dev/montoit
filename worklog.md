---
Task ID: 8
Agent: Main
Task: Remove all hardcoded mock data, make hero stats and properties come from DB

Work Log:
- Audited entire codebase for hardcoded mock data using grep and file reading
- Found remaining issues: (1) stats API had hardcoded satisfactionRate=98, (2) property-detail-view.tsx had mockReviews array, (3) hero and nos-biens had hardcoded commune/property type lists
- Updated /api/stats/route.ts: replaced hardcoded satisfactionRate=98 with computation from Rating table (aggregate avg score converted to percentage, 0% when no ratings)
- Added communes and propertyTypes fields to stats API response (distinct values from DB for dynamic filter options)
- Created /api/properties/reviews/route.ts: fetches reviews for a property from DB via Rating table, returns reviews array, avgRating, and totalReviews
- Updated property-detail-view.tsx: removed mockReviews array, added Review interface, added reviews/avgRating/totalReviews state with API fetch, updated ReviewsTab to use API data instead of mocks, added empty state for no reviews
- Updated hero.tsx: extended Stats interface with communes and propertyTypes arrays, replaced hardcoded SelectItem options with dynamic values from stats API
- Updated nos-biens-view.tsx: removed hardcoded propertyTypes and communes constants, added state variables for dynamic filter options, fetched from stats API in parallel with properties, passed through FilterSidebarProps
- All lint checks pass clean
- Verified all API endpoints return correct data from database

Stage Summary:
- Zero hardcoded mock data remaining in the codebase
- satisfactionRate now computed from Rating table (was hardcoded 98)
- Reviews fetched from DB via /api/properties/reviews API (was mockReviews array)
- Hero search dropdowns populated dynamically from DB (was hardcoded city/type lists)
- Nos-biens filter options populated dynamically from DB (was hardcoded constants)
- All data flows: Frontend → API → Prisma → SQLite
