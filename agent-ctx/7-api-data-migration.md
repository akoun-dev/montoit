# Task 7: Migrate property-detail-view.tsx from mock data to API

## Summary
Migrated the property detail view component from hardcoded mock data to fetching data from the `/api/properties/[id]` API endpoint.

## Changes Made

### Removed
- `propertyExtras` object (~157 lines of hardcoded mock data for 8 properties)
- `getPropertyById` function
- Import of nos-biens-view property list for the `getPropertyById` function
- Hardcoded `responseRate` and `responseTime` owner stats from sidebar (not available in API)

### Updated PropertyDetail interface
- Changed `id` from `number` to `string` (Prisma cuid)
- Added: `description`, `rentalStatus`, `currency`, `bathrooms`, `address`, `commune` (nullable), `latitude` (nullable), `longitude` (nullable), `isFurnished`, `hasParking`, `hasGarden`, `hasPool`, `hasGuardian`, `hasClimate`, `amenities` (JSON string), `rentalTerms` (JSON string), `viewsCount`, `createdAt`, `updatedAt`, `ownerId`, `images` array, `owner` nested object
- Removed: `location`, `meuble`, `views`, `lat`, `lng`, `image`, `status` (replaced by `rentalStatus`)

### New types and helpers
- Added `ParsedExtras` interface for derived data from API response
- Added `parseExtras()` helper function that:
  - Parses `amenities` JSON string into string array
  - Parses `rentalTerms` JSON string into modalites object
  - Derives owner name/initials from `firstName`/`lastName`
  - Formats owner joined date from ISO string
  - Maps `property.images` to URL string array
- Added `formatJoinedDate()` helper for French date formatting
- Added `PropertyDetailSkeleton` loading component with animated pulse placeholders

### Main component changes
- Changed `propertyId` prop from `number` to `string`
- Added `useState` for `property`, `loading`, `error`
- Added `useEffect` for fetching from `/api/properties/${propertyId}` with cancellation support
- Loading state shows `PropertyDetailSkeleton`
- Error state shows alert icon with error message and back button
- All field references updated:
  - `property.status` → `property.rentalStatus`
  - `property.meuble` → `property.isFurnished`
  - `property.views` → `property.viewsCount`
  - `property.location` → `property.address`
  - `property.lat`/`property.lng` → `property.latitude`/`property.longitude`
  - `property.image` → `property.images[0]?.url`
  - Sidebar commune display uses `property.commune || property.city`
- Image gallery uses `extras.images` derived from `property.images.map(i => i.url)`
- Empty images shows placeholder with Building2 icon
- Sidebar owner stats (responseRate, responseTime) removed since API doesn't provide them

### Sub-component updates
- `DetailsTab`: uses `ParsedExtras` type, `property.address`, `property.latitude`/`property.longitude` with fallback defaults for map
- `CommoditesTab`: unchanged (already takes `amenities: string[]`)
- `ModalitesTab`: uses `ParsedExtras` type, shows empty state when no rental terms data, conditionally renders sections
- `ContactTab`: uses `ParsedExtras` type, removed responseRate/responseTime display
- `VisitTab`: unchanged (takes `property: PropertyDetail`)
- `ReviewsTab`: unchanged (uses `mockReviews`)
- `ApplyDialog`: uses `ParsedExtras` type, uses `property.images[0]?.url` for thumbnail, `property.address`

### Kept as mock
- `mockReviews` array kept for Reviews tab (no Review/Rating API endpoint yet)

### Lint
- Passes clean with no errors or warnings
