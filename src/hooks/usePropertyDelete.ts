import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ERROR_MESSAGES } from '@/constants';
import { AppError, handleError, handleSuccess } from '@/lib/errorHandler';
import { logger } from '@/services/logger';
import { useMediaUpload, type MediaUrls } from './useMediaUpload';

/**
 * Hook for deleting properties
 * Handles both media deletion and database record removal
 */
export const usePropertyDelete = () => {
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { deleteMedia } = useMediaUpload();

  /**
   * Delete a property and all its associated media
   */
  const deleteProperty = async (
    propertyId: string,
    userId: string,
    mediaUrls: MediaUrls
  ): Promise<void> => {
    setDeleting(true);

    try {
      // 1. Verify ownership
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('owner_id')
        .eq('id', propertyId)
        .single();

      if (fetchError || !property) {
        logger.error('Property not found', { error: fetchError, propertyId });
        throw new AppError('PROPERTY_NOT_FOUND');
      }

      if (property.owner_id !== userId) {
        logger.error('Unauthorized delete attempt', { propertyId, userId });
        throw new AppError('OWNER_ONLY');
      }

      // 2. Delete all media from storage
      await deleteMedia(mediaUrls);

      // 3. Delete property from database
      const { error: deleteError } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (deleteError) {
        logger.error('Failed to delete property', { error: deleteError, propertyId });
        throw new AppError('PROPERTY_DELETE_FAILED');
      }

      handleSuccess('PROPERTY_DELETED');
      navigate('/mes-biens');
    } catch (error) {
      handleError(error, ERROR_MESSAGES.PROPERTY_DELETE_FAILED);
    } finally {
      setDeleting(false);
    }
  };

  return {
    deleting,
    deleteProperty,
  };
};
