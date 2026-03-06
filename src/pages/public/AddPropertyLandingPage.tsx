import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, CheckCircle, Shield, Camera, FileText, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function AddPropertyLandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard/ajouter-propriete');
    }
  }, [user, navigate]);

  const benefits = [
    {
      icon: TrendingUp,
      title: 'Visibilité maximale',
      description: 'Votre bien sera visible par des milliers de locataires potentiels'
    },
    {
      icon: Shield,
      title: 'Locataires vérifiés',
      description: 'Tous les locataires sont vérifiés (identité, solvabilité, antécédents)'
    },
    {
      icon: FileText,
      title: 'Contrats automatisés',
      description: 'Génération automatique de contrats conformes à la loi ivoirienne'
    },
    {
      icon: CheckCircle,
      title: 'Paiements sécurisés',
      description: 'Recevez vos loyers directement via Mobile Money ou virement bancaire'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'Créez votre compte',
      description: 'Inscription gratuite en 2 minutes'
    },
    {
      number: '2',
      title: 'Ajoutez votre bien',
      description: 'Renseignez les détails et ajoutez des photos'
    },
    {
      number: '3',
      title: 'Recevez des demandes',
      description: 'Les locataires vous contactent directement'
    },
    {
      number: '4',
      title: 'Louez en toute sécurité',
      description: 'Signature électronique et paiements automatisés'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-6 shadow-xl">
            <Home className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Louez votre bien en toute sérénité
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Rejoignez des centaines de propriétaires qui font confiance à <span className="font-bold text-orange-600">Mon Toit</span> pour louer leurs biens en Côte d'Ivoire
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/inscription?type=proprietaire&redirect=/dashboard/ajouter-propriete"
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold rounded-xl hover:from-orange-700 hover:to-orange-600 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <span>Commencer gratuitement</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              to="/connexion?redirect=/dashboard/ajouter-propriete"
              className="px-8 py-4 bg-white text-orange-600 font-bold rounded-xl border-2 border-orange-600 hover:bg-orange-50 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <span>J'ai déjà un compte</span>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 mb-20">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            Comment ça marche ?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 text-white text-2xl font-bold shadow-lg">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-orange-400 to-orange-200" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-3xl shadow-2xl p-8 md:p-12 text-white text-center">
          <Camera className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Publiez votre première annonce gratuitement
          </h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Aucun frais d'inscription. Aucun engagement. Commencez dès maintenant et trouvez le locataire idéal.
          </p>
          <Link
            to="/inscription?type=proprietaire&redirect=/dashboard/ajouter-propriete"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-all shadow-lg hover:shadow-xl"
          >
            <span>Créer mon compte propriétaire</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">Besoin d'aide ?</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/aide" className="text-orange-600 hover:text-orange-700 font-semibold">
              Centre d'aide
            </Link>
            <span className="text-gray-400">•</span>
            <Link to="/contact" className="text-orange-600 hover:text-orange-700 font-semibold">
              Nous contacter
            </Link>
            <span className="text-gray-400">•</span>
            <Link to="/a-propos" className="text-orange-600 hover:text-orange-700 font-semibold">
              À propos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
