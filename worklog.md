# Mon Toit — Worklog

---
Task ID: 1
Agent: Main Agent
Task: Integrate ANSUT Messaging API for OTP SMS and Email in the authentication system

Work Log:
- Analyzed the existing auth system: Zustand store, API routes, Prisma schema, auth components
- Identified current hardcoded OTP code `123456` and lack of real SMS/Email sending
- Added ANSUT API environment variables to `.env` (ANSUT_API_BASE_URL, ANSUT_API_USERNAME, ANSUT_API_PASSWORD, ANSUT_SMS_SENDER, OTP_EXPIRY_MINUTES, OTP_LENGTH)
- Created `src/lib/ansut-messaging.ts` — messaging service utility with:
  - `sendSms()` — sends SMS via POST /api/SendSMS
  - `sendEmail()` — sends Email via POST /api/message/send (channel: "Email")
  - `sendOtpSms()` — sends OTP code by SMS with formatted message
  - `sendOtpEmail()` — sends OTP code by Email with professional HTML template
  - `generateOtpCode()` — generates random 6-digit code
  - `formatPhoneForAnsut()` — formats phone numbers for the ANSUT API (225XXXXXXXXXX)
- Updated Prisma schema: added `PASSWORD_RESET` to `OTPType` enum
- Updated `src/app/api/auth/send-sms-otp/route.ts` — now generates random OTP + sends via ANSUT SMS API
- Created `src/app/api/auth/send-email-otp/route.ts` — generates random OTP + sends via ANSUT Email API
- Created `src/app/api/auth/verify-email-otp/route.ts` — verifies email OTP codes (EMAIL_VERIFY and PASSWORD_RESET types)
- Created `src/app/api/auth/forgot-password/route.ts` — sends password reset OTP via Email or SMS
- Created `src/app/api/auth/reset-password/route.ts` — verifies OTP + resets password with bcrypt
- Updated `src/lib/auth-store.ts` with new state/methods:
  - Added `pendingEmail`, `otpPurpose` state fields
  - Added `AppView` types: 'email-verify', 'forgot-password'
  - Added `OtpPurpose` type: 'login' | 'email_verify' | 'password_reset'
  - Added methods: `sendEmailOtp()`, `verifyEmailOtp()`, `forgotPassword()`, `resetPassword()`, `setOtpPurpose()`
  - Updated `registerWithEmail()` to send email verification after registration
- Updated `src/components/auth/login-form.tsx`:
  - "Mot de passe oublié ?" button now navigates to forgot-password view
  - Removed hardcoded demo OTP hints from SMS section
- Updated `src/components/auth/otp-verify-form.tsx`:
  - Supports both SMS and Email OTP
  - Added countdown timer (60s) for resend cooldown
  - Dynamic labels based on `otpPurpose` (login, email_verify, password_reset)
  - Numeric-only input filtering
- Created `src/components/auth/forgot-password-form.tsx`:
  - 3-step flow: Request → Verify OTP → Reset Password
  - Email/SMS method toggle
  - Password strength validation
- Created `src/components/auth/email-verify-form.tsx`:
  - Dedicated email OTP verification form
  - Countdown timer for resend
  - Supports email_verify and password_reset purposes
- Updated `src/app/page.tsx` — added 'forgot-password' and 'email-verify' view routing

Stage Summary:
- Full ANSUT messaging API integration for both SMS and Email
- OTP codes are now randomly generated (no more hardcoded 123456)
- New auth flows: Email verification, Password reset
- All environment variables configured in .env
- Lint passes, dev server compiles successfully

---
Task ID: 2
Agent: Main Agent
Task: Require OTP verification before login after registration + add Agence role

Work Log:
- Added `AGENCE` to Role enum in Prisma schema, pushed to DB
- Rewrote `src/app/api/auth/register/route.ts`:
  - Removed cookie setting (no auto-login)
  - Sets `isEmailVerified: false` for email method, `isPhoneVerified: false` for SMS
  - Creates and sends OTP directly in the register route
  - Returns `needsVerification: true` with `verificationMethod`
- Updated `src/lib/auth-store.ts`:
  - `registerWithEmail()` → sets `pendingEmail`, `otpPurpose: 'email_verify'`, `currentView: 'email-verify'` (NOT dashboard, NOT authenticated)
  - `registerWithSms()` → sets `pendingPhone`, `otpPurpose: 'login'`, `currentView: 'otp-verify'` (NOT dashboard, NOT authenticated)
  - Added `AGENCE` to AuthUser role type
  - `loginWithEmail()` now handles 403 `needsVerification` → redirects to email-verify
- Rewrote `src/app/api/auth/login/route.ts`:
  - Blocks login if `isEmailVerified: false`
  - Auto-sends verification email and returns 403 with `needsVerification: true`
- Updated `src/components/auth/register-form.tsx`:
  - Added AGENCE role card with Landmark icon
  - Updated toast messages: "Compte créé ! Vérifiez votre email/SMS pour continuer"

Stage Summary:
- Registration now requires OTP verification before any login is possible
- Login route blocks unverified users and auto-sends verification code
- AGENCE role added to DB schema, auth types, and registration form
- Lint passes, dev server compiles successfully

---
Task ID: 3
Agent: Main Agent
Task: Fix 400 Bad Request on registration + fix forgot-password flow + update verify-sms-otp for password reset

Work Log:
- Diagnosed the root cause of the 400/500 error: Prisma Client was caching an old version that didn't recognize the `AGENCE` Role enum value
- Regenerated Prisma Client with `bunx prisma generate` and cleared `.next` cache
- Confirmed AGENCE registration works after regenerating the client
- Updated `src/app/api/auth/login/route.ts`:
  - Added `devCode` to the 403 response for development testing (same as register route)
- Fixed `src/components/auth/forgot-password-form.tsx`:
  - Rewrote to call API directly instead of using the store's `forgotPassword()` method (which was changing the view and replacing the form)
  - Added animated step transitions (slideVariants with AnimatePresence)
  - Added step indicator with 3 steps: Identification → Vérification → Nouveau mot de passe
  - Step 2 (verify) now properly verifies the OTP code via the API before advancing
  - Added resend cooldown timer (60s)
  - Step 3 (reset) calls `/api/auth/reset-password` with verified code
  - Supports both email and SMS methods for password reset
- Updated `src/app/api/auth/verify-sms-otp/route.ts`:
  - Added support for `PASSWORD_RESET` OTP type (previously only handled `LOGIN`)
  - Added `purpose` parameter to the request body
  - Returns `{ valid: true, phone }` for password reset verification
  - Maintains backward compatibility with existing LOGIN flow
- Cleaned up test users from database
- Verified end-to-end flow:
  - AGENCE registration → 200 with `needsVerification: true`
  - Login without verification → 403 with `needsVerification: true`
  - OTP verification → 200 with `isEmailVerified: true`
  - Login after verification → 200 with user data
- Lint passes cleanly

Stage Summary:
- Fixed the AGENCE role 400/500 error (was Prisma Client cache issue)
- Forgot-password form now works as a self-contained 3-step flow without view changes
- SMS OTP verification now supports PASSWORD_RESET type
- Login 403 response now includes devCode for development testing
- Full auth flow verified end-to-end: register → block login → verify OTP → login succeeds
