import { z } from "zod";
import { VALIDATION_LIMITS, PROPERTY_LIMITS } from "@/constants";

export const propertySchema = z.object({
  title: z.string()
    .min(VALIDATION_LIMITS.MIN_TITLE_LENGTH, `Le titre doit contenir au moins ${VALIDATION_LIMITS.MIN_TITLE_LENGTH} caractères`)
    .max(VALIDATION_LIMITS.MAX_TITLE_LENGTH, `Le titre ne doit pas dépasser ${VALIDATION_LIMITS.MAX_TITLE_LENGTH} caractères`),
  description: z.string()
    .min(VALIDATION_LIMITS.MIN_DESCRIPTION_LENGTH, `La description doit contenir au moins ${VALIDATION_LIMITS.MIN_DESCRIPTION_LENGTH} caractères`)
    .max(VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH, `La description ne doit pas dépasser ${VALIDATION_LIMITS.MAX_DESCRIPTION_LENGTH} caractères`),
  property_type: z.string().min(1, "Le type de bien est requis"),
  address: z.string()
    .min(VALIDATION_LIMITS.MIN_ADDRESS_LENGTH, `L'adresse doit contenir au moins ${VALIDATION_LIMITS.MIN_ADDRESS_LENGTH} caractères`)
    .max(VALIDATION_LIMITS.MAX_ADDRESS_LENGTH, `L'adresse ne doit pas dépasser ${VALIDATION_LIMITS.MAX_ADDRESS_LENGTH} caractères`),
  city: z.string().min(1, "La ville est requise"),
  bedrooms: z.coerce.number()
    .min(PROPERTY_LIMITS.MIN_BEDROOMS, `Minimum ${PROPERTY_LIMITS.MIN_BEDROOMS} chambre`)
    .max(PROPERTY_LIMITS.MAX_BEDROOMS, `Maximum ${PROPERTY_LIMITS.MAX_BEDROOMS} chambres`),
  bathrooms: z.coerce.number()
    .min(PROPERTY_LIMITS.MIN_BATHROOMS, `Minimum ${PROPERTY_LIMITS.MIN_BATHROOMS} salle de bain`)
    .max(PROPERTY_LIMITS.MAX_BATHROOMS, `Maximum ${PROPERTY_LIMITS.MAX_BATHROOMS} salles de bain`),
  surface_area: z.coerce.number()
    .min(PROPERTY_LIMITS.MIN_SURFACE, `Minimum ${PROPERTY_LIMITS.MIN_SURFACE}m²`)
    .max(PROPERTY_LIMITS.MAX_SURFACE, `Maximum ${PROPERTY_LIMITS.MAX_SURFACE}m²`),
  monthly_rent: z.coerce.number()
    .min(PROPERTY_LIMITS.MIN_RENT, `Minimum ${PROPERTY_LIMITS.MIN_RENT} FCFA`)
    .max(PROPERTY_LIMITS.MAX_RENT, `Maximum ${PROPERTY_LIMITS.MAX_RENT} FCFA`),
  deposit_amount: z.coerce.number()
    .min(1, "La caution est obligatoire et doit être supérieure à 0 FCFA"),
  is_furnished: z.boolean().default(false),
  has_ac: z.boolean().default(false),
  has_parking: z.boolean().default(false),
  has_garden: z.boolean().default(false),
  work_status: z.enum(["aucun_travail", "travaux_a_effectuer"]).default("aucun_travail"),
  work_description: z.string().optional(),
  work_images: z.array(z.string()).optional().default([]),
  work_estimated_cost: z.number().nullable().optional(),
  work_estimated_duration: z.string().nullable().optional(),
  work_start_date: z.string().nullable().optional(),
  title_deed_url: z.string().optional(),
});

export type PropertyFormData = z.infer<typeof propertySchema>;
