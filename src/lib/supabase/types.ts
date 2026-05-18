export type UserRole =
  | 'LOCATAIRE'
  | 'PROPRIETAIRE'
  | 'AGENCE'
  | 'ADMIN'
  | 'TIERS_CONFIANCE'

export type OtpType =
  | 'LOGIN'
  | 'EMAIL_VERIFY'
  | 'PASSWORD_RESET'
  | 'BAIL_SIGNATURE'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          phone: string | null
          email: string
          password_hash: string
          first_name: string
          last_name: string
          role: UserRole
          active_role: UserRole
          avatar_url: string | null
          is_active: boolean
          is_email_verified: boolean
          is_phone_verified: boolean
          gender: string | null
          city: string | null
          address: string | null
          birth_date: string | null
          nni: string | null
          neoface_verified: boolean
          neoface_verified_at: string | null
          kyc_document_id: string | null
          oneci_verified: boolean
          oneci_verified_at: string | null
          password_updated_at: string | null
          bio: string | null
          company_name: string | null
          show_phone: boolean
          show_email: boolean
          two_factor_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          email: string
          password_hash: string
          first_name: string
          last_name: string
          role?: UserRole
          active_role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          is_email_verified?: boolean
          is_phone_verified?: boolean
          gender?: string | null
          city?: string | null
          address?: string | null
          birth_date?: string | null
          nni?: string | null
          neoface_verified?: boolean
          neoface_verified_at?: string | null
          kyc_document_id?: string | null
          oneci_verified?: boolean
          oneci_verified_at?: string | null
          password_updated_at?: string | null
          bio?: string | null
          company_name?: string | null
          show_phone?: boolean
          show_email?: boolean
          two_factor_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      otp_codes: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          code: string
          type: OtpType
          expires_at: string
          is_used: boolean
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          phone?: string | null
          email?: string | null
          code: string
          type: OtpType
          expires_at: string
          is_used?: boolean
          created_at?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['otp_codes']['Insert']>
        Relationships: []
      }
      favorites: {
        Row: {
          id: string
          created_at: string
          user_id: string
          property_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          property_id: string
        }
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          message: string
          is_read: boolean
          action_url: string | null
          entity_id: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          message: string
          is_read?: boolean
          action_url?: string | null
          entity_id?: string | null
          created_at?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
        Relationships: []
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          messages: boolean
          dossier_updates: boolean
          visit_reminders: boolean
          payment_alerts: boolean
          promotions: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          messages?: boolean
          dossier_updates?: boolean
          visit_reminders?: boolean
          payment_alerts?: boolean
          promotions?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['notification_preferences']['Insert']>
        Relationships: []
      }
      properties: {
        Row: {
          id: string
          title: string
          description: string
          type: string
          status: string
          rental_status: string
          price: number
          currency: string
          area: number
          bedrooms: number | null
          bathrooms: number | null
          address: string
          city: string
          commune: string | null
          latitude: number | null
          longitude: number | null
          is_furnished: boolean
          is_verified: boolean
          has_parking: boolean
          has_garden: boolean
          has_pool: boolean
          has_guardian: boolean
          has_climate: boolean
          amenities: string
          rental_terms: string
          hide_owner_name: boolean
          virtual_tour_url: string | null
          views_count: number
          created_at: string
          updated_at: string
          owner_id: string
        }
        Insert: {
          id?: string
          title?: string
          description?: string
          type?: string
          status?: string
          rental_status?: string
          price?: number
          currency?: string
          area?: number
          bedrooms?: number | null
          bathrooms?: number | null
          address?: string
          city?: string
          commune?: string | null
          latitude?: number | null
          longitude?: number | null
          is_furnished?: boolean
          is_verified?: boolean
          has_parking?: boolean
          has_garden?: boolean
          has_pool?: boolean
          has_guardian?: boolean
          has_climate?: boolean
          amenities?: string
          rental_terms?: string
          hide_owner_name?: boolean
          virtual_tour_url?: string | null
          views_count?: number
          created_at?: string
          updated_at?: string
          owner_id: string
        }
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
        Relationships: []
      }
      property_images: {
        Row: {
          id: string
          url: string
          order: number
          created_at: string
          property_id: string
        }
        Insert: {
          id?: string
          url: string
          order?: number
          created_at?: string
          property_id: string
        }
        Update: Partial<Database['public']['Tables']['property_images']['Insert']>
        Relationships: []
      }
      property_documents: {
        Row: {
          id: string
          name: string
          type: string
          url: string
          description: string | null
          expiry_date: string | null
          created_at: string
          updated_at: string
          property_id: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          url: string
          description?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
          property_id: string
        }
        Update: Partial<Database['public']['Tables']['property_documents']['Insert']>
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          last_message_at: string | null
          created_at: string
          property_id: string | null
          participant1_id: string
          participant2_id: string
        }
        Insert: {
          id?: string
          last_message_at?: string | null
          created_at?: string
          property_id?: string | null
          participant1_id: string
          participant2_id: string
        }
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          content: string
          is_read: boolean
          created_at: string
          conversation_id: string
          sender_id: string
        }
        Insert: {
          id?: string
          content: string
          is_read?: boolean
          created_at?: string
          conversation_id: string
          sender_id: string
        }
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
        Relationships: []
      }
      visit_requests: {
        Row: {
          id: string
          visit_type: string
          requested_date: string
          time_slot: string
          status: string
          counter_date: string | null
          counter_time_slot: string | null
          owner_comment: string | null
          tenant_message: string | null
          created_at: string
          updated_at: string
          property_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          visit_type?: string
          requested_date: string
          time_slot: string
          status?: string
          counter_date?: string | null
          counter_time_slot?: string | null
          owner_comment?: string | null
          tenant_message?: string | null
          created_at?: string
          updated_at?: string
          property_id: string
          tenant_id: string
        }
        Update: Partial<Database['public']['Tables']['visit_requests']['Insert']>
        Relationships: []
      }
      rental_files: {
        Row: {
          id: string
          status: string
          priority: string
          on_hold: boolean
          on_hold_reason: string | null
          tenant_category: string | null
          monthly_income: number | null
          employer: string | null
          employment_type: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          guarantor_relation: string | null
          valid_until: string | null
          rejection_reason: string | null
          tc_comment: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
          tenant_id: string
          reviewed_by_id: string | null
        }
        Insert: {
          id?: string
          status?: string
          priority?: string
          on_hold?: boolean
          on_hold_reason?: string | null
          tenant_category?: string | null
          monthly_income?: number | null
          employer?: string | null
          employment_type?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          guarantor_relation?: string | null
          valid_until?: string | null
          rejection_reason?: string | null
          tc_comment?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
          tenant_id: string
          reviewed_by_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['rental_files']['Insert']>
        Relationships: []
      }
      rental_file_documents: {
        Row: {
          id: string
          type: string
          url: string
          name: string
          status: string
          tc_comment: string | null
          created_at: string
          rental_file_id: string
        }
        Insert: {
          id?: string
          type: string
          url: string
          name: string
          status?: string
          tc_comment?: string | null
          created_at?: string
          rental_file_id: string
        }
        Update: Partial<Database['public']['Tables']['rental_file_documents']['Insert']>
        Relationships: []
      }
      owner_files: {
        Row: {
          id: string
          status: string
          monthly_income: number | null
          employer: string | null
          employment_type: string | null
          guarantor_name: string | null
          guarantor_phone: string | null
          guarantor_relation: string | null
          valid_until: string | null
          rejection_reason: string | null
          tc_comment: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
          owner_id: string
          reviewed_by_id: string | null
        }
        Insert: {
          id?: string
          status?: string
          monthly_income?: number | null
          employer?: string | null
          employment_type?: string | null
          guarantor_name?: string | null
          guarantor_phone?: string | null
          guarantor_relation?: string | null
          valid_until?: string | null
          rejection_reason?: string | null
          tc_comment?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
          owner_id: string
          reviewed_by_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['owner_files']['Insert']>
        Relationships: []
      }
      owner_file_documents: {
        Row: {
          id: string
          type: string
          url: string
          name: string
          status: string
          tc_comment: string | null
          created_at: string
          owner_file_id: string
        }
        Insert: {
          id?: string
          type: string
          url: string
          name: string
          status?: string
          tc_comment?: string | null
          created_at?: string
          owner_file_id: string
        }
        Update: Partial<Database['public']['Tables']['owner_file_documents']['Insert']>
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          action: string
          entity: string
          entity_id: string | null
          details: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          action: string
          entity: string
          entity_id?: string | null
          details?: string | null
          created_at?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
        Relationships: []
      }
      leases: {
        Row: {
          id: string
          status: string
          start_date: string
          end_date: string
          monthly_rent: number
          charges: number
          deposit: number
          special_conditions: string | null
          owner_signed_at: string | null
          owner_sign_otp: string | null
          owner_signature_image: string | null
          tenant_signed_at: string | null
          tenant_sign_otp: string | null
          tenant_signature_image: string | null
          created_at: string
          updated_at: string
          property_id: string
          tenant_id: string
          owner_id: string
          rental_file_id: string
        }
        Insert: {
          id?: string
          status?: string
          start_date: string
          end_date: string
          monthly_rent: number
          charges?: number
          deposit?: number
          special_conditions?: string | null
          owner_signed_at?: string | null
          owner_sign_otp?: string | null
          owner_signature_image?: string | null
          tenant_signed_at?: string | null
          tenant_sign_otp?: string | null
          tenant_signature_image?: string | null
          created_at?: string
          updated_at?: string
          property_id: string
          tenant_id: string
          owner_id: string
          rental_file_id: string
        }
        Update: Partial<Database['public']['Tables']['leases']['Insert']>
        Relationships: []
      }
      ratings: {
        Row: {
          id: string
          score: number
          comment: string | null
          reply: string | null
          replied_at: string | null
          property_id: string | null
          created_at: string
          lease_id: string
          from_user_id: string
          to_user_id: string
        }
        Insert: {
          id?: string
          score: number
          comment?: string | null
          reply?: string | null
          replied_at?: string | null
          property_id?: string | null
          created_at?: string
          lease_id: string
          from_user_id: string
          to_user_id: string
        }
        Update: Partial<Database['public']['Tables']['ratings']['Insert']>
        Relationships: []
      }
      mandats: {
        Row: {
          id: string
          type: string
          status: string
          commission_rate: number
          commission_type: string
          fixed_commission: number | null
          start_date: string
          end_date: string
          conditions: string | null
          owner_signed_at: string | null
          agency_signed_at: string | null
          terminated_at: string | null
          termination_reason: string | null
          created_at: string
          updated_at: string
          property_id: string
          owner_id: string
          agency_id: string
        }
        Insert: {
          id?: string
          type?: string
          status?: string
          commission_rate?: number
          commission_type?: string
          fixed_commission?: number | null
          start_date: string
          end_date: string
          conditions?: string | null
          owner_signed_at?: string | null
          agency_signed_at?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          created_at?: string
          updated_at?: string
          property_id: string
          owner_id: string
          agency_id: string
        }
        Update: Partial<Database['public']['Tables']['mandats']['Insert']>
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          amount: number
          status: string
          due_date: string
          paid_at: string | null
          reference: string | null
          method: string | null
          operator_transaction_id: string | null
          operator_phone_number: string | null
          payment_operator_data: unknown | null
          created_at: string
          updated_at: string
          lease_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          amount: number
          status?: string
          due_date: string
          paid_at?: string | null
          reference?: string | null
          method?: string | null
          operator_transaction_id?: string | null
          operator_phone_number?: string | null
          payment_operator_data?: unknown | null
          created_at?: string
          updated_at?: string
          lease_id: string
          tenant_id: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      otp_type: OtpType
    }
    CompositeTypes: Record<string, never>
  }
}
