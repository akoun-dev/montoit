'use client'

import { motion } from 'framer-motion'
import { Cookie } from 'lucide-react'

export function CookiesPage() {
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
            <Cookie className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Politique de Cookies
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
          <h2 className="text-lg font-semibold text-foreground">1. Qu&apos;est-ce qu&apos;un Cookie ?</h2>
          <p>
            Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette,
            smartphone) lors de votre visite sur un site web. Il permet à la Plateforme de
            mémoriser vos actions et préférences (identifiant de session, langue, taille
            d&apos;affichage) pendant une durée déterminée, afin que vous n&apos;ayez pas à les
            ressaisir à chaque visite.
          </p>
          <p>
            Les cookies ne peuvent pas exécuter de programmes ni transmettre des virus. Ils sont
            propres à chaque navigateur et ne permettent de vous identifier qu&apos;indirectement
            via votre session de navigation.
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Types de Cookies Utilisés</h2>

          <h3 className="text-base font-medium text-foreground">2.1 Cookies Fonctionnels (Strictement Nécessaires)</h3>
          <p>
            Ces cookies sont essentiels au fonctionnement de la Plateforme. Ils permettent de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Maintenir votre session authentifiée pendant votre navigation</li>
            <li>Mémoriser vos préférences de consentement aux cookies</li>
            <li>Assurer la sécurité de votre compte et de vos transactions</li>
            <li>Permettre le bon fonctionnement du formulaire de recherche et des filtres</li>
          </ul>
          <div className="pl-4 border-l-2 border-brand-200 bg-brand-50/50 p-3 rounded-lg text-sm">
            <p className="font-medium text-foreground">Base légale :</p>
            <p>Ces cookies ne nécessitent pas votre consentement préalable car ils sont indispensables au service.</p>
          </div>

          <h3 className="text-base font-medium text-foreground">2.2 Cookies d&apos;Analyse et de Performance</h3>
          <p>
            Ces cookies nous permettent de comprendre comment vous utilisez la Plateforme et
            d&apos;améliorer votre expérience :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Pages les plus visitées et parcours de navigation</li>
            <li>Taux de conversion (inscriptions, candidatures, signatures)</li>
            <li>Performance technique (temps de chargement, erreurs)</li>
            <li>Utilisation des fonctionnalités (recherche, messagerie, paiement)</li>
          </ul>

          <h3 className="text-base font-medium text-foreground">2.3 Cookies de Préférence</h3>
          <p>
            Ces cookies mémorisent vos choix et préférences pour personnaliser votre expérience :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Vue par défaut (grille, liste, carte)</li>
            <li>Filtres de recherche mémorisés</li>
            <li>Langue et format d&apos;affichage</li>
            <li>Thème (clair/sombre)</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">3. Liste Détaillée des Cookies</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-2 border border-border font-medium">Nom du cookie</th>
                  <th className="text-left p-2 border border-border font-medium">Type</th>
                  <th className="text-left p-2 border border-border font-medium">Durée</th>
                  <th className="text-left p-2 border border-border font-medium">Finalité</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-border font-mono text-xs">montoit-auth</td>
                  <td className="p-2 border border-border">Fonctionnel</td>
                  <td className="p-2 border border-border">30 jours</td>
                  <td className="p-2 border border-border">Session utilisateur et authentification</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border font-mono text-xs">sb-*-auth-token</td>
                  <td className="p-2 border border-border">Fonctionnel</td>
                  <td className="p-2 border border-border">Session</td>
                  <td className="p-2 border border-border">Token d&apos;authentification Supabase</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border font-mono text-xs">_ga / _gid</td>
                  <td className="p-2 border border-border">Analyse</td>
                  <td className="p-2 border border-border">13 mois</td>
                  <td className="p-2 border border-border">Statistiques de navigation Google Analytics</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border font-mono text-xs">cookie-consent</td>
                  <td className="p-2 border border-border">Fonctionnel</td>
                  <td className="p-2 border border-border">6 mois</td>
                  <td className="p-2 border border-border">Mémorisation de votre choix de consentement</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border font-mono text-xs">theme-pref</td>
                  <td className="p-2 border border-border">Préférence</td>
                  <td className="p-2 border border-border">1 an</td>
                  <td className="p-2 border border-border">Thème d&apos;affichage (clair/sombre)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-foreground">4. Durée de Conservation</h2>
          <p>La durée de conservation des cookies varie selon leur type :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Cookies de session :</strong> supprimés automatiquement à la fermeture du navigateur.</li>
            <li><strong>Cookies persistants :</strong> conservés jusqu&apos;à expiration de leur durée de vie (de 6 mois à 13 mois maximum).</li>
            <li><strong>Données d&apos;analyse :</strong> anonymisées et conservées 13 mois maximum conformément aux recommandations de la CNIL.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">5. Gestion de vos Préférences</h2>
          <p>Vous pouvez à tout moment gérer vos préférences de cookies de plusieurs manières :</p>

          <h3 className="text-base font-medium text-foreground">5.1 Via notre outil de consentement</h3>
          <p>
            Un bandeau de consentement s&apos;affiche lors de votre première visite sur la
            Plateforme. Vous pouvez à tout moment modifier vos choix en cliquant sur le lien
            &laquo; Gérer les cookies &raquo; présent en bas de chaque page.
          </p>

          <h3 className="text-base font-medium text-foreground">5.2 Via les paramètres de votre navigateur</h3>
          <p>Vous pouvez configurer votre navigateur pour :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Accepter ou refuser tous les cookies</li>
            <li>Être averti avant qu&apos;un cookie ne soit installé</li>
            <li>Supprimer les cookies déjà installés</li>
            <li>Activer le mode navigation privée</li>
          </ul>
          <p>Voici les liens vers les guides des principaux navigateurs :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/fr/kb/effacer-les-cookies" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Safari</a></li>
            <li><a href="https://support.microsoft.com/fr-fr/windows/g%C3%A9rer-les-cookies-dans-microsoft-edge" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Microsoft Edge</a></li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">6. Consentement</h2>
          <p>
            Conformément à la réglementation en vigueur, nous recueillons votre consentement
            préalable pour les cookies non fonctionnels (analyse, performance, préférences).
            Vous pouvez à tout moment retirer votre consentement ou vous opposer au traitement
            des données via les outils décrits ci-dessus.
          </p>
          <p>
            Le refus des cookies d&apos;analyse n&apos;affecte pas votre capacité à utiliser la
            Plateforme. En revanche, le refus des cookies fonctionnels peut entraîner des
            dysfonctionnements (déconnexion intempestive, perte des préférences).
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Cookies Tiers</h2>
          <p>
            La Plateforme peut intégrer des services tiers qui déposent leurs propres cookies :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Google Analytics</strong> — mesures d&apos;audience et d&apos;utilisation (cookies d&apos;analyse)</li>
            <li><strong>Supabase</strong> — gestion de l&apos;authentification et des sessions (cookies fonctionnels)</li>
            <li><strong>CRYPTONEO</strong> — signature électronique des baux (cookies fonctionnels)</li>
            <li><strong>Mobile Money (Orange Money, MTN, Moov, Wave)</strong> — redirection de paiement (cookies temporaires)</li>
          </ul>
          <p>
            Nous vous invitons à consulter les politiques de confidentialité de ces services
            tiers pour en savoir plus sur leur utilisation des cookies.
          </p>

          <h2 className="text-lg font-semibold text-foreground">8. Modification de la Politique</h2>
          <p>
            Nous nous réservons le droit de modifier la présente Politique de Cookies à tout
            moment. Les modifications seront notifiées via la Plateforme ou par email. La
            date de dernière mise à jour est indiquée en haut de cette page.
          </p>

          <h2 className="text-lg font-semibold text-foreground">9. Contact</h2>
          <p>
            Pour toute question relative à notre utilisation des cookies, vous pouvez nous
            contacter :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email : contact@montoit.ci</li>
            <li>Téléphone : +225 01 02 03 04 05</li>
            <li>Courrier : ANSUT, Riviera Palmeraie, Abidjan, Côte d&apos;Ivoire</li>
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
