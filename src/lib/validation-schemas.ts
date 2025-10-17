/**
 * Schémas de validation Zod sécurisés pour la plateforme Mon Toit
 * Fournit une validation robuste contre les injections et les données malveillantes
 */

import { z } from 'zod';

/**
 * Utilitaires de validation pour les chaînes de caractères
 */
const secureString = {
  // Nettoie et valide les chaînes de caractères
  clean: (min = 1, max = 1000) => z.string()
    .min(min, `Doit contenir au moins ${min} caractère(s)`)
    .max(max, `Doit contenir au maximum ${max} caractère(s)`)
    .transform(val => val.trim())
    .refine(val => {
      // Détection de patterns suspects
      const suspiciousPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /data:text\/html/i,
        /vbscript:/i,
        /expression\s*\(/i,
        /@import/i
      ];
      return !suspiciousPatterns.some(pattern => pattern.test(val));
    }, { message: 'Contenu non autorisé détecté' }),

  // Validation pour les noms
  name: (min = 2, max = 100) => z.string()
    .min(min, `Doit contenir au moins ${min} caractère(s)`)
    .max(max, `Doit contenir au maximum ${max} caractère(s)`)
    .transform(val => val.trim())
    .refine(val => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(val), {
      message: 'Seuls les lettres, espaces, tirets et apostrophes sont autorisés'
    })
    .refine(val => !val.includes('<') && !val.includes('>'), {
      message: 'Caractères non autorisés détectés'
    }),

  // Validation pour les adresses email
  email: () => z.string()
    .email('Adresse email invalide')
    .transform(val => val.toLowerCase().trim())
    .refine(val => {
      // Vérification supplémentaire contre les injections
      const suspiciousPatterns = [
        /<[^>]*>/,
        /javascript:/i,
        /data:/i
      ];
      return !suspiciousPatterns.some(pattern => pattern.test(val));
    }, { message: 'Format d\'email non sécurisé' })
    .refine(val => val.length <= 254, {
      message: 'Adresse email trop longue'
    }),

  // Validation pour les numéros de téléphone
  phone: () => z.string()
    .transform(val => val.replace(/[\s\-\(\)]/g, '')) // Nettoyer le formatage
    .refine(val => /^\+?[0-9]{10,15}$/.test(val), {
      message: 'Numéro de téléphone invalide (10-15 chiffres)'
    })
    .refine(val => {
      // Refuser les numéros suspects
      const blockedPrefixes = ['900', '976', '890']; // Premium rate numbers
      return !blockedPrefixes.some(prefix => val.includes(prefix));
    }, { message: 'Type de numéro non autorisé' }),

  // Validation pour les URLs
  url: () => z.string()
    .url('URL invalide')
    .refine(val => {
      const url = new URL(val);
      // Accepter seulement les protocoles sécurisés
      return ['http:', 'https:'].includes(url.protocol);
    }, { message: 'Protocole non autorisé' })
    .refine(val => {
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /vbscript:/i
      ];
      return !suspiciousPatterns.some(pattern => pattern.test(val));
    }, { message: 'URL non sécurisée' })
};

/**
 * Schémas de validation pour les utilisateurs
 */
export const userSchemas = {
  // Inscription
  register: z.object({
    email: secureString.email(),
    password: z.string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .max(128, 'Le mot de passe est trop long')
      .refine(val => /[A-Z]/.test(val), {
        message: 'Le mot de passe doit contenir au moins une majuscule'
      })
      .refine(val => /[a-z]/.test(val), {
        message: 'Le mot de passe doit contenir au moins une minuscule'
      })
      .refine(val => /[0-9]/.test(val), {
        message: 'Le mot de passe doit contenir au moins un chiffre'
      })
      .refine(val => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val), {
        message: 'Le mot de passe doit contenir au moins un caractère spécial'
      }),
    full_name: secureString.name(2, 100),
    user_type: z.enum(['proprietaire', 'locataire', 'agence', 'tiers_de_confiance'], {
      errorMap: () => ({ message: 'Type d\'utilisateur invalide' })
    }),
    phone: secureString.phone().optional(),
    agree_to_terms: z.boolean().refine(val => val === true, {
      message: 'Vous devez accepter les conditions générales'
    })
  }),

  // Connexion
  login: z.object({
    email: secureString.email(),
    password: z.string().min(1, 'Le mot de passe est requis'),
    remember_me: z.boolean().optional()
  }),

  // Mise à jour de profil
  updateProfile: z.object({
    full_name: secureString.name(2, 100).optional(),
    phone: secureString.phone().optional(),
    bio: secureString.clean(0, 500).optional(),
    company_name: secureString.name(2, 100).optional(),
    company_address: secureString.clean(10, 500).optional(),
    license_number: secureString.clean(5, 50).optional()
  })
};

/**
 * Schémas de validation pour les propriétés
 */
export const propertySchemas = {
  // Création/Mise à jour de propriété
  create: z.object({
    title: secureString.clean(10, 200),
    description: secureString.clean(50, 5000),
    property_type: z.enum([
      'appartement', 'maison', 'studio', 'duplex', 'villa', 'chambre', 'commerce'
    ], {
      errorMap: () => ({ message: 'Type de propriété invalide' })
    }),
    address: secureString.clean(10, 500),
    city: secureString.name(2, 100),
    surface_area: z.number()
      .min(10, 'La surface doit être d\'au moins 10m²')
      .max(10000, 'La surface ne peut dépasser 10000m²'),
    bedrooms: z.number()
      .int()
      .min(0, 'Le nombre de chambres ne peut être négatif')
      .max(20, 'Le nombre de chambres est trop élevé'),
    bathrooms: z.number()
      .int()
      .min(0, 'Le nombre de salles de bain ne peut être négatif')
      .max(20, 'Le nombre de salles de bain est trop élevé'),
    monthly_rent: z.number()
      .min(1000, 'Le loyer doit être d\'au moins 1000 FCFA')
      .max(10000000, 'Le loyer est trop élevé'),
    deposit_amount: z.number()
      .min(0, 'Le cautionnement ne peut être négatif')
      .max(20000000, 'Le cautionnement est trop élevé'),
    is_furnished: z.boolean(),
    has_ac: z.boolean(),
    has_parking: z.boolean(),
    has_garden: z.boolean(),
    latitude: z.number()
      .min(-90, 'Latitude invalide')
      .max(90, 'Latitude invalide'),
    longitude: z.number()
      .min(-180, 'Longitude invalide')
      .max(180, 'Longitude invalide'),
    images: z.array(secureString.url()).max(50, 'Trop d\'images'),
    video_url: secureString.url().optional(),
    virtual_tour_url: secureString.url().optional(),
    work_status: z.enum([
      'aucun_travail', 'travail_prevu', 'travail_en_cours', 'travail_termine'
    ]).optional(),
    work_description: secureString.clean(0, 1000).optional(),
    work_estimated_cost: z.number().min(0).optional(),
    work_estimated_duration: z.number().min(0).optional()
  }),

  // Recherche de propriétés
  search: z.object({
    query: secureString.clean(0, 200).optional(),
    property_type: z.string().optional(),
    city: secureString.name(0, 100).optional(),
    min_price: z.number().min(0).optional(),
    max_price: z.number().min(0).optional(),
    min_surface: z.number().min(0).optional(),
    max_surface: z.number().min(0).optional(),
    bedrooms: z.number().min(0).max(20).optional(),
    furnished: z.boolean().optional(),
    page: z.number().int().min(1).max(1000).default(1),
    limit: z.number().int().min(1).max(100).default(20)
  })
};

/**
 * Schémas de validation pour les messages
 */
export const messageSchemas = {
  // Envoi de message
  send: z.object({
    receiver_id: z.string().uuid('ID du destinataire invalide'),
    content: secureString.clean(1, 5000),
    property_id: z.string().uuid().optional(),
    attachments: z.array(z.object({
      name: secureString.clean(1, 255),
      url: secureString.url(),
      type: z.string(),
      size: z.number().max(10485760) // 10MB max par fichier
    })).max(10, 'Trop de pièces jointes').optional()
  }),

  // Réponse à un message
  reply: z.object({
    message_id: z.string().uuid('ID du message invalide'),
    content: secureString.clean(1, 5000),
    attachments: z.array(z.object({
      name: secureString.clean(1, 255),
      url: secureString.url(),
      type: z.string(),
      size: z.number().max(10485760)
    })).max(10).optional()
  })
};

/**
 * Schémas de validation pour les candidatures
 */
export const applicationSchemas = {
  // Création de candidature
  create: z.object({
    property_id: z.string().uuid('ID de la propriété invalide'),
    message: secureString.clean(50, 2000),
    monthly_income: z.number().min(0).optional(),
    employment_status: z.enum([
      'employed', 'self_employed', 'unemployed', 'student', 'retired'
    ]).optional(),
    move_in_date: z.string().datetime('Date invalide').optional(),
    guarantor_info: z.object({
      name: secureString.name(2, 100),
      email: secureString.email(),
      phone: secureString.phone(),
      income: z.number().min(0)
    }).optional()
  }),

  // Mise à jour du statut de candidature
  updateStatus: z.object({
    application_id: z.string().uuid('ID de candidature invalide'),
    status: z.enum(['pending', 'approved', 'rejected', 'withdrawn'], {
      errorMap: () => ({ message: 'Statut invalide' })
    }),
    notes: secureString.clean(0, 1000).optional()
  })
};

/**
 * Schémas de validation pour l'administration
 */
export const adminSchemas = {
  // Création d'utilisateur admin
  createUser: z.object({
    email: secureString.email(),
    full_name: secureString.name(2, 100),
    user_type: z.enum(['proprietaire', 'locataire', 'agence', 'tiers_de_confiance', 'admin']),
    role: z.enum(['user', 'moderator', 'admin']).optional(),
    is_active: z.boolean().default(true)
  }),

  // Validation de documents
  validateDocument: z.object({
    document_id: z.string().uuid('ID du document invalide'),
    status: z.enum(['pending', 'approved', 'rejected']),
    rejection_reason: secureString.clean(10, 500).optional(),
    admin_notes: secureString.clean(0, 1000).optional()
  }),

  // Configuration système
  updateSettings: z.object({
    key: secureString.clean(1, 100),
    value: z.any(), // Validation spécifique selon le type de valeur
    description: secureString.clean(0, 500).optional()
  })
};

/**
 * Schémas de validation pour le support
 */
export const supportSchemas = {
  // Création de ticket de support
  createTicket: z.object({
    subject: secureString.clean(10, 200),
    category: z.enum([
      'technical', 'account', 'billing', 'property', 'safety', 'other'
    ]),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    description: secureString.clean(50, 5000),
    attachments: z.array(z.object({
      name: secureString.clean(1, 255),
      url: secureString.url(),
      type: z.string(),
      size: z.number().max(10485760)
    })).max(5).optional()
  }),

  // Réponse à un ticket
  replyTicket: z.object({
    ticket_id: z.string().uuid('ID du ticket invalide'),
    message: secureString.clean(10, 5000),
    attachments: z.array(z.object({
      name: secureString.clean(1, 255),
      url: secureString.url(),
      type: z.string(),
      size: z.number().max(10485760)
    })).max(5).optional(),
    is_internal: z.boolean().default(false)
  })
};

/**
 * Middleware de validation pour Express (si utilisé côté serveur)
 */
export const validateSchema = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

/**
 * Hook React pour la validation de formulaires
 */
export const useFormValidation = <T extends z.ZodSchema>(
  schema: T,
  initialValues: z.infer<T>
) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState(initialValues);

  const validateField = (name: string, value: any) => {
    try {
      const fieldSchema = schema.shape[name];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === name);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [name]: fieldError.message }));
        }
      }
    }
  };

  const validateForm = () => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path.join('.');
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const setValue = (name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const setFieldTouched = (name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, values[name as keyof T]);
  };

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validateForm,
    setValues
  };
};

// Import pour le hook
import { useState } from 'react';

export default {
  userSchemas,
  propertySchemas,
  messageSchemas,
  applicationSchemas,
  adminSchemas,
  supportSchemas,
  validateSchema,
  useFormValidation
};