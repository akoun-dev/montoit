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
