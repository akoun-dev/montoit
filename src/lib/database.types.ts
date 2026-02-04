export type UserType = 'locataire' | 'proprietaire' | 'agence' | 'admin';
export type UserRole = 'admin' | 'user' | 'agent' | 'moderator';
export type PropertyCategory = 'residentiel' | 'commercial';
export type PropertyType =
  | 'appartement'
  | 'maison'
  | 'villa'
  | 'studio'
  | 'duplex'
  | 'chambre'
  | 'bureau'
  | 'commerce'
  | 'entrepot'
  | 'terrain';
export type PropertyStatus = 'disponible' | 'loue' | 'en_attente' | 'retire';
export type ApplicationStatus = 'en_attente' | 'acceptee' | 'refusee' | 'annulee';
export type VerificationStatus = 'en_attente' | 'verifie' | 'rejete';
export type PaymentStatus = 'en_attente' | 'complete' | 'echoue' | 'annule';
export type PaymentType = 'loyer' | 'depot_garantie' | 'charges' | 'frais_agence';
export type PaymentMethod = 'mobile_money' | 'carte_bancaire' | 'virement' | 'especes';
export type LeaseStatus = 'brouillon' | 'en_attente_signature' | 'actif' | 'expire' | 'resilie';
export type LeaseType = 'courte_duree' | 'longue_duree';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          user_type: string;
          active_role: string | null;
          available_roles: string[];
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          address: string | null;
          is_verified: boolean;
          profile_setup_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          user_type?: string;
          active_role?: string | null;
          available_roles?: string[];
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          address?: string | null;
          is_verified?: boolean;
          profile_setup_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          user_type?: string;
          active_role?: string | null;
          available_roles?: string[];
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          address?: string | null;
          is_verified?: boolean;
          profile_setup_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          address: string;
          city: string;
          neighborhood: string | null;
          latitude: number | null;
          longitude: number | null;
          property_type: PropertyType;
          property_category: PropertyCategory;
          status: PropertyStatus;
          bedrooms: number;
          bathrooms: number;
          surface_area: number | null;
          has_parking: boolean;
          has_garden: boolean;
          furnished: boolean;
          has_ac: boolean;
          price: number;
          deposit_amount: number | null;
          charges_amount: number;
          images: string[];
          main_image: string | null;
          views_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          address: string;
          city: string;
          neighborhood?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          property_type: PropertyType;
          property_category?: PropertyCategory;
          status?: PropertyStatus;
          bedrooms?: number;
          bathrooms?: number;
          surface_area?: number | null;
          has_parking?: boolean;
          has_garden?: boolean;
          furnished?: boolean;
          has_ac?: boolean;
          price: number;
          deposit_amount?: number | null;
          charges_amount?: number;
          images?: string[];
          main_image?: string | null;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          address?: string;
          city?: string;
          neighborhood?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          property_type?: PropertyType;
          property_category?: PropertyCategory;
          status?: PropertyStatus;
          bedrooms?: number;
          bathrooms?: number;
          surface_area?: number | null;
          has_parking?: boolean;
          has_garden?: boolean;
          furnished?: boolean;
          has_ac?: boolean;
          price?: number;
          deposit_amount?: number | null;
          charges_amount?: number;
          images?: string[];
          main_image?: string | null;
          views_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      rental_applications: {
        Row: {
          id: string;
          property_id: string;
          applicant_id: string;
          status: ApplicationStatus;
          cover_letter: string | null;
          application_score: number;
          documents: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          applicant_id: string;
          status?: ApplicationStatus;
          cover_letter?: string | null;
          application_score?: number;
          documents?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          applicant_id?: string;
          status?: ApplicationStatus;
          cover_letter?: string | null;
          application_score?: number;
          documents?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          property_id: string;
          applicant_id: string;
          status: ApplicationStatus;
          cover_letter: string | null;
          application_score: number;
          documents: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          applicant_id: string;
          status?: ApplicationStatus;
          cover_letter?: string | null;
          application_score?: number;
          documents?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          applicant_id?: string;
          status?: ApplicationStatus;
          cover_letter?: string | null;
          application_score?: number;
          documents?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      leases: {
        Row: {
          id: string;
          property_id: string;
          tenant_id: string;
          landlord_id: string;
          start_date: string;
          end_date: string;
          monthly_rent: number;
          deposit_amount: number;
          status: LeaseStatus;
          lease_type: LeaseType;
          terms: string | null;
          signed_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          tenant_id: string;
          landlord_id: string;
          start_date: string;
          end_date: string;
          monthly_rent: number;
          deposit_amount: number;
          status?: LeaseStatus;
          lease_type: LeaseType;
          terms?: string | null;
          signed_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          tenant_id?: string;
          landlord_id?: string;
          start_date?: string;
          end_date?: string;
          monthly_rent?: number;
          deposit_amount?: number;
          status?: LeaseStatus;
          lease_type?: LeaseType;
          terms?: string | null;
          signed_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          last_message_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          last_message_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          last_message_at?: string | null;
          created_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          application_id: string | null;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          application_id?: string | null;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          application_id?: string | null;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      maintenance_requests: {
        Row: {
          id: string;
          property_id: string;
          tenant_id: string;
          landlord_id: string;
          title: string;
          description: string;
          status: string;
          priority: string;
          images: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          tenant_id: string;
          landlord_id: string;
          title: string;
          description: string;
          status?: string;
          priority?: string;
          images?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          tenant_id?: string;
          landlord_id?: string;
          title?: string;
          description?: string;
          status?: string;
          priority?: string;
          images?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      user_verifications: {
        Row: {
          id: string;
          user_id: string;
          oneci_status: VerificationStatus;
          cnam_status: VerificationStatus;
          tenant_score: number;
          profile_completeness_score: number;
          rental_history_score: number;
          payment_reliability_score: number;
          last_score_update: string;
          created_at: string;
          updated_at: string;
        };
      };
      score_history: {
        Row: {
          id: string;
          user_id: string;
          score_type: string;
          old_score: number;
          new_score: number;
          change_reason: string | null;
          metadata: Record<string, any>;
          created_at: string;
        };
      };
      score_settings: {
        Row: {
          id: string;
          setting_key: string;
          setting_value: Record<string, any>;
          description: string | null;
          updated_at: string;
        };
      };
      rental_history: {
        Row: {
          id: string;
          tenant_id: string;
          landlord_id: string;
          property_id: string | null;
          lease_id: string | null;
          start_date: string;
          end_date: string | null;
          monthly_rent: number;
          payment_reliability_score: number;
          property_condition_score: number;
          lease_compliance_score: number;
          landlord_notes: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      owner_ratings: {
        Row: {
          id: string;
          owner_id: string;
          overall_rating: number;
          response_time_score: number;
          contract_completion_rate: number;
          tenant_satisfaction_score: number;
          total_properties: number;
          total_rentals: number;
          updated_at: string;
        };
      };
      score_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_type: string;
          achievement_name: string;
          achievement_description: string | null;
          icon: string;
          achieved_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          lease_id: string;
          tenant_id: string;
          amount: number;
          payment_type: PaymentType;
          payment_method: PaymentMethod;
          status: PaymentStatus;
          transaction_id: string | null;
          payment_date: string | null;
          due_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lease_id: string;
          tenant_id: string;
          amount: number;
          payment_type: PaymentType;
          payment_method: PaymentMethod;
          status?: PaymentStatus;
          transaction_id?: string | null;
          payment_date?: string | null;
          due_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lease_id?: string;
          tenant_id?: string;
          amount?: number;
          payment_type?: PaymentType;
          payment_method?: PaymentMethod;
          status?: PaymentStatus;
          transaction_id?: string | null;
          payment_date?: string | null;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      mobile_money_transactions: {
        Row: {
          id: string;
          payment_id: string;
          provider: string;
          phone_number: string;
          amount: number;
          fees: number;
          status: string;
          transaction_reference: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          provider: string;
          phone_number: string;
          amount: number;
          fees?: number;
          status?: string;
          transaction_reference: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          provider?: string;
          phone_number?: string;
          amount?: number;
          fees?: number;
          status?: string;
          transaction_reference?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
