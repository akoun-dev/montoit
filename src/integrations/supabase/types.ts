Initialising login role...
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          action_type: string | null
          admin_id: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_type?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_type?: string | null
          admin_id?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_logs_extended: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          request_method: string | null
          request_path: string | null
          status_code: number | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          request_method?: string | null
          request_path?: string | null
          status_code?: number | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_extended_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_extended_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_extended_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_extended_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_audit_logs_extended_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_login_attempts: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "admin_login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_login_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          admin_id: string
          created_at: string | null
          data: Json | null
          id: string
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["admin_notification_type"]
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          data?: Json | null
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["admin_notification_type"]
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["admin_notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address: string | null
          agency_name: string
          city: string | null
          commission_rate: number | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          logo_url: string | null
          phone: string | null
          registration_number: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          agency_name: string
          city?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          registration_number?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          agency_name?: string
          city?: string | null
          commission_rate?: number | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          logo_url?: string | null
          phone?: string | null
          registration_number?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agencies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_applications: {
        Row: {
          address: string | null
          agency_name: string
          city: string | null
          country: string | null
          email: string
          id: string
          insurance_proof_url: string | null
          insurance_proof_verified: boolean | null
          insurance_proof_verified_at: string | null
          notes: string | null
          phone: string | null
          registration_document_url: string | null
          registration_document_verified: boolean | null
          registration_document_verified_at: string | null
          registration_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          tax_certificate_url: string | null
          tax_certificate_verified: boolean | null
          tax_certificate_verified_at: string | null
          tax_id: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          address?: string | null
          agency_name: string
          city?: string | null
          country?: string | null
          email: string
          id?: string
          insurance_proof_url?: string | null
          insurance_proof_verified?: boolean | null
          insurance_proof_verified_at?: string | null
          notes?: string | null
          phone?: string | null
          registration_document_url?: string | null
          registration_document_verified?: boolean | null
          registration_document_verified_at?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          tax_certificate_url?: string | null
          tax_certificate_verified?: boolean | null
          tax_certificate_verified_at?: string | null
          tax_id?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          address?: string | null
          agency_name?: string
          city?: string | null
          country?: string | null
          email?: string
          id?: string
          insurance_proof_url?: string | null
          insurance_proof_verified?: boolean | null
          insurance_proof_verified_at?: string | null
          notes?: string | null
          phone?: string | null
          registration_document_url?: string | null
          registration_document_verified?: boolean | null
          registration_document_verified_at?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          tax_certificate_url?: string | null
          tax_certificate_verified?: boolean | null
          tax_certificate_verified_at?: string | null
          tax_id?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_mandates: {
        Row: {
          agency_id: string
          agency_signed_at: string | null
          can_communicate_tenants: boolean | null
          can_create_leases: boolean | null
          can_create_properties: boolean | null
          can_delete_properties: boolean | null
          can_edit_properties: boolean | null
          can_manage_applications: boolean | null
          can_manage_documents: boolean | null
          can_manage_maintenance: boolean | null
          can_view_applications: boolean | null
          can_view_financials: boolean | null
          can_view_properties: boolean | null
          commission_rate: number | null
          created_at: string | null
          cryptoneo_operation_id: string | null
          cryptoneo_signature_status: string | null
          end_date: string | null
          id: string
          mandate_document_url: string | null
          mandate_scope: string | null
          notes: string | null
          owner_id: string
          owner_signed_at: string | null
          property_id: string | null
          signed_at: string | null
          signed_mandate_url: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          agency_signed_at?: string | null
          can_communicate_tenants?: boolean | null
          can_create_leases?: boolean | null
          can_create_properties?: boolean | null
          can_delete_properties?: boolean | null
          can_edit_properties?: boolean | null
          can_manage_applications?: boolean | null
          can_manage_documents?: boolean | null
          can_manage_maintenance?: boolean | null
          can_view_applications?: boolean | null
          can_view_financials?: boolean | null
          can_view_properties?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          cryptoneo_operation_id?: string | null
          cryptoneo_signature_status?: string | null
          end_date?: string | null
          id?: string
          mandate_document_url?: string | null
          mandate_scope?: string | null
          notes?: string | null
          owner_id: string
          owner_signed_at?: string | null
          property_id?: string | null
          signed_at?: string | null
          signed_mandate_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          agency_signed_at?: string | null
          can_communicate_tenants?: boolean | null
          can_create_leases?: boolean | null
          can_create_properties?: boolean | null
          can_delete_properties?: boolean | null
          can_edit_properties?: boolean | null
          can_manage_applications?: boolean | null
          can_manage_documents?: boolean | null
          can_manage_maintenance?: boolean | null
          can_view_applications?: boolean | null
          can_view_financials?: boolean | null
          can_view_properties?: boolean | null
          commission_rate?: number | null
          created_at?: string | null
          cryptoneo_operation_id?: string | null
          cryptoneo_signature_status?: string | null
          end_date?: string | null
          id?: string
          mandate_document_url?: string | null
          mandate_scope?: string | null
          notes?: string | null
          owner_id?: string
          owner_signed_at?: string | null
          property_id?: string | null
          signed_at?: string | null
          signed_mandate_url?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_mandates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "agency_mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          api_key: string
          api_secret: string | null
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          service_name: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          service_name: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          api_secret?: string | null
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          service_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      api_rate_limit_configs: {
        Row: {
          created_at: string | null
          description: string | null
          endpoint_pattern: string
          id: string
          is_active: boolean | null
          max_requests_per_hour: number
          max_requests_per_minute: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          endpoint_pattern: string
          id?: string
          is_active?: boolean | null
          max_requests_per_hour?: number
          max_requests_per_minute?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          endpoint_pattern?: string
          id?: string
          is_active?: boolean | null
          max_requests_per_hour?: number
          max_requests_per_minute?: number
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          request_count: number | null
          user_id: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          request_count?: number | null
          user_id?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      business_rules: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          max_value: number | null
          min_value: number | null
          rule_key: string
          rule_name: string
          rule_type: string
          updated_at: string | null
          value_boolean: boolean | null
          value_json: Json | null
          value_number: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          max_value?: number | null
          min_value?: number | null
          rule_key: string
          rule_name: string
          rule_type: string
          updated_at?: string | null
          value_boolean?: boolean | null
          value_json?: Json | null
          value_number?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          max_value?: number | null
          min_value?: number | null
          rule_key?: string
          rule_name?: string
          rule_type?: string
          updated_at?: string | null
          value_boolean?: boolean | null
          value_json?: Json | null
          value_number?: number | null
        }
        Relationships: []
      }
      cev_missions: {
        Row: {
          assigned_agent_id: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          documents: Json | null
          etat_lieux_report: Json | null
          id: string
          mission_type: string
          notes: string | null
          photos: Json | null
          property_id: string | null
          scheduled_date: string | null
          status: string
          updated_at: string | null
          urgency: string
          verification_checklist: Json | null
        }
        Insert: {
          assigned_agent_id: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          etat_lieux_report?: Json | null
          id?: string
          mission_type: string
          notes?: string | null
          photos?: Json | null
          property_id?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
          urgency?: string
          verification_checklist?: Json | null
        }
        Update: {
          assigned_agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          etat_lieux_report?: Json | null
          id?: string
          mission_type?: string
          notes?: string | null
          photos?: Json | null
          property_id?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string | null
          urgency?: string
          verification_checklist?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cev_missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cev_reports: {
        Row: {
          attachments: string[] | null
          findings: Json | null
          id: string
          mission_id: string
          recommendations: Json | null
          report_content: Json
          report_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          submitted_by: string
        }
        Insert: {
          attachments?: string[] | null
          findings?: Json | null
          id?: string
          mission_id: string
          recommendations?: Json | null
          report_content: Json
          report_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by: string
        }
        Update: {
          attachments?: string[] | null
          findings?: Json | null
          id?: string
          mission_id?: string
          recommendations?: Json | null
          report_content?: Json
          report_type?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cev_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "cev_missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "trust_agent_missions_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "cev_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cev_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "cev_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cev_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      cev_requests: {
        Row: {
          created_at: string | null
          id: string
          property_id: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cev_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "cev_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cev_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_conversations: {
        Row: {
          application_id: string | null
          archived_at: string | null
          context_data: Json | null
          created_at: string | null
          id: string
          last_message_at: string | null
          message_count: number | null
          metadata: Json | null
          property_id: string | null
          session_id: string | null
          status:
            | Database["public"]["Enums"]["chatbot_conversation_status"]
            | null
          tags: string[] | null
          title: string | null
          type: Database["public"]["Enums"]["chatbot_conversation_type"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          archived_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          property_id?: string | null
          session_id?: string | null
          status?:
            | Database["public"]["Enums"]["chatbot_conversation_status"]
            | null
          tags?: string[] | null
          title?: string | null
          type?: Database["public"]["Enums"]["chatbot_conversation_type"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          archived_at?: string | null
          context_data?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          property_id?: string | null
          session_id?: string | null
          status?:
            | Database["public"]["Enums"]["chatbot_conversation_status"]
            | null
          tags?: string[] | null
          title?: string | null
          type?: Database["public"]["Enums"]["chatbot_conversation_type"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "chatbot_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      chatbot_messages: {
        Row: {
          content: string
          content_type: string | null
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean | null
          metadata: Json | null
          read_at: string | null
          role: Database["public"]["Enums"]["chatbot_message_role"]
          token_count: number | null
        }
        Insert: {
          content: string
          content_type?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          role: Database["public"]["Enums"]["chatbot_message_role"]
          token_count?: number | null
        }
        Update: {
          content?: string
          content_type?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
          read_at?: string | null
          role?: Database["public"]["Enums"]["chatbot_message_role"]
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chatbot_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      cnam_verifications: {
        Row: {
          cnam_response: Json | null
          created_at: string | null
          id: string
          request_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          verification_result: Json | null
        }
        Insert: {
          cnam_response?: Json | null
          created_at?: string | null
          id?: string
          request_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          verification_result?: Json | null
        }
        Update: {
          cnam_response?: Json | null
          created_at?: string | null
          id?: string
          request_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          verification_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cnam_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "cnam_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnam_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cnam_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cnam_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          resolved_at: string | null
          status: string | null
          subject: string | null
          submitted_at: string | null
        }
        Insert: {
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          submitted_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          resolved_at?: string | null
          status?: string | null
          subject?: string | null
          submitted_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string | null
          id: string
          is_archived_by_participant1: boolean | null
          is_archived_by_participant2: boolean | null
          last_message_at: string | null
          last_message_id: string | null
          listing_id: string | null
          participant1_id: string
          participant2_id: string
          property_id: string | null
          unread_count_participant1: number | null
          unread_count_participant2: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_archived_by_participant1?: boolean | null
          is_archived_by_participant2?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          listing_id?: string | null
          participant1_id: string
          participant2_id: string
          property_id?: string | null
          unread_count_participant1?: number | null
          unread_count_participant2?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_archived_by_participant1?: boolean | null
          is_archived_by_participant2?: boolean | null
          last_message_at?: string | null
          last_message_id?: string | null
          listing_id?: string | null
          participant1_id?: string
          participant2_id?: string
          property_id?: string | null
          unread_count_participant1?: number | null
          unread_count_participant2?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_certificates: {
        Row: {
          certificate_data: Json | null
          certificate_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_data?: Json | null
          certificate_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_data?: Json | null
          certificate_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "digital_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "digital_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence: {
        Row: {
          created_at: string | null
          description: string | null
          dispute_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          is_public: boolean | null
          uploaded_by: string
          uploader_role: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dispute_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          is_public?: boolean | null
          uploaded_by: string
          uploader_role: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dispute_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_public?: boolean | null
          uploaded_by?: string
          uploader_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_messages: {
        Row: {
          attachments: string[] | null
          content: string
          created_at: string | null
          dispute_id: string
          id: string
          is_internal: boolean | null
          read_at: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          attachments?: string[] | null
          content: string
          created_at?: string | null
          dispute_id: string
          id?: string
          is_internal?: boolean | null
          read_at?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          attachments?: string[] | null
          content?: string
          created_at?: string | null
          dispute_id?: string
          id?: string
          is_internal?: boolean | null
          read_at?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dispute_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_proposals: {
        Row: {
          accepted_at: string | null
          amount: number | null
          created_at: string | null
          description: string
          dispute_id: string
          expires_at: string | null
          id: string
          owner_accepted: boolean | null
          owner_response_notes: string | null
          proposal_type: string
          proposed_by: string
          rejected_at: string | null
          tenant_accepted: boolean | null
          tenant_response_notes: string | null
        }
        Insert: {
          accepted_at?: string | null
          amount?: number | null
          created_at?: string | null
          description: string
          dispute_id: string
          expires_at?: string | null
          id?: string
          owner_accepted?: boolean | null
          owner_response_notes?: string | null
          proposal_type: string
          proposed_by: string
          rejected_at?: string | null
          tenant_accepted?: boolean | null
          tenant_response_notes?: string | null
        }
        Update: {
          accepted_at?: string | null
          amount?: number | null
          created_at?: string | null
          description?: string
          dispute_id?: string
          expires_at?: string | null
          id?: string
          owner_accepted?: boolean | null
          owner_response_notes?: string | null
          proposal_type?: string
          proposed_by?: string
          rejected_at?: string | null
          tenant_accepted?: boolean | null
          tenant_response_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_proposals_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_proposals_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "dispute_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "dispute_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_to: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string
          description: string
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          id: string
          mediation_stage: string | null
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by: string
          description: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          mediation_stage?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          contract_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          escalated_at?: string | null
          escalated_to?: string | null
          escalation_reason?: string | null
          id?: string
          mediation_stage?: string | null
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      electronic_signature_logs: {
        Row: {
          created_at: string | null
          cryptoneo_response: Json | null
          error_message: string | null
          id: string
          initiated_by: string
          lease_id: string
          operation_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cryptoneo_response?: Json | null
          error_message?: string | null
          id?: string
          initiated_by: string
          lease_id: string
          operation_id: string
          status: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cryptoneo_response?: Json | null
          error_message?: string | null
          id?: string
          initiated_by?: string
          lease_id?: string
          operation_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "electronic_signature_logs_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          active: boolean | null
          body_html: string
          body_text: string
          category:
            | Database["public"]["Enums"]["email_template_category"]
            | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          preview_data: Json | null
          slug: string
          subject: string
          tags: string[] | null
          updated_at: string | null
          usage_count: number | null
          variables: string[] | null
        }
        Insert: {
          active?: boolean | null
          body_html: string
          body_text: string
          category?:
            | Database["public"]["Enums"]["email_template_category"]
            | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          preview_data?: Json | null
          slug: string
          subject: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: string[] | null
        }
        Update: {
          active?: boolean | null
          body_html?: string
          body_text?: string
          category?:
            | Database["public"]["Enums"]["email_template_category"]
            | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          preview_data?: Json | null
          slug?: string
          subject?: string
          tags?: string[] | null
          updated_at?: string | null
          usage_count?: number | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      facial_verifications: {
        Row: {
          created_at: string | null
          document_id: string | null
          failure_reason: string | null
          id: string
          is_live: boolean | null
          is_match: boolean | null
          matching_score: number | null
          provider: string
          provider_response: Json | null
          selfie_url: string | null
          status: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          failure_reason?: string | null
          id?: string
          is_live?: boolean | null
          is_match?: boolean | null
          matching_score?: number | null
          provider: string
          provider_response?: Json | null
          selfie_url?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          failure_reason?: string | null
          id?: string
          is_live?: boolean | null
          is_match?: boolean | null
          matching_score?: number | null
          provider?: string
          provider_response?: Json | null
          selfie_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "facial_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "facial_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facial_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "facial_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_audits: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          description: string | null
          flag_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          rollback_data: Json | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          description?: string | null
          flag_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          rollback_data?: Json | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          description?: string | null
          flag_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          rollback_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_audits_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "feature_flag_audits_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audits_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audits_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_audits_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audits_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_audits_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_evaluations: {
        Row: {
          evaluated_at: string | null
          evaluation: boolean
          flag_id: string | null
          id: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          evaluated_at?: string | null
          evaluation: boolean
          flag_id?: string | null
          id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          evaluated_at?: string | null
          evaluation?: boolean
          flag_id?: string | null
          id?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_evaluations_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags_with_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_evaluations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "feature_flag_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_variants: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          flag_id: string
          id: string
          is_active: boolean | null
          name: string
          percentage: number | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          flag_id: string
          id?: string
          is_active?: boolean | null
          name: string
          percentage?: number | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          flag_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_variants_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_variants_flag_id_fkey"
            columns: ["flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags_with_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          flag_type: string
          id: string
          is_active: boolean | null
          name: string
          rollout_percentage: number | null
          segment_rules: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flag_type: string
          id?: string
          is_active?: boolean | null
          name: string
          rollout_percentage?: number | null
          segment_rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          flag_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          rollout_percentage?: number | null
          segment_rules?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_messages: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string
          name: string | null
          phone: string | null
          property_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message: string
          name?: string | null
          phone?: string | null
          property_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string
          name?: string | null
          phone?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_slides: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          created_at: string | null
          id: string
          provider: string | null
          provider_response: Json | null
          request_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          verification_result: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider?: string | null
          provider_response?: Json | null
          request_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          verification_result?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          provider?: string | null
          provider_response?: Json | null
          request_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          verification_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_contracts: {
        Row: {
          agency_id: string | null
          agency_signature: Json | null
          agency_signed_at: string | null
          archived_at: string | null
          auto_renewal: boolean | null
          bank_account_details: Json | null
          charges_amount: number | null
          contract_number: string
          created_at: string | null
          custom_clauses: string | null
          deposit_amount: number | null
          document_hash: string | null
          document_url: string | null
          document_version: number | null
          draft_document_url: string | null
          duration_months: number | null
          effective_date: string | null
          end_at: string | null
          end_date: string | null
          fully_signed_at: string | null
          house_rules: string | null
          id: string
          inventory_details: Json | null
          lease_id: string | null
          metadata: Json | null
          monthly_rent: number
          notes: string | null
          owner_id: string
          owner_signature: Json | null
          owner_signed_at: string | null
          payment_day: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          property_id: string
          reference_number: string | null
          renewal_notice_days: number | null
          renewal_option: boolean | null
          service_charges: number | null
          signing_date: string | null
          special_conditions: string | null
          start_date: string
          status: Database["public"]["Enums"]["lease_contract_status"] | null
          tags: string[] | null
          tax_amount: number | null
          tenant_id: string
          tenant_signature: Json | null
          tenant_signed_at: string | null
          terminated_at: string | null
          termination_notice_days: number | null
          updated_at: string | null
          witness_signatures: Json | null
        }
        Insert: {
          agency_id?: string | null
          agency_signature?: Json | null
          agency_signed_at?: string | null
          archived_at?: string | null
          auto_renewal?: boolean | null
          bank_account_details?: Json | null
          charges_amount?: number | null
          contract_number: string
          created_at?: string | null
          custom_clauses?: string | null
          deposit_amount?: number | null
          document_hash?: string | null
          document_url?: string | null
          document_version?: number | null
          draft_document_url?: string | null
          duration_months?: number | null
          effective_date?: string | null
          end_at?: string | null
          end_date?: string | null
          fully_signed_at?: string | null
          house_rules?: string | null
          id?: string
          inventory_details?: Json | null
          lease_id?: string | null
          metadata?: Json | null
          monthly_rent: number
          notes?: string | null
          owner_id: string
          owner_signature?: Json | null
          owner_signed_at?: string | null
          payment_day?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          property_id: string
          reference_number?: string | null
          renewal_notice_days?: number | null
          renewal_option?: boolean | null
          service_charges?: number | null
          signing_date?: string | null
          special_conditions?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["lease_contract_status"] | null
          tags?: string[] | null
          tax_amount?: number | null
          tenant_id: string
          tenant_signature?: Json | null
          tenant_signed_at?: string | null
          terminated_at?: string | null
          termination_notice_days?: number | null
          updated_at?: string | null
          witness_signatures?: Json | null
        }
        Update: {
          agency_id?: string | null
          agency_signature?: Json | null
          agency_signed_at?: string | null
          archived_at?: string | null
          auto_renewal?: boolean | null
          bank_account_details?: Json | null
          charges_amount?: number | null
          contract_number?: string
          created_at?: string | null
          custom_clauses?: string | null
          deposit_amount?: number | null
          document_hash?: string | null
          document_url?: string | null
          document_version?: number | null
          draft_document_url?: string | null
          duration_months?: number | null
          effective_date?: string | null
          end_at?: string | null
          end_date?: string | null
          fully_signed_at?: string | null
          house_rules?: string | null
          id?: string
          inventory_details?: Json | null
          lease_id?: string | null
          metadata?: Json | null
          monthly_rent?: number
          notes?: string | null
          owner_id?: string
          owner_signature?: Json | null
          owner_signed_at?: string | null
          payment_day?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          property_id?: string
          reference_number?: string | null
          renewal_notice_days?: number | null
          renewal_option?: boolean | null
          service_charges?: number | null
          signing_date?: string | null
          special_conditions?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["lease_contract_status"] | null
          tags?: string[] | null
          tax_amount?: number | null
          tenant_id?: string
          tenant_signature?: Json | null
          tenant_signed_at?: string | null
          terminated_at?: string | null
          termination_notice_days?: number | null
          updated_at?: string | null
          witness_signatures?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "lease_contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lease_contracts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      leases: {
        Row: {
          auto_renew: boolean | null
          charges_amount: number | null
          contract_hash: string | null
          contract_url: string | null
          created_at: string | null
          deposit_amount: number | null
          end_at: string | null
          house_rules: string | null
          id: string
          landlord_id: string
          landlord_signature: Json | null
          last_rent_payment: string | null
          late_fee_percent: number | null
          lease_type: Database["public"]["Enums"]["lease_type"]
          property_id: string
          renewal_notice_days: number | null
          rent_amount: number
          rent_payment_day: number | null
          signed_at: string | null
          special_conditions: string | null
          start_date: string
          status: Database["public"]["Enums"]["lease_status"] | null
          tenant_id: string
          tenant_signature: Json | null
          terminated_at: string | null
          termination_notice_days: number | null
          terms: string | null
          updated_at: string | null
          witness_signatures: Json | null
        }
        Insert: {
          auto_renew?: boolean | null
          charges_amount?: number | null
          contract_hash?: string | null
          contract_url?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          end_at?: string | null
          house_rules?: string | null
          id?: string
          landlord_id: string
          landlord_signature?: Json | null
          last_rent_payment?: string | null
          late_fee_percent?: number | null
          lease_type?: Database["public"]["Enums"]["lease_type"]
          property_id: string
          renewal_notice_days?: number | null
          rent_amount: number
          rent_payment_day?: number | null
          signed_at?: string | null
          special_conditions?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"] | null
          tenant_id: string
          tenant_signature?: Json | null
          terminated_at?: string | null
          termination_notice_days?: number | null
          terms?: string | null
          updated_at?: string | null
          witness_signatures?: Json | null
        }
        Update: {
          auto_renew?: boolean | null
          charges_amount?: number | null
          contract_hash?: string | null
          contract_url?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          end_at?: string | null
          house_rules?: string | null
          id?: string
          landlord_id?: string
          landlord_signature?: Json | null
          last_rent_payment?: string | null
          late_fee_percent?: number | null
          lease_type?: Database["public"]["Enums"]["lease_type"]
          property_id?: string
          renewal_notice_days?: number | null
          rent_amount?: number
          rent_payment_day?: number | null
          signed_at?: string | null
          special_conditions?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"] | null
          tenant_id?: string
          tenant_signature?: Json | null
          terminated_at?: string | null
          termination_notice_days?: number | null
          terms?: string | null
          updated_at?: string | null
          witness_signatures?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leases_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_time: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          completed_date: string | null
          contract_id: string | null
          created_at: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          images: string[] | null
          issue_type: string
          priority: string | null
          property_id: string | null
          rejection_reason: string | null
          resolved_at: string | null
          scheduled_date: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          actual_cost?: number | null
          completed_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          issue_type: string
          priority?: string | null
          property_id?: string | null
          rejection_reason?: string | null
          resolved_at?: string | null
          scheduled_date?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          actual_cost?: number | null
          completed_date?: string | null
          contract_id?: string | null
          created_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          issue_type?: string
          priority?: string | null
          property_id?: string | null
          rejection_reason?: string | null
          resolved_at?: string | null
          scheduled_date?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_signature_logs: {
        Row: {
          created_at: string | null
          cryptoneo_response: Json | null
          error_message: string | null
          id: string
          ip_address: string | null
          mandate_id: string
          operation_id: string | null
          signer_id: string
          signer_type: string
          status: string
        }
        Insert: {
          created_at?: string | null
          cryptoneo_response?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          mandate_id: string
          operation_id?: string | null
          signer_id: string
          signer_type: string
          status: string
        }
        Update: {
          created_at?: string | null
          cryptoneo_response?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          mandate_id?: string
          operation_id?: string | null
          signer_id?: string
          signer_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandate_signature_logs_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "agency_mandates"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_metadata: Json | null
          attachments: Json | null
          content: string | null
          conversation_id: string
          created_at: string | null
          deleted_at: string | null
          delivered_at: string | null
          edited_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_read: boolean | null
          message_type: Database["public"]["Enums"]["message_type"] | null
          metadata: Json | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          attachment_metadata?: Json | null
          attachments?: Json | null
          content?: string | null
          conversation_id: string
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          metadata?: Json | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          attachment_metadata?: Json | null
          attachments?: Json | null
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_read?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          metadata?: Json | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_status: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          migration_name: string
          status: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          migration_name: string
          status: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          migration_name?: string
          status?: string
        }
        Relationships: []
      }
      mobile_money_transactions: {
        Row: {
          callback_data: Json | null
          confirmed_at: string | null
          country_code: string | null
          created_at: string | null
          external_transaction_id: string | null
          failed_at: string | null
          id: string
          initiated_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          otp_expires_at: string | null
          otp_required: boolean | null
          otp_verified: boolean | null
          payment_id: string
          phone_number: string
          provider: string
          provider_status: string | null
          response_data: Json | null
          retry_count: number | null
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          callback_data?: Json | null
          confirmed_at?: string | null
          country_code?: string | null
          created_at?: string | null
          external_transaction_id?: string | null
          failed_at?: string | null
          id?: string
          initiated_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          otp_expires_at?: string | null
          otp_required?: boolean | null
          otp_verified?: boolean | null
          payment_id: string
          phone_number: string
          provider: string
          provider_status?: string | null
          response_data?: Json | null
          retry_count?: number | null
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          callback_data?: Json | null
          confirmed_at?: string | null
          country_code?: string | null
          created_at?: string | null
          external_transaction_id?: string | null
          failed_at?: string | null
          id?: string
          initiated_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          otp_expires_at?: string | null
          otp_required?: boolean | null
          otp_verified?: boolean | null
          payment_id?: string
          phone_number?: string
          provider?: string
          provider_status?: string | null
          response_data?: Json | null
          retry_count?: number | null
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      monartisan_contractors: {
        Row: {
          created_at: string | null
          id: string
          name: string
          phone: string | null
          rating: number | null
          specialty: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          phone?: string | null
          rating?: number | null
          specialty?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          phone?: string | null
          rating?: number | null
          specialty?: string | null
        }
        Relationships: []
      }
      monartisan_job_requests: {
        Row: {
          contractor_id: string | null
          created_at: string | null
          id: string
          maintenance_request_id: string | null
          quote_amount: number | null
          status: string | null
        }
        Insert: {
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          maintenance_request_id?: string | null
          quote_amount?: number | null
          status?: string | null
        }
        Update: {
          contractor_id?: string | null
          created_at?: string | null
          id?: string
          maintenance_request_id?: string | null
          quote_amount?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monartisan_job_requests_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "monartisan_contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monartisan_job_requests_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      monartisan_quotes: {
        Row: {
          amount: number | null
          created_at: string | null
          details: string | null
          id: string
          job_request_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          details?: string | null
          id?: string
          job_request_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          details?: string | null
          id?: string
          job_request_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monartisan_quotes_job_request_id_fkey"
            columns: ["job_request_id"]
            isOneToOne: false
            referencedRelation: "monartisan_job_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_reports: {
        Row: {
          created_at: string | null
          emailed_at: string | null
          ended_leases: number | null
          generated_at: string | null
          id: string
          new_leases: number | null
          owner_id: string
          properties_rented: number | null
          report_data: Json | null
          report_month: string
          total_applications: number | null
          total_properties: number | null
          total_revenue: number | null
          total_views: number | null
        }
        Insert: {
          created_at?: string | null
          emailed_at?: string | null
          ended_leases?: number | null
          generated_at?: string | null
          id?: string
          new_leases?: number | null
          owner_id: string
          properties_rented?: number | null
          report_data?: Json | null
          report_month: string
          total_applications?: number | null
          total_properties?: number | null
          total_revenue?: number | null
          total_views?: number | null
        }
        Update: {
          created_at?: string | null
          emailed_at?: string | null
          ended_leases?: number | null
          generated_at?: string | null
          id?: string
          new_leases?: number | null
          owner_id?: string
          properties_rented?: number | null
          report_data?: Json | null
          report_month?: string
          total_applications?: number | null
          total_properties?: number | null
          total_revenue?: number | null
          total_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "monthly_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "monthly_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          application_notifications: boolean | null
          created_at: string | null
          digest_frequency: string | null
          digest_mode: boolean | null
          email_address: string | null
          email_notifications: boolean | null
          id: string
          in_app_notifications: boolean | null
          lease_notifications: boolean | null
          marketing_notifications: boolean | null
          message_notifications: boolean | null
          payment_notifications: boolean | null
          phone_number: string | null
          preferences: Json | null
          push_notifications: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_notifications: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_notifications?: boolean | null
          created_at?: string | null
          digest_frequency?: string | null
          digest_mode?: boolean | null
          email_address?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          lease_notifications?: boolean | null
          marketing_notifications?: boolean | null
          message_notifications?: boolean | null
          payment_notifications?: boolean | null
          phone_number?: string | null
          preferences?: Json | null
          push_notifications?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_notifications?: boolean | null
          created_at?: string | null
          digest_frequency?: string | null
          digest_mode?: boolean | null
          email_address?: string | null
          email_notifications?: boolean | null
          id?: string
          in_app_notifications?: boolean | null
          lease_notifications?: boolean | null
          marketing_notifications?: boolean | null
          message_notifications?: boolean | null
          payment_notifications?: boolean | null
          phone_number?: string | null
          preferences?: Json | null
          push_notifications?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_notifications?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_text: string | null
          action_url: string | null
          archived_at: string | null
          category: string | null
          created_at: string | null
          data: Json | null
          delivery_attempts: number | null
          delivery_error: string | null
          expires_at: string | null
          id: string
          is_archived: boolean | null
          is_read: boolean | null
          last_delivery_attempt_at: string | null
          message: string
          priority: string | null
          read_at: string | null
          sent_via_email: boolean | null
          sent_via_in_app: boolean | null
          sent_via_push: boolean | null
          sent_via_sms: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_text?: string | null
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          delivery_attempts?: number | null
          delivery_error?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          last_delivery_attempt_at?: string | null
          message: string
          priority?: string | null
          read_at?: string | null
          sent_via_email?: boolean | null
          sent_via_in_app?: boolean | null
          sent_via_push?: boolean | null
          sent_via_sms?: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_text?: string | null
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          delivery_attempts?: number | null
          delivery_error?: string | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean | null
          is_read?: boolean | null
          last_delivery_attempt_at?: string | null
          message?: string
          priority?: string | null
          read_at?: string | null
          sent_via_email?: boolean | null
          sent_via_in_app?: boolean | null
          sent_via_push?: boolean | null
          sent_via_sms?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string
          expires_at: string
          id: string
          max_attempts: number | null
          method: string
          purpose: string | null
          recipient: string
          updated_at: string
          used: boolean | null
          used_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number | null
          method: string
          purpose?: string | null
          recipient: string
          updated_at?: string
          used?: boolean | null
          used_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number | null
          method?: string
          purpose?: string | null
          recipient?: string
          updated_at?: string
          used?: boolean | null
          used_at?: string | null
        }
        Relationships: []
      }
      owner_applications: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          id_document_url: string | null
          id_document_verified: boolean | null
          id_document_verified_at: string | null
          income_proof_url: string | null
          income_proof_verified: boolean | null
          income_proof_verified_at: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          property_proof_url: string | null
          property_proof_verified: boolean | null
          property_proof_verified_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          date_of_birth?: string | null
          email: string
          full_name: string
          id?: string
          id_document_url?: string | null
          id_document_verified?: boolean | null
          id_document_verified_at?: string | null
          income_proof_url?: string | null
          income_proof_verified?: boolean | null
          income_proof_verified_at?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          property_proof_url?: string | null
          property_proof_verified?: boolean | null
          property_proof_verified_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          id_document_url?: string | null
          id_document_verified?: boolean | null
          id_document_verified_at?: string | null
          income_proof_url?: string | null
          income_proof_verified?: boolean | null
          income_proof_verified_at?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          property_proof_url?: string | null
          property_proof_verified?: boolean | null
          property_proof_verified_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_documents: {
        Row: {
          category: string | null
          created_at: string | null
          file_size: number | null
          file_url: string
          id: string
          name: string
          ocr_text: string | null
          owner_id: string
          property_id: string | null
          signed: boolean | null
          signed_at: string | null
          status: string | null
          tags: string[] | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          file_url: string
          id?: string
          name: string
          ocr_text?: string | null
          owner_id: string
          property_id?: string | null
          signed?: boolean | null
          signed_at?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          file_size?: number | null
          file_url?: string
          id?: string
          name?: string
          ocr_text?: string | null
          owner_id?: string
          property_id?: string | null
          signed?: boolean | null
          signed_at?: string | null
          status?: string | null
          tags?: string[] | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          ip_address: string | null
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          ip_address?: string | null
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          channel: string | null
          click_count: number | null
          contract_id: string | null
          created_at: string | null
          id: string
          message: string | null
          opened: boolean | null
          opened_date: string | null
          owner_id: string
          property_id: string | null
          reminder_type: string
          schedule_offset: number
          scheduled_date: string
          sent_date: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          channel?: string | null
          click_count?: number | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          opened?: boolean | null
          opened_date?: string | null
          owner_id: string
          property_id?: string | null
          reminder_type: string
          schedule_offset?: number
          scheduled_date: string
          sent_date?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channel?: string | null
          click_count?: number | null
          contract_id?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          opened?: boolean | null
          opened_date?: string | null
          owner_id?: string
          property_id?: string | null
          reminder_type?: string
          schedule_offset?: number
          scheduled_date?: string
          sent_date?: string | null
          status?: string | null
          subject?: string | null
          template_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "payment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          base_amount: number | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          due_date_reminders: Json | null
          external_reference: string | null
          fees_amount: number | null
          id: string
          lease_id: string | null
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          processor_response: Json | null
          property_id: string | null
          refund_amount: number | null
          refund_reason: string | null
          refund_transaction_id: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          due_date_reminders?: Json | null
          external_reference?: string | null
          fees_amount?: number | null
          id?: string
          lease_id?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: Database["public"]["Enums"]["payment_type"]
          processor_response?: Json | null
          property_id?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refund_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          due_date_reminders?: Json | null
          external_reference?: string | null
          fees_amount?: number | null
          id?: string
          lease_id?: string | null
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type?: Database["public"]["Enums"]["payment_type"]
          processor_response?: Json | null
          property_id?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          refund_transaction_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: Json | null
          agency_description: string | null
          agency_email: string | null
          agency_id: string | null
          agency_logo: string | null
          agency_name: string | null
          agency_phone: string | null
          agency_website: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          cnam_verified: boolean | null
          created_at: string | null
          documents: Json | null
          email: string
          facial_verification_date: string | null
          facial_verification_provider: string | null
          facial_verification_score: number | null
          facial_verification_status: string | null
          full_name: string | null
          gender: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          metadata: Json | null
          oneci_verified: boolean | null
          phone: string | null
          preferences: Json | null
          profile_setup_completed: boolean | null
          reliability_score: number | null
          trust_score: number | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          verification_documents: Json | null
        }
        Insert: {
          address?: Json | null
          agency_description?: string | null
          agency_email?: string | null
          agency_id?: string | null
          agency_logo?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          agency_website?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          created_at?: string | null
          documents?: Json | null
          email: string
          facial_verification_date?: string | null
          facial_verification_provider?: string | null
          facial_verification_score?: number | null
          facial_verification_status?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          oneci_verified?: boolean | null
          phone?: string | null
          preferences?: Json | null
          profile_setup_completed?: boolean | null
          reliability_score?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verification_documents?: Json | null
        }
        Update: {
          address?: Json | null
          agency_description?: string | null
          agency_email?: string | null
          agency_id?: string | null
          agency_logo?: string | null
          agency_name?: string | null
          agency_phone?: string | null
          agency_website?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          created_at?: string | null
          documents?: Json | null
          email?: string
          facial_verification_date?: string | null
          facial_verification_provider?: string | null
          facial_verification_score?: number | null
          facial_verification_status?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          oneci_verified?: boolean | null
          phone?: string | null
          preferences?: Json | null
          profile_setup_completed?: boolean | null
          reliability_score?: number | null
          trust_score?: number | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          verification_documents?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: Json
          amenities: Json | null
          ansut_certificate_url: string | null
          ansut_verification_date: string | null
          ansut_verified: boolean | null
          applications_count: number | null
          available_for_visits: boolean | null
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          charges_amount: number | null
          charges_included: boolean | null
          city: string | null
          coordinates: Json | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          external_references: Json | null
          favorites_count: number | null
          featured: boolean | null
          features: Json | null
          floor_number: number | null
          furnished: boolean | null
          has_ac: boolean | null
          has_elevator: boolean | null
          has_garden: boolean | null
          has_parking: boolean | null
          id: string
          images: Json | null
          is_anonymous: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          last_viewed_at: string | null
          latitude: number | null
          longitude: number | null
          main_image: string | null
          minimum_lease_months: number | null
          neighborhood: string | null
          owner_id: string
          price: number
          property_category: string | null
          property_code: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          rooms: number | null
          status: Database["public"]["Enums"]["property_status"] | null
          surface_area: number | null
          title: string
          updated_at: string | null
          video_tour_url: string | null
          views_count: number | null
          virtual_tour_url: string | null
          year_built: number | null
        }
        Insert: {
          address?: Json
          amenities?: Json | null
          ansut_certificate_url?: string | null
          ansut_verification_date?: string | null
          ansut_verified?: boolean | null
          applications_count?: number | null
          available_for_visits?: boolean | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          charges_amount?: number | null
          charges_included?: boolean | null
          city?: string | null
          coordinates?: Json | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          external_references?: Json | null
          favorites_count?: number | null
          featured?: boolean | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          has_ac?: boolean | null
          has_elevator?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          id?: string
          images?: Json | null
          is_anonymous?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          last_viewed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string | null
          minimum_lease_months?: number | null
          neighborhood?: string | null
          owner_id: string
          price: number
          property_category?: string | null
          property_code?: string | null
          property_type: Database["public"]["Enums"]["property_type"]
          rooms?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          surface_area?: number | null
          title: string
          updated_at?: string | null
          video_tour_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Update: {
          address?: Json
          amenities?: Json | null
          ansut_certificate_url?: string | null
          ansut_verification_date?: string | null
          ansut_verified?: boolean | null
          applications_count?: number | null
          available_for_visits?: boolean | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          charges_amount?: number | null
          charges_included?: boolean | null
          city?: string | null
          coordinates?: Json | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          external_references?: Json | null
          favorites_count?: number | null
          featured?: boolean | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          has_ac?: boolean | null
          has_elevator?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          id?: string
          images?: Json | null
          is_anonymous?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          last_viewed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string | null
          minimum_lease_months?: number | null
          neighborhood?: string | null
          owner_id?: string
          price?: number
          property_category?: string | null
          property_code?: string | null
          property_type?: Database["public"]["Enums"]["property_type"]
          rooms?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          surface_area?: number | null
          title?: string
          updated_at?: string | null
          video_tour_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      property_alerts: {
        Row: {
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_notified_at: string | null
          max_bedrooms: number | null
          max_price: number | null
          min_bedrooms: number | null
          min_price: number | null
          neighborhood: string | null
          property_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          max_bedrooms?: number | null
          max_price?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          neighborhood?: string | null
          property_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_notified_at?: string | null
          max_bedrooms?: number | null
          max_price?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          neighborhood?: string | null
          property_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "property_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          created_at: string | null
          document_name: string | null
          document_type: string
          document_url: string
          id: string
          owner_id: string
          property_id: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_name?: string | null
          document_type: string
          document_url: string
          id?: string
          owner_id: string
          property_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_name?: string | null
          document_type?: string
          document_url?: string
          id?: string
          owner_id?: string
          property_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      property_favorites: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          priority: number | null
          property_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          property_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          property_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "property_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      property_statistics: {
        Row: {
          applications: number | null
          created_at: string | null
          date: string
          id: string
          property_id: string | null
          total_views: number | null
        }
        Insert: {
          applications?: number | null
          created_at?: string | null
          date: string
          id?: string
          property_id?: string | null
          total_views?: number | null
        }
        Update: {
          applications?: number | null
          created_at?: string | null
          date?: string
          id?: string
          property_id?: string | null
          total_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_statistics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_statistics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_statistics_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      property_visits: {
        Row: {
          agent_id: string | null
          calendar_event_id: string | null
          completed_at: string | null
          confirmed_at: string | null
          contact_phone: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          meeting_point: string | null
          property_id: string
          property_showback_notes: string | null
          reminders_sent: Json | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["visit_status"] | null
          tenant_feedback: number | null
          tenant_id: string
          tenant_notes: string | null
          updated_at: string | null
          visit_date: string
        }
        Insert: {
          agent_id?: string | null
          calendar_event_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contact_phone?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_point?: string | null
          property_id: string
          property_showback_notes?: string | null
          reminders_sent?: Json | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["visit_status"] | null
          tenant_feedback?: number | null
          tenant_id: string
          tenant_notes?: string | null
          updated_at?: string | null
          visit_date: string
        }
        Update: {
          agent_id?: string | null
          calendar_event_id?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          contact_phone?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          meeting_point?: string | null
          property_id?: string
          property_showback_notes?: string | null
          reminders_sent?: Json | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["visit_status"] | null
          tenant_feedback?: number | null
          tenant_id?: string
          tenant_notes?: string | null
          updated_at?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "property_visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_visits_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "property_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          recommendation_type: string
          recommended_items: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          recommendation_type: string
          recommended_items?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          recommendation_type?: string
          recommended_items?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "recommendation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recommendation_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_payments: {
        Row: {
          amount: number
          contract_id: string
          created_at: string
          end_date: string | null
          frequency: string
          id: string
          is_active: boolean
          last_payment_date: string | null
          next_payment_date: string
          payment_day: number
          phone_number: string
          provider: string
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          contract_id: string
          created_at?: string
          end_date?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          last_payment_date?: string | null
          next_payment_date: string
          payment_day: number
          phone_number: string
          provider: string
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          contract_id?: string
          created_at?: string
          end_date?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_payment_date?: string | null
          next_payment_date?: string
          payment_day?: number
          phone_number?: string
          provider?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "recurring_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "recurring_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          created_at: string | null
          default_channel: string | null
          id: string
          owner_id: string
          reminders_enabled: boolean | null
          renewal_reminder_days: number | null
          renewal_reminders_enabled: boolean | null
          rent_reminder_schedule: number[]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_channel?: string | null
          id?: string
          owner_id: string
          reminders_enabled?: boolean | null
          renewal_reminder_days?: number | null
          renewal_reminders_enabled?: boolean | null
          rent_reminder_schedule?: number[]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_channel?: string | null
          id?: string
          owner_id?: string
          reminders_enabled?: boolean | null
          renewal_reminder_days?: number | null
          renewal_reminders_enabled?: boolean | null
          rent_reminder_schedule?: number[]
          updated_at?: string | null
        }
        Relationships: []
      }
      reminder_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          owner_id: string
          subject: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          owner_id: string
          subject?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          owner_id?: string
          subject?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      rental_applications: {
        Row: {
          application_message: string | null
          applied_at: string | null
          background_check_status: string | null
          credit_score: number | null
          documents: Json | null
          expires_at: string | null
          guarantor_id: string | null
          id: string
          income_proof: Json | null
          landlord_notes: string | null
          property_id: string
          proposed_rent: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          application_message?: string | null
          applied_at?: string | null
          background_check_status?: string | null
          credit_score?: number | null
          documents?: Json | null
          expires_at?: string | null
          guarantor_id?: string | null
          id?: string
          income_proof?: Json | null
          landlord_notes?: string | null
          property_id: string
          proposed_rent?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          application_message?: string | null
          applied_at?: string | null
          background_check_status?: string | null
          credit_score?: number | null
          documents?: Json | null
          expires_at?: string | null
          guarantor_id?: string | null
          id?: string
          income_proof?: Json | null
          landlord_notes?: string | null
          property_id?: string
          proposed_rent?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_applications_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "rental_applications_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_applications_guarantor_id_fkey"
            columns: ["guarantor_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "rental_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_history: {
        Row: {
          city: string
          created_at: string | null
          departure_reason: string | null
          end_date: string | null
          id: string
          is_current: boolean | null
          landlord_email: string | null
          landlord_name: string | null
          landlord_phone: string | null
          monthly_rent: number
          proof_documents: Json | null
          property_address: string
          property_type: string | null
          self_condition_rating: number | null
          self_payment_rating: number | null
          start_date: string
          tenant_id: string
          updated_at: string | null
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          departure_reason?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          landlord_email?: string | null
          landlord_name?: string | null
          landlord_phone?: string | null
          monthly_rent: number
          proof_documents?: Json | null
          property_address: string
          property_type?: string | null
          self_condition_rating?: number | null
          self_payment_rating?: number | null
          start_date: string
          tenant_id: string
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          departure_reason?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean | null
          landlord_email?: string | null
          landlord_name?: string | null
          landlord_phone?: string | null
          monthly_rent?: number
          proof_documents?: Json | null
          property_address?: string
          property_type?: string | null
          self_condition_rating?: number | null
          self_payment_rating?: number | null
          start_date?: string
          tenant_id?: string
          updated_at?: string | null
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "rental_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "rental_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          email_sent_at: string | null
          error_message: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          owner_id: string
          period_end: string | null
          period_start: string | null
          report_data: Json | null
          report_type: string
          sent_status: string | null
        }
        Insert: {
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          owner_id: string
          period_end?: string | null
          period_start?: string | null
          report_data?: Json | null
          report_type: string
          sent_status?: string | null
        }
        Update: {
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          owner_id?: string
          period_end?: string | null
          period_start?: string | null
          report_data?: Json | null
          report_type?: string
          sent_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_history_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "report_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_visible: boolean | null
          moderation_status: string | null
          property_id: string | null
          rating: number
          review_type: string | null
          reviewee_id: string | null
          reviewer_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          moderation_status?: string | null
          property_id?: string | null
          rating: number
          review_type?: string | null
          reviewee_id?: string | null
          reviewer_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          moderation_status?: string | null
          property_id?: string | null
          rating?: number
          review_type?: string | null
          reviewee_id?: string | null
          reviewer_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          alert_enabled: boolean | null
          alert_frequency: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          last_alert_sent_at: string | null
          last_search_run_at: string | null
          metadata: Json | null
          name: string
          search_criteria: Json
          tags: string[] | null
          total_matches: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_alert_sent_at?: string | null
          last_search_run_at?: string | null
          metadata?: Json | null
          name: string
          search_criteria: Json
          tags?: string[] | null
          total_matches?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_enabled?: boolean | null
          alert_frequency?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          last_alert_sent_at?: string | null
          last_search_run_at?: string | null
          metadata?: Json | null
          name?: string
          search_criteria?: Json
          tags?: string[] | null
          total_matches?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          clicked_properties: string[] | null
          created_at: string | null
          id: string
          result_count: number | null
          search_filters: Json | null
          user_id: string | null
        }
        Insert: {
          clicked_properties?: string[] | null
          created_at?: string | null
          id?: string
          result_count?: number | null
          search_filters?: Json | null
          user_id?: string | null
        }
        Update: {
          clicked_properties?: string[] | null
          created_at?: string | null
          id?: string
          result_count?: number | null
          search_filters?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      service_configurations: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          priority: number | null
          provider: string
          service_name: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          priority?: number | null
          provider: string
          service_name: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          priority?: number | null
          provider?: string
          service_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      service_usage_logs: {
        Row: {
          error_message: string | null
          id: string
          phone: string | null
          provider: string
          response_time_ms: number | null
          service_name: string
          status: string
          timestamp: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          phone?: string | null
          provider: string
          response_time_ms?: number | null
          service_name: string
          status: string
          timestamp?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          phone?: string | null
          provider?: string
          response_time_ms?: number | null
          service_name?: string
          status?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      signature_history: {
        Row: {
          action: string | null
          created_at: string | null
          document_url: string | null
          id: string
          lease_id: string | null
          metadata: Json | null
          otp_code: string | null
          signature_data: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          lease_id?: string | null
          metadata?: Json | null
          otp_code?: string | null
          signature_data?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          lease_id?: string | null
          metadata?: Json | null
          otp_code?: string | null
          signature_data?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "signature_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "signature_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          provider: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          provider: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          provider?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
      suta_analytics: {
        Row: {
          avg_response_time_ms: number | null
          category: string | null
          created_at: string | null
          date: string | null
          id: string
          negative_feedback: number | null
          positive_feedback: number | null
          question_count: number | null
          topic: string | null
        }
        Insert: {
          avg_response_time_ms?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          negative_feedback?: number | null
          positive_feedback?: number | null
          question_count?: number | null
          topic?: string | null
        }
        Update: {
          avg_response_time_ms?: number | null
          category?: string | null
          created_at?: string | null
          date?: string | null
          id?: string
          negative_feedback?: number | null
          positive_feedback?: number | null
          question_count?: number | null
          topic?: string | null
        }
        Relationships: []
      }
      suta_conversations: {
        Row: {
          ended_at: string | null
          id: string
          session_id: string | null
          started_at: string | null
          user_id: string | null
        }
        Insert: {
          ended_at?: string | null
          id?: string
          session_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Update: {
          ended_at?: string | null
          id?: string
          session_id?: string | null
          started_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suta_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "suta_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suta_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suta_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "suta_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      suta_feedback: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          feedback_text: string | null
          id: string
          message_id: string
          question: string
          rating: string
          response: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message_id: string
          question: string
          rating: string
          response: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          feedback_text?: string | null
          id?: string
          message_id?: string
          question?: string
          rating?: string
          response?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suta_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chatbot_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      suta_knowledge_base: {
        Row: {
          answer: string
          category: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          negative_feedback_count: number | null
          positive_feedback_count: number | null
          priority: number | null
          question: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          answer: string
          category: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          negative_feedback_count?: number | null
          positive_feedback_count?: number | null
          priority?: number | null
          question: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          negative_feedback_count?: number | null
          positive_feedback_count?: number | null
          priority?: number | null
          question?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      suta_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "suta_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "suta_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string | null
          description: string | null
          id: string
          is_public: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      tenant_applications: {
        Row: {
          bank_statement_url: string | null
          bank_statement_verified: boolean | null
          bank_statement_verified_at: string | null
          current_address: string | null
          date_of_birth: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employer_contact: string | null
          employer_name: string | null
          employment_proof_url: string | null
          employment_proof_verified: boolean | null
          employment_proof_verified_at: string | null
          employment_status: string | null
          family_size: number | null
          full_name: string
          has_pets: boolean | null
          id: string
          id_document_url: string | null
          id_document_verified: boolean | null
          id_document_verified_at: string | null
          income_proof_url: string | null
          income_proof_verified: boolean | null
          income_proof_verified_at: string | null
          monthly_income: number | null
          national_id: string | null
          notes: string | null
          occupation: string | null
          pets_description: string | null
          phone: string | null
          reference_data: Json | null
          rejection_reason: string | null
          rental_history_url: string | null
          rental_history_verified: boolean | null
          rental_history_verified_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          user_id: string
          verification_status: string | null
        }
        Insert: {
          bank_statement_url?: string | null
          bank_statement_verified?: boolean | null
          bank_statement_verified_at?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employer_contact?: string | null
          employer_name?: string | null
          employment_proof_url?: string | null
          employment_proof_verified?: boolean | null
          employment_proof_verified_at?: string | null
          employment_status?: string | null
          family_size?: number | null
          full_name: string
          has_pets?: boolean | null
          id?: string
          id_document_url?: string | null
          id_document_verified?: boolean | null
          id_document_verified_at?: string | null
          income_proof_url?: string | null
          income_proof_verified?: boolean | null
          income_proof_verified_at?: string | null
          monthly_income?: number | null
          national_id?: string | null
          notes?: string | null
          occupation?: string | null
          pets_description?: string | null
          phone?: string | null
          reference_data?: Json | null
          rejection_reason?: string | null
          rental_history_url?: string | null
          rental_history_verified?: boolean | null
          rental_history_verified_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          user_id: string
          verification_status?: string | null
        }
        Update: {
          bank_statement_url?: string | null
          bank_statement_verified?: boolean | null
          bank_statement_verified_at?: string | null
          current_address?: string | null
          date_of_birth?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          employer_contact?: string | null
          employer_name?: string | null
          employment_proof_url?: string | null
          employment_proof_verified?: boolean | null
          employment_proof_verified_at?: string | null
          employment_status?: string | null
          family_size?: number | null
          full_name?: string
          has_pets?: boolean | null
          id?: string
          id_document_url?: string | null
          id_document_verified?: boolean | null
          id_document_verified_at?: string | null
          income_proof_url?: string | null
          income_proof_verified?: boolean | null
          income_proof_verified_at?: string | null
          monthly_income?: number | null
          national_id?: string | null
          notes?: string | null
          occupation?: string | null
          pets_description?: string | null
          phone?: string | null
          reference_data?: Json | null
          rejection_reason?: string | null
          rental_history_url?: string | null
          rental_history_verified?: boolean | null
          rental_history_verified_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          user_id?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      test_data_templates: {
        Row: {
          active: boolean | null
          ai_prompt: string | null
          created_at: string | null
          description: string | null
          generation_rules: Json | null
          id: string
          name: string
          payload: Json | null
          template_type: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          ai_prompt?: string | null
          created_at?: string | null
          description?: string | null
          generation_rules?: Json | null
          id?: string
          name: string
          payload?: Json | null
          template_type: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          ai_prompt?: string | null
          created_at?: string | null
          description?: string | null
          generation_rules?: Json | null
          id?: string
          name?: string
          payload?: Json | null
          template_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_active_roles: {
        Row: {
          active_role: string
          available_roles: string[]
          created_at: string | null
          last_switch_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          active_role: string
          available_roles?: string[]
          created_at?: string | null
          last_switch_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          active_role?: string
          available_roles?: string[]
          created_at?: string | null
          last_switch_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_active_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_active_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_active_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_active_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_active_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_conversations: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          participant_1_id: string
          participant_2_id: string
          property_id: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant_1_id: string
          participant_2_id: string
          property_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          participant_1_id?: string
          participant_2_id?: string
          property_id?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          created_at: string | null
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          max_budget: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          min_budget: number | null
          preferred_cities: string[] | null
          preferred_property_types: string[] | null
          requires_ac: boolean | null
          requires_furnished: boolean | null
          requires_garden: boolean | null
          requires_parking: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_budget?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_budget?: number | null
          preferred_cities?: string[] | null
          preferred_property_types?: string[] | null
          requires_ac?: boolean | null
          requires_furnished?: boolean | null
          requires_garden?: boolean | null
          requires_parking?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_budget?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_budget?: number | null
          preferred_cities?: string[] | null
          preferred_property_types?: string[] | null
          requires_ac?: boolean | null
          requires_furnished?: boolean | null
          requires_garden?: boolean | null
          requires_parking?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminders: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          link: string | null
          message: string | null
          reminder_type: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link?: string | null
          message?: string | null
          reminder_type: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link?: string | null
          message?: string | null
          reminder_type?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      user_verifications: {
        Row: {
          created_at: string | null
          documents: Json | null
          expiry_date: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string | null
          user_id: string
          verification_data: Json | null
          verification_type: Database["public"]["Enums"]["verification_type"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string | null
          documents?: Json | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
          user_id: string
          verification_data?: Json | null
          verification_type: Database["public"]["Enums"]["verification_type"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string | null
          documents?: Json | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
          user_id?: string
          verification_data?: Json | null
          verification_type?: Database["public"]["Enums"]["verification_type"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "user_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_applications: {
        Row: {
          approved_at: string | null
          assigned_agent_id: string | null
          completion_percentage: number | null
          created_at: string
          documents: Json | null
          dossier_type: string
          financial_info: Json | null
          id: string
          personal_info: Json | null
          property_info: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          status: string
          submitted_at: string
          updated_at: string
          user_id: string
          verification_status: Json | null
        }
        Insert: {
          approved_at?: string | null
          assigned_agent_id?: string | null
          completion_percentage?: number | null
          created_at?: string
          documents?: Json | null
          dossier_type: string
          financial_info?: Json | null
          id?: string
          personal_info?: Json | null
          property_info?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          verification_status?: Json | null
        }
        Update: {
          approved_at?: string | null
          assigned_agent_id?: string | null
          completion_percentage?: number | null
          created_at?: string
          documents?: Json | null
          dossier_type?: string
          financial_info?: Json | null
          id?: string
          personal_info?: Json | null
          property_info?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          verification_status?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_applications_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "verification_applications_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_applications_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_applications_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verification_applications_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          email: string | null
          expires_at: string
          id: string
          max_attempts: number | null
          phone: string | null
          type: string
          user_id: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          email?: string | null
          expires_at: string
          id?: string
          max_attempts?: number | null
          phone?: string | null
          type: string
          user_id?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          max_attempts?: number | null
          phone?: string | null
          type?: string
          user_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verification_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          document_url: string
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          uploaded_at: string
          verification_notes: string | null
          verification_status: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          document_url: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          document_url?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          uploaded_at?: string
          verification_notes?: string | null
          verification_status?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "verification_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "verification_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "verification_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      visit_requests: {
        Row: {
          access_instructions: string | null
          additional_attendees: Json | null
          agent_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmation_sent: boolean | null
          confirmed_at: string | null
          confirmed_date: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          duration_minutes: number | null
          emergency_contact: Json | null
          follow_up_notes: string | null
          follow_up_required: boolean | null
          id: string
          last_reminder_at: string | null
          meeting_point: string | null
          metadata: Json | null
          notes: string | null
          owner_attended: boolean | null
          owner_feedback: string | null
          owner_id: string
          owner_rating: number | null
          parking_info: string | null
          preferred_dates: Json | null
          property_access_code: string | null
          property_id: string
          rejection_reason: string | null
          reminder_sent: boolean | null
          status: Database["public"]["Enums"]["visit_request_status"] | null
          tenant_attended: boolean | null
          tenant_feedback: string | null
          tenant_id: string
          tenant_rating: number | null
          updated_at: string | null
          visit_date: string | null
          visit_successful: boolean | null
          visit_time: string | null
          visit_type: Database["public"]["Enums"]["visit_type"] | null
        }
        Insert: {
          access_instructions?: string | null
          additional_attendees?: Json | null
          agent_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmation_sent?: boolean | null
          confirmed_at?: string | null
          confirmed_date?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          emergency_contact?: Json | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          last_reminder_at?: string | null
          meeting_point?: string | null
          metadata?: Json | null
          notes?: string | null
          owner_attended?: boolean | null
          owner_feedback?: string | null
          owner_id: string
          owner_rating?: number | null
          parking_info?: string | null
          preferred_dates?: Json | null
          property_access_code?: string | null
          property_id: string
          rejection_reason?: string | null
          reminder_sent?: boolean | null
          status?: Database["public"]["Enums"]["visit_request_status"] | null
          tenant_attended?: boolean | null
          tenant_feedback?: string | null
          tenant_id: string
          tenant_rating?: number | null
          updated_at?: string | null
          visit_date?: string | null
          visit_successful?: boolean | null
          visit_time?: string | null
          visit_type?: Database["public"]["Enums"]["visit_type"] | null
        }
        Update: {
          access_instructions?: string | null
          additional_attendees?: Json | null
          agent_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmation_sent?: boolean | null
          confirmed_at?: string | null
          confirmed_date?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          emergency_contact?: Json | null
          follow_up_notes?: string | null
          follow_up_required?: boolean | null
          id?: string
          last_reminder_at?: string | null
          meeting_point?: string | null
          metadata?: Json | null
          notes?: string | null
          owner_attended?: boolean | null
          owner_feedback?: string | null
          owner_id?: string
          owner_rating?: number | null
          parking_info?: string | null
          preferred_dates?: Json | null
          property_access_code?: string | null
          property_id?: string
          rejection_reason?: string | null
          reminder_sent?: boolean | null
          status?: Database["public"]["Enums"]["visit_request_status"] | null
          tenant_attended?: boolean | null
          tenant_feedback?: string | null
          tenant_id?: string
          tenant_rating?: number | null
          updated_at?: string | null
          visit_date?: string | null
          visit_successful?: boolean | null
          visit_time?: string | null
          visit_type?: Database["public"]["Enums"]["visit_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "visit_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "visit_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visit_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "visit_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visit_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "visit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visit_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          processing_result: string
          signature_provided: string | null
          signature_valid: boolean | null
          source_ip: string | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processing_result: string
          signature_provided?: string | null
          signature_valid?: boolean | null
          source_ip?: string | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          processing_result?: string
          signature_provided?: string | null
          signature_valid?: boolean | null
          source_ip?: string | null
          webhook_type?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          provider: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          provider: string
          status: string
          transaction_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          provider?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      admin_audit_stats: {
        Row: {
          actions_last_30_days: number | null
          actions_last_7_days: number | null
          admin_email: string | null
          admin_id: string | null
          admin_name: string | null
          last_action_at: string | null
          total_actions: number | null
        }
        Relationships: []
      }
      admin_notifications_with_info: {
        Row: {
          admin_avatar: string | null
          admin_email: string | null
          admin_id: string | null
          admin_name: string | null
          created_at: string | null
          data: Json | null
          id: string | null
          link: string | null
          message: string | null
          read_at: string | null
          title: string | null
          type: Database["public"]["Enums"]["admin_notification_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_applications_with_details: {
        Row: {
          address: string | null
          agency_name: string | null
          application_email: string | null
          application_phone: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          id: string | null
          insurance_proof_url: string | null
          insurance_proof_verified: boolean | null
          insurance_proof_verified_at: string | null
          notes: string | null
          registration_document_url: string | null
          registration_document_verified: boolean | null
          registration_document_verified_at: string | null
          registration_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          tax_certificate_url: string | null
          tax_certificate_verified: boolean | null
          tax_certificate_verified_at: string | null
          tax_id: string | null
          user_email: string | null
          user_id: string | null
          user_phone: string | null
          verification_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agency_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limit_violations: {
        Row: {
          endpoint: string | null
          max_requests_per_minute: number | null
          request_count: number | null
          reset_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          violation_detected_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes_with_details: {
        Row: {
          assigned_to: string | null
          contract_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          escalated_at: string | null
          escalated_to: string | null
          escalation_reason: string | null
          id: string | null
          mediation_stage: string | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          priority: string | null
          property_address: Json | null
          property_city: string | null
          property_id: string | null
          property_title: string | null
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          tenant_email: string | null
          tenant_id: string | null
          tenant_name: string | null
          title: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "disputes_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "lease_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "disputes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "disputes_escalated_to_fkey"
            columns: ["escalated_to"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lease_contracts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lease_contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags_with_stats: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          evaluations_last_7_days: number | null
          flag_type: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          rollout_percentage: number | null
          segment_rules: Json | null
          total_users_enabled: number | null
          total_users_evaluated: number | null
          updated_at: string | null
          variants_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feature_flags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_applications_with_details: {
        Row: {
          address: string | null
          application_email: string | null
          application_phone: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          date_of_birth: string | null
          full_name: string | null
          id: string | null
          id_document_url: string | null
          id_document_verified: boolean | null
          id_document_verified_at: string | null
          income_proof_url: string | null
          income_proof_verified: boolean | null
          income_proof_verified_at: string | null
          national_id: string | null
          notes: string | null
          property_proof_url: string | null
          property_proof_verified: boolean | null
          property_proof_verified_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          user_email: string | null
          user_id: string | null
          user_phone: string | null
          verification_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles_with_user_id: {
        Row: {
          address: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          is_verified: boolean | null
          metadata: Json | null
          phone: string | null
          preferences: Json | null
          profile_setup_completed: boolean | null
          updated_at: string | null
          user_id: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          phone?: string | null
          preferences?: Json | null
          profile_setup_completed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          address?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          metadata?: Json | null
          phone?: string | null
          preferences?: Json | null
          profile_setup_completed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      properties_with_monthly_rent: {
        Row: {
          address: Json | null
          amenities: Json | null
          ansut_certificate_url: string | null
          ansut_verification_date: string | null
          ansut_verified: boolean | null
          applications_count: number | null
          available_for_visits: boolean | null
          available_from: string | null
          bathrooms: number | null
          bedrooms: number | null
          charges_amount: number | null
          charges_included: boolean | null
          city: string | null
          coordinates: Json | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          external_references: Json | null
          favorites_count: number | null
          featured: boolean | null
          features: Json | null
          floor_number: number | null
          furnished: boolean | null
          has_ac: boolean | null
          has_elevator: boolean | null
          has_garden: boolean | null
          has_parking: boolean | null
          id: string | null
          images: Json | null
          is_anonymous: boolean | null
          is_public: boolean | null
          is_verified: boolean | null
          last_viewed_at: string | null
          latitude: number | null
          longitude: number | null
          main_image: string | null
          minimum_lease_months: number | null
          monthly_rent: number | null
          neighborhood: string | null
          owner_id: string | null
          property_category: string | null
          property_code: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          rooms: number | null
          status: Database["public"]["Enums"]["property_status"] | null
          surface_area: number | null
          title: string | null
          updated_at: string | null
          video_tour_url: string | null
          views_count: number | null
          virtual_tour_url: string | null
          year_built: number | null
        }
        Insert: {
          address?: Json | null
          amenities?: Json | null
          ansut_certificate_url?: string | null
          ansut_verification_date?: string | null
          ansut_verified?: boolean | null
          applications_count?: number | null
          available_for_visits?: boolean | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          charges_amount?: number | null
          charges_included?: boolean | null
          city?: string | null
          coordinates?: Json | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          external_references?: Json | null
          favorites_count?: number | null
          featured?: boolean | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          has_ac?: boolean | null
          has_elevator?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          id?: string | null
          images?: Json | null
          is_anonymous?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          last_viewed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string | null
          minimum_lease_months?: number | null
          monthly_rent?: number | null
          neighborhood?: string | null
          owner_id?: string | null
          property_category?: string | null
          property_code?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          rooms?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          surface_area?: number | null
          title?: string | null
          updated_at?: string | null
          video_tour_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Update: {
          address?: Json | null
          amenities?: Json | null
          ansut_certificate_url?: string | null
          ansut_verification_date?: string | null
          ansut_verified?: boolean | null
          applications_count?: number | null
          available_for_visits?: boolean | null
          available_from?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          charges_amount?: number | null
          charges_included?: boolean | null
          city?: string | null
          coordinates?: Json | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          external_references?: Json | null
          favorites_count?: number | null
          featured?: boolean | null
          features?: Json | null
          floor_number?: number | null
          furnished?: boolean | null
          has_ac?: boolean | null
          has_elevator?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          id?: string | null
          images?: Json | null
          is_anonymous?: boolean | null
          is_public?: boolean | null
          is_verified?: boolean | null
          last_viewed_at?: string | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string | null
          minimum_lease_months?: number | null
          monthly_rent?: number | null
          neighborhood?: string | null
          owner_id?: string | null
          property_category?: string | null
          property_code?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          rooms?: number | null
          status?: Database["public"]["Enums"]["property_status"] | null
          surface_area?: number | null
          title?: string | null
          updated_at?: string | null
          video_tour_url?: string | null
          views_count?: number | null
          virtual_tour_url?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles_view: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cnam_verified: boolean | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          oneci_verified: boolean | null
          trust_score: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          oneci_verified?: boolean | null
          trust_score?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          oneci_verified?: boolean | null
          trust_score?: number | null
        }
        Relationships: []
      }
      public_properties_view: {
        Row: {
          ansut_certificate_url: string | null
          ansut_verification_date: string | null
          ansut_verified: boolean | null
          applications_count: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          favorites_count: number | null
          featured: boolean | null
          furnished: boolean | null
          has_parking: boolean | null
          id: string | null
          images: Json | null
          main_image: string | null
          monthly_rent: number | null
          neighborhood: string | null
          owner_id: string | null
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          status: Database["public"]["Enums"]["property_status"] | null
          surface_area: number | null
          title: string | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          ansut_certificate_url?: string | null
          ansut_verification_date?: string | null
          ansut_verified?: boolean | null
          applications_count?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          favorites_count?: number | null
          featured?: boolean | null
          furnished?: boolean | null
          has_parking?: boolean | null
          id?: string | null
          images?: Json | null
          main_image?: string | null
          monthly_rent?: number | null
          neighborhood?: string | null
          owner_id?: string | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          status?: Database["public"]["Enums"]["property_status"] | null
          surface_area?: number | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          ansut_certificate_url?: string | null
          ansut_verification_date?: string | null
          ansut_verified?: boolean | null
          applications_count?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          favorites_count?: number | null
          featured?: boolean | null
          furnished?: boolean | null
          has_parking?: boolean | null
          id?: string | null
          images?: Json | null
          main_image?: string | null
          monthly_rent?: number | null
          neighborhood?: string | null
          owner_id?: string | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          status?: Database["public"]["Enums"]["property_status"] | null
          surface_area?: number | null
          title?: string | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_applications_with_details: {
        Row: {
          application_email: string | null
          application_phone: string | null
          avatar_url: string | null
          bank_statement_url: string | null
          bank_statement_verified: boolean | null
          bank_statement_verified_at: string | null
          current_address: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          employer_contact: string | null
          employer_name: string | null
          employment_proof_url: string | null
          employment_proof_verified: boolean | null
          employment_proof_verified_at: string | null
          employment_status: string | null
          family_size: number | null
          full_name: string | null
          has_pets: boolean | null
          id: string | null
          id_document_url: string | null
          id_document_verified: boolean | null
          id_document_verified_at: string | null
          income_proof_url: string | null
          income_proof_verified: boolean | null
          income_proof_verified_at: string | null
          monthly_income: number | null
          national_id: string | null
          notes: string | null
          occupation: string | null
          pets_description: string | null
          reference_data: Json | null
          rejection_reason: string | null
          rental_history_url: string | null
          rental_history_verified: boolean | null
          rental_history_verified_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          user_city: string | null
          user_email: string | null
          user_id: string | null
          user_phone: string | null
          verification_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tenant_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_audit_stats"
            referencedColumns: ["admin_id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_user_id"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tenant_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles_view"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_agent_dashboard_stats: {
        Row: {
          agent_id: string | null
          completed_missions: number | null
          in_progress_missions: number | null
          open_disputes: number | null
          pending_agency_dossiers: number | null
          pending_missions: number | null
          pending_owner_dossiers: number | null
          pending_tenant_dossiers: number | null
          resolved_disputes: number | null
          total_disputes: number | null
          total_missions: number | null
        }
        Relationships: []
      }
      trust_agent_missions_with_details: {
        Row: {
          assigned_agent_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          documents: Json | null
          etat_lieux_report: Json | null
          id: string | null
          mission_type: string | null
          notes: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          photos: Json | null
          property_address: Json | null
          property_city: string | null
          property_id: string | null
          property_image: string | null
          property_title: string | null
          scheduled_date: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
          verification_checklist: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cev_missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_monthly_rent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cev_missions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      assign_dispute_to_agent: {
        Args: { agent_id?: string; dispute_id: string }
        Returns: string
      }
      certify_property_ansut: {
        Args: {
          p_ansut_certificate_url?: string
          p_ansut_verification_date: string
          p_ansut_verified: boolean
          p_property_id: string
        }
        Returns: Json
      }
      check_lease_expirations: {
        Args: never
        Returns: {
          contract_id: string
          days_until_expiry: number
          expiry_date: string
          owner_id: string
          property_id: string
          tenant_id: string
        }[]
      }
      check_property_against_saved_searches: {
        Args: { p_property_data: Json; p_property_id: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_requests?: number; p_user_id: string }
        Returns: Json
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_admin_notification: {
        Args: {
          p_admin_id: string
          p_data?: Json
          p_link?: string
          p_message?: string
          p_title: string
          p_type: Database["public"]["Enums"]["admin_notification_type"]
        }
        Returns: string
      }
      create_rent_reminders: {
        Args: { p_contract_id: string; p_schedule?: number[] }
        Returns: {
          channel: string | null
          click_count: number | null
          contract_id: string | null
          created_at: string | null
          id: string
          message: string | null
          opened: boolean | null
          opened_date: string | null
          owner_id: string
          property_id: string | null
          reminder_type: string
          schedule_offset: number
          scheduled_date: string
          sent_date: string | null
          status: string | null
          subject: string | null
          template_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "payment_reminders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_feature_flag: {
        Args: { p_changed_by?: string; p_flag_id: string }
        Returns: boolean
      }
      evaluate_feature_flag: {
        Args: { p_flag_name: string; p_user_id?: string }
        Returns: Json
      }
      get_dispute_statistics: { Args: { p_agent_id?: string }; Returns: Json }
      get_entity_audit_history: {
        Args: { p_entity_id: string; p_entity_type: string; p_limit?: number }
        Returns: {
          action: string
          admin_email: string
          admin_id: string
          admin_name: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json
          old_values: Json
        }[]
      }
      get_public_profile: {
        Args: { profile_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          cnam_verified: boolean
          full_name: string
          is_verified: boolean
          oneci_verified: boolean
          trust_score: number
          user_id: string
        }[]
      }
      get_public_profiles: {
        Args: { profile_user_ids?: string[] }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          cnam_verified: boolean
          full_name: string
          is_verified: boolean
          oneci_verified: boolean
          trust_score: number
          user_id: string
        }[]
      }
      get_public_properties: {
        Args: never
        Returns: {
          ansut_certificate_url: string | null
          ansut_verification_date: string | null
          ansut_verified: boolean | null
          applications_count: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          favorites_count: number | null
          featured: boolean | null
          furnished: boolean | null
          has_parking: boolean | null
          id: string | null
          images: Json | null
          main_image: string | null
          monthly_rent: number | null
          neighborhood: string | null
          owner_id: string | null
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          status: Database["public"]["Enums"]["property_status"] | null
          surface_area: number | null
          title: string | null
          updated_at: string | null
          views_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "public_properties_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_rate_limit_status: {
        Args: { p_endpoint: string; p_user_id: string }
        Returns: Json
      }
      get_unread_notifications_count: {
        Args: { p_admin_id: string }
        Returns: number
      }
      get_user_roles: {
        Args: { _user_id?: string }
        Returns: {
          app_role: string
        }[]
      }
      is_trust_agent: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_entity_id?: string
          p_entity_type: string
          p_error_message?: string
          p_ip_address?: unknown
          p_new_values?: Json
          p_old_values?: Json
          p_status_code?: number
          p_user_agent?: string
        }
        Returns: string
      }
      log_facial_verification_attempt: {
        Args: {
          p_document_id: string
          p_provider: string
          p_selfie_url?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_all_notifications_read: {
        Args: { p_admin_id: string }
        Returns: number
      }
      mark_notification_read: {
        Args: { p_admin_id: string; p_notification_id: string }
        Returns: boolean
      }
      notify_all_admins: {
        Args: {
          p_data?: Json
          p_link?: string
          p_message?: string
          p_title: string
          p_type: Database["public"]["Enums"]["admin_notification_type"]
        }
        Returns: number
      }
      reset_rate_limit: {
        Args: { p_endpoint?: string; p_user_id: string }
        Returns: number
      }
      rollback_feature_flag: {
        Args: {
          p_audit_id: string
          p_flag_id: string
          p_rolled_back_by?: string
        }
        Returns: boolean
      }
      update_facial_verification_status: {
        Args: {
          p_failure_reason?: string
          p_is_live?: boolean
          p_is_match?: boolean
          p_matching_score?: number
          p_provider_response?: Json
          p_status: string
          p_verification_id: string
        }
        Returns: undefined
      }
      upsert_feature_flag: {
        Args: {
          p_changed_by?: string
          p_description?: string
          p_flag_type?: string
          p_is_active?: boolean
          p_name: string
          p_rollout_percentage?: number
          p_segment_rules?: Json
        }
        Returns: string
      }
    }
    Enums: {
      admin_notification_type:
        | "new_user"
        | "document_pending"
        | "document_fraud"
        | "service_down"
        | "quota_exceeded"
        | "security_alert"
        | "dispute_created"
        | "payment_failed"
        | "system_error"
        | "feature_flag_change"
      application_status:
        | "en_attente"
        | "acceptee"
        | "refusee"
        | "annulee"
        | "en_negociation"
      chatbot_conversation_status: "active" | "archived" | "closed"
      chatbot_conversation_type:
        | "general"
        | "property"
        | "application"
        | "lease"
      chatbot_message_role: "user" | "assistant" | "system"
      email_template_category:
        | "welcome"
        | "rent_reminder"
        | "visit_confirmed"
        | "visit_cancelled"
        | "visit_reminder"
        | "renewal"
        | "rent_increase"
        | "contract_signed"
        | "payment_received"
        | "payment_overdue"
        | "maintenance_request"
        | "custom"
      lease_contract_status:
        | "brouillon"
        | "en_attente_signature"
        | "actif"
        | "expire"
        | "resilie"
        | "annule"
      lease_status:
        | "brouillon"
        | "en_attente_signature"
        | "actif"
        | "expire"
        | "resilie"
      lease_type: "courte_duree" | "longue_duree" | "saisonniere" | "mobilité"
      message_type:
        | "text"
        | "image"
        | "document"
        | "video"
        | "audio"
        | "location"
        | "system"
      notification_type: "info" | "success" | "warning" | "error" | "system"
      payment_method:
        | "mobile_money"
        | "carte_bancaire"
        | "virement"
        | "especes"
        | "orange_money"
        | "moov_money"
        | "wave"
      payment_status:
        | "en_attente"
        | "complete"
        | "echoue"
        | "annule"
        | "rembourse"
        | "partiel"
      payment_type:
        | "loyer"
        | "depot_garantie"
        | "charges"
        | "frais_agence"
        | "frais_dossier"
        | "penalite"
      property_status:
        | "disponible"
        | "loue"
        | "en_attente"
        | "retire"
        | "maintenance"
      property_type:
        | "appartement"
        | "villa"
        | "studio"
        | "chambre"
        | "bureau"
        | "commerce"
        | "maison"
        | "duplex"
        | "entrepot"
        | "terrain"
      user_role: "admin" | "user" | "agent" | "moderator" | "trust_agent"
      user_type:
        | "locataire"
        | "proprietaire"
        | "agence"
        | "admin_ansut"
        | "trust_agent"
      verification_status: "en_attente" | "verifie" | "rejete" | "expiré"
      verification_type: "identity" | "address" | "income" | "professional"
      visit_request_status:
        | "en_attente"
        | "confirmee"
        | "planifie"
        | "terminee"
        | "annulee"
      visit_status: "planifie" | "confirme" | "termine" | "annule"
      visit_type: "physique" | "virtuelle" | "visioconference"
    }
    CompositeTypes: {
      api_rate_limit_config: {
        endpoint_pattern: string | null
        max_requests_per_minute: number | null
        max_requests_per_hour: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      admin_notification_type: [
        "new_user",
        "document_pending",
        "document_fraud",
        "service_down",
        "quota_exceeded",
        "security_alert",
        "dispute_created",
        "payment_failed",
        "system_error",
        "feature_flag_change",
      ],
      application_status: [
        "en_attente",
        "acceptee",
        "refusee",
        "annulee",
        "en_negociation",
      ],
      chatbot_conversation_status: ["active", "archived", "closed"],
      chatbot_conversation_type: [
        "general",
        "property",
        "application",
        "lease",
      ],
      chatbot_message_role: ["user", "assistant", "system"],
      email_template_category: [
        "welcome",
        "rent_reminder",
        "visit_confirmed",
        "visit_cancelled",
        "visit_reminder",
        "renewal",
        "rent_increase",
        "contract_signed",
        "payment_received",
        "payment_overdue",
        "maintenance_request",
        "custom",
      ],
      lease_contract_status: [
        "brouillon",
        "en_attente_signature",
        "actif",
        "expire",
        "resilie",
        "annule",
      ],
      lease_status: [
        "brouillon",
        "en_attente_signature",
        "actif",
        "expire",
        "resilie",
      ],
      lease_type: ["courte_duree", "longue_duree", "saisonniere", "mobilité"],
      message_type: [
        "text",
        "image",
        "document",
        "video",
        "audio",
        "location",
        "system",
      ],
      notification_type: ["info", "success", "warning", "error", "system"],
      payment_method: [
        "mobile_money",
        "carte_bancaire",
        "virement",
        "especes",
        "orange_money",
        "moov_money",
        "wave",
      ],
      payment_status: [
        "en_attente",
        "complete",
        "echoue",
        "annule",
        "rembourse",
        "partiel",
      ],
      payment_type: [
        "loyer",
        "depot_garantie",
        "charges",
        "frais_agence",
        "frais_dossier",
        "penalite",
      ],
      property_status: [
        "disponible",
        "loue",
        "en_attente",
        "retire",
        "maintenance",
      ],
      property_type: [
        "appartement",
        "villa",
        "studio",
        "chambre",
        "bureau",
        "commerce",
        "maison",
        "duplex",
        "entrepot",
        "terrain",
      ],
      user_role: ["admin", "user", "agent", "moderator", "trust_agent"],
      user_type: [
        "locataire",
        "proprietaire",
        "agence",
        "admin_ansut",
        "trust_agent",
      ],
      verification_status: ["en_attente", "verifie", "rejete", "expiré"],
      verification_type: ["identity", "address", "income", "professional"],
      visit_request_status: [
        "en_attente",
        "confirmee",
        "planifie",
        "terminee",
        "annulee",
      ],
      visit_status: ["planifie", "confirme", "termine", "annule"],
      visit_type: ["physique", "virtuelle", "visioconference"],
    },
  },
} as const
