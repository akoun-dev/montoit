import { FileText, Mail, Search } from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <PageHeader
        title="Conditions Générales de Vente"
        subtitle="Informations sur les conditions de vente des services Mon Toit"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-[20px] p-8 border border-[#EFEBE9] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] flex items-center justify-center">
              <FileText className="h-5 w-5 text-[#F16522]" />
            </div>
            <h2 className="text-xl font-bold text-[#2C1810]">Document en préparation</h2>
          </div>
          <p className="text-[#6B5A4E] leading-relaxed">
            Les conditions générales de vente seront publiées prochainement. En attendant, vous
            pouvez nous contacter pour toute question liée aux services proposés.
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm text-[#6B5A4E]">
            <Mail className="h-4 w-4 text-[#F16522]" />
            <a href="mailto:contact@montoit.ci" className="text-[#F16522] hover:underline">
              contact@montoit.ci
            </a>
          </div>
        </div>
      </div>

      <FooterCTA
        title="Besoin d'informations complémentaires ?"
        subtitle="Consultez les annonces disponibles ou contactez notre équipe."
        buttons={[
          { label: 'Voir les biens', href: '/recherche', icon: Search, variant: 'primary' },
        ]}
      />
    </div>
  );
}
