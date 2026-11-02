'use client'

import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export function PrivacyPage() {
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
            <Shield className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Politique de Confidentialité
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
          <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
          <p>
            L&apos;Agence Nationale de la Sécurité et de l&apos;Utilisation du Trust (ANSUT),
            éditrice de la plateforme Mon Toit, accorde une importance primordiale à la
            protection de vos données personnelles. La présente Politique de Confidentialité
            vous informe de la manière dont nous collectons, utilisons, stockons et protégeons
            vos informations lorsque vous utilisez la Plateforme.
          </p>
          <p>
            En utilisant la Plateforme, vous consentez à la collecte et au traitement de
            vos données personnelles conformément à la présente politique.
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Responsable du Traitement</h2>
          <p>
            Le responsable du traitement des données est l&apos;ANSUT, située à :
          </p>
          <p className="pl-4 border-l-2 border-brand-200 bg-brand-50/50 p-3 rounded-lg text-sm">
            ANSUT<br />
            Riviera Palmeraie, Abidjan<br />
            Côte d&apos;Ivoire<br />
            Email : contact@montoit.ci<br />
            Téléphone : +225 01 02 03 04 05
          </p>

          <h2 className="text-lg font-semibold text-foreground">3. Données Collectées</h2>
          <p>Nous collectons les catégories de données suivantes :</p>

          <h3 className="text-base font-medium text-foreground">3.1 Données d&apos;identification</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Pièce d&apos;identité (CNI, passeport) &mdash; pour la vérification KYC</li>
            <li>Photo d&apos;identité &mdash; pour la vérification biométrique NeoFace</li>
          </ul>

          <h3 className="text-base font-medium text-foreground">3.2 Données de profil</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Adresse et localisation</li>
            <li>Informations professionnelles (employeur, revenus)</li>
            <li>Documents justificatifs (bulletins de salaire, quittances)</li>
            <li>Garant et ses informations</li>
          </ul>

          <h3 className="text-base font-medium text-foreground">3.3 Données de transaction</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Historique des paiements</li>
            <li>Références de transaction mobile money</li>
            <li>Contrats de location signés</li>
            <li>États des lieux</li>
          </ul>

          <h3 className="text-base font-medium text-foreground">3.4 Données de navigation</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Adresse IP</li>
            <li>Type de navigateur et appareil</li>
            <li>Pages visitées et interactions</li>
            <li>Cookies fonctionnels et d&apos;analyse</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">4. Finalités du Traitement</h2>
          <p>Vos données sont traitées pour les finalités suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Gestion du compte :</strong> création, authentification, maintenance.</li>
            <li><strong>Vérification d&apos;identité :</strong> KYC, ONECI, biométrie NeoFace.</li>
            <li><strong>Mise en relation :</strong> entre locataires, propriétaires et agences.</li>
            <li><strong>Traitement des transactions :</strong> paiements, quittances, cautions.</li>
            <li><strong>Validation par les TC :</strong> vérification des dossiers et documents.</li>
            <li><strong>Communication :</strong> messagerie interne, notifications, support.</li>
            <li><strong>Amélioration du service :</strong> analyses statistiques, UX.</li>
            <li><strong>Conformité légale :</strong> respect des obligations réglementaires.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">5. Base Légale du Traitement</h2>
          <p>Le traitement de vos données repose sur :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Votre <strong>consentement</strong> (acceptation des CGU et de la présente politique).</li>
            <li>L&apos;<strong>exécution du contrat</strong> (utilisation des services de la Plateforme).</li>
            <li>Les <strong>obligations légales</strong> (conservation des documents, lutte contre la fraude).</li>
            <li>L&apos;<strong>intérêt légitime</strong> (amélioration des services, sécurité).</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">6. Destinataires des Données</h2>
          <p>Vos données peuvent être partagées avec :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Les <strong>Tiers de Confiance</strong> agréés, dans le cadre de la validation des dossiers.</li>
            <li>Les <strong>propriétaires/agences</strong> (pour les dossiers validés des locataires).</li>
            <li>Les <strong>prestataires techniques</strong> (hébergement, paiement, signature électronique).</li>
            <li>Les <strong>autorités compétentes</strong> sur requête légale.</li>
          </ul>
          <p>
            Nous ne vendons jamais vos données personnelles à des tiers à des fins
            commerciales.
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Durée de Conservation</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="text-left p-2 border border-border font-medium">Type de données</th>
                  <th className="text-left p-2 border border-border font-medium">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border border-border">Données de compte</td>
                  <td className="p-2 border border-border">Durée de vie du compte + 3 ans</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border">Documents KYC</td>
                  <td className="p-2 border border-border">5 ans après clôture du compte</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border">Contrats et baux</td>
                  <td className="p-2 border border-border">10 ans (obligation légale)</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border">Données de paiement</td>
                  <td className="p-2 border border-border">10 ans (obligation comptable)</td>
                </tr>
                <tr>
                  <td className="p-2 border border-border">Données de navigation</td>
                  <td className="p-2 border border-border">13 mois maximum</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-lg font-semibold text-foreground">8. Sécurité des Données</h2>
          <p>Nous mettons en œuvre les mesures de sécurité suivantes :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Chiffrement SSL/TLS pour toutes les communications.</li>
            <li>Stockage sécurisé des documents dans Supabase Storage avec RLS (Row Level Security).</li>
            <li>Authentification à deux facteurs (2FA) disponible.</li>
            <li>Contrôle d&apos;accès basé sur les rôles (RBAC).</li>
            <li>Audit et journalisation des accès aux données sensibles.</li>
            <li>Sauvegardes régulières de la base de données.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">9. Vos Droits</h2>
          <p>Conformément à la réglementation, vous disposez des droits suivants :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données.</li>
            <li><strong>Droit de rectification :</strong> modifier vos données inexactes.</li>
            <li><strong>Droit à l&apos;effacement :</strong> demander la suppression de votre compte et de vos données.</li>
            <li><strong>Droit à la limitation :</strong> restreindre le traitement de vos données.</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer à certains traitements.</li>
            <li><strong>Droit de retrait du consentement :</strong> à tout moment, sans affecter la licéité du traitement antérieur.</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez-nous à <strong>contact@montoit.ci</strong>.
            Nous répondrons à votre demande dans un délai maximum de 30 jours.
          </p>

          <h2 className="text-lg font-semibold text-foreground">10. Cookies</h2>
          <p>
            La Plateforme utilise des cookies fonctionnels nécessaires à son bon
            fonctionnement (authentification, session). Des cookies d&apos;analyse peuvent
            être utilisés pour améliorer l&apos;expérience utilisateur. Vous pouvez configurer
            vos préférences de cookies dans les paramètres de votre navigateur.
          </p>

          <h2 className="text-lg font-semibold text-foreground">11. Transfert des Données</h2>
          <p>
            Vos données sont hébergées sur des serveurs situés en France et en Côte
            d&apos;Ivoire. En cas de transfert hors de l&apos;Union Européenne, nous nous
            assurons que des garanties appropriées sont mises en place (clauses
            contractuelles types, Privacy Shield).
          </p>

          <h2 className="text-lg font-semibold text-foreground">12. Modification de la Politique</h2>
          <p>
            Nous nous réservons le droit de modifier la présente politique à tout moment.
            Les utilisateurs seront informés de tout changement significatif via la
            Plateforme ou par email. La date de dernière mise à jour est indiquée en
            haut de cette page.
          </p>

          <h2 className="text-lg font-semibold text-foreground">13. Contact et Réclamation</h2>
          <p>
            Pour toute question relative à la protection de vos données, vous pouvez
            nous contacter :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Email : contact@montoit.ci</li>
            <li>Téléphone : +225 01 02 03 04 05</li>
            <li>Courrier : ANSUT, Riviera Palmeraie, Abidjan, Côte d&apos;Ivoire</li>
          </ul>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire
            une réclamation auprès de l&apos;autorité de protection des données compétente
            en Côte d&apos;Ivoire.
          </p>

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
