# Task 7: Fix Hardcoded Light-Mode Colors in Auth Components

## Summary
Fixed all hardcoded light-mode colors in 5 auth component files under `/home/z/my-project/src/components/auth/` for dark mode compatibility by replacing them with semantic Tailwind CSS tokens.

## Files Modified
1. **login-form.tsx** - 9 replacement operations
2. **register-form.tsx** - 12 replacement operations  
3. **forgot-password-form.tsx** - 9 replacement operations
4. **otp-verify-form.tsx** - 5 replacement operations
5. **email-verify-form.tsx** - 5 replacement operations

## Replacements Applied
| Hardcoded | Replace With | Count |
|---|---|---|
| `bg-neutral-50` (page bg) | `bg-background` | 5 |
| `bg-neutral-50` (subtle fill) | `bg-muted` | 4 |
| `bg-white` (tab button) | `bg-background` | 6 |
| `bg-white` (card) | `bg-card` | 1 |
| `bg-neutral-100` | `bg-muted` | 1 |
| `text-neutral-900` | `text-foreground` | 5 |
| `text-neutral-800` | `text-foreground` | 2 |
| `text-neutral-700` | `text-foreground` | 6 |
| `text-neutral-600` | `text-muted-foreground` | 5 |
| `text-neutral-500` | `text-muted-foreground` | 13 |
| `hover:text-neutral-700` | `hover:text-foreground` | 8 |
| `hover:text-neutral-600` | `hover:text-muted-foreground` | 4 |
| `border-neutral-200` | `border-border` | 5 (cards) + 4 (containers) |

## Preserved (Not In Rules Table)
- `text-neutral-400` - Used for input icons, lighter hint text
- `bg-neutral-200` - Used for step indicators, password strength empty bars
- `border-neutral-300` - Used for unselected role card radio borders
- Brand colors (bg-brand-*, text-brand-*, border-brand-*)
- Status colors (green/red/amber/emerald)
- `text-white`
- Amber-themed dev code display blocks

## Lint Result
No new lint errors introduced. Pre-existing lint errors in theme-toggle.tsx are unrelated.
