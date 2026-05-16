---
Task ID: 1
Agent: Main
Task: Implement comprehensive Dossier Locataire/Propriétaire system with tenant categories, document uploads, and seed data

Work Log:
- Updated Prisma schema: Added TenantCategory enum (SALARIE, ENTREPRENEUR, ETUDIANT), expanded DocumentType enum with 10 new types (WORK_CERTIFICATE, GUARANTOR_INCOME_PROOF, PARENT_ADDRESS_PROOF, RCCM_REGISTRATION, TAX_DECLARATION, SCHOOL_CERTIFICATE, SCHOLARSHIP_CERTIFICATE, PROPERTY_TITLE, UTILITY_BILL, BANK_ACCOUNT_DETAILS), added tenantCategory field to RentalFile
- Created document upload API routes: /api/rental-file/documents (POST/DELETE) and /api/owner-file/documents (POST/DELETE)
- Updated /api/rental-file route to handle tenantCategory
- Simplified /api/owner-file route (removed irrelevant employment/guarantor fields from POST)
- Completely rewrote rental-file.tsx: 4-step form with tenant category selection (Salarié, Entrepreneur, Étudiant), dynamic document requirements per category, actual file upload with base64 encoding, delete/replace documents, progress indicator, required/optional badges
- Completely rewrote owner-file.tsx: 2-step form with personal info + 4 owner-specific documents (ID, Titre de propriété, Facture CIE/SODECI, RIB), actual file upload, delete/replace documents, progress indicator
- Added "Mon dossier" sidebar entry for LOCATAIRE role
- Updated seed data: Added rental file with SALARIÉ category and 3 documents for locataire@montoit.ci, owner file with 4 documents for proprietaire@montoit.ci, active lease with 12 payments, maintenance request, set activeRole defaults

Stage Summary:
- Locataire dossier supports 3 tenant categories with specific document requirements
- Propriétaire dossier simplified to 4 essential documents
- Document upload is fully functional (base64, max 5MB, replace/delete)
- Seed data includes complete lease/payment data for locataire@montoit.ci
- All lint checks pass, dev server running on port 3000
