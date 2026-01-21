import { BookOpen, Search } from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <PageHeader
        title="Blog"
        subtitle="Actualités, conseils et guides pratiques pour votre recherche"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-[20px] p-8 border border-[#EFEBE9] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-[#F16522]" />
            </div>
            <h2 className="text-xl font-bold text-[#2C1810]">Bientôt disponible</h2>
          </div>
          <p className="text-[#6B5A4E] leading-relaxed">
            Notre blog est en cours de préparation. Vous y trouverez prochainement des conseils,
            des bonnes pratiques et des actualités sur la location en Côte d'Ivoire.
          </p>
        </div>
      </div>

      <FooterCTA
        title="En attendant, explorez les logements"
        subtitle="Parcourez les annonces disponibles selon vos critères."
        buttons={[
          { label: 'Rechercher un bien', href: '/recherche', icon: Search, variant: 'primary' },
        ]}
      />
    </div>
  );
}
