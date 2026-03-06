import React from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../../../shared/components/PageLayout';
import Breadcrumb from '../../../shared/components/Breadcrumb';
import PropertyForm from '../../features/property/components/PropertyForm';
import { Home, MapPin, Users, Star, ArrowRight } from 'lucide-react';

const AddPropertyPage: React.FC = () => {
  const steps = [
    { label: 'Informations générales', number: 1 },
    { label: 'Localisation', number: 2 },
    { label: 'Photos', number: 3 },
    { label: 'Tarif & Contact', number: 4 },
    { label: 'Validation', number: 5 }
  ];

  const benefits = [
    {
      icon: <Star className="w-6 h-6 text-yellow-500" />,
      title: "Publication gratuite",
      description: "Créez et publiez votre annonce sans frais"
    },
    {
      icon: <Users className="w-6 h-6 text-blue-500" />,
      title: "Visibilité maximale",
      description: "Touche des milliers d'acheteurs potentiels"
    },
    {
      icon: <MapPin className="w-6 h-6 text-green-500" />,
      title: "Géolocalisation précise",
      description: "Localisez précisément votre bien immobilier"
    }
  ];

  const tips = [
    {
      icon: "📸",
      title: "Photos de qualité",
      content: "Des photos attractives multiplient par 5 vos chances de vente"
    },
    {
      icon: "💰",
      title: "Prix réaliste",
      content: "Un prix compétitif accélère la vente ou la location"
    },
    {
      icon: "📝",
      title: "Description détaillée",
      content: "Une description complète rassure les acheteurs"
    },
    {
      icon: "🏠",
      title: "Localisation claire",
      content: "Une bonne localisation attire plus de visiteurs"
    }
  ];

  return (
    <PageLayout>
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Accueil', href: '/' },
        { label: 'Tableau de bord', href: '/dashboard' },
        { label: 'Ajouter une Propriété', href: '/add-property' }
      ]} />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ajouter une Propriété
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Publiez votre bien immobilier en quelques étapes. Notre processus guidé vous accompagne de la création à la publication.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Pourquoi choisir MonToit pour publier ?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{benefit.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Process Overview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Processus en 5 étapes
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {steps.map((step, index) => (
              <React.Fragment key={index}>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {step.number}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Star className="w-5 h-5 mr-2 text-yellow-500" />
            Conseils pour réussir votre annonce
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="text-2xl">{tip.icon}</div>
                <div>
                  <h3 className="font-medium text-gray-900">{tip.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{tip.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <PropertyForm />
        </div>

        {/* Help Section */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <Home className="w-5 h-5 mr-2" />
            <span className="text-sm">
              Besoin d'aide ? 
              <Link to="/help" className="ml-1 underline hover:no-underline">
                Consultez notre guide
              </Link>
            </span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default AddPropertyPage;
