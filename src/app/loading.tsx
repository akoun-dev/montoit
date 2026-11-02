import { Home } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5">
        {/* Logo + spinner */}
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-neutral-200 border-t-brand-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-3 rounded-full bg-brand-500/30 animate-pulse" />
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <Home className="size-4 text-brand-500" />
            <span className="text-sm font-semibold text-brand-500">MON TOIT</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Chargement...
          </p>
        </div>
      </div>
    </div>
  )
}
