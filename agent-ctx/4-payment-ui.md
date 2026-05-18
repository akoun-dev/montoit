# Task 4 - Payment Frontend UI

## Summary

Created complete payment frontend UI for the Mon Toit real estate app's locataire dashboard with 4 mobile money operators support.

## Files Created/Modified

### 1. NEW: `/home/z/my-project/src/components/dashboard/locataire/payment-dialog.tsx`
- 4-step payment dialog flow:
  - **Step 1 - Select Operator**: 2x2 grid with Orange Money, MTN MoMo, Moov Money, Wave operator cards (logos from `/payment-operators/`)
  - **Step 2 - Enter Phone Number**: Phone input with +225 prefix, 10-digit validation, amount display, confirm button
  - **Step 3 - Processing**: Animated spinner, auto-polling payment status every 5s for up to 2 minutes, manual "Vérifier le statut" button on timeout
  - **Step 4 - Success**: Green checkmark animation, amount + reference display, close button
- Uses `authFetch` for API calls (`POST /api/payments/initiate`, `GET /api/payments/[id]`)
- Uses `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `Button`, `Input` from shadcn/ui
- Responsive: `sm:max-w-md` on DialogContent, 2x2 grid on operator selection
- Framer Motion animations for step transitions

### 2. REWRITTEN: `/home/z/my-project/src/components/dashboard/locataire/payments.tsx`
- Stats cards: Prochain paiement, Total payé, Paiements en retard (responsive `grid-cols-1 sm:grid-cols-3`)
- Filter tabs: Tous, En attente, En cours, Payés, En retard (horizontal scrollable pills)
- Payment cards with: amount, due date, status badge, property name, owner name, payment method badge
- PENDING payments: "Payer" button that opens PaymentDialog
- PROCESSING payments: Spinning indicator with "En cours de traitement"
- PAID payments: Payment method badge and reference display
- LATE payments: "Payer maintenant" destructive button
- Payment method badge colors: ORANGE_MONEY (orange), MTN_MOMO (yellow), MOOV_MONEY (blue), WAVE (indigo)
- Empty state per filter
- Loading skeleton
- `text-xl sm:text-2xl` headings

### 3. REWRITTEN: `/home/z/my-project/src/components/dashboard/locataire/payment-detail.tsx`
- Back button to payments list
- Large amount display (text-2xl sm:text-3xl) with status badge
- Property info card (image + title + address)
- Lease info (monthly rent, charges, dates)
- Owner info card
- Payment timeline: Created → Processing → Paid (with visual step indicators)
- PENDING/LATE payments: Big "Payer maintenant" button (opens PaymentDialog)
- PROCESSING payments: Animated spinner with "Vérifier le statut" refresh button
- PAID payments: Green checkmark, receipt download, payment method & reference display
- Responsive layout (single column mobile, grid desktop)
- Receipt download includes payment method info

### 4. VERIFIED: `/home/z/my-project/src/components/dashboard/index.tsx`
- Already has proper imports for `Payments` and `PaymentDetail`
- No changes needed — PaymentDialog is used internally by the two components

## Key Design Decisions
- Dialog uses `sm:max-w-md` (not bare `max-w-*`) per styling rules
- All grids use mobile-first responsive patterns (`grid-cols-1 sm:grid-cols-2` or `grid-cols-1 sm:grid-cols-3`)
- Headings use `text-xl sm:text-2xl`
- `cn()` utility used for conditional classnames
- All buttons have loading states with disabled + spinner
- Images have proper alt text
- Auto-polling with `setInterval` + `setTimeout` for 2-minute timeout
- Cleanup on dialog close/unmount
