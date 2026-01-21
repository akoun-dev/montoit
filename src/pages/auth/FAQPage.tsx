import { useState } from 'react';
import {
  ChevronDown,
  Search,
  HelpCircle,
  Shield,
  CreditCard,
  Home,
  User,
  MessageCircle,
  Phone,
  Mail,
} from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: 'Général',
    question: "Qu'est-ce que Mon Toit ?",
    answer:
      "Mon Toit est une plateforme immobilière en Côte d'Ivoire qui facilite la mise en relation entre propriétaires et locataires. Nous offrons une solution sécurisée, transparente et certifiée ANSUT pour trouver et louer des logements.",
  },
  {
    category: 'Général',
    question: 'Comment créer un compte ?',
    answer:
      'Cliquez sur "Inscription" en haut de la page, renseignez vos informations (email, téléphone, mot de passe) et choisissez votre profil (Locataire, Propriétaire, ou Agence). Validez votre compte via le code OTP envoyé par SMS ou email.',
  },
  {
    category: 'Locataires',
    question: 'Comment rechercher une propriété ?',
    answer:
      'Utilisez notre barre de recherche pour filtrer par ville, quartier, type de bien, prix et équipements. Vous pouvez sauvegarder vos recherches et activer des alertes pour être notifié des nouvelles annonces correspondant à vos critères.',
  },
  {
    category: 'Locataires',
    question: 'Comment réserver une visite ?',
    answer:
      'Sur la page d\'une propriété, cliquez sur "Planifier une visite". Choisissez une date et heure disponibles. Le propriétaire recevra votre demande et vous confirmera le rendez-vous. Un frais symbolique de 2 000 FCFA peut être requis.',
  },
  {
    category: 'Locataires',
    question: 'Puis-je payer mon loyer via la plateforme ?',
    answer:
      'Oui ! Mon Toit intègre les paiements Mobile Money (Orange Money, MTN Mobile Money, Moov Money) et virements bancaires. Vos paiements sont sécurisés et un reçu électronique vous est envoyé automatiquement.',
  },
  {
    category: 'Propriétaires',
    question: 'Comment publier mon bien ?',
    answer:
      'Connectez-vous à votre compte propriétaire, allez dans "Ajouter une propriété", remplissez les informations détaillées (adresse, prix, photos, équipements), et publiez. Votre annonce sera visible instantanément après modération.',
  },
  {
    category: 'Propriétaires',
    question: 'Y a-t-il des frais pour publier une annonce ?',
    answer:
      "La publication de votre première annonce est gratuite. Pour les propriétaires avec plusieurs biens ou les agences, des formules d'abonnement sont disponibles pour gérer efficacement votre portefeuille.",
  },
  {
    category: 'Propriétaires',
    question: 'Comment signer un contrat de bail ?',
    answer:
      'Mon Toit génère automatiquement des contrats conformes à la loi ivoirienne. Après accord avec votre locataire, le contrat peut être signé électroniquement via CryptoNeo pour une valeur juridique certifiée.',
  },
  {
    category: 'Paiements',
    question: 'Quels moyens de paiement sont acceptés ?',
    answer:
      'Nous acceptons : Mobile Money (Orange, MTN, Moov), virements bancaires (via InTouch), et paiements par carte bancaire. Tous les paiements sont sécurisés et tracés.',
  },
  {
    category: 'Paiements',
    question: 'Quand et comment je reçois mon loyer ?',
    answer:
      'Les propriétaires reçoivent leur loyer sous 48h après paiement du locataire. Le virement est effectué directement sur votre compte bancaire ou Mobile Money. Une commission de 5% est prélevée pour couvrir les frais de transaction et de plateforme.',
  },
  {
    category: 'Vérification',
    question: 'Pourquoi vérifier mon identité ?',
    answer:
      "La vérification d'identité (via ONECI/CEV) renforce la confiance entre utilisateurs et réduit les fraudes. Les profils vérifiés reçoivent un badge spécial et sont prioritaires dans les résultats de recherche.",
  },
  {
    category: 'Vérification',
    question: 'Comment obtenir la certification ANSUT ?',
    answer:
      "ANSUT (Agence Nationale de Soutien à l'Habitat) certifie les logements conformes aux normes ivoiriennes. Soumettez une demande depuis votre dashboard propriétaire, un agent viendra inspecter le bien. La certification est valable 3 ans.",
  },
  {
    category: 'Sécurité',
    question: 'Mes données personnelles sont-elles protégées ?',
    answer:
      'Oui ! Nous utilisons un chiffrement SSL 256-bit, stockons vos données sur des serveurs sécurisés, et respectons la réglementation RGPD et les lois ivoiriennes sur la protection des données. Vos informations ne sont jamais vendues à des tiers.',
  },
  {
    category: 'Sécurité',
    question: 'Comment signaler une annonce frauduleuse ?',
    answer:
      'Sur la page d\'une propriété, cliquez sur "Signaler". Décrivez le problème rencontré. Notre équipe de modération examine chaque signalement sous 24h et prend les mesures appropriées.',
  },
];

const categories = [
  { name: 'Général', icon: HelpCircle },
  { name: 'Locataires', icon: Home },
  { name: 'Propriétaires', icon: User },
  { name: 'Paiements', icon: CreditCard },
  { name: 'Vérification', icon: Shield },
  { name: 'Sécurité', icon: Shield },
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const filteredFAQ = faqData.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'Tous' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <PageHeader
        title="Questions Fréquentes (FAQ)"
        subtitle="Trouvez rapidement des réponses à toutes vos questions sur Mon Toit"
        icon={<HelpCircle className="h-8 w-8 text-white" />}
        breadcrumbs={[{ label: 'FAQ', href: '/faq' }]}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 animate-fade-in">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#A69B95]" />
            <input
              type="text"
              placeholder="Rechercher une question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-[#EFEBE9] rounded-xl focus:ring-2 focus:ring-[#F16522]/20 focus:border-[#F16522] transition-all text-lg bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-16 animate-fade-in stagger-1">
          <button
            onClick={() => setSelectedCategory('Tous')}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              selectedCategory === 'Tous'
                ? 'bg-[#F16522] text-white shadow-lg'
                : 'bg-white text-[#6B5A4E] hover:border-[#F16522] border border-[#EFEBE9]'
            }`}
          >
            Tous
          </button>
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
                  selectedCategory === cat.name
                    ? 'bg-[#F16522] text-white shadow-lg'
                    : 'bg-white text-[#6B5A4E] hover:border-[#F16522] border border-[#EFEBE9]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-[20px] overflow-hidden mb-16 animate-slide-up border border-[#EFEBE9]">
          {filteredFAQ.length === 0 ? (
            <div className="p-12 text-center">
              <HelpCircle className="h-16 w-16 text-[#A69B95] mx-auto mb-4" />
              <p className="text-[#6B5A4E] text-lg">
                Aucune question trouvée. Essayez un autre terme de recherche.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#EFEBE9]">
              {filteredFAQ.map((item, index) => (
                <div key={index}>
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-[#FAF7F4] transition-colors text-left"
                  >
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 bg-[#F16522]/10 text-[#F16522] text-xs font-semibold rounded-full mb-2">
                        {item.category}
                      </span>
                      <h3 className="text-lg font-bold text-[#2C1810]">{item.question}</h3>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 text-[#A69B95] transition-transform flex-shrink-0 ml-4 ${
                        openItems.has(index) ? 'transform rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openItems.has(index) && (
                    <div className="px-6 pb-5 pt-2 bg-[#FAF7F4]">
                      <p className="text-[#6B5A4E] leading-relaxed">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <FooterCTA
        title="Vous ne trouvez pas de réponse ?"
        subtitle="Notre équipe support est là pour vous accompagner. Contactez-nous par téléphone, email ou via notre centre d'aide."
        icon={MessageCircle}
        buttons={[
          {
            label: 'Contactez-nous',
            href: '/contact',
            icon: Mail,
            variant: 'primary',
          },
          {
            label: "Centre d'aide",
            href: '/aide',
            icon: Phone,
            variant: 'secondary',
          },
        ]}
      />
    </div>
  );
}
