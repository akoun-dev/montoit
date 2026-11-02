import type { Metadata } from 'next'

import { MissionReportForm } from '@/components/missions/mission-report-form'

/**
 * Page publique /m/[token] — rapport de mission de l'agent de terrain (AGENT_TERRAIN, sans compte).
 *
 * - Autonome : hérite uniquement du layout racine (QueryProvider global). Le dashboard est une SPA
 *   dans src/app/page.tsx — aucune sidebar/auth ne peut s'appliquer à /m/*.
 * - Hors middleware : `PROTECTED_API_PREFIXES` ne couvre que /api/** (spec TC-001 §7) — ne PAS
 *   "corriger" ça par erreur.
 * - Server component minimal : le token est passé tel quel au composant client.
 */

export const metadata: Metadata = {
  title: 'Rapport de mission — Mon Toit',
  description:
    'Rendez compte de votre mission : points de contrôle, photos et observations — sans compte, depuis votre téléphone.',
  // Les URLs à token ne doivent jamais être indexées.
  robots: { index: false, follow: false },
}

export default async function MissionTokenPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <MissionReportForm token={token} />
}
