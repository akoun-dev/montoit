import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/constants';
import { propertySchema, type PropertyFormData } from '@/components/property/form/PropertyFormSchema';
import { usePropertyPermissions } from './usePropertyPermissions';
import { AppError, handleError, handleSuccess } from '@/lib/errorHandler';
import { logger } from '@/services/logger';
import type { MediaUrls } from './useMediaUpload';

/**
 * Hook for managing property form state and submission
 * Handles both creation and update of properties
 */
export const usePropertyForm = (propertyId?: string) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, profile } = usePropertyPermissions();

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      title: '',
      description: '',
      property_type: '',
      address: '',
      city: '',
      bedrooms: 0,
      bathrooms: 0,
      surface_area: 0,
      is_furnished: false,
      has_ac: false,
      has_parking: false,
      has_garden: false,
      monthly_rent: 0,
      deposit_amount: 0,
    },
  });

  /**
   * Load existing property data (for edit mode)
   */
  const loadProperty = async (): Promise<void> => {
    if (!propertyId) return;

    setLoading(true);
    try {
      const { data: property, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error || !property) {
        logger.error('Failed to load property', { error, propertyId });
        handleError(new AppError('PROPERTY_LOAD_FAILED'));
        navigate('/mes-biens');
        return;
      }

      // Populate form with existing data
      form.reset({
        title: property.title,
        description: property.description || '',
        property_type: property.property_type,
        address: property.address,
        city: property.city,
        bedrooms: property.bedrooms || 1,
        bathrooms: property.bathrooms || 1,
        surface_area: property.surface_area || 50,
        is_furnished: property.is_furnished || false,
        has_ac: property.has_ac || false,
        has_parking: property.has_parking || false,
        has_garden: property.has_garden || false,
        monthly_rent: property.monthly_rent,
        deposit_amount: property.deposit_amount || 0,
      });

      logger.info('Property loaded successfully', { propertyId });
    } catch (error) {
      handleError(error, ERROR_MESSAGES.PROPERTY_LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Geocode address to get coordinates
   */
  const geocodeAddress = async (
    address: string,
    city: string
  ): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address, city },
      });

      if (error || !data) {
        logger.error('Geocoding failed', { error, address, city });
        handleError(new AppError('GEOCODING_FAILED'));
        return null;
      }

      return data;
    } catch (error) {
      logger.error('Geocode error', { error, address, city });
      return null;
    }
  };

  /**
   * Submit property (create or update)
   */
  const submitProperty = async (
    data: PropertyFormData,
    mediaUrls: MediaUrls,
    overridePropertyId?: string,
    manualCoords?: { lat: number; lng: number } | null
  ): Promise<string> => {
    if (!user || !profile) {
      throw new AppError('AUTH_REQUIRED');
    }

    setSubmitting(true);

    try {
      // Use manual coordinates if provided, otherwise geocode
      let coords = manualCoords ? { latitude: manualCoords.lat, longitude: manualCoords.lng } : null;
      
      if (!coords) {
        coords = await geocodeAddress(data.address, data.city);
      }

      const propertyData: any = {
        title: data.title,
        description: data.description,
        property_type: data.property_type,
        address: data.address,
        city: data.city,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        surface_area: data.surface_area,
        is_furnished: data.is_furnished,
        has_ac: data.has_ac,
        has_parking: data.has_parking,
        has_garden: data.has_garden,
        monthly_rent: data.monthly_rent,
        deposit_amount: data.deposit_amount,
        owner_id: user.id,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        images: mediaUrls.images,
        main_image: mediaUrls.mainImage,
        video_url: mediaUrls.videoUrl,
        panoramic_images: mediaUrls.panoramas,
        floor_plans: mediaUrls.floorPlans,
      };

      const targetId = overridePropertyId || propertyId;

      if (targetId) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', targetId);

        if (error) {
          logger.error('Failed to update property', { error, targetId });
          throw new AppError('PROPERTY_UPDATE_FAILED');
        }

        handleSuccess('PROPERTY_UPDATED');
        return targetId;
      } else {
        // Create new property
        const { data: newProperty, error } = await supabase
          .from('properties')
          .insert([propertyData])
          .select('id')
          .single();

        if (error) {
          logger.error('Failed to create property', { error, propertyData });
          
          // Identifier le champ manquant ou problématique
          let specificError = 'Échec de la création de la propriété';
          
          if (error.message?.includes('null value')) {
            const field = error.message.match(/column "(\w+)"/)?.[1];
            specificError = field 
              ? `Le champ "${field}" est requis mais n'a pas été fourni.`
              : 'Un champ requis n\'a pas été fourni.';
          } else if (error.message?.includes('violates')) {
            specificError = 'Les données fournies ne respectent pas les contraintes de validation.';
          } else if (error.message) {
            specificError = error.message;
          }
          
          throw new Error(specificError);
        }

        if (!newProperty) {
          throw new Error('La propriété a été créée mais aucune donnée n\'a été retournée.');
        }

        handleSuccess('PROPERTY_CREATED');
        return newProperty.id;
      }
    } catch (error) {
      // Améliorer les messages d'erreur selon le type d'erreur
      const errorMessage = error instanceof Error 
        ? error.message 
        : (propertyId ? ERROR_MESSAGES.PROPERTY_UPDATE_FAILED : ERROR_MESSAGES.PROPERTY_CREATE_FAILED);
      
      handleError(error, errorMessage);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  // Load property data on mount if in edit mode
  useEffect(() => {
    if (propertyId) {
      loadProperty();
    }
  }, [propertyId]);

  return {
    form,
    loading,
    submitting,
    loadProperty,
    submitProperty,
  };
};
