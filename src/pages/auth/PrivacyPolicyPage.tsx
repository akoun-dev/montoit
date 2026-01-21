import { Eye, Lock, UserCheck, Mail, Home } from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <PageHeader
        title="Politique de Confidentialité"
        subtitle="Découvrez comment nous protégeons vos données personnelles"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-[20px] p-8 border border-[#EFEBE9] shadow-sm">
          <p className="text-sm text-[#6B5A4E] mb-8">Dernière mise à jour : Novembre 2025</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] flex items-center justify-center">
                  <Eye className="h-5 w-5 text-[#F16522]" />
                </div>
                1. Introduction
              </h2>
              <p className="text-[#6B5A4E] leading-relaxed">
                Mon Toit, plateforme immobilière certifiée ANSUT, s'engage à protéger la vie privée
                de ses utilisateurs. Cette politique de confidentialité explique comment nous
                collectons, utilisons, conservons et protégeons vos données personnelles
                conformément à la réglementation ivoirienne en vigueur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">2. Données Collectées</h2>
              <p className="text-[#6B5A4E] leading-relaxed mb-3">
                Nous collectons les types de données suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#6B5A4E]">
                <li>
                  <strong className="text-[#2C1810]">Données d'identification :</strong> nom,
                  prénom, date de naissance, numéro de CNI
                </li>
                <li>
                  <strong className="text-[#2C1810]">Données de contact :</strong> adresse email,
                  numéro de téléphone, adresse postale
                </li>
                <li>
                  <strong className="text-[#2C1810]">Données de compte :</strong> identifiant, mot
                  de passe crypté, préférences
                </li>
                <li>
                  <strong className="text-[#2C1810]">Données de transaction :</strong> historique de
                  recherches, candidatures, paiements
                </li>
                <li>
                  <strong className="text-[#2C1810]">Données techniques :</strong> adresse IP, type
                  de navigateur, données de connexion
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">3. Finalités du Traitement</h2>
              <p className="text-[#6B5A4E] leading-relaxed mb-3">
                Vos données personnelles sont utilisées pour :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#6B5A4E]">
                <li>Créer et gérer votre compte utilisateur</li>
                <li>Faciliter la mise en relation entre propriétaires et locataires</li>
                <li>Vérifier votre identité via l'ONECI</li>
                <li>Traiter vos paiements de manière sécurisée</li>
                <li>Vous envoyer des notifications importantes</li>
                <li>Améliorer nos services et votre expérience utilisateur</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] flex items-center justify-center">
                  <Lock className="h-5 w-5 text-[#F16522]" />
                </div>
                4. Sécurité des Données
              </h2>
              <p className="text-[#6B5A4E] leading-relaxed mb-3">
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour
                protéger vos données :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#6B5A4E]">
                <li>Cryptage des données sensibles (SSL/TLS)</li>
                <li>Authentification sécurisée avec double facteur</li>
                <li>Contrôle d'accès strict aux données</li>
                <li>Sauvegardes régulières et sécurisées</li>
                <li>Surveillance continue des systèmes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">5. Partage des Données</h2>
              <p className="text-[#6B5A4E] leading-relaxed mb-3">
                Vos données personnelles peuvent être partagées avec :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#6B5A4E]">
                <li>
                  <strong className="text-[#2C1810]">ONECI :</strong> pour la vérification
                  d'identité
                </li>
                <li>
                  <strong className="text-[#2C1810]">Prestataires de paiement :</strong> Orange
                  Money, MTN Money, Moov Money
                </li>
                <li>
                  <strong className="text-[#2C1810]">ANSUT :</strong> dans le cadre de la
                  certification de la plateforme
                </li>
                <li>
                  <strong className="text-[#2C1810]">Autorités légales :</strong> sur réquisition
                  judiciaire
                </li>
              </ul>
              <p className="text-[#6B5A4E] leading-relaxed mt-3">
                Nous ne vendons jamais vos données personnelles à des tiers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-[#F16522]" />
                </div>
                6. Vos Droits
              </h2>
              <p className="text-[#6B5A4E] leading-relaxed mb-3">
                Conformément à la loi ivoirienne, vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#6B5A4E]">
                <li>
                  <strong className="text-[#2C1810]">Droit d'accès :</strong> consulter vos données
                  personnelles
                </li>
                <li>
                  <strong className="text-[#2C1810]">Droit de rectification :</strong> corriger vos
                  données inexactes
                </li>
                <li>
                  <strong className="text-[#2C1810]">Droit d'opposition :</strong> refuser certains
                  traitements
                </li>
                <li>
                  <strong className="text-[#2C1810]">Droit à l'effacement :</strong> demander la
                  suppression de vos données
                </li>
                <li>
                  <strong className="text-[#2C1810]">Droit à la portabilité :</strong> récupérer vos
                  données dans un format structuré
                </li>
              </ul>
              <p className="text-[#6B5A4E] leading-relaxed mt-3">
                Pour exercer ces droits, contactez-nous à :{' '}
                <a
                  href="mailto:privacy@mon-toit.ci"
                  className="text-[#F16522] hover:underline font-medium"
                >
                  privacy@mon-toit.ci
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">7. Conservation des Données</h2>
              <p className="text-[#6B5A4E] leading-relaxed">
                Nous conservons vos données personnelles uniquement pendant la durée nécessaire aux
                finalités pour lesquelles elles ont été collectées, ou selon les exigences légales
                en vigueur. Les données liées aux contrats de bail sont conservées pendant 5 ans
                après la fin du contrat.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">8. Cookies</h2>
              <p className="text-[#6B5A4E] leading-relaxed">
                Notre site utilise des cookies pour améliorer votre expérience de navigation. Vous
                pouvez configurer votre navigateur pour refuser les cookies, mais cela pourrait
                affecter certaines fonctionnalités de la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">9. Modifications</h2>
              <p className="text-[#6B5A4E] leading-relaxed">
                Nous nous réservons le droit de modifier cette politique de confidentialité à tout
                moment. Les modifications importantes vous seront notifiées par email ou via une
                notification sur la plateforme.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#2C1810] mb-4">10. Contact</h2>
              <p className="text-[#6B5A4E] leading-relaxed mb-4">
                Pour toute question concernant le traitement de vos données personnelles, vous
                pouvez nous contacter :
              </p>
              <div className="bg-[#2C1810] text-white p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="h-5 w-5 text-[#F16522]" />
                  <span className="font-semibold">Contactez notre DPO</span>
                </div>
                <p className="text-[#E8D4C5] mb-2">
                  <strong className="text-white">Email :</strong>{' '}
                  <a href="mailto:privacy@mon-toit.ci" className="text-[#F16522] hover:underline">
                    privacy@mon-toit.ci
                  </a>
                </p>
                <p className="text-[#E8D4C5] mb-2">
                  <strong className="text-white">Responsable :</strong> DPO Mon Toit
                </p>
                <p className="text-[#E8D4C5]">
                  <strong className="text-white">Adresse :</strong> Abidjan, Côte d'Ivoire
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>

      <FooterCTA
        title="Des questions sur vos données ?"
        subtitle="Notre équipe est disponible pour répondre à toutes vos interrogations"
        buttons={[
          {
            label: 'Contacter le DPO',
            href: 'mailto:privacy@mon-toit.ci',
            icon: Mail,
            variant: 'primary',
          },
          { label: "Retour à l'accueil", href: '/', icon: Home, variant: 'secondary' },
        ]}
      />
    </div>
  );
}
