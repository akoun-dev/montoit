import { supabase } from '@/integrations/supabase/client';

export interface PropertyData {
  // Informations générales
  title: string;
  description: string;
  propertyType: 'appartement' | 'maison' | 'villa' | 'terrain' | 'bureau' | 'local-commercial';
  bedrooms: number;
  bathrooms: number;
  area: number; // surface en m²
  price: number;
  priceType: 'achat' | 'location';

  // Localisation
  city: string;
  district: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };

  // Photos
  images: File[];
  mainImageIndex?: number;

  // Détails supplémentaires
  amenities: string[];
  furnished: boolean;
  parking: boolean;
  garden: boolean;
  terrace: boolean;
  elevator: boolean;
  security: boolean;

  // Contact
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

export interface PropertyFormErrors {
  title?: string;
  description?: string;
  propertyType?: string;
  bedrooms?: string;
  bathrooms?: string;
  area?: string;
  price?: string;
  city?: string;
  district?: string;
  address?: string;
  images?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

class PropertyService {
  // Validation des données de propriété
  validatePropertyData(data: PropertyData): PropertyFormErrors {
    const errors: PropertyFormErrors = {};

    // Validation titre
    if (!data.title || data.title.trim().length < 5) {
      errors.title = 'Le titre doit contenir au moins 5 caractères';
    } else if (data.title.length > 100) {
      errors.title = 'Le titre ne peut pas dépasser 100 caractères';
    }

    // Validation description
    if (!data.description || data.description.trim().length < 20) {
      errors.description = 'La description doit contenir au moins 20 caractères';
    } else if (data.description.length > 2000) {
      errors.description = 'La description ne peut pas dépasser 2000 caractères';
    }

    // Validation type de propriété
    if (!data.propertyType) {
      errors.propertyType = 'Veuillez sélectionner un type de propriété';
    }

    // Validation chambres
    if (!data.bedrooms || data.bedrooms < 0) {
      errors.bedrooms = 'Le nombre de chambres doit être positif';
    }

    // Validation salles de bain
    if (!data.bathrooms || data.bathrooms < 0) {
      errors.bathrooms = 'Le nombre de salles de bain doit être positif';
    }

    // Validation surface
    if (!data.area || data.area <= 0) {
      errors.area = 'La surface doit être supérieure à 0';
    }

    // Validation prix
    if (!data.price || data.price <= 0) {
      errors.price = 'Le prix doit être supérieur à 0';
    }

    // Validation localisation
    if (!data.city || data.city.trim().length === 0) {
      errors.city = 'Veuillez sélectionner une ville';
    }

    if (!data.district || data.district.trim().length === 0) {
      errors.district = 'Veuillez indiquer un quartier';
    }

    if (!data.address || data.address.trim().length < 5) {
      errors.address = "L'adresse doit contenir au moins 5 caractères";
    }

    // Validation images
    if (!data.images || data.images.length === 0) {
      errors.images = 'Veuillez ajouter au moins une photo';
    } else if (data.images.length > 20) {
      errors.images = 'Vous ne pouvez pas ajouter plus de 20 photos';
    }

    // Validation contact propriétaire
    if (!data.ownerName || data.ownerName.trim().length < 2) {
      errors.ownerName = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!data.ownerEmail || !this.isValidEmail(data.ownerEmail)) {
      errors.ownerEmail = 'Veuillez saisir une adresse email valide';
    }

    if (!data.ownerPhone || !this.isValidPhone(data.ownerPhone)) {
      errors.ownerPhone = 'Veuillez saisir un numéro de téléphone valide';
    }

    return errors;
  }

  // Validation email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validation téléphone (format ivoirien)
  private isValidPhone(phone: string): boolean {
    // Supporte les formats : +225 XX XX XX XX, 0X XX XX XX XX, XX XX XX XX XX
    const phoneRegex = /^(\+225|0)?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}\s?[0-9]{2}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // Upload des images vers Supabase Storage
  async uploadImages(images: File[], userId: string): Promise<string[]> {
    try {
      const uploadedUrls: string[] = [];
      // Organiser par utilisateur pour les RLS policies
      const folderName = `${userId}/${Date.now()}`;

      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        if (!image) continue;

        const fileName = `${i}_${image.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const filePath = `${folderName}/${fileName}`;

        // Vérifier la taille du fichier (max 5MB)
        if (image.size > 5 * 1024 * 1024) {
          throw new Error(`L'image ${image.name} dépasse la taille maximale de 5MB`);
        }

        // Vérifier le type de fichier
        if (!image.type.startsWith('image/')) {
          throw new Error(`Le fichier ${image.name} n'est pas une image valide`);
        }

        const { error } = await supabase.storage.from('property-images').upload(filePath, image, {
          cacheControl: '3600',
          upsert: false,
        });

        if (error) {
          throw new Error(`Erreur lors de l'upload de ${image.name}: ${error.message}`);
        }

        // Générer l'URL publique
        const { data: urlData } = supabase.storage.from('property-images').getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      }

      return uploadedUrls;
    } catch (error) {
      console.error('Erreur upload images:', error);
      throw error;
    }
  }

  // Sauvegarder la propriété en base de données
  async createProperty(data: PropertyData): Promise<{ id: string; success: boolean }> {
    try {
      // Récupérer l'utilisateur connecté
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Vous devez être connecté pour publier une propriété');
      }

      // Upload des images avec l'ID utilisateur
      const imageUrls = await this.uploadImages(data.images, user.id);

      // Déterminer l'image principale
      const mainImageIndex = data.mainImageIndex ?? 0;
      const mainImageUrl = imageUrls[mainImageIndex] || imageUrls[0] || null;

      // Créer l'enregistrement de propriété avec TOUTES les colonnes correctement mappées
      const propertyData = {
        owner_id: user.id, // CRUCIAL - Assignation du propriétaire
        title: data.title,
        description: data.description,
        property_type: data.propertyType,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        surface_area: data.area,
        price: data.price,
        city: data.city,
        neighborhood: data.district,
        address: data.address,
        latitude: data.coordinates?.lat ?? null,
        longitude: data.coordinates?.lng ?? null,
        images: imageUrls,
        main_image: mainImageUrl,
        amenities: data.amenities,
        furnished: data.furnished,
        has_parking: data.parking,
        has_garden: data.garden,
        has_ac: data.amenities.includes('climatisation'),
        deposit_amount: data.priceType === 'location' ? data.price * 2 : null, // 2 mois de caution par défaut
        status: 'disponible',
      };

      const { data: property, error } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (error) {
        throw new Error(`Erreur lors de la création de la propriété: ${error.message}`);
      }

      return { id: property.id, success: true };
    } catch (error) {
      console.error('Erreur création propriété:', error);
      throw error;
    }
  }

  // Obtenir les villes populaires
  getPopularCities() {
    return [
      {
        name: 'Abidjan',
        properties: 1200,
        image: '/cities/abidjan.jpg',
        districts: ['Cocody', 'Plateau', 'Marcory', 'Treichville', 'Yopougon'],
      },
      {
        name: 'Yamoussoukro',
        properties: 150,
        image: '/cities/yamoussoukro.jpg',
        districts: ['Centre-ville', 'Plateau', 'Adjamé', 'Résidentiel'],
      },
      {
        name: 'Bouaké',
        properties: 80,
        image: '/cities/bouake.jpg',
        districts: ['Centre-ville', 'Kokoin', 'Bracodi'],
      },
      {
        name: 'San-Pédro',
        properties: 60,
        image: '/cities/san-pedro.jpg',
        districts: ['Centre-ville', 'Port', 'Résidentiel'],
      },
    ];
  }

  // Obtenir les quartiers d'une ville
  getCityDistricts(cityName: string): string[] {
    const cities = this.getPopularCities();
    const city = cities.find((c) => c.name === cityName);
    return city ? city.districts : [];
  }

  // Obtenir les types de propriétés
  getPropertyTypes() {
    return [
      { value: 'appartement', label: 'Appartement' },
      { value: 'maison', label: 'Maison' },
      { value: 'villa', label: 'Villa' },
      { value: 'terrain', label: 'Terrain' },
      { value: 'bureau', label: 'Bureau' },
      { value: 'local-commercial', label: 'Local Commercial' },
    ];
  }

  // Obtenir les équipements disponibles
  getAmenities() {
    return [
      { value: 'wifi', label: 'WiFi', icon: 'wifi' },
      { value: 'climatisation', label: 'Climatisation', icon: 'snowflake' },
      { value: 'chauffage', label: 'Chauffage', icon: 'thermometer' },
      { value: 'television', label: 'Télévision', icon: 'tv' },
      { value: 'machine-a-laver', label: 'Machine à laver', icon: 'washing-machine' },
      { value: 'refrigerateur', label: 'Réfrigérateur', icon: 'refrigerator' },
      { value: 'cuisine-equipee', label: 'Cuisine équipée', icon: 'chef-hat' },
      { value: 'balcon', label: 'Balcon', icon: 'building' },
      { value: 'vue-mer', label: 'Vue sur mer', icon: 'waves' },
      { value: 'piscine', label: 'Piscine', icon: 'waves' },
    ];
  }
}

export const propertyService = new PropertyService();
