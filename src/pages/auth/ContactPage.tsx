import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import PageHeader from '@/shared/components/PageHeader';
import FooterCTA from '@/shared/components/FooterCTA';
import { useAuth } from '@/app/providers/AuthProvider';
import { supportService, CreateTicketData } from '@/services/support/support.service';
import { toast } from 'sonner';

type FormField = 'name' | 'email' | 'subject' | 'category' | 'message';

export default function ContactPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
    email: user?.email || '',
    subject: '',
    category: 'other' as CreateTicketData['category'],
    message: '',
  });

  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});

  const categories = [
    { value: 'technical', label: 'Technique', icon: '🔧' },
    { value: 'billing', label: 'Facturation', icon: '💳' },
    { value: 'account', label: 'Compte', icon: '👤' },
    { value: 'property', label: 'Propriété', icon: '🏠' },
    { value: 'booking', label: 'Réservation', icon: '📅' },
    { value: 'payment', label: 'Paiement', icon: '💰' },
    { value: 'verification', label: 'Vérification', icon: '✓' },
    { value: 'other', label: 'Autre', icon: '❓' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<FormField, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Le sujet est requis';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Le message est requis';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Le message doit contenir au moins 10 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // If user is authenticated, create a support ticket
      if (user) {
        const result = await supportService.createSupportTicket(user.id, {
          subject: formData.subject,
          description: formData.message,
          category: formData.category,
        });

        setTicketNumber(result.ticket_number);
      } else {
        // For non-authenticated users, just show success
        // They would need to be redirected to create an account first
        toast.info('Connectez-vous pour créer un ticket de support');
        navigate('/connexion?redirect=' + encodeURIComponent('/contact'));
        return;
      }

      setSubmitted(true);
      toast.success('Votre message a été envoyé avec succès !');
    } catch (error) {
      console.error('Error submitting contact form:', error);
      toast.error('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
      email: user?.email || '',
      subject: '',
      category: 'other',
      message: '',
    });
    setSubmitted(false);
    setTicketNumber('');
    setErrors({});
  };

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

        {/* Contact Form */}
        <div className="bg-white rounded-[24px] p-8 md:p-12 animate-slide-up border border-[#EFEBE9]">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#2C1810] mb-4">
                Message envoyé avec succès !
              </h2>
              <p className="text-[#6B5A4E] mb-6 max-w-lg mx-auto">
                {ticketNumber && (
                  <>Votre ticket de support a été créé avec le numéro <strong>{ticketNumber}</strong>.</>
                )}
                Notre équipe vous répondra dans les plus brefs délais.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#F16522] text-white font-semibold rounded-xl hover:bg-[#D95518] transition-colors"
                >
                  <Send className="h-4 w-4" />
                  Envoyer un autre message
                </button>
                <a
                  href="/support/tickets"
                  className="inline-flex items-center gap-2 px-6 py-3 border-2 border-[#2C1810] text-[#2C1810] font-semibold rounded-xl hover:bg-[#2C1810] hover:text-white transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Voir mes tickets
                </a>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#2C1810] mb-2 text-center">
                Envoyez-nous un message
              </h2>
              <p className="text-[#6B5A4E] text-center mb-8 max-w-2xl mx-auto">
                Remplissez le formulaire ci-dessous et notre équipe vous répondra dans les plus brefs délais.
              </p>

              <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#2C1810] mb-2">
                      Nom complet *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-colors ${
                        errors.name
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-[#EFEBE9] focus:border-[#F16522] focus:ring-orange-200'
                      }`}
                      placeholder="Votre nom"
                    />
                    {errors.name && (
                      <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#2C1810] mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-colors ${
                        errors.email
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                          : 'border-[#EFEBE9] focus:border-[#F16522] focus:ring-orange-200'
                      }`}
                      placeholder="votre@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-[#2C1810] mb-2">
                    Catégorie
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CreateTicketData['category'] })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#EFEBE9] focus:border-[#F16522] focus:ring-2 focus:ring-orange-200 focus:outline-none transition-colors"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-[#2C1810] mb-2">
                    Sujet *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-colors ${
                      errors.subject
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#EFEBE9] focus:border-[#F16522] focus:ring-orange-200'
                    }`}
                    placeholder="Sujet de votre message"
                  />
                  {errors.subject && (
                    <p className="text-red-600 text-sm mt-1">{errors.subject}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-[#2C1810] mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={6}
                    className={`w-full px-4 py-3 rounded-xl border-2 focus:outline-none focus:ring-2 transition-colors resize-none ${
                      errors.message
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                        : 'border-[#EFEBE9] focus:border-[#F16522] focus:ring-orange-200'
                    }`}
                    placeholder="Décrivez votre demande ou votre problème..."
                  />
                  {errors.message && (
                    <p className="text-red-600 text-sm mt-1">{errors.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#F16522] text-white font-bold rounded-xl hover:bg-[#D95518] hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Envoyer le message</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
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
