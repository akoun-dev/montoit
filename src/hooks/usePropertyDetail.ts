import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Property, Application, PropertyStats } from '@/types';
import { propertyService } from '@/services/propertyService';
import { logger } from '@/services/logger';

interface PropertyOwner {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_verified: boolean;
}

export const usePropertyDetail = (propertyId: string | undefined) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [owner, setOwner] = useState<PropertyOwner | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<PropertyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);

  const isOwner = user && property && user.id === property.owner_id;

  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    if (!propertyId) return;
    
    try {
      setLoading(true);

      // Fetch property
      const propertyData = await propertyService.fetchById(propertyId);
      
      // If property not found, simply set to null (UI will display "Bien introuvable")
      if (!propertyData) {
        logger.warn('Property not found', { propertyId });
        setProperty(null);
        return;
      }
      
      setProperty(propertyData);
      
      // Set images
      const allImages = [propertyData.main_image, ...(propertyData.images || [])].filter(Boolean) as string[];
      setImages(allImages);

      // Increment view count
      await propertyService.incrementViewCount(propertyId);

      // Fetch owner info
      const { data: ownerData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, is_verified')
        .eq('id', propertyData.owner_id)
        .single();
      
      if (ownerData) {
        setOwner(ownerData);
      }

      // If current user is the owner, fetch applications and stats
      if (user && user.id === propertyData.owner_id) {
        await Promise.all([
          fetchApplications(),
          fetchStats()
        ]);
      }
    } catch (error) {
      logger.error('Error fetching property details', { error, propertyId });
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails du bien',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!propertyId) return;

    try {
      const { data, error } = await supabase
        .from('rental_applications')
        .select(`
          *,
          applicant:profiles!rental_applications_applicant_id_fkey(
            id,
            full_name,
            avatar_url,
            is_verified
          ),
          verification:user_verifications!user_verifications_user_id_fkey(
            tenant_score
          )
        `)
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data as any || []);
    } catch (error) {
      logger.error('Error fetching applications', { error, propertyId });
    }
  };

  const fetchStats = async () => {
    if (!propertyId) return;

    try {
      const statsData = await propertyService.getStats(propertyId);
      setStats({
        ...statsData,
        view_count: statsData.views,
        favorites_count: statsData.favorites,
        applications_count: statsData.applications,
      });
    } catch (error) {
      logger.error('Error fetching property stats', { error, propertyId });
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!propertyId || !property) return;

    try {
      await propertyService.update(propertyId, { status: newStatus });
      setProperty({ ...property, status: newStatus });
      toast({
        title: 'Succès',
        description: 'Le statut du bien a été mis à jour',
      });
    } catch (error) {
      logger.error('Error updating property status', { error, propertyId, newStatus });
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    }
  };

  return {
    property,
    owner,
    applications,
    stats,
    loading,
    images,
    isOwner,
    handleStatusChange,
    fetchPropertyDetails,
  };
};
