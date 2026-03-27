/**
 * Templates de notifications pour les décisions de verification
 */

import type { NotificationTemplate, NotificationCategory } from '@/types/notification.types';

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Verification réussie - Locataire
  'tenant_verification_approved': {
    id: 'tenant_verification_approved',
    code: 'tenant_verification_approved',
    category: 'verification_result',
    channels: ['email', 'sms', 'in_app'],
    priority: 'high',
    subject: 'Votre dossier a été validé !',
    template_fr: `Bonjour {{full_name},

Nous avons le plaisir de vous informer que votre dossier locatif a été validé avec succès !

Détails de la décision :
- Date : {{decision_date}}
- Référence : {{application_id}}
- Durée de validité : {{validity_duration_months}} mois
- Valable jusqu'au : {{valid_until}}

Prochaines étapes :
1. Complétez votre profil si ce n'est pas déjà fait
2. Commencez à rechercher vos futurs logements
3. Répondez aux propriétaires qui vous intéressent

Votre score de confiance est de {{trust_score}}%.

Important : Vous serez notifié 30 jours avant l'expiration de votre dossier.

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'decision_date', 'application_id', 'trust_score', 'validity_duration_months', 'valid_until'],
  },

  // Verification rejetée - Locataire
  'tenant_verification_rejected': {
    id: 'tenant_verification_rejected',
    code: 'tenant_verification_rejected',
    category: 'verification_result',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'Votre dossier nécessite des corrections',
    template_fr: `Bonjour {{full_name}},

Après examen, votre dossier n'a pas pu être validé pour la raison suivante :

Motif : {{rejection_reason}}

Documents concernés : {{rejected_docs}}

Que pouvez-vous faire ?
1. Corrigez les documents mentionnés
2. Soumettez à nouveau votre dossier complet
3. Contactez-nous si vous avez des questions : support@montoit.ci

Nous restons à votre disposition pour vous accompagner.

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'rejection_reason', 'rejected_docs', 'application_id'],
  },

  // Demande de documents complémentaires
  'additional_documents_requested': {
    id: 'additional_documents_requested',
    code: 'additional_documents_requested',
    category: 'document_request',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: '📎 Documents complémentaires requis',
    template_fr: `Bonjour {{full_name}},

Votre dossier est en cours d'examen et nous avons besoin de documents supplémentaires pour poursuivre la vérification.

📋 Documents demandés :
{{required_documents}}

Délai : {{deadline}}

Merci de les télécharger via votre espace personnel dès que possible.

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'required_documents', 'deadline', 'application_id'],
  },

  // Verification approuvée - Propriétaire
  'owner_verification_approved': {
    id: 'owner_verification_approved',
    code: 'owner_verification_approved',
    category: 'verification_result',
    channels: ['email', 'sms', 'in_app'],
    priority: 'high',
    subject: 'Votre compte propriétaire est certifié',
    template_fr: `Bonjour {{full_name}},

Félicitations ! Votre compte propriétaire a obtenu la certification ANSUT.

Certification : {{certification_number}}
Date : {{certification_date}}
Durée de validité : {{validity_duration_months}} mois
Valable jusqu'au : {{valid_until}}

Bénéfices de votre certification :
- Badge de vérification sur votre profil
- Visibilité améliorée auprès des locataires
- Crédit de confiance accru

Vous pouvez maintenant :
- Gérer vos biens plus efficacement
- Répondre aux candidatures avec confiance
- Accéder à des fonctionnalités premium

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'certification_number', 'certification_date', 'validity_duration_months', 'valid_until'],
  },

  // Verification rejetée - Propriétaire
  'owner_verification_rejected': {
    id: 'owner_verification_rejected',
    code: 'owner_verification_rejected',
    category: 'verification_result',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'Votre certification a été refusée',
    template_fr: `Bonjour {{full_name}},

Nous regrettons de vous informer que votre certification propriétaire a été refusée.

Motif : {{rejection_reason}}
Documents concernés : {{rejected_docs}}

Que pouvez-vous faire ?
1. Corrigez les documents mentionnés
2. Soumettez à nouveau votre dossier
3. Contactez le support : support@montoit.ci

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'rejection_reason', 'rejected_docs', 'application_id'],
  },

  // Verification approuvée - Agence
  'agency_verification_approved': {
    id: 'agency_verification_approved',
    code: 'agency_verification_approved',
    category: 'verification_result',
    channels: ['email', 'sms', 'in_app'],
    priority: 'high',
    subject: 'Votre agence est certifiée ANSUT',
    template_fr: `Bonjour {{agency_name}},

Excellente nouvelle ! Votre agence a obtenu la certification ANSUT.

Certification : {{certification_number}}
Date : {{certification_date}}
Durée de validité : {{validity_duration_months}} mois
Valable jusqu'au : {{valid_until}}

Votre agence apparaîtra maintenant comme vérifiée sur la plateforme.

Cordialement,
L'équipe MonToit`,
    variables: ['agency_name', 'certification_number', 'certification_date', 'agency_id', 'validity_duration_months', 'valid_until'],
  },

  // Verification rejetée - Agence
  'agency_verification_rejected': {
    id: 'agency_verification_rejected',
    code: 'agency_verification_rejected',
    category: 'verification_result',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'Certification agence refusée',
    template_fr: `Bonjour {{agency_name}},

Nous regrettons de vous informer que la certification de votre agence a été refusée.

Motif : {{rejection_reason}}
Documents concernés : {{rejected_docs}}

Pour plus d'informations, contactez notre support technique.

Cordialement,
L'équipe MonToit`,
    variables: ['agency_name', 'rejection_reason', 'rejected_docs', 'agency_id'],
  },

  // Document approuvé
  'document_approved': {
    id: 'document_approved',
    code: 'document_approved',
    category: 'verification_result',
    channels: ['in_app'],
    priority: 'normal',
    subject: 'Document vérifié',
    template_fr: null, // Notification in-app seulement
    variables: ['document_type', 'document_name'],
  },

  // Document rejeté
  'document_rejected': {
    id: 'document_rejected',
    code: 'document_rejected',
    category: 'verification_result',
    channels: ['email', 'in_app'],
    priority: 'normal',
    subject: 'Document refusé',
    template_fr: `Bonjour {{full_name}},

Le document "{{document_name}}" a été refusé pour la raison suivante :
{{rejection_reason}}

Merci de soumettre un nouveau document.`,
    variables: ['full_name', 'document_name', 'rejection_type', 'rejection_reason'],
  },

  // Rappel avant expiration
  'verification_expiring_soon': {
    id: 'verification_expiring_soon',
    code: 'verification_expiring_soon',
    category: 'profile',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'Votre vérification expire bientôt',
    template_fr: `Bonjour {{full_name}},

Votre vérification "{{verification_type}}" expire dans {{days_left}} jours.

Pensez à la renouveler pour conserver votre score de confiance.

Pour renouveler :
1. Connectez-vous à votre compte
2. Allez dans "Mon profil" > "Vérifications"
3. Soumettez à nouveau vos documents

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'verification_type', 'days_left', 'verification_id'],
  },

  // Verification expirée
  'verification_expired': {
    id: 'verification_expired',
    code: 'verification_expired',
    category: 'profile',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'Votre vérification a expiré',
    template_fr: `Bonjour {{full_name}},

Votre vérification "{{verification_type}}" est expirée depuis {{expired_since}} jours.

Votre score de confiance a été ajusté en conséquence.

Pour restaurer votre score :
1. Connectez-vous à votre compte
2. Allez dans "Mon profil" > "Vérifications"
3. Renouvelez vos documents

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'verification_type', 'expired_since', 'verification_id'],
  },

  // Nouvelle demande de visite - Pour le propriétaire
  'new_visit_requested': {
    id: 'new_visit_requested',
    code: 'new_visit_requested',
    category: 'approval_needed',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'Nouvelle demande de visite - {{property_title}}',
    template_fr: `Bonjour {{owner_name}},

Vous avez reçu une nouvelle demande de visite pour votre propriété :

{{property_title}}
Date : {{visit_date}}
Heure : {{visit_time}}
Candidat : {{tenant_name}}
Contact : {{tenant_phone}}
Email : {{tenant_email}}
Type de visite : {{visit_type_label}}

Connectez-vous à votre espace propriétaire pour confirmer ou annuler cette visite.

Cordialement,
L'équipe MonToit`,
    variables: ['owner_name', 'property_title', 'visit_date', 'visit_time', 'tenant_name', 'tenant_phone', 'tenant_email', 'visit_type_label'],
  },

  // VISITE CONFIRMÉE - Pour le locataire
  'visit_confirmed': {
    id: 'visit_confirmed',
    code: 'visit_confirmed',
    category: 'approval_needed',
    channels: ['email', 'in_app'],
    priority: 'high',
    subject: 'VISITE CONFIRMÉE - {{property_title}}',
    template_fr: `Bonjour {{tenant_name}},

Votre visite a été confirmée par le propriétaire :

{{property_title}}
Date : {{visit_date}}
Heure : {{visit_time}}
Adresse : {{property_address}}

Merci de ponctualité. En cas d'empêchement, merci de prévenir le propriétaire.

Cordialement,
L'équipe MonToit`,
    variables: ['tenant_name', 'property_title', 'visit_date', 'visit_time', 'property_address'],
  },

  // Visite annulée - Pour le locataire
  'visit_cancelled': {
    id: 'visit_cancelled',
    code: 'visit_cancelled',
    category: 'approval_needed',
    channels: ['email', 'in_app'],
    priority: 'normal',
    subject: 'Visite annulée - {{property_title}}',
    template_fr: `Bonjour {{tenant_name},

La visite pour {{property_title}} prévue le {{visit_date}} à {{visit_time}} a été annulée par le propriétaire.

N'hésitez pas à contacter le propriétaire pour plus d'informations ou à planifier une nouvelle visite.

Cordialement,
L'équipe MonToit`,
    variables: ['tenant_name', 'property_title', 'visit_date', 'visit_time', 'cancellation_reason'],
  },

  // Rappel de visite programmée
  'visit_reminder': {
    id: 'visit_reminder',
    code: 'visit_reminder',
    category: 'approval_needed',
    channels: ['email', 'sms', 'in_app'],
    priority: 'high',
    subject: 'Rappel : Visite prévue demain - {{property_title}}',
    template_fr: `Bonjour {{full_name}},

Rappel : Vous avez une visite programmée demain :

{{property_title}}
Date : {{visit_date}}
Heure : {{visit_time}}
Adresse : {{property_address}}

Pensez à préparer votre visite.

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'property_title', 'visit_date', 'visit_time', 'property_address'],
  },

  // ===== MON-056 : Alertes de recherche de biens =====

  // Nouveau bien correspondant à une recherche sauvegardée
  'new_property_match': {
    id: 'new_property_match',
    code: 'new_property_match',
    category: 'property',
    channels: ['email', 'in_app', 'push'],
    priority: 'high',
    subject: '🏠 Un bien correspond à votre recherche "{{search_name}}"',
    template_fr: `Bonjour {{full_name}},

Bonne nouvelle ! Un nouveau bien correspond à votre recherche sauvegardée :

{{search_name}}

📍 {{property_title}}
🏙️ {{property_city}}
💰 {{property_price}}€/mois
{{#property_has_bedrooms}}
🛏️ {{property_bedrooms}} chambre(s)
{{/property_has_bedrooms}}
{{#property_surface}}
📐 {{property_surface}}m²
{{/property_surface}}

{{search_description}}

Voir le bien :
{{property_url}}

Vous recevrez ce type de notification selon vos préférences :
{{alert_frequency}}

Pour gérer vos alertes, connectez-vous à votre espace locataire.

À bientôt sur MonToit !`,
    variables: ['full_name', 'search_name', 'search_id', 'property_title', 'property_city', 'property_price', 'property_id', 'property_url', 'property_image', 'property_bedrooms', 'property_surface', 'property_has_bedrooms', 'search_description', 'alert_frequency'],
  },

  // Résumé quotidien des nouveaux biens correspondants
  'property_match_daily_summary': {
    id: 'property_match_daily_summary',
    code: 'property_match_daily_summary',
    category: 'property',
    channels: ['email', 'in_app'],
    priority: 'normal',
    subject: '🏠 {{match_count}} bien(s) correspond(ent) à vos recherches',
    template_fr: `Bonjour {{full_name}},

Voici le résumé des nouveaux biens correspondant à vos recherches sauvegardées :

{{#has_matches}}
Vous avez {{match_count}} nouvelle(s) correspondance(s) aujourd'hui :

{{matches_list}}

Pour voir tous les détails, connectez-vous à votre espace locataire.
{{/has_matches}}
{{^has_matches}}
Aucun nouveau bien ne correspond à vos critères aujourd'hui.

Nous continuons à rechercher pour vous !
{{/has_matches}}

Pour gérer vos alertes :
{{manage_alerts_url}}

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'match_count', 'matches_list', 'has_matches', 'manage_alerts_url', 'date'],
  },

  // Résumé hebdomadaire des nouveaux biens correspondants
  'property_match_weekly_summary': {
    id: 'property_match_weekly_summary',
    code: 'property_match_weekly_summary',
    category: 'property',
    channels: ['email'],
    priority: 'normal',
    subject: '🏠 Résumé hebdomadaire - {{match_count}} bien(s) correspond(ent)',
    template_fr: `Bonjour {{full_name}},

Voici votre résumé hebdomadaire des biens correspondant à vos recherches :

{{#has_matches}}
Cette semaine, {{match_count}} bien(s) correspondent(nt) à vos critères :

{{matches_list}}

{{/has_matches}}
{{^has_matches}}
Aucun nouveau bien ne correspond parfaitement à vos critères cette semaine.

Conseils :
- Élargissez vos critères de recherche (ville, prix, surface)
- Ajoutez d'autres types de biens
- Modifiez vos alertes depuis votre espace locataire

{{/has_matches}}

Pour gérer vos alertes :
{{manage_alerts_url}}

Cordialement,
L'équipe MonToit`,
    variables: ['full_name', 'match_count', 'matches_list', 'has_matches', 'manage_alerts_url', 'week_start', 'week_end'],
  },
};

/**
 * Obtient un template par son code
 */
export function getTemplate(code: string): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES[code];
}

/**
 * Obtient tous les templates d'une catégorie
 */
export function getTemplatesByCategory(category: NotificationCategory): NotificationTemplate[] {
  return Object.values(NOTIFICATION_TEMPLATES).filter(t => t.category === category);
}

/**
 * Génère le contenu d'une notification à partir d'un template et de données
 */
export function renderTemplate(template: NotificationTemplate, data: Record<string, unknown>): string {
  let content = template.template_fr;

  for (const variable of template.variables) {
    const placeholder = `{{${variable}}}`;
    const value = data[variable] ?? `[${variable}]`;
    content = content.replace(new RegExp(placeholder, 'g'), String(value));
  }

  return content;
}

export default NOTIFICATION_TEMPLATES;
