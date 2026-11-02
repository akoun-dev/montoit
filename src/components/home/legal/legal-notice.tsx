'use client'

import { motion } from 'framer-motion'
import { Scale } from 'lucide-react'

export function LegalNoticePage() {
  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-14"
        >
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-brand-50 text-brand-500 mb-5">
            <Scale className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Mentions Légales
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Dernière mise à jour : 1er juin 2025
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="prose prose-sm sm:prose-base max-w-none text-muted-foreground space-y-6"
        >
          <h2 className="text-lg font-semibold text-foreground">1. Éditeur de la Plateforme</h2>
          <div className="pl-4 border-l-2 border-brand-200 bg-brand-50/50 p-3 rounded-lg text-sm space-y-1">
            <p><strong>Agence Nationale de la Sécurité et de l&apos;Utilisation du Trust (ANSUT)</strong></p>
            <p>Riviera Palmeraie, Abidjan</p>
            <p>Côte d&apos;Ivoire</p>
            <p>Email : contact@montoit.ci</p>
            <p>Téléphone : +225 01 02 03 04 05</p>
          </div>

          <h2 className="text-lg font-semibold text-foreground">2. Directeur de la Publication</h2>
          <p>
            Le Directeur de la publication est le Directeur Général de l&apos;ANSUT,
            représentant légal de l&apos;agence.
          </p>

          <h2 className="text-lg font-semibold text-foreground">3. Hébergement</h2>
          <div className="pl-4 border-l-2 border-brand-200 bg-brand-50/50 p-3 rounded-lg text-sm space-y-1">
            <p><strong>Supabase Inc.</strong></p>
            <p>970 Toa Payoh North, #07-04</p>
            <p>Singapour 318995</p>
            <p>La Plateforme utilise également les services d&apos;infrastructure de :</p>
            <p><strong>Vercel Inc.</strong> &mdash; 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</p>
          </div>

          <h2 className="text-lg font-semibold text-foreground">4. Propriété Intellectuelle</h2>
          <p>
            L&apos;ensemble des éléments composant la Plateforme Mon Toit (textes, graphismes,
            logos, icônes, code source, base de données) est la propriété exclusive de
            l&apos;ANSUT, sauf indication contraire. Toute reproduction, représentation,
            modification ou exploitation, totale ou partielle, est interdite sans
            autorisation préalable écrite de l&apos;ANSUT.
          </p>

          <h2 className="text-lg font-semibold text-foreground">5. Données Personnelles</h2>
          <p>
            Conformément à la réglementation ivoirienne sur la protection des données
            à caractère personnel, les utilisateurs disposent d&apos;un droit d&apos;accès, de
            rectification et de suppression de leurs données. Pour plus d&apos;informations,
            consultez notre <strong>Politique de confidentialité</strong>.
          </p>

          <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
          <p>
            La Plateforme utilise des cookies fonctionnels nécessaires à son bon
            fonctionnement. En naviguant sur la Plateforme, vous acceptez l&apos;utilisation
            de ces cookies. Vous pouvez configurer vos préférences dans les paramètres
            de votre navigateur.
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Responsabilité</h2>
          <p>
            L&apos;ANSUT s&apos;efforce d&apos;assurer l&apos;exactitude et la mise à jour des informations
            diffusées sur la Plateforme. Cependant, l&apos;ANSUT ne saurait garantir
            l&apos;exhaustivité ou l&apos;absence de modification par un tiers. L&apos;ANSUT décline
            toute responsabilité en cas de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dommages directs ou indirects résultant de l&apos;utilisation de la Plateforme.</li>
            <li>Interruption temporaire du service pour maintenance ou mise à jour.</li>
            <li>Contenus publiés par les utilisateurs (annonces, messages, documents).</li>
            <li>Liens hypertextes renvoyant vers des sites tiers.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">8. Litiges</h2>
          <p>
            Les présentes mentions légales sont régies par le droit ivoirien. En cas de
            litige, les parties s&apos;efforceront de trouver une solution amiable avant toute
            action judiciaire. À défaut, le litige sera porté devant les tribunaux
            compétents d&apos;Abidjan, Côte d&apos;Ivoire.
          </p>

          <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
          <p>
            Pour toute question relative aux mentions légales, vous pouvez nous contacter :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email : contact@montoit.ci</li>
            <li>Téléphone : +225 01 02 03 04 05</li>
            <li>Adresse : ANSUT, Riviera Palmeraie, Abidjan, Côte d&apos;Ivoire</li>
          </ul>

          <div className="mt-10 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              ANSUT &mdash; Agence Nationale de la Sécurité et de l&apos;Utilisation du Trust<br />
              Riviera Palmeraie, Abidjan, Côte d&apos;Ivoire
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
