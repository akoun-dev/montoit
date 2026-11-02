/**
 * Templates de texte pour les documents de mandat
 */

import { MandatePermissions } from '@/hooks/useAgencyMandates';

export const getMandateHeaderText = () => ({
  republic: "RÉPUBLIQUE DE CÔTE D'IVOIRE",
  motto: 'Union - Discipline - Travail',
  title: 'MANDAT DE GESTION IMMOBILIÈRE',
});

export const getPermissionLabels = (): Record<keyof MandatePermissions, string> => ({
  can_view_properties: 'Consulter les informations des biens',
  can_edit_properties: 'Modifier les annonces des biens',
  can_create_properties: 'Créer de nouvelles annonces',
  can_delete_properties: 'Supprimer des annonces',
  can_view_applications: 'Consulter les candidatures',
  can_manage_applications: 'Accepter ou refuser des candidatures',
  can_create_leases: 'Créer et signer des baux',
  can_view_financials: 'Consulter les données financières',
  can_manage_maintenance: 'Gérer les demandes de maintenance',
  can_communicate_tenants: 'Communiquer avec les locataires',
  can_manage_documents: 'Gérer les documents',
});

export const getMandateArticles = () => ({
  article1: {
    title: 'ARTICLE 1 : OBJET DU MANDAT',
    intro: 'Le mandant confie au mandataire, qui accepte, la gestion de :',
    singleProperty: 'Un bien immobilier désigné ci-après.',
    allProperties:
      "L'ensemble de ses biens immobiliers, actuels et futurs, tant que le mandat est actif.",
  },
  article2: {
    title: 'ARTICLE 2 : DURÉE DU MANDAT',
    indefinite: 'Le présent mandat est conclu pour une durée indéterminée.',
    definite: 'Le présent mandat est conclu pour une durée déterminée.',
    renewal: "Il peut être résilié par l'une ou l'autre des parties avec un préavis de 30 jours.",
  },
  article3: {
    title: 'ARTICLE 3 : RÉMUNÉRATION',
    intro: 'En contrepartie de ses services, le mandataire percevra une commission de :',
    basis: 'Cette commission est calculée sur le montant des loyers perçus.',
  },
  article4: {
    title: 'ARTICLE 4 : POUVOIRS DU MANDATAIRE',
    intro: 'Le mandant autorise expressément le mandataire à effectuer les actes suivants :',
  },
  article5: {
    title: 'ARTICLE 5 : OBLIGATIONS DU MANDATAIRE',
    obligations: [
      'Gérer les biens en bon père de famille',
      'Rendre compte régulièrement au mandant de sa gestion',
      'Reverser les loyers perçus dans un délai de 7 jours',
      'Informer le mandant de tout incident significatif',
      'Respecter la confidentialité des informations',
    ],
  },
  article6: {
    title: 'ARTICLE 6 : OBLIGATIONS DU MANDANT',
    obligations: [
      'Fournir tous les documents nécessaires à la gestion',
      'Informer le mandataire de tout changement de situation',
      'Régler les honoraires convenus dans les délais',
      'Ne pas interférer dans la gestion confiée',
    ],
  },
  article7: {
    title: 'ARTICLE 7 : RÉSILIATION',
    content:
      'Chaque partie peut résilier le présent mandat moyennant un préavis de 30 jours par lettre recommandée ou notification électronique sur la plateforme Mon Toit.',
  },
});

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('fr-FR') + ' FCFA';
};
