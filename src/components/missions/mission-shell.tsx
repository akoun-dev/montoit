import { Home } from 'lucide-react'

/**
 * Coquille de la page /m/[token] — header simple "MON TOIT / Rapport de mission" + footer.
 * Autonome : AUCUN chrome dashboard, AUCUNE navigation auth (acteur AGENT_TERRAIN sans compte).
 * Mobile-first : conteneur max-w-md, safe-area iOS en bas, skip-link clavier.
 */
export function MissionShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-neutral-50 text-foreground">
      <a
        href="#mission-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-500 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-md items-center gap-2.5 px-4 py-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-white shadow-xs"
          >
            <Home className="size-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-extrabold tracking-wide text-neutral-900">MON&nbsp;TOIT</p>
            <p className="text-xs text-neutral-500">Rapport de mission</p>
          </div>
          <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
            Espace agent
          </span>
        </div>
      </header>

      <main id="mission-main" className="mx-auto w-full max-w-md flex-1 px-4 pb-10 pt-5">
        {children}
      </main>

      <footer className="border-t border-neutral-200 bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] pt-3.5 text-center">
        <p className="text-xs text-neutral-400">
          Mon Toit CI — Tiers de Confiance agréé ANSUT
        </p>
      </footer>
    </div>
  )
}
