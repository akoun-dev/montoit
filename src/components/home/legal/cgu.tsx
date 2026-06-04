'use client'

import { motion } from 'framer-motion'
import { FileText } from 'lucide-react'

export function CguPage() {
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
            <FileText className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
            Conditions Générales d&apos;Utilisation
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
          <h2 className="text-lg font-semibold text-foreground">1. Préambule</h2>
          <p>
            Les présentes Conditions Générales d&apos;Utilisation (ci-après &laquo; CGU &raquo;) régissent
            l&apos;accès et l&apos;utilisation de la plateforme Mon Toit (ci-après &laquo; la Plateforme &raquo;),
            éditée par l&apos;Agence Nationale de la Sécurité et de l&apos;Utilisation du Trust (ANSUT),
            située à Abidjan, Côte d&apos;Ivoire.
          </p>
          <p>
            La Plateforme a pour objet de mettre en relation des propriétaires, des locataires,
            des agences immobilières et des Tiers de Confiance dans le cadre de la location
            immobilière en Côte d&apos;Ivoire.
          </p>
          <p>
            En créant un compte et en utilisant la Plateforme, vous acceptez sans réserve
            les présentes CGU. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas
            utiliser la Plateforme.
          </p>

          <h2 className="text-lg font-semibold text-foreground">2. Définitions</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Utilisateur :</strong> toute personne physique ou morale créant un compte sur la Plateforme.</li>
            <li><strong>Locataire :</strong> utilisateur cherchant un logement à louer.</li>
            <li><strong>Propriétaire :</strong> utilisateur mettant un ou plusieurs biens en location.</li>
            <li><strong>Agence :</strong> entreprise de gestion locative agissant pour le compte de propriétaires.</li>
            <li><strong>Tiers de Confiance (TC) :</strong> acteur indépendant chargé de vérifier et valider les dossiers et documents.</li>
            <li><strong>Dossier locatif :</strong> ensemble des pièces justificatives d&apos;un locataire.</li>
            <li><strong>Bail :</strong> contrat de location signé électroniquement entre les parties.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">3. Inscription et Compte</h2>
          <p>Pour accéder aux services de la Plateforme, l&apos;utilisateur doit :</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Fournir des informations exactes et complètes (nom, prénom, email ou téléphone).</li>
            <li>Choisir un rôle (Locataire, Propriétaire ou Agence).</li>
            <li>Accepter les présentes CGU et la Politique de confidentialité.</li>
            <li>Vérifier son identité via le code OTP reçu par SMS ou email.</li>
          </ul>
          <p>
            L&apos;utilisateur est responsable de la confidentialité de ses identifiants et de
            toutes les activités effectuées depuis son compte. Il s&apos;engage à notifier
            immédiatement l&apos;ANSUT en cas d&apos;utilisation non autorisée de son compte.
          </p>

          <h2 className="text-lg font-semibold text-foreground">4. Services proposés</h2>
          <h3 className="text-base font-medium text-foreground">4.1 Pour les Locataires</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Recherche et consultation de biens disponibles à la location.</li>
            <li>Création et soumission de dossier locatif.</li>
            <li>Demande de visite de biens.</li>
            <li>Signature électronique de baux.</li>
            <li>Paiement de loyer en ligne.</li>
            <li>Suivi des demandes de maintenance.</li>
          </ul>

          <h3 className="text-base font-medium text-foreground">4.2 Pour les Propriétaires</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Publication et gestion d&apos;annonces immobilières.</li>
            <li>Réception et traitement des candidatures.</li>
            <li>Gestion des visites et des baux.</li>
            <li>Suivi des paiements et impayés.</li>
            <li>Gestion des demandes de maintenance.</li>
          </ul>

          <h3 className="text-base font-medium text-foreground">4.3 Pour les Agences</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gestion multi-biens et multi-agents.</li>
            <li>Mandats de gestion avec les propriétaires.</li>
            <li>Tableau de bord financier consolidé.</li>
            <li>Outils de communication et marketing.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">5. Rôle du Tiers de Confiance</h2>
          <p>
            Le Tiers de Confiance est un acteur indépendant agréé par l&apos;ANSUT. Il est
            chargé de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Vérifier l&apos;authenticité des documents d&apos;identité et justificatifs.</li>
            <li>Valider les dossiers locatifs et les profils propriétaires.</li>
            <li>Certifier les biens et les états des lieux.</li>
            <li>Garantir la confiance entre les parties.</li>
          </ul>
          <p>
            Le Tiers de Confiance s&apos;engage à traiter chaque dossier sous un délai maximum
            de 48 heures ouvrées (SLA).
          </p>

          <h2 className="text-lg font-semibold text-foreground">6. Signature Électronique</h2>
          <p>
            Les baux et mandats de gestion sont signés électroniquement via le service
            CRYPTONEO. La signature par OTP SMS ou email a valeur légale conformément à la
            réglementation en vigueur en Côte d&apos;Ivoire.
          </p>

          <h2 className="text-lg font-semibold text-foreground">7. Paiements</h2>
          <p>
            Les paiements de loyer et de services s&apos;effectuent via les canaux suivants :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Mobile money : Orange Money, MTN MoMo, Moov Money, Wave.</li>
            <li>Carte bancaire (à venir).</li>
            <li>Espèces avec reçu digital (pour les paiements en agence).</li>
          </ul>
          <p>
            Chaque paiement donne lieu à l&apos;émission d&apos;une quittance électronique
            téléchargeable depuis le tableau de bord.
          </p>

          <h2 className="text-lg font-semibold text-foreground">8. Protection des Données</h2>
          <p>
            L&apos;ANSUT s&apos;engage à protéger les données personnelles des utilisateurs
            conformément à la réglementation ivoirienne sur la protection des données à
            caractère personnel. Les modalités de traitement des données sont détaillées
            dans la Politique de confidentialité.
          </p>

          <h2 className="text-lg font-semibold text-foreground">9. Obligations de l&apos;Utilisateur</h2>
          <p>L&apos;utilisateur s&apos;engage à :</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fournir des informations exactes et à jour.</li>
            <li>Ne pas publier de contenu frauduleux ou illicite.</li>
            <li>Respecter les droits des autres utilisateurs.</li>
            <li>Ne pas tenter de contourner les mécanismes de sécurité de la Plateforme.</li>
            <li>Utiliser la Plateforme conformément à sa destination.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">10. Responsabilité</h2>
          <p>
            L&apos;ANSUT met en œuvre tous les moyens raisonnables pour assurer le bon
            fonctionnement de la Plateforme. Cependant, l&apos;ANSUT ne saurait être tenue
            responsable :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Des litiges entre utilisateurs (locataires, propriétaires, agences).</li>
            <li>Des dommages indirects résultant de l&apos;utilisation de la Plateforme.</li>
            <li>Des interruptions temporaires du service pour maintenance.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">11. Suspension et Résiliation</h2>
          <p>
            L&apos;ANSUT se réserve le droit de suspendre ou résilier un compte utilisateur
            en cas de violation des présentes CGU, notamment en cas de :
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fausses déclarations ou documents frauduleux.</li>
            <li>Non-paiement des services.</li>
            <li>Comportement abusif envers d&apos;autres utilisateurs.</li>
            <li>Utilisation de la Plateforme à des fins illicites.</li>
          </ul>

          <h2 className="text-lg font-semibold text-foreground">12. Droit Applicable et Litiges</h2>
          <p>
            Les présentes CGU sont régies par le droit ivoirien. Tout litige relatif à
            leur interprétation ou exécution relève de la compétence des tribunaux
            d&apos;Abidjan, Côte d&apos;Ivoire.
          </p>

          <h2 className="text-lg font-semibold text-foreground">13. Contact</h2>
          <p>
            Pour toute question relative aux présentes CGU, veuillez nous contacter à
            l&apos;adresse suivante : <strong>contact@montoit.ci</strong> ou par téléphone
            au <strong>+225 01 02 03 04 05</strong>.
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
