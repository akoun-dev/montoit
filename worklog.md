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
