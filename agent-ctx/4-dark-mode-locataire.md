# Task 4: Fix Hardcoded Light-Mode Colors for Dark Mode Compatibility

## Agent: Dark Mode Fix Agent

## Summary
Fixed all hardcoded light-mode colors in 19 files under `/home/z/my-project/src/components/dashboard/locataire/` to use semantic Tailwind CSS tokens that adapt to dark mode via CSS custom properties.

## Replacements Applied
All replacements from the task specification were applied in the correct order:

1. **Combined pattern first**: `bg-neutral-50 text-neutral-500 border-neutral-200` → `bg-muted text-muted-foreground border-border`
2. **Opacity variants**: `bg-white/90` → `bg-card/90`, `bg-white/95` → `bg-card/95`
3. **Hover states**: `hover:bg-white` → `hover:bg-card`, `hover:bg-neutral-50` → `hover:bg-accent`
4. **Backgrounds**: `bg-white` → `bg-card`, `bg-neutral-50/50` → `bg-muted/50`, `bg-neutral-100` → `bg-muted`, `bg-neutral-50` → `bg-muted`
5. **Text colors**: `text-neutral-900/800/700` → `text-foreground`, `text-neutral-600/500/400` → `text-muted-foreground`
6. **Borders**: `border-neutral-300/200/100` → `border-border`
7. **Bonus**: `hover:bg-neutral-200` → `hover:bg-accent` in reviews.tsx

## Exceptions Preserved
- Status badge colors with intentional fixed colors (amber, green, red, brand, purple)
- `text-white` kept as-is
- SVG stroke attributes kept as-is
- `bg-neutral-200` and `text-neutral-300` not in replacement rules, kept as-is

## Verification
- Zero remaining hardcoded neutral/white patterns from the replacement rules
- No new lint errors introduced
- Dev server compiling and serving pages correctly
