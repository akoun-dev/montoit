---
Task ID: 1
Agent: main
Task: Fix registration form - terms checkbox not visible and 400 Bad Request error

Work Log:
- Replaced raw `<input type="checkbox">` with shadcn `Checkbox` component for better visibility and styling
- Added a bordered background container around the terms section for better visual prominence
- Updated the register API (`/api/auth/register/route.ts`) to handle re-registration for unverified accounts
  - When an unverified user tries to register again, update their info and re-send OTP instead of returning 400 error
  - Differentiate between verified accounts (error) and unverified accounts (allow re-registration)
- Cleaned up test users from the database
- Verified re-registration works for `aboa.akoun40@gmail.com` (existing unverified user) - returns 200 with devCode

Stage Summary:
- Terms checkbox now uses shadcn Checkbox component with brand-500 styling
- Re-registration for unverified accounts works (200 with new OTP instead of 400 error)
- Server is stable and responding correctly

---
Task ID: 2
Agent: main
Task: Fix session persistence - session lost on page refresh

Work Log:
- Diagnosed root cause: Zustand store was purely in-memory, so on page refresh all state (user, isAuthenticated, currentView) reset to defaults
- Although `checkAuth()` was called in useEffect to restore from cookie, there was a race condition where the home page rendered first before checkAuth completed
- Added `zustand/persist` middleware to persist key auth state to localStorage (`montoit-auth` key)
  - Persisted fields: user, isAuthenticated, currentView, previousView, dashboardSection, selectedPropertyId
  - Transient fields (not persisted): isLoading, isInitialized, pendingPhone, pendingEmail, authMethod, devCode, otpPurpose
- Added `isInitialized` flag to prevent rendering before first auth check completes
  - On first load, `isInitialized: false` → shows loading spinner
  - After `checkAuth()` completes, `isInitialized: true` → shows correct view
- Added `LoadingScreen` component with brand-colored spinner
- Updated `checkAuth()` to:
  - Set `isInitialized: true` in all cases (success, fail, network error)
  - On server 401: clear persisted auth state and redirect to home if on dashboard
  - On network error: don't clear persisted state (might still be valid)
  - On success: update user data from server (keeps data fresh)
- Verified cookie-based session works correctly:
  - Login sets `montoit-user-id` cookie (7 days, httpOnly, sameSite: lax)
  - `/api/auth/me` correctly reads cookie and returns user data
  - Logout correctly clears cookie
- No lint errors

Stage Summary:
- Session now persists across page refreshes using localStorage + server cookie
- No more flash of wrong view on refresh (loading spinner shown during auth check)
- Server-validated session ensures persisted state stays in sync
