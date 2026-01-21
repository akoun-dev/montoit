import { Shield, Users, Target, Award, ArrowRight, Building2 } from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <PageHeader
        title="À propos de Mon Toit"
        subtitle="Plateforme immobilière avec signature électronique sécurisée"
        icon={<Building2 className="h-8 w-8 text-white" />}
        breadcrumbs={[{ label: 'À propos', href: '/a-propos' }]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-[20px] p-8 md:p-12 shadow-lg border border-[#EFEBE9] mb-12 animate-fade-in">
          <div className="prose prose-lg max-w-none">
            <p className="text-[#6B5A4E] leading-relaxed mb-8 text-lg">
              Mon Toit est une plateforme immobilière innovante qui vise à faciliter l'accès au
              logement en Côte d'Ivoire grâce à la signature électronique sécurisée et la
              vérification d'identité officielle.
            </p>

            <div className="mb-10">
              <h2 className="text-2xl font-bold text-[#2C1810] mb-4 flex items-center">
                <div className="w-10 h-10 bg-[#F16522] rounded-xl flex items-center justify-center mr-4">
                  <Target className="h-5 w-5 text-white" />
                </div>
                Notre Mission
              </h2>
              <p className="text-[#6B5A4E] leading-relaxed">
                Rendre l'accès au logement plus simple, transparent et sécurisé pour tous les
                Ivoiriens. Nous connectons propriétaires et locataires à travers une plateforme
                digitale moderne qui garantit confiance et sécurité dans toutes les transactions.
              </p>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-bold text-[#2C1810] mb-4 flex items-center">
                <div className="w-10 h-10 bg-[#2C1810] rounded-xl flex items-center justify-center mr-4">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                Nos Garanties
              </h2>
              <ul className="space-y-4 text-[#6B5A4E]">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-[#F16522] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong className="text-[#2C1810]">Vérification d'identité officielle :</strong>{' '}
                    Tous les utilisateurs sont vérifiés via l'ONECI pour garantir l'authenticité des
                    profils
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-[#F16522] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong className="text-[#2C1810]">Signature électronique légale :</strong>{' '}
                    Contrats sécurisés conformes à la réglementation ivoirienne
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-[#F16522] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong className="text-[#2C1810]">Paiement sécurisé :</strong> Transactions
                    protégées via Mobile Money (Orange, MTN, Moov)
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-[#F16522] rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    <strong className="text-[#2C1810]">Cachet électronique visible :</strong> Tous
                    les contrats sont marqués d'un cachet électronique garantissant leur
                    authenticité
                  </span>
                </li>
              </ul>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-bold text-[#2C1810] mb-6 flex items-center">
                <div className="w-10 h-10 bg-[#F16522] rounded-xl flex items-center justify-center mr-4">
                  <Users className="h-5 w-5 text-white" />
                </div>
                Nos Valeurs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#FAF7F4] p-5 rounded-[16px] border border-[#EFEBE9] hover:border-[#F16522] transition-colors">
                  <h3 className="font-bold text-[#2C1810] mb-2">Transparence</h3>
                  <p className="text-sm text-[#6B5A4E]">
                    Toutes les informations sont claires et vérifiables
                  </p>
                </div>
                <div className="bg-[#FAF7F4] p-5 rounded-[16px] border border-[#EFEBE9] hover:border-[#F16522] transition-colors">
                  <h3 className="font-bold text-[#2C1810] mb-2">Sécurité</h3>
                  <p className="text-sm text-[#6B5A4E]">
                    Protection maximale de vos données et transactions
                  </p>
                </div>
                <div className="bg-[#FAF7F4] p-5 rounded-[16px] border border-[#EFEBE9] hover:border-[#F16522] transition-colors">
                  <h3 className="font-bold text-[#2C1810] mb-2">Accessibilité</h3>
                  <p className="text-sm text-[#6B5A4E]">
                    Un logement pour tous, sans discrimination
                  </p>
                </div>
                <div className="bg-[#FAF7F4] p-5 rounded-[16px] border border-[#EFEBE9] hover:border-[#F16522] transition-colors">
                  <h3 className="font-bold text-[#2C1810] mb-2">Innovation</h3>
                  <p className="text-sm text-[#6B5A4E]">Technologie au service de l'immobilier</p>
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-bold text-[#2C1810] mb-4 flex items-center">
                <div className="w-10 h-10 bg-[#2C1810] rounded-xl flex items-center justify-center mr-4">
                  <Award className="h-5 w-5 text-white" />
                </div>
                Sécurité et Conformité
              </h2>
              <p className="text-[#6B5A4E] leading-relaxed">
                Mon Toit respecte les normes nationales en matière de services numériques et de
                protection des utilisateurs. Nous utilisons la signature électronique via CryptoNeo
                et appliquons un cachet électronique visible sur tous les contrats. Les utilisateurs
                peuvent optionnellement demander un Certificat Électronique de Vérification (CEV)
                auprès de l'ONECI pour renforcer la validité légale de leur contrat.
              </p>
            </div>

            <div className="bg-[#2C1810] p-6 rounded-[16px] text-white">
              <h3 className="font-bold mb-4 text-lg">Nous Contacter</h3>
              <p className="mb-2">
                <strong className="text-[#E8D4C5]">Email :</strong>{' '}
                <a href="mailto:contact@mon-toit.ci" className="text-[#F16522] hover:underline">
                  contact@mon-toit.ci
                </a>
              </p>
              <p className="text-[#E8D4C5]">
                <strong>Adresse :</strong> Abidjan, Côte d'Ivoire
              </p>
            </div>
          </div>
        </div>
      </div>

      <FooterCTA
        title="Découvrez Mon Toit"
        subtitle="Rejoignez notre communauté et trouvez votre logement idéal en toute sécurité"
        icon={Building2}
        buttons={[
          {
            label: 'Commencer',
            href: '/inscription',
            icon: ArrowRight,
            variant: 'primary',
          },
          {
            label: 'Comment ça marche',
            href: '/comment-ca-marche',
            icon: Target,
            variant: 'secondary',
          },
        ]}
      />
    </div>
  );
}
