/**
 * RoleSelectionPage - Page de sélection du rôle utilisateur
 *
 * Affichée après l'inscription réussie
 * Permet de choisir entre Locataire, Propriétaire, Agence
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Star,
  Shield,
  ArrowRight,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useBrevoAuth } from '@/hooks/useBrevoAuth';

const roles = [
  {
    value: 'locataire',
    label: 'Locataire',
    icon: Home,
    color: 'blue',
    description: 'Je cherche un logement',
    features: [
      'Recherche avancée',
      'Alertes personnalisées',
      'Candidature en 1 clic',
      'Signature électronique',
    ],
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    value: 'proprietaire',
    label: 'Propriétaire',
    icon: Star,
    color: 'orange',
    description: 'Je mets un bien en location',
    features: [
      'Publication illimitée',
      'Vérification locataires',
      'Contrats digitaux',
      'Gestion des paiements',
    ],
    gradient: 'from-orange-500 to-orange-600',
  },
  {
    value: 'agence',
    label: 'Agence',
    icon: Shield,
    color: 'purple',
    description: 'Je gère plusieurs biens',
    features: [
      'Portfolio multi-biens',
      'Gestion d\'équipe',
      'Reporting avancé',
      'Suivi des mandats',
    ],
    gradient: 'from-purple-500 to-purple-600',
  },
] as const;

export default function RoleSelectionPage() {
  const navigate = useNavigate();
  const { loading, selectRole } = useBrevoAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleRoleSelect = async (roleValue: string) => {
    setSelectedRole(roleValue);
    await selectRole(roleValue as 'locataire' | 'proprietaire' | 'agence');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F4] to-white flex flex-col justify-center items-center p-6">
      {/* Header */}
      <div className="w-full max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-[#2C1810] mb-4">
          Bienvenue sur Mon Toit !
        </h1>
        <p className="text-xl text-[#6B5A4E] mb-2">
          Votre compte a été créé avec succès
        </p>
        <p className="text-[#A69B95]">
          Choisissez votre profil pour commencer votre expérience
        </p>
      </div>

      {/* Grille des rôles */}
      <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {roles.map((role) => {
          const isSelected = selectedRole === role.value;
          return (
            <button
              key={role.value}
              onClick={() => !loading && handleRoleSelect(role.value)}
              disabled={loading}
              className={`
                relative group p-6 rounded-2xl border-2 transition-all duration-300
                ${isSelected
                  ? 'border-transparent shadow-2xl transform scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-xl'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Gradient background pour le rôle sélectionné */}
              {isSelected && (
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} opacity-10`} />
              )}

              <div className="relative z-10">
                {/* Icône du rôle */}
                <div className={`
                  inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4
                  ${isSelected
                    ? `bg-gradient-to-br ${role.gradient} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                  }
                `}>
                  <role.icon className="w-8 h-8" />
                </div>

                {/* Titre */}
                <h3 className="text-xl font-bold text-[#2C1810] mb-2">
                  {role.label}
                </h3>

                {/* Description */}
                <p className="text-sm text-[#6B5A4E] mb-4">
                  {role.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 text-left">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className={`
                        w-1.5 h-1.5 rounded-full
                        ${isSelected
                          ? `bg-gradient-to-r ${role.gradient}`
                          : 'bg-gray-300'
                        }
                      } />
                      <span className={isSelected ? 'text-[#2C1810]' : 'text-[#6B5A4E]'}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Indicateur de sélection */}
                {isSelected && (
                  <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Configuration en cours...
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Note */}
      <div className="text-center text-sm text-[#A69B95]">
        <p>
          Vous pourrez modifier votre profil plus tard depuis les paramètres de votre compte.
        </p>
      </div>

      {/* Footer branding */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-[#A69B95]">
          <strong>Mon Toit</strong> - Certifié ANSUT Côte d'Ivoire
        </p>
      </div>
    </div>
  );
}