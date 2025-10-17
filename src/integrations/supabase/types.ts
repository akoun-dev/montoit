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
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action_metadata: Json | null
          action_type: string
          admin_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          target_id: string
          target_type: string
          user_agent: string | null
        }
        Insert: {
          action_metadata?: Json | null
          action_type: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          target_id: string
          target_type: string
          user_agent?: string | null
        }
        Update: {
          action_metadata?: Json | null
          action_type?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          target_id?: string
          target_type?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_integration_secrets: {
        Row: {
          created_at: string
          created_by: string
          encrypted_config: Json
          id: string
          integration_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          encrypted_config: Json
          id?: string
          integration_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          encrypted_config?: Json
          id?: string
          integration_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      agency_mandates: {
        Row: {
          accepted_at: string | null
          agency_id: string
          billing_frequency: string | null
          commission_rate: number | null
          created_at: string
          end_date: string | null
          fixed_fee: number | null
          id: string
          mandate_type: string
          notes: string | null
          owner_id: string
          permissions: Json
          property_id: string | null
          start_date: string
          status: string
          terminated_at: string | null
          terminated_by: string | null
          termination_reason: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          agency_id: string
          billing_frequency?: string | null
          commission_rate?: number | null
          created_at?: string
          end_date?: string | null
          fixed_fee?: number | null
          id?: string
          mandate_type: string
          notes?: string | null
          owner_id: string
          permissions?: Json
          property_id?: string | null
          start_date: string
          status?: string
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          agency_id?: string
          billing_frequency?: string | null
          commission_rate?: number | null
          created_at?: string
          end_date?: string | null
          fixed_fee?: number | null
          id?: string
          mandate_type?: string
          notes?: string | null
          owner_id?: string
          permissions?: Json
          property_id?: string | null
          start_date?: string
          status?: string
          terminated_at?: string | null
          terminated_by?: string | null
          termination_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_mandates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
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
            referencedRelation: "profiles_public"
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
            foreignKeyName: "agency_mandates_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_mandates_terminated_by_fkey"
            columns: ["terminated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_history: {
        Row: {
          alert_data: Json | null
          alert_id: string | null
          alert_type: string
          clicked_at: string | null
          created_at: string | null
          delivery_method: string
          delivery_status: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          property_id: string | null
          sent_at: string | null
          user_id: string
        }
        Insert: {
          alert_data?: Json | null
          alert_id?: string | null
          alert_type: string
          clicked_at?: string | null
          created_at?: string | null
          delivery_method: string
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          property_id?: string | null
          sent_at?: string | null
          user_id: string
        }
        Update: {
          alert_data?: Json | null
          alert_id?: string | null
          alert_type?: string
          clicked_at?: string | null
          created_at?: string | null
          delivery_method?: string
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          property_id?: string | null
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_history_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "property_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          request_count: number
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          request_count?: number
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          id: string
          ip_address: string
          notes: string | null
          reason: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address: string
          notes?: string | null
          reason: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          id?: string
          ip_address?: string
          notes?: string | null
          reason?: string
        }
        Relationships: []
      }
      digital_certificates: {
        Row: {
          certificate_data: Json
          certificate_id: string
          certificate_status: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_data: Json
          certificate_id: string
          certificate_status?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_data?: Json
          certificate_id?: string
          certificate_status?: string | null
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
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          assigned_to: string | null
          attachments: Json | null
          created_at: string | null
          description: string
          dispute_type: string
          id: string
          lease_id: string | null
          priority: string | null
          reported_id: string
          reporter_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string | null
          description: string
          dispute_type: string
          id?: string
          lease_id?: string | null
          priority?: string | null
          reported_id: string
          reporter_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json | null
          created_at?: string | null
          description?: string
          dispute_type?: string
          id?: string
          lease_id?: string | null
          priority?: string | null
          reported_id?: string
          reporter_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          id: string
          is_active: boolean | null
          name: string
          template_content: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          name: string
          template_content: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          template_content?: Json
          updated_at?: string
        }
        Relationships: []
      }
      electronic_signature_logs: {
        Row: {
          created_at: string | null
          cryptoneo_response: Json | null
          error_message: string | null
          id: string
          lease_id: string
          operation_id: string
          signature_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cryptoneo_response?: Json | null
          error_message?: string | null
          id?: string
          lease_id: string
          operation_id: string
          signature_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cryptoneo_response?: Json | null
          error_message?: string | null
          id?: string
          lease_id?: string
          operation_id?: string
          signature_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "electronic_signature_logs_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_signature_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "electronic_signature_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_messages: {
        Row: {
          browser_fingerprint: string | null
          created_at: string | null
          guest_email: string
          guest_name: string
          guest_phone: string | null
          id: string
          ip_address: string
          message_content: string
          owner_id: string
          property_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          browser_fingerprint?: string | null
          created_at?: string | null
          guest_email: string
          guest_name: string
          guest_phone?: string | null
          id?: string
          ip_address: string
          message_content: string
          owner_id: string
          property_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          browser_fingerprint?: string | null
          created_at?: string | null
          guest_email?: string
          guest_name?: string
          guest_phone?: string | null
          id?: string
          ip_address?: string
          message_content?: string
          owner_id?: string
          property_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_certification_history: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          lease_id: string
          notes: string | null
          status: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          lease_id: string
          notes?: string | null
          status: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          lease_id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_certification_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_documents: {
        Row: {
          created_at: string
          document_type: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          lease_id: string
          name: string
          notes: string | null
          status: string | null
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          lease_id: string
          name: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          lease_id?: string
          name?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lease_documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_templates: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          template_type: string
          updated_at: string
          variables: Json
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          template_type?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      leases: {
        Row: {
          ansut_certified_at: string | null
          certification_notes: string | null
          certification_requested_at: string | null
          certification_status: string | null
          certified_by: string | null
          charges_amount: number | null
          created_at: string
          cryptoneo_operation_id: string | null
          deposit_amount: number | null
          document_url: string | null
          end_date: string
          id: string
          is_electronically_signed: boolean | null
          landlord_cryptoneo_signature_at: string | null
          landlord_id: string
          landlord_signature_operation_id: string | null
          landlord_signed_at: string | null
          lease_type: string
          monthly_rent: number
          property_id: string
          signed_document_url: string | null
          start_date: string
          status: string
          tenant_cryptoneo_signature_at: string | null
          tenant_id: string
          tenant_signature_operation_id: string | null
          tenant_signed_at: string | null
          updated_at: string
        }
        Insert: {
          ansut_certified_at?: string | null
          certification_notes?: string | null
          certification_requested_at?: string | null
          certification_status?: string | null
          certified_by?: string | null
          charges_amount?: number | null
          created_at?: string
          cryptoneo_operation_id?: string | null
          deposit_amount?: number | null
          document_url?: string | null
          end_date: string
          id?: string
          is_electronically_signed?: boolean | null
          landlord_cryptoneo_signature_at?: string | null
          landlord_id: string
          landlord_signature_operation_id?: string | null
          landlord_signed_at?: string | null
          lease_type: string
          monthly_rent: number
          property_id: string
          signed_document_url?: string | null
          start_date: string
          status?: string
          tenant_cryptoneo_signature_at?: string | null
          tenant_id: string
          tenant_signature_operation_id?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
        }
        Update: {
          ansut_certified_at?: string | null
          certification_notes?: string | null
          certification_requested_at?: string | null
          certification_status?: string | null
          certified_by?: string | null
          charges_amount?: number | null
          created_at?: string
          cryptoneo_operation_id?: string | null
          deposit_amount?: number | null
          document_url?: string | null
          end_date?: string
          id?: string
          is_electronically_signed?: boolean | null
          landlord_cryptoneo_signature_at?: string | null
          landlord_id?: string
          landlord_signature_operation_id?: string | null
          landlord_signed_at?: string | null
          lease_type?: string
          monthly_rent?: number
          property_id?: string
          signed_document_url?: string | null
          start_date?: string
          status?: string
          tenant_cryptoneo_signature_at?: string | null
          tenant_id?: string
          tenant_signature_operation_id?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          blocked_until: string | null
          created_at: string
          email: string
          fingerprint: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked_until?: string | null
          created_at?: string
          email: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked_until?: string | null
          created_at?: string
          email?: string
          fingerprint?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      maintenance_requests: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string
          id: string
          images: Json | null
          property_id: string
          request_type: string
          requester_id: string
          status: string
          title: string
          updated_at: string
          urgency: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description: string
          id?: string
          images?: Json | null
          property_id: string
          request_type: string
          requester_id: string
          status?: string
          title: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string
          id?: string
          images?: Json | null
          property_id?: string
          request_type?: string
          requester_id?: string
          status?: string
          title?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          application_id: string | null
          attachments: Json | null
          content: string
          conversation_type: string | null
          created_at: string
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          application_id?: string | null
          attachments?: Json | null
          content: string
          conversation_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          application_id?: string | null
          attachments?: Json | null
          content?: string
          conversation_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      mfa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_login_attempts: {
        Row: {
          attempt_ip: string | null
          attempt_type: string
          created_at: string
          id: string
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempt_ip?: string | null
          attempt_type: string
          created_at?: string
          id?: string
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempt_ip?: string | null
          attempt_type?: string
          created_at?: string
          id?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mfa_policies: {
        Row: {
          created_at: string
          grace_period_days: number | null
          id: string
          mfa_required: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          grace_period_days?: number | null
          id?: string
          mfa_required?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          grace_period_days?: number | null
          id?: string
          mfa_required?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      mobile_money_transactions: {
        Row: {
          amount: number
          created_at: string
          fees: number | null
          id: string
          payment_id: string
          phone_number: string
          provider: string
          provider_response: Json | null
          status: string
          transaction_ref: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          fees?: number | null
          id?: string
          payment_id: string
          phone_number: string
          provider: string
          provider_response?: Json | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          fees?: number | null
          id?: string
          payment_id?: string
          phone_number?: string
          provider?: string
          provider_response?: Json | null
          status?: string
          transaction_ref?: string | null
          updated_at?: string
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
      notification_preferences: {
        Row: {
          category: string
          created_at: string
          email_enabled: boolean | null
          enabled: boolean | null
          id: string
          push_enabled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          email_enabled?: boolean | null
          enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          email_enabled?: boolean | null
          enabled?: boolean | null
          id?: string
          push_enabled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_access_log: {
        Row: {
          access_granted: boolean
          accessed_at: string
          id: string
          payment_id: string
          relationship_type: string | null
          requester_id: string
        }
        Insert: {
          access_granted: boolean
          accessed_at?: string
          id?: string
          payment_id: string
          relationship_type?: string | null
          requester_id: string
        }
        Update: {
          access_granted?: boolean
          accessed_at?: string
          id?: string
          payment_id?: string
          relationship_type?: string | null
          requester_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          payer_id: string
          payment_method: string
          payment_type: string
          property_id: string | null
          receiver_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          payer_id: string
          payment_method: string
          payment_type: string
          property_id?: string | null
          receiver_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          payer_id?: string
          payment_method?: string
          payment_type?: string
          property_id?: string | null
          receiver_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_access_log: {
        Row: {
          access_granted: boolean
          accessed_at: string
          id: string
          relationship_type: string | null
          requester_id: string
          target_user_id: string
        }
        Insert: {
          access_granted: boolean
          accessed_at?: string
          id?: string
          relationship_type?: string | null
          requester_id: string
          target_user_id: string
        }
        Update: {
          access_granted?: boolean
          accessed_at?: string
          id?: string
          relationship_type?: string | null
          requester_id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      processing_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cnam_verified: boolean | null
          created_at: string
          face_verified: boolean | null
          full_name: string
          id: string
          is_verified: boolean | null
          oneci_verified: boolean | null
          phone: string | null
          ui_density: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          created_at?: string
          face_verified?: boolean | null
          full_name: string
          id: string
          is_verified?: boolean | null
          oneci_verified?: boolean | null
          phone?: string | null
          ui_density?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          created_at?: string
          face_verified?: boolean | null
          full_name?: string
          id?: string
          is_verified?: boolean | null
          oneci_verified?: boolean | null
          phone?: string | null
          ui_density?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          bathrooms: number | null
          bedrooms: number | null
          charges_amount: number | null
          city: string
          created_at: string
          deposit_amount: number | null
          description: string | null
          floor_number: number | null
          floor_plans: Json | null
          has_ac: boolean | null
          has_garden: boolean | null
          has_parking: boolean | null
          id: string
          images: string[] | null
          is_furnished: boolean | null
          latitude: number | null
          longitude: number | null
          main_image: string | null
          media_metadata: Json | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_status: string | null
          monthly_rent: number
          neighborhood: string | null
          owner_id: string
          panoramic_images: Json | null
          property_type: string
          status: string
          surface_area: number | null
          title: string
          title_deed_url: string | null
          updated_at: string
          video_url: string | null
          view_count: number | null
          virtual_tour_url: string | null
          work_description: string | null
          work_estimated_cost: number | null
          work_estimated_duration: string | null
          work_images: Json | null
          work_start_date: string | null
          work_status: string | null
        }
        Insert: {
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          charges_amount?: number | null
          city: string
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          floor_number?: number | null
          floor_plans?: Json | null
          has_ac?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          id?: string
          images?: string[] | null
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string | null
          media_metadata?: Json | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string | null
          monthly_rent: number
          neighborhood?: string | null
          owner_id: string
          panoramic_images?: Json | null
          property_type: string
          status?: string
          surface_area?: number | null
          title: string
          title_deed_url?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
          virtual_tour_url?: string | null
          work_description?: string | null
          work_estimated_cost?: number | null
          work_estimated_duration?: string | null
          work_images?: Json | null
          work_start_date?: string | null
          work_status?: string | null
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          charges_amount?: number | null
          city?: string
          created_at?: string
          deposit_amount?: number | null
          description?: string | null
          floor_number?: number | null
          floor_plans?: Json | null
          has_ac?: boolean | null
          has_garden?: boolean | null
          has_parking?: boolean | null
          id?: string
          images?: string[] | null
          is_furnished?: boolean | null
          latitude?: number | null
          longitude?: number | null
          main_image?: string | null
          media_metadata?: Json | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string | null
          monthly_rent?: number
          neighborhood?: string | null
          owner_id?: string
          panoramic_images?: Json | null
          property_type?: string
          status?: string
          surface_area?: number | null
          title?: string
          title_deed_url?: string | null
          updated_at?: string
          video_url?: string | null
          view_count?: number | null
          virtual_tour_url?: string | null
          work_description?: string | null
          work_estimated_cost?: number | null
          work_estimated_duration?: string | null
          work_images?: Json | null
          work_start_date?: string | null
          work_status?: string | null
        }
        Relationships: []
      }
      property_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          email_enabled: boolean | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          push_enabled: boolean | null
          search_criteria: Json | null
          trigger_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          push_enabled?: boolean | null
          search_criteria?: Json | null
          trigger_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          push_enabled?: boolean | null
          search_criteria?: Json | null
          trigger_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          id: string
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendation_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          recommendation_type: string
          recommended_items: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          recommendation_type: string
          recommended_items?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          recommendation_type?: string
          recommended_items?: Json
          user_id?: string
        }
        Relationships: [
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
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_applications: {
        Row: {
          applicant_id: string
          application_score: number | null
          auto_action_type: string | null
          auto_processed: boolean | null
          cover_letter: string | null
          created_at: string
          documents: Json | null
          id: string
          is_overdue: boolean | null
          processing_deadline: string | null
          property_id: string
          reviewed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_id: string
          application_score?: number | null
          auto_action_type?: string | null
          auto_processed?: boolean | null
          cover_letter?: string | null
          created_at?: string
          documents?: Json | null
          id?: string
          is_overdue?: boolean | null
          processing_deadline?: string | null
          property_id: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          application_score?: number | null
          auto_action_type?: string | null
          auto_processed?: boolean | null
          cover_letter?: string | null
          created_at?: string
          documents?: Json | null
          id?: string
          is_overdue?: boolean | null
          processing_deadline?: string | null
          property_id?: string
          reviewed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      report_history: {
        Row: {
          created_at: string | null
          email_sent_at: string | null
          error_message: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          owner_id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          sent_status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          owner_id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          sent_status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email_sent_at?: string | null
          error_message?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          owner_id?: string
          period_end?: string
          period_start?: string
          report_data?: Json
          report_type?: string
          sent_status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reputation_scores: {
        Row: {
          as_landlord_reviews: number | null
          as_landlord_score: number | null
          as_tenant_reviews: number | null
          as_tenant_score: number | null
          avg_rating: number | null
          created_at: string
          id: string
          overall_score: number | null
          total_reviews: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          as_landlord_reviews?: number | null
          as_landlord_score?: number | null
          as_tenant_reviews?: number | null
          as_tenant_score?: number | null
          avg_rating?: number | null
          created_at?: string
          id?: string
          overall_score?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          as_landlord_reviews?: number | null
          as_landlord_score?: number | null
          as_tenant_reviews?: number | null
          as_tenant_score?: number | null
          avg_rating?: number | null
          created_at?: string
          id?: string
          overall_score?: number | null
          total_reviews?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          lease_id: string | null
          moderated_at: string | null
          moderated_by: string | null
          moderation_notes: string | null
          moderation_status: string | null
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          lease_id?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string | null
          rating: number
          review_type: string
          reviewee_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          lease_id?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_notes?: string | null
          moderation_status?: string | null
          rating?: number
          review_type?: string
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
        ]
      }
      sarah_conversations: {
        Row: {
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sarah_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "sarah_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sarah_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          clicked_properties: string[] | null
          created_at: string
          id: string
          result_count: number | null
          search_filters: Json
          user_id: string
        }
        Insert: {
          clicked_properties?: string[] | null
          created_at?: string
          id?: string
          result_count?: number | null
          search_filters?: Json
          user_id: string
        }
        Update: {
          clicked_properties?: string[] | null
          created_at?: string
          id?: string
          result_count?: number | null
          search_filters?: Json
          user_id?: string
        }
        Relationships: [
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
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_data_access_log: {
        Row: {
          access_granted: boolean
          accessed_at: string
          data_type: string
          id: string
          metadata: Json | null
          relationship_type: string | null
          requester_id: string
          target_user_id: string
        }
        Insert: {
          access_granted: boolean
          accessed_at?: string
          data_type: string
          id?: string
          metadata?: Json | null
          relationship_type?: string | null
          requester_id: string
          target_user_id: string
        }
        Update: {
          access_granted?: boolean
          accessed_at?: string
          data_type?: string
          id?: string
          metadata?: Json | null
          relationship_type?: string | null
          requester_id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      title_deed_access_log: {
        Row: {
          access_granted: boolean
          access_reason: string | null
          accessed_at: string | null
          id: string
          ip_address: string | null
          property_id: string | null
          requester_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_granted: boolean
          access_reason?: string | null
          accessed_at?: string | null
          id?: string
          ip_address?: string | null
          property_id?: string | null
          requester_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_granted?: boolean
          access_reason?: string | null
          accessed_at?: string | null
          id?: string
          ip_address?: string | null
          property_id?: string | null
          requester_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "title_deed_access_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_third_parties: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          license_number: string | null
          organization_name: string
          specialization: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          organization_name: string
          specialization?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string | null
          organization_name?: string
          specialization?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_active_roles: {
        Row: {
          available_roles: Database["public"]["Enums"]["user_type"][]
          created_at: string
          current_role: Database["public"]["Enums"]["user_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          available_roles?: Database["public"]["Enums"]["user_type"][]
          created_at?: string
          current_role: Database["public"]["Enums"]["user_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          available_roles?: Database["public"]["Enums"]["user_type"][]
          created_at?: string
          current_role?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
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
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
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
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
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
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reminders: {
        Row: {
          created_at: string | null
          frequency: string | null
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          link: string | null
          message: string | null
          reminder_type: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link?: string | null
          message?: string | null
          reminder_type: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          frequency?: string | null
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          link?: string | null
          message?: string | null
          reminder_type?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_verifications: {
        Row: {
          admin_review_notes: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          cnam_data: Json | null
          cnam_employer: string | null
          cnam_social_security_number: string | null
          cnam_status: string | null
          cnam_verified_at: string | null
          created_at: string
          face_similarity_score: number | null
          face_verification_attempts: number | null
          face_verification_status: string | null
          face_verified_at: string | null
          id: string
          oneci_cni_number: string | null
          oneci_data: Json | null
          oneci_status: string | null
          oneci_verified_at: string | null
          score_updated_at: string | null
          tenant_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_review_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          cnam_data?: Json | null
          cnam_employer?: string | null
          cnam_social_security_number?: string | null
          cnam_status?: string | null
          cnam_verified_at?: string | null
          created_at?: string
          face_similarity_score?: number | null
          face_verification_attempts?: number | null
          face_verification_status?: string | null
          face_verified_at?: string | null
          id?: string
          oneci_cni_number?: string | null
          oneci_data?: Json | null
          oneci_status?: string | null
          oneci_verified_at?: string | null
          score_updated_at?: string | null
          tenant_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_review_notes?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          cnam_data?: Json | null
          cnam_employer?: string | null
          cnam_social_security_number?: string | null
          cnam_status?: string | null
          cnam_verified_at?: string | null
          created_at?: string
          face_similarity_score?: number | null
          face_verification_attempts?: number | null
          face_verification_status?: string | null
          face_verified_at?: string | null
          id?: string
          oneci_cni_number?: string | null
          oneci_data?: Json | null
          oneci_status?: string | null
          oneci_verified_at?: string | null
          score_updated_at?: string | null
          tenant_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verification_access_log: {
        Row: {
          access_type: string
          accessed_at: string
          admin_id: string
          id: string
          ip_address: string | null
          metadata: Json | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          admin_id: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          admin_id?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          cnam_verified: boolean | null
          created_at: string | null
          face_verified: boolean | null
          full_name: string | null
          id: string | null
          is_verified: boolean | null
          oneci_verified: boolean | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          created_at?: string | null
          face_verified?: boolean | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          oneci_verified?: boolean | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          cnam_verified?: boolean | null
          created_at?: string | null
          face_verified?: boolean | null
          full_name?: string | null
          id?: string | null
          is_verified?: boolean | null
          oneci_verified?: boolean | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      property_alerts_analytics: {
        Row: {
          alert_type: string | null
          click_rate: number | null
          clicked_count: number | null
          date: string | null
          delivery_method: string | null
          delivery_status: string | null
          open_rate: number | null
          opened_count: number | null
          total_sent: number | null
        }
        Relationships: []
      }
      report_statistics: {
        Row: {
          failed_count: number | null
          month: string | null
          report_type: string | null
          sent_count: number | null
          success_rate: number | null
          total_reports: number | null
          unique_owners: number | null
        }
        Relationships: []
      }
      sensitive_data_access_monitoring: {
        Row: {
          access_granted: boolean | null
          accessed_at: string | null
          data_type: string | null
          id: string | null
          metadata: Json | null
          mfa_status: string | null
          relationship_type: string | null
          requester_id: string | null
          requester_name: string | null
          target_name: string | null
          target_user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_available_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["user_type"]
          p_user_id: string
        }
        Returns: undefined
      }
      admin_get_guest_messages: {
        Args: { p_limit?: number; p_property_id?: string }
        Returns: {
          created_at: string
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          ip_address: string
          message_content: string
          owner_id: string
          property_id: string
          status: string
          updated_at: string
        }[]
      }
      admin_has_2fa_enabled: {
        Args: { _admin_id: string }
        Returns: boolean
      }
      agency_can_create_for_owner: {
        Args: { _agency_id: string; _owner_id: string }
        Returns: boolean
      }
      agency_can_manage_property: {
        Args: {
          _agency_id: string
          _property_id: string
          _required_permission?: string
        }
        Returns: boolean
      }
      alert_suspicious_sensitive_access: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      approve_verification: {
        Args: {
          p_review_notes?: string
          p_user_id: string
          p_verification_type: string
        }
        Returns: undefined
      }
      auto_expire_mandates: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      auto_process_overdue_applications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      block_ip: {
        Args: {
          _duration_hours?: number
          _ip_address: string
          _notes?: string
          _reason: string
        }
        Returns: string
      }
      calculate_reputation_score: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      can_access_maintenance: {
        Args: { p_property_id: string }
        Returns: boolean
      }
      check_admin_mfa_compliance: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_created_at: string
          full_name: string
          grace_period_expires_at: string
          has_mfa: boolean
          is_compliant: boolean
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      check_api_rate_limit: {
        Args: {
          _endpoint: string
          _ip_address: string
          _max_requests: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      check_guest_rate_limit: {
        Args: { _email: string; _fingerprint: string; _ip: string }
        Returns: Json
      }
      check_login_rate_limit: {
        Args: { _email: string; _ip_address: string }
        Returns: Json
      }
      check_mfa_rate_limit: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      cleanup_expired_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_recommendations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_guest_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      detect_ddos_pattern: {
        Args: Record<PropertyKey, never>
        Returns: {
          endpoints_targeted: string[]
          first_request: string
          ip_address: string
          last_request: string
          request_count: number
          time_window: string
        }[]
      }
      detect_mass_actions: {
        Args: Record<PropertyKey, never>
        Returns: {
          action_count: number
          admin_id: string
          time_window_end: string
          time_window_start: string
        }[]
      }
      detect_suspicious_sensitive_data_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          access_count: number
          admin_id: string
          admin_name: string
          data_types: string[]
          first_access: string
          has_2fa: boolean
          last_access: string
        }[]
      }
      get_alert_statistics: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          avg_click_rate: number
          avg_open_rate: number
          total_alerts_active: number
          total_alerts_sent_month: number
          total_alerts_sent_today: number
          total_alerts_sent_week: number
          users_with_alerts: number
        }[]
      }
      get_conversation_type: {
        Args: {
          p_property_id?: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: string
      }
      get_failed_login_attempts: {
        Args: { hours_ago?: number }
        Returns: {
          attempt_count: number
          email: string
          last_attempt: string
        }[]
      }
      get_integration_secret: {
        Args: { p_integration_name: string }
        Returns: Json
      }
      get_mfa_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          admins_with_2fa: number
          percentage_with_2fa: number
          total_admins: number
          unused_backup_codes: number
          used_backup_codes: number
        }[]
      }
      get_my_disputes: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_to: string
          attachments: Json
          created_at: string
          description: string
          dispute_type: string
          id: string
          is_reporter: boolean
          lease_id: string
          priority: string
          reported_id: string
          reported_name: string
          reporter_id: string
          reporter_name: string
          resolution_notes: string
          resolved_at: string
          status: string
        }[]
      }
      get_my_verification_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          admin_review_notes: string
          admin_reviewed_at: string
          cnam_status: string
          cnam_verified: boolean
          face_verification_status: string
          face_verified: boolean
          oneci_status: string
          oneci_verified: boolean
          tenant_score: number
        }[]
      }
      get_owner_analytics: {
        Args: { owner_user_id: string }
        Returns: {
          applications_count: number
          conversion_rate: number
          monthly_rent: number
          property_id: string
          property_image: string
          property_title: string
          status: string
          views_30d: number
          views_7d: number
        }[]
      }
      get_property_owner_public_info: {
        Args: { property_id_param: string }
        Returns: {
          avatar_url: string
          city: string
          cnam_verified: boolean
          face_verified: boolean
          full_name: string
          id: string
          is_verified: boolean
          oneci_verified: boolean
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_property_with_title_deed: {
        Args: { p_property_id: string }
        Returns: {
          address: string
          bathrooms: number
          bedrooms: number
          charges_amount: number
          city: string
          created_at: string
          deposit_amount: number
          description: string
          floor_number: number
          floor_plans: Json
          has_ac: boolean
          has_garden: boolean
          has_parking: boolean
          id: string
          images: string[]
          is_furnished: boolean
          latitude: number
          longitude: number
          main_image: string
          media_metadata: Json
          moderation_status: string
          monthly_rent: number
          neighborhood: string
          panoramic_images: Json
          property_type: string
          status: string
          surface_area: number
          title: string
          title_deed_url: string
          updated_at: string
          video_url: string
          view_count: number
          virtual_tour_url: string
          work_description: string
          work_images: Json
          work_status: string
        }[]
      }
      get_public_profile: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          cnam_verified: boolean
          face_verified: boolean
          full_name: string
          id: string
          is_verified: boolean
          oneci_verified: boolean
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_public_profile_safe: {
        Args: { target_user_id: string }
        Returns: {
          avatar_url: string
          bio: string
          city: string
          cnam_verified: boolean
          face_verified: boolean
          full_name: string
          id: string
          is_verified: boolean
          oneci_verified: boolean
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_public_properties: {
        Args: {
          p_city?: string
          p_max_rent?: number
          p_min_bedrooms?: number
          p_min_rent?: number
          p_property_type?: string
          p_status?: string
        }
        Returns: {
          address: string
          bathrooms: number
          bedrooms: number
          charges_amount: number
          city: string
          created_at: string
          deposit_amount: number
          description: string
          floor_number: number
          floor_plans: Json
          has_ac: boolean
          has_garden: boolean
          has_parking: boolean
          id: string
          images: string[]
          is_furnished: boolean
          latitude: number
          longitude: number
          main_image: string
          media_metadata: Json
          moderation_status: string
          monthly_rent: number
          neighborhood: string
          panoramic_images: Json
          property_type: string
          status: string
          surface_area: number
          title: string
          updated_at: string
          video_url: string
          view_count: number
          virtual_tour_url: string
        }[]
      }
      get_public_property: {
        Args: { p_property_id: string }
        Returns: {
          address: string
          bathrooms: number
          bedrooms: number
          charges_amount: number
          city: string
          created_at: string
          deposit_amount: number
          description: string
          floor_number: number
          floor_plans: Json
          has_ac: boolean
          has_garden: boolean
          has_parking: boolean
          id: string
          images: string[]
          is_furnished: boolean
          latitude: number
          longitude: number
          main_image: string
          media_metadata: Json
          moderation_status: string
          monthly_rent: number
          neighborhood: string
          panoramic_images: Json
          property_type: string
          status: string
          surface_area: number
          title: string
          updated_at: string
          video_url: string
          view_count: number
          virtual_tour_url: string
        }[]
      }
      get_tenant_dashboard_summary: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_user_payments: {
        Args: { target_user_id: string }
        Returns: {
          amount: number
          completed_at: string
          created_at: string
          id: string
          payer_id: string
          payment_method: string
          payment_type: string
          property_id: string
          receiver_id: string
          status: string
          transaction_id: string
        }[]
      }
      get_user_phone: {
        Args: { target_user_id: string }
        Returns: string
      }
      get_verifications_for_admin_review: {
        Args: Record<PropertyKey, never>
        Returns: {
          admin_review_notes: string
          admin_reviewed_at: string
          admin_reviewed_by: string
          city: string
          cnam_data: Json
          cnam_employer: string
          cnam_social_security_number: string
          cnam_status: string
          cnam_verified_at: string
          created_at: string
          face_similarity_score: number
          face_verification_status: string
          face_verified_at: string
          full_name: string
          oneci_cni_number: string
          oneci_data: Json
          oneci_status: string
          oneci_verified_at: string
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      get_verifications_for_review: {
        Args: Record<PropertyKey, never>
        Returns: {
          city: string
          cnam_status: string
          cnam_verified_at: string
          created_at: string
          full_name: string
          oneci_status: string
          oneci_verified_at: string
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_trusted_third_party: {
        Args: { _user_id: string }
        Returns: boolean
      }
      log_mfa_attempt: {
        Args: { _attempt_type?: string; _success: boolean }
        Returns: undefined
      }
      mark_overdue_applications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      notify_mfa_compliance: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      pre_validate_lease_for_certification: {
        Args: { p_lease_id: string }
        Returns: Json
      }
      promote_to_super_admin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      reject_verification: {
        Args: {
          p_review_notes: string
          p_user_id: string
          p_verification_type: string
        }
        Returns: undefined
      }
      save_integration_secret: {
        Args: { p_encrypted_config: Json; p_integration_name: string }
        Returns: undefined
      }
      unblock_ip: {
        Args: { _ip_address: string }
        Returns: boolean
      }
      verify_backup_code: {
        Args: { _backup_code: string }
        Returns: boolean
      }
      verify_user_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      view_user_verification: {
        Args: { target_user_id: string }
        Returns: {
          admin_review_notes: string
          admin_reviewed_at: string
          cnam_status: string
          cnam_verified_at: string
          oneci_status: string
          oneci_verified_at: string
          tenant_score: number
          user_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "agent"
        | "moderator"
        | "super_admin"
        | "tiers_de_confiance"
      certification_status:
        | "not_requested"
        | "pending"
        | "in_review"
        | "certified"
        | "rejected"
      user_type: "locataire" | "proprietaire" | "agence" | "admin_ansut"
    }
    CompositeTypes: {
      [_ in never]: never
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
  public: {
    Enums: {
      app_role: [
        "admin",
        "user",
        "agent",
        "moderator",
        "super_admin",
        "tiers_de_confiance",
      ],
      certification_status: [
        "not_requested",
        "pending",
        "in_review",
        "certified",
        "rejected",
      ],
      user_type: ["locataire", "proprietaire", "agence", "admin_ansut"],
    },
  },
} as const
