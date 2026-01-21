import { Mail, Phone, MapPin, HelpCircle, ExternalLink } from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F4]">
      <PageHeader
        title="Contactez-nous"
        subtitle="Une question ? Besoin d'aide ? Notre équipe est là pour vous accompagner."
        icon={<Mail className="h-8 w-8 text-white" />}
        breadcrumbs={[{ label: 'Contact', href: '/contact' }]}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-6 mb-16 animate-fade-in">
          <a
            href="mailto:contact@mon-toit.ci"
            className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 bg-[#F16522]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#F16522] transition-colors">
              <Mail className="h-7 w-7 text-[#F16522] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-[#2C1810] mb-2">Email</h3>
            <p className="text-[#A69B95] text-sm mb-3">Réponse sous 24h</p>
            <p className="text-[#F16522] font-semibold">contact@mon-toit.ci</p>
          </a>

          <a
            href="tel:+2250700000000"
            className="bg-white rounded-[20px] p-6 border border-[#EFEBE9] hover:border-[#F16522] hover:shadow-lg transition-all group"
          >
            <div className="w-14 h-14 bg-[#F16522]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#F16522] transition-colors">
              <Phone className="h-7 w-7 text-[#F16522] group-hover:text-white transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-[#2C1810] mb-2">Téléphone</h3>
            <p className="text-[#A69B95] text-sm mb-3">Lun-Ven 8h-18h</p>
            <p className="text-[#F16522] font-semibold">+225 07 00 00 00 00</p>
          </a>

          <div className="bg-white rounded-[20px] p-6 border border-[#EFEBE9]">
            <div className="w-14 h-14 bg-[#2C1810]/10 rounded-xl flex items-center justify-center mb-4">
              <MapPin className="h-7 w-7 text-[#2C1810]" />
            </div>
            <h3 className="text-lg font-bold text-[#2C1810] mb-2">Adresse</h3>
            <p className="text-[#A69B95] text-sm mb-3">Bureau principal</p>
            <p className="text-[#6B5A4E]">
              Abidjan, Cocody
              <br />
              Côte d'Ivoire
            </p>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-8 md:p-12 animate-slide-up border border-[#EFEBE9]">
          <h2 className="text-2xl font-bold text-[#2C1810] mb-6 text-center">
            Comment pouvons-nous vous aider ?
          </h2>

          <p className="text-[#6B5A4E] text-center mb-8 max-w-2xl mx-auto">
            Pour toute demande, envoyez-nous un email à l'adresse ci-dessous. Notre équipe vous
            répondra dans les plus brefs délais.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="mailto:contact@mon-toit.ci?subject=Contact Mon Toit"
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#F16522] text-white font-bold rounded-xl hover:bg-[#D95518] hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Mail className="h-5 w-5" />
              <span>Envoyer un email</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <a
              href="tel:+2250700000000"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#2C1810] text-[#2C1810] font-bold rounded-xl hover:bg-[#2C1810] hover:text-white transition-all duration-300"
            >
              <Phone className="h-5 w-5" />
              <span>Nous appeler</span>
            </a>
          </div>
        </div>
      </div>

      <FooterCTA
        title="Besoin d'aide supplémentaire ?"
        subtitle="Consultez notre FAQ pour des réponses immédiates ou explorez notre centre d'aide complet."
        icon={HelpCircle}
        buttons={[
          {
            label: 'Voir la FAQ',
            href: '/faq',
            icon: HelpCircle,
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
