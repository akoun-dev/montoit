# Task 2 - TC Settings Component

## Summary
Created a dedicated TC (Tiers de Confiance) settings component that removes all scoring, ONECI, KYC, NNI, and role switching features.

## Files Created
- `src/components/dashboard/tc/settings.tsx` - New `TcSettings` component

## Files Modified
- `src/components/dashboard/index.tsx` - Added TcSettings import, updated TcDashboard to use TcSettings instead of SettingsSection
- `worklog.md` - Appended work record

## What was removed from TC settings
- Scoring tab and Trust Score display
- ONECI verification section
- KYC verification modal (NeoFace)
- NNI and birthDate fields
- Role switching button
- Profile completion summary card
- Scoring API fetch
- Profile sharing section

## What was kept
- Profile tab: firstName, lastName, phone, city, gender, email (read-only)
- Security tab: password change, email/phone verification status, session management
- Notifications tab: all notification preference toggles
- Avatar upload/delete functionality
- All framer-motion animations and brand orange styling
