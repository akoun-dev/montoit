---
Task ID: 4-11
Agent: frontend-developer
Task: Update ALL tenant (locataire) frontend components to use real API data instead of mocks

Work Log:
- Read worklog.md to understand prior work (Tasks 1-17)
- Analyzed all 8 existing mock components in `/src/components/dashboard/locataire/`
- Analyzed all API route response shapes to map correctly
- Followed the pattern from `favorites.tsx` (authFetch + useCallback + useState + error/loading states)

1. **notifications.tsx** — Complete rewrite:
   - Fetches from `/api/notifications` with type filter support
   - Shows real notification items with type-specific icons (MessageSquare, FileText, Calendar, CreditCard, Megaphone, Settings)
   - Click-to-mark-as-read (PUT /api/notifications with notificationIds)
   - "Tout marquer lu" button (PUT with markAllRead: true)
   - Unread count badge in header
   - Category filter badges (Toutes, Messages, Candidatures, Visites, Paiements, Système)
   - Time-ago formatting (À l'instant, Il y a X min, Xh, Xj)
   - Unread notifications highlighted with brand-50 background and dot indicator
   - Empty state when no notifications

2. **payments.tsx** — Complete rewrite:
   - Fetches from `/api/payments` for payments list + stats
   - Shows stats cards: next payment due (with date), total paid (with count), late payments (red if >0)
   - Payment list with status badges (PAID=emerald, PENDING=amber, LATE=red, PARTIAL=cyan)
   - Shows amount, due date, paid date, reference, property info
   - Empty state when no payments

3. **reviews.tsx** — Complete rewrite:
   - Fetches from `/api/reviews` for given/received ratings + stats
   - Stats cards: count given, average score received with star display
   - Tab toggle between "Avis donnés" and "Avis reçus"
   - Rating cards with user avatar, stars, comment, property badge, date
   - Empty state per tab

4. **history.tsx** — Complete rewrite:
   - Fetches from `/api/history` for audit logs
   - Timeline visual with action-type icons (CheckCircle2 for CREATE/VERIFY, Settings for UPDATE, Clock for SUBMIT, etc.)
   - Entity badges (Profil, Dossier locatif, Maintenance, etc.)
   - Action badges color-coded (green for CREATE, amber for UPDATE, brand for SUBMIT)
   - First item highlighted with brand color
   - Empty state when no logs

5. **applications.tsx** — Complete rewrite:
   - Fetches from `/api/applications` for rental files with status tracking
   - Shows application cards with property image, status badge, status timeline (Brouillon→Soumis→Examen TC→Validé)
   - Document progress bar (validated/total)
   - Rejection reason display (red box with AlertCircle)
   - "Compléter le dossier" button for DRAFT status → navigates to rental-file section
   - How-it-works card when no applications
   - Create dossier button in empty state

6. **maintenance.tsx** — Complete rewrite:
   - Fetches from `/api/maintenance` for requests + stats
   - Stats cards: En attente (amber), En cours (brand), Résolues (emerald)
   - Request cards with priority badge (LOW/MEDIUM/HIGH/URGENT) and status badge
   - URGENT priority shows AlertTriangle icon in red
   - "Nouvelle demande" button opens Dialog with form:
     - Lease selector (fetched from /api/dashboard/locataire activeLeases)
     - Title, description, priority inputs
     - Form validation and POST to /api/maintenance
     - Success/error toast feedback
   - Empty state with "Nouvelle demande" CTA

7. **rental-file.tsx** — Complete rewrite:
   - Fetches existing rental files from `/api/rental-file` on mount
   - If DRAFT exists, loads it into the form fields
   - "Sauvegarder" button saves draft (POST without submit flag)
   - "Soumettre le dossier" button submits (POST with submit: true)
   - Status banner showing current file status (VALIDATED=green, REJECTED=red, SUBMITTED=amber)
   - Rejection reason and TC comment display
   - Read-only mode when file is not DRAFT (all fields disabled)
   - Document upload placeholders with existing document status badges
   - Valid until date display

8. **search-properties.tsx** — Complete rewrite:
   - Real search using `/api/properties` (public endpoint, uses raw fetch not authFetch)
   - Search input, city filter, min/max price inputs (all enabled)
   - Enter key triggers search
   - Results grid with property cards (image, rental status badge, verified badge)
   - Click property card → navigates to property detail
   - Result count display
   - Empty result state with "Voir tous les biens" button
   - Initial empty state with "Voir les biens" button

UI consistency across all components:
- Orange (#FF6C2F) brand color, NO blue/indigo
- Loading skeleton states with pulse animation
- Error card with amber styling
- Empty states with icon + name + CTA
- All text in French
- framer-motion animations (containerVariants/itemVariants)
- authFetch pattern with isAuthenticated guard and AuthError 401 silent handling
- Responsive design (grid cols adapt: 1→2→3)

Fixed issues:
- maintenance.tsx: No `/api/leases/my-leases` route exists → changed to fetch activeLeases from `/api/dashboard/locataire`
- search-properties.tsx: `/api/properties` is public → changed from authFetch to raw fetch, removed unused imports (Heart, PropertiesResponse, isAuthenticated)

Lint: 0 errors, 0 warnings

Stage Summary:
- All 8 tenant components now use real API data instead of mocks
- Full CRUD: notifications (mark read), maintenance (create), rental-file (save draft + submit)
- Consistent UI pattern: loading skeleton → error state → empty state → data display
- All API responses properly mapped (data field, stats, pagination)
- No lint errors
