export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          entity_id: string | null;
          entity_type: string;
          id: string;
          ip_address: string | null;
          user_email: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          ip_address?: string | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          ip_address?: string | null;
          user_email?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      agencies: {
        Row: {
          address: string | null;
          agency_name: string;
          city: string | null;
          commission_rate: number | null;
          created_at: string | null;
          description: string | null;
          email: string | null;
          id: string;
          is_verified: boolean | null;
          logo_url: string | null;
          phone: string | null;
          registration_number: string | null;
          status: string | null;
          updated_at: string | null;
          user_id: string;
          verified_at: string | null;
          website: string | null;
        };
        Insert: {
          address?: string | null;
          agency_name: string;
          city?: string | null;
          commission_rate?: number | null;
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_verified?: boolean | null;
          logo_url?: string | null;
          phone?: string | null;
          registration_number?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id: string;
          verified_at?: string | null;
          website?: string | null;
        };
        Update: {
          address?: string | null;
          agency_name?: string;
          city?: string | null;
          commission_rate?: number | null;
          created_at?: string | null;
          description?: string | null;
          email?: string | null;
          id?: string;
          is_verified?: boolean | null;
          logo_url?: string | null;
          phone?: string | null;
          registration_number?: string | null;
          status?: string | null;
          updated_at?: string | null;
          user_id?: string;
          verified_at?: string | null;
          website?: string | null;
        };
        Relationships: [];
      };
      agency_mandates: {
        Row: {
          agency_id: string;
          agency_signed_at: string | null;
          can_communicate_tenants: boolean | null;
          can_create_leases: boolean | null;
          can_create_properties: boolean | null;
          can_delete_properties: boolean | null;
          can_edit_properties: boolean | null;
          can_manage_applications: boolean | null;
          can_manage_documents: boolean | null;
          can_manage_maintenance: boolean | null;
          can_view_applications: boolean | null;
          can_view_financials: boolean | null;
          can_view_properties: boolean | null;
          commission_rate: number | null;
          created_at: string | null;
          cryptoneo_operation_id: string | null;
          cryptoneo_signature_status: string | null;
          end_date: string | null;
          id: string;
          mandate_document_url: string | null;
          mandate_scope: string | null;
          notes: string | null;
          owner_id: string;
          owner_signed_at: string | null;
          property_id: string | null;
          signed_at: string | null;
          signed_mandate_url: string | null;
          start_date: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          agency_id: string;
          agency_signed_at?: string | null;
          can_communicate_tenants?: boolean | null;
          can_create_leases?: boolean | null;
          can_create_properties?: boolean | null;
          can_delete_properties?: boolean | null;
          can_edit_properties?: boolean | null;
          can_manage_applications?: boolean | null;
          can_manage_documents?: boolean | null;
          can_manage_maintenance?: boolean | null;
          can_view_applications?: boolean | null;
          can_view_financials?: boolean | null;
          can_view_properties?: boolean | null;
          commission_rate?: number | null;
          created_at?: string | null;
          cryptoneo_operation_id?: string | null;
          cryptoneo_signature_status?: string | null;
          end_date?: string | null;
          id?: string;
          mandate_document_url?: string | null;
          mandate_scope?: string | null;
          notes?: string | null;
          owner_id: string;
          owner_signed_at?: string | null;
          property_id?: string | null;
          signed_at?: string | null;
          signed_mandate_url?: string | null;
          start_date?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          agency_id?: string;
          agency_signed_at?: string | null;
          can_communicate_tenants?: boolean | null;
          can_create_leases?: boolean | null;
          can_create_properties?: boolean | null;
          can_delete_properties?: boolean | null;
          can_edit_properties?: boolean | null;
          can_manage_applications?: boolean | null;
          can_manage_documents?: boolean | null;
          can_manage_maintenance?: boolean | null;
          can_view_applications?: boolean | null;
          can_view_financials?: boolean | null;
          can_view_properties?: boolean | null;
          commission_rate?: number | null;
          created_at?: string | null;
          cryptoneo_operation_id?: string | null;
          cryptoneo_signature_status?: string | null;
          end_date?: string | null;
          id?: string;
          mandate_document_url?: string | null;
          mandate_scope?: string | null;
          notes?: string | null;
          owner_id?: string;
          owner_signed_at?: string | null;
          property_id?: string | null;
          signed_at?: string | null;
          signed_mandate_url?: string | null;
          start_date?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'agency_mandates_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agency_mandates_agency_id_fkey';
            columns: ['agency_id'];
            isOneToOne: false;
            referencedRelation: 'public_agencies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agency_mandates_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'agency_mandates_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      api_keys: {
        Row: {
          api_key: string;
          api_secret: string | null;
          config: Json | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_used_at: string | null;
          service_name: string;
          updated_at: string | null;
        };
        Insert: {
          api_key: string;
          api_secret?: string | null;
          config?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          service_name: string;
          updated_at?: string | null;
        };
        Update: {
          api_key?: string;
          api_secret?: string | null;
          config?: Json | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_used_at?: string | null;
          service_name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      business_rules: {
        Row: {
          category: string;
          created_at: string | null;
          description: string | null;
          id: string;
          is_enabled: boolean | null;
          max_value: number | null;
          min_value: number | null;
          rule_key: string;
          rule_name: string;
          rule_type: string;
          updated_at: string | null;
          value_boolean: boolean | null;
          value_json: Json | null;
          value_number: number | null;
        };
        Insert: {
          category: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          max_value?: number | null;
          min_value?: number | null;
          rule_key: string;
          rule_name: string;
          rule_type: string;
          updated_at?: string | null;
          value_boolean?: boolean | null;
          value_json?: Json | null;
          value_number?: number | null;
        };
        Update: {
          category?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          max_value?: number | null;
          min_value?: number | null;
          rule_key?: string;
          rule_name?: string;
          rule_type?: string;
          updated_at?: string | null;
          value_boolean?: boolean | null;
          value_json?: Json | null;
          value_number?: number | null;
        };
        Relationships: [];
      };
      cev_missions: {
        Row: {
          assigned_agent_id: string;
          completed_at: string | null;
          created_at: string | null;
          created_by: string | null;
          documents: Json | null;
          etat_lieux_report: Json | null;
          id: string;
          mission_type: string;
          notes: string | null;
          photos: Json | null;
          property_id: string | null;
          scheduled_date: string | null;
          status: string;
          updated_at: string | null;
          urgency: string;
          verification_checklist: Json | null;
        };
        Insert: {
          assigned_agent_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          documents?: Json | null;
          etat_lieux_report?: Json | null;
          id?: string;
          mission_type?: string;
          notes?: string | null;
          photos?: Json | null;
          property_id?: string | null;
          scheduled_date?: string | null;
          status?: string;
          updated_at?: string | null;
          urgency?: string;
          verification_checklist?: Json | null;
        };
        Update: {
          assigned_agent_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          documents?: Json | null;
          etat_lieux_report?: Json | null;
          id?: string;
          mission_type?: string;
          notes?: string | null;
          photos?: Json | null;
          property_id?: string | null;
          scheduled_date?: string | null;
          status?: string;
          updated_at?: string | null;
          urgency?: string;
          verification_checklist?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'cev_missions_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cev_missions_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      chatbot_conversations: {
        Row: {
          archived_at: string | null;
          created_at: string | null;
          id: string;
          message_count: number | null;
          metadata: Json | null;
          status: string | null;
          title: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string | null;
          id?: string;
          message_count?: number | null;
          metadata?: Json | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string | null;
          id?: string;
          message_count?: number | null;
          metadata?: Json | null;
          status?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      chatbot_messages: {
        Row: {
          attachments: Json | null;
          content: string;
          conversation_id: string;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          metadata: Json | null;
          reactions: Json | null;
          read_at: string | null;
          role: string;
        };
        Insert: {
          attachments?: Json | null;
          content: string;
          conversation_id: string;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          metadata?: Json | null;
          reactions?: Json | null;
          read_at?: string | null;
          role: string;
        };
        Update: {
          attachments?: Json | null;
          content?: string;
          conversation_id?: string;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          metadata?: Json | null;
          reactions?: Json | null;
          read_at?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chatbot_messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'chatbot_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      contact_submissions: {
        Row: {
          email: string;
          id: string;
          message: string;
          name: string;
          phone: string | null;
          resolved_at: string | null;
          status: string | null;
          subject: string | null;
          submitted_at: string | null;
        };
        Insert: {
          email: string;
          id?: string;
          message: string;
          name: string;
          phone?: string | null;
          resolved_at?: string | null;
          status?: string | null;
          subject?: string | null;
          submitted_at?: string | null;
        };
        Update: {
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          phone?: string | null;
          resolved_at?: string | null;
          status?: string | null;
          subject?: string | null;
          submitted_at?: string | null;
        };
        Relationships: [];
      };
      digital_certificates: {
        Row: {
          certificate_data: Json | null;
          certificate_id: string;
          created_at: string | null;
          expires_at: string | null;
          id: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          certificate_data?: Json | null;
          certificate_id: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          certificate_data?: Json | null;
          certificate_id?: string;
          created_at?: string | null;
          expires_at?: string | null;
          id?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      electronic_signature_logs: {
        Row: {
          created_at: string | null;
          cryptoneo_response: Json | null;
          error_message: string | null;
          id: string;
          initiated_by: string;
          lease_id: string;
          operation_id: string;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          cryptoneo_response?: Json | null;
          error_message?: string | null;
          id?: string;
          initiated_by: string;
          lease_id: string;
          operation_id: string;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          cryptoneo_response?: Json | null;
          error_message?: string | null;
          id?: string;
          initiated_by?: string;
          lease_id?: string;
          operation_id?: string;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'electronic_signature_logs_lease_id_fkey';
            columns: ['lease_id'];
            isOneToOne: false;
            referencedRelation: 'lease_contracts';
            referencedColumns: ['id'];
          },
        ];
      };
      facial_verification_attempts: {
        Row: {
          completed_at: string | null;
          created_at: string | null;
          document_id: string | null;
          document_url: string | null;
          failure_reason: string | null;
          id: string;
          is_live: boolean | null;
          is_match: boolean | null;
          matching_score: number | null;
          provider: string;
          provider_response: Json | null;
          selfie_url: string | null;
          status: string | null;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          document_url?: string | null;
          failure_reason?: string | null;
          id?: string;
          is_live?: boolean | null;
          is_match?: boolean | null;
          matching_score?: number | null;
          provider?: string;
          provider_response?: Json | null;
          selfie_url?: string | null;
          status?: string | null;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string | null;
          document_id?: string | null;
          document_url?: string | null;
          failure_reason?: string | null;
          id?: string;
          is_live?: boolean | null;
          is_match?: boolean | null;
          matching_score?: number | null;
          provider?: string;
          provider_response?: Json | null;
          selfie_url?: string | null;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      favorites: {
        Row: {
          created_at: string | null;
          id: string;
          property_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          property_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          property_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorites_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'favorites_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      feature_flags: {
        Row: {
          config: Json | null;
          created_at: string | null;
          description: string | null;
          feature_name: string;
          id: string;
          is_enabled: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          config?: Json | null;
          created_at?: string | null;
          description?: string | null;
          feature_name: string;
          id?: string;
          is_enabled?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          config?: Json | null;
          created_at?: string | null;
          description?: string | null;
          feature_name?: string;
          id?: string;
          is_enabled?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      hero_slides: {
        Row: {
          created_at: string | null;
          description: string | null;
          display_order: number;
          id: string;
          image_url: string;
          is_active: boolean;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url: string;
          is_active?: boolean;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          display_order?: number;
          id?: string;
          image_url?: string;
          is_active?: boolean;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      lease_contracts: {
        Row: {
          ansut_certified_at: string | null;
          certification_status: string | null;
          charges_amount: number | null;
          contract_number: string;
          created_at: string | null;
          cryptoneo_callback_received_at: string | null;
          cryptoneo_operation_id: string | null;
          cryptoneo_signature_status: string | null;
          cryptoneo_signed_document_url: string | null;
          custom_clauses: string | null;
          deposit_amount: number | null;
          document_url: string | null;
          end_date: string;
          id: string;
          is_electronically_signed: boolean | null;
          landlord_cryptoneo_signature_at: string | null;
          landlord_signed_at: string | null;
          lease_type: string | null;
          monthly_rent: number;
          owner_id: string;
          payment_day: number | null;
          property_id: string;
          signed_at: string | null;
          signed_document_url: string | null;
          start_date: string;
          status: string | null;
          template_id: string | null;
          tenant_cryptoneo_signature_at: string | null;
          tenant_id: string;
          tenant_signed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          ansut_certified_at?: string | null;
          certification_status?: string | null;
          charges_amount?: number | null;
          contract_number: string;
          created_at?: string | null;
          cryptoneo_callback_received_at?: string | null;
          cryptoneo_operation_id?: string | null;
          cryptoneo_signature_status?: string | null;
          cryptoneo_signed_document_url?: string | null;
          custom_clauses?: string | null;
          deposit_amount?: number | null;
          document_url?: string | null;
          end_date: string;
          id?: string;
          is_electronically_signed?: boolean | null;
          landlord_cryptoneo_signature_at?: string | null;
          landlord_signed_at?: string | null;
          lease_type?: string | null;
          monthly_rent: number;
          owner_id: string;
          payment_day?: number | null;
          property_id: string;
          signed_at?: string | null;
          signed_document_url?: string | null;
          start_date: string;
          status?: string | null;
          template_id?: string | null;
          tenant_cryptoneo_signature_at?: string | null;
          tenant_id: string;
          tenant_signed_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          ansut_certified_at?: string | null;
          certification_status?: string | null;
          charges_amount?: number | null;
          contract_number?: string;
          created_at?: string | null;
          cryptoneo_callback_received_at?: string | null;
          cryptoneo_operation_id?: string | null;
          cryptoneo_signature_status?: string | null;
          cryptoneo_signed_document_url?: string | null;
          custom_clauses?: string | null;
          deposit_amount?: number | null;
          document_url?: string | null;
          end_date?: string;
          id?: string;
          is_electronically_signed?: boolean | null;
          landlord_cryptoneo_signature_at?: string | null;
          landlord_signed_at?: string | null;
          lease_type?: string | null;
          monthly_rent?: number;
          owner_id?: string;
          payment_day?: number | null;
          property_id?: string;
          signed_at?: string | null;
          signed_document_url?: string | null;
          start_date?: string;
          status?: string | null;
          template_id?: string | null;
          tenant_cryptoneo_signature_at?: string | null;
          tenant_id?: string;
          tenant_signed_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lease_contracts_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_contracts_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lease_contracts_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'lease_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      lease_templates: {
        Row: {
          content: Json;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          is_default: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          content?: Json;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          content?: Json;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_default?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      maintenance_requests: {
        Row: {
          actual_cost: number | null;
          completed_date: string | null;
          contract_id: string | null;
          created_at: string | null;
          description: string | null;
          estimated_cost: number | null;
          id: string;
          images: string[] | null;
          issue_type: string;
          priority: string | null;
          property_id: string | null;
          rejection_reason: string | null;
          resolved_at: string | null;
          scheduled_date: string | null;
          status: string | null;
          tenant_id: string;
          urgency: string | null;
        };
        Insert: {
          actual_cost?: number | null;
          completed_date?: string | null;
          contract_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          estimated_cost?: number | null;
          id?: string;
          images?: string[] | null;
          issue_type: string;
          priority?: string | null;
          property_id?: string | null;
          rejection_reason?: string | null;
          resolved_at?: string | null;
          scheduled_date?: string | null;
          status?: string | null;
          tenant_id: string;
          urgency?: string | null;
        };
        Update: {
          actual_cost?: number | null;
          completed_date?: string | null;
          contract_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          estimated_cost?: number | null;
          id?: string;
          images?: string[] | null;
          issue_type?: string;
          priority?: string | null;
          property_id?: string | null;
          rejection_reason?: string | null;
          resolved_at?: string | null;
          scheduled_date?: string | null;
          status?: string | null;
          tenant_id?: string;
          urgency?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'lease_contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      mandate_signature_logs: {
        Row: {
          created_at: string;
          cryptoneo_response: Json | null;
          error_message: string | null;
          id: string;
          ip_address: string | null;
          mandate_id: string;
          operation_id: string | null;
          signer_id: string;
          signer_type: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          cryptoneo_response?: Json | null;
          error_message?: string | null;
          id?: string;
          ip_address?: string | null;
          mandate_id: string;
          operation_id?: string | null;
          signer_id: string;
          signer_type: string;
          status: string;
        };
        Update: {
          created_at?: string;
          cryptoneo_response?: Json | null;
          error_message?: string | null;
          id?: string;
          ip_address?: string | null;
          mandate_id?: string;
          operation_id?: string | null;
          signer_id?: string;
          signer_type?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mandate_signature_logs_mandate_id_fkey';
            columns: ['mandate_id'];
            isOneToOne: false;
            referencedRelation: 'agency_mandates';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          attachment_name: string | null;
          attachment_size: number | null;
          attachment_type: string | null;
          attachment_url: string | null;
          content: string;
          conversation_id: string | null;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          receiver_id: string;
          sender_id: string;
        };
        Insert: {
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_type?: string | null;
          attachment_url?: string | null;
          content: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          receiver_id: string;
          sender_id: string;
        };
        Update: {
          attachment_name?: string | null;
          attachment_size?: number | null;
          attachment_type?: string | null;
          attachment_url?: string | null;
          content?: string;
          conversation_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          receiver_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'user_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          action_url: string | null;
          channel: string | null;
          created_at: string | null;
          id: string;
          is_read: boolean | null;
          message: string;
          metadata: Json | null;
          read_at: string | null;
          title: string;
          type: string | null;
          user_id: string;
        };
        Insert: {
          action_url?: string | null;
          channel?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message: string;
          metadata?: Json | null;
          read_at?: string | null;
          title: string;
          type?: string | null;
          user_id: string;
        };
        Update: {
          action_url?: string | null;
          channel?: string | null;
          created_at?: string | null;
          id?: string;
          is_read?: boolean | null;
          message?: string;
          metadata?: Json | null;
          read_at?: string | null;
          title?: string;
          type?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      password_reset_tokens: {
        Row: {
          created_at: string | null;
          email: string;
          expires_at: string;
          id: string;
          ip_address: string | null;
          token: string;
          used_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          expires_at: string;
          id?: string;
          ip_address?: string | null;
          token: string;
          used_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          expires_at?: string;
          id?: string;
          ip_address?: string | null;
          token?: string;
          used_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          contract_id: string | null;
          created_at: string | null;
          due_date: string | null;
          id: string;
          paid_date: string | null;
          payer_id: string;
          payment_method: string | null;
          payment_type: string;
          property_id: string | null;
          receiver_id: string | null;
          status: string | null;
          transaction_ref: string | null;
        };
        Insert: {
          amount: number;
          contract_id?: string | null;
          created_at?: string | null;
          due_date?: string | null;
          id?: string;
          paid_date?: string | null;
          payer_id: string;
          payment_method?: string | null;
          payment_type: string;
          property_id?: string | null;
          receiver_id?: string | null;
          status?: string | null;
          transaction_ref?: string | null;
        };
        Update: {
          amount?: number;
          contract_id?: string | null;
          created_at?: string | null;
          due_date?: string | null;
          id?: string;
          paid_date?: string | null;
          payer_id?: string;
          payment_method?: string | null;
          payment_type?: string;
          property_id?: string | null;
          receiver_id?: string | null;
          status?: string | null;
          transaction_ref?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'lease_contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          active_role: string | null;
          address: string | null;
          avatar_url: string | null;
          bio: string | null;
          city: string | null;
          cnam_verified: boolean | null;
          cni_photo_url: string | null;
          created_at: string | null;
          email: string | null;
          facial_verification_date: string | null;
          facial_verification_image_url: string | null;
          facial_verification_score: number | null;
          facial_verification_status: string | null;
          full_name: string | null;
          id: string;
          is_verified: boolean | null;
          oneci_data: Json | null;
          oneci_number: string | null;
          oneci_verification_date: string | null;
          oneci_verified: boolean | null;
          phone: string | null;
          profile_setup_completed: boolean | null;
          reliability_score: number | null;
          trust_score: number | null;
          updated_at: string | null;
          user_id: string | null;
          user_type: string | null;
        };
        Insert: {
          active_role?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          cnam_verified?: boolean | null;
          cni_photo_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          facial_verification_date?: string | null;
          facial_verification_image_url?: string | null;
          facial_verification_score?: number | null;
          facial_verification_status?: string | null;
          full_name?: string | null;
          id?: string;
          is_verified?: boolean | null;
          oneci_data?: Json | null;
          oneci_number?: string | null;
          oneci_verification_date?: string | null;
          oneci_verified?: boolean | null;
          phone?: string | null;
          profile_setup_completed?: boolean | null;
          reliability_score?: number | null;
          trust_score?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          user_type?: string | null;
        };
        Update: {
          active_role?: string | null;
          address?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          city?: string | null;
          cnam_verified?: boolean | null;
          cni_photo_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          facial_verification_date?: string | null;
          facial_verification_image_url?: string | null;
          facial_verification_score?: number | null;
          facial_verification_status?: string | null;
          full_name?: string | null;
          id?: string;
          is_verified?: boolean | null;
          oneci_data?: Json | null;
          oneci_number?: string | null;
          oneci_verification_date?: string | null;
          oneci_verified?: boolean | null;
          phone?: string | null;
          profile_setup_completed?: boolean | null;
          reliability_score?: number | null;
          trust_score?: number | null;
          updated_at?: string | null;
          user_id?: string | null;
          user_type?: string | null;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string | null;
          amenities: string[] | null;
          ansut_certificate_url: string | null;
          ansut_verification_date: string | null;
          ansut_verified: boolean | null;
          bathrooms: number | null;
          bedrooms: number | null;
          charges_amount: number | null;
          city: string;
          created_at: string | null;
          deposit_amount: number | null;
          description: string | null;
          has_ac: boolean | null;
          has_garden: boolean | null;
          has_parking: boolean | null;
          id: string;
          images: string[] | null;
          is_anonymous: boolean | null;
          furnished: boolean | null;
          latitude: number | null;
          longitude: number | null;
          main_image: string | null;
          neighborhood: string | null;
          owner_id: string | null;
          price: number | null;
          property_category: string | null;
          property_type: string;
          status: string | null;
          surface_area: number | null;
          title: string;
          updated_at: string | null;
          views_count: number | null;
        };
        Insert: {
          address?: string | null;
          amenities?: string[] | null;
          ansut_certificate_url?: string | null;
          ansut_verification_date?: string | null;
          ansut_verified?: boolean | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          charges_amount?: number | null;
          city: string;
          created_at?: string | null;
          deposit_amount?: number | null;
          description?: string | null;
          has_ac?: boolean | null;
          has_garden?: boolean | null;
          has_parking?: boolean | null;
          id?: string;
          images?: string[] | null;
          is_anonymous?: boolean | null;
          furnished?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          main_image?: string | null;
          neighborhood?: string | null;
          owner_id?: string | null;
          price?: number | null;
          property_category?: string | null;
          property_type: string;
          status?: string | null;
          surface_area?: number | null;
          title: string;
          updated_at?: string | null;
          views_count?: number | null;
        };
        Update: {
          address?: string | null;
          amenities?: string[] | null;
          ansut_certificate_url?: string | null;
          ansut_verification_date?: string | null;
          ansut_verified?: boolean | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          charges_amount?: number | null;
          city?: string;
          created_at?: string | null;
          deposit_amount?: number | null;
          description?: string | null;
          has_ac?: boolean | null;
          has_garden?: boolean | null;
          has_parking?: boolean | null;
          id?: string;
          images?: string[] | null;
          is_anonymous?: boolean | null;
          furnished?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          main_image?: string | null;
          neighborhood?: string | null;
          owner_id?: string | null;
          price?: number | null;
          property_category?: string | null;
          property_type?: string;
          status?: string | null;
          surface_area?: number | null;
          title?: string;
          updated_at?: string | null;
          views_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_properties_owner_profile';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['user_id'];
          },
        ];
      };
      property_alerts: {
        Row: {
          city: string | null;
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          last_notified_at: string | null;
          max_bedrooms: number | null;
          max_price: number | null;
          min_bedrooms: number | null;
          min_price: number | null;
          neighborhood: string | null;
          property_type: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          city?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_notified_at?: string | null;
          max_bedrooms?: number | null;
          max_price?: number | null;
          min_bedrooms?: number | null;
          min_price?: number | null;
          neighborhood?: string | null;
          property_type?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          city?: string | null;
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_notified_at?: string | null;
          max_bedrooms?: number | null;
          max_price?: number | null;
          min_bedrooms?: number | null;
          min_price?: number | null;
          neighborhood?: string | null;
          property_type?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      rental_applications: {
        Row: {
          applicant_id: string;
          application_score: number | null;
          cover_letter: string | null;
          created_at: string | null;
          id: string;
          property_id: string;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          applicant_id: string;
          application_score?: number | null;
          cover_letter?: string | null;
          created_at?: string | null;
          id?: string;
          property_id: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          applicant_id?: string;
          application_score?: number | null;
          cover_letter?: string | null;
          created_at?: string | null;
          id?: string;
          property_id?: string;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rental_applications_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'rental_applications_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      rental_history: {
        Row: {
          city: string;
          created_at: string | null;
          departure_reason: string | null;
          end_date: string | null;
          id: string;
          is_current: boolean | null;
          landlord_email: string | null;
          landlord_name: string | null;
          landlord_phone: string | null;
          monthly_rent: number;
          proof_documents: Json | null;
          property_address: string;
          property_type: string | null;
          self_condition_rating: number | null;
          self_payment_rating: number | null;
          start_date: string;
          tenant_id: string;
          updated_at: string | null;
          verification_notes: string | null;
          verification_status: string | null;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          city: string;
          created_at?: string | null;
          departure_reason?: string | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean | null;
          landlord_email?: string | null;
          landlord_name?: string | null;
          landlord_phone?: string | null;
          monthly_rent: number;
          proof_documents?: Json | null;
          property_address: string;
          property_type?: string | null;
          self_condition_rating?: number | null;
          self_payment_rating?: number | null;
          start_date: string;
          tenant_id: string;
          updated_at?: string | null;
          verification_notes?: string | null;
          verification_status?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          city?: string;
          created_at?: string | null;
          departure_reason?: string | null;
          end_date?: string | null;
          id?: string;
          is_current?: boolean | null;
          landlord_email?: string | null;
          landlord_name?: string | null;
          landlord_phone?: string | null;
          monthly_rent?: number;
          proof_documents?: Json | null;
          property_address?: string;
          property_type?: string | null;
          self_condition_rating?: number | null;
          self_payment_rating?: number | null;
          start_date?: string;
          tenant_id?: string;
          updated_at?: string | null;
          verification_notes?: string | null;
          verification_status?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          comment: string | null;
          created_at: string | null;
          id: string;
          is_visible: boolean | null;
          property_id: string | null;
          rating: number;
          review_type: string | null;
          reviewee_id: string | null;
          reviewer_id: string;
          updated_at: string | null;
        };
        Insert: {
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          is_visible?: boolean | null;
          property_id?: string | null;
          rating: number;
          review_type?: string | null;
          reviewee_id?: string | null;
          reviewer_id: string;
          updated_at?: string | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string | null;
          id?: string;
          is_visible?: boolean | null;
          property_id?: string | null;
          rating?: number;
          review_type?: string | null;
          reviewee_id?: string | null;
          reviewer_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      saved_searches: {
        Row: {
          created_at: string | null;
          filters: Json;
          id: string;
          name: string;
          notifications_enabled: boolean | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          filters?: Json;
          id?: string;
          name: string;
          notifications_enabled?: boolean | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          filters?: Json;
          id?: string;
          name?: string;
          notifications_enabled?: boolean | null;
          user_id?: string;
        };
        Relationships: [];
      };
      service_configurations: {
        Row: {
          config: Json | null;
          created_at: string | null;
          id: string;
          is_enabled: boolean | null;
          priority: number | null;
          provider: string;
          service_name: string;
          updated_at: string | null;
        };
        Insert: {
          config?: Json | null;
          created_at?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          priority?: number | null;
          provider: string;
          service_name: string;
          updated_at?: string | null;
        };
        Update: {
          config?: Json | null;
          created_at?: string | null;
          id?: string;
          is_enabled?: boolean | null;
          priority?: number | null;
          provider?: string;
          service_name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      service_usage_logs: {
        Row: {
          error_message: string | null;
          id: string;
          phone: string | null;
          provider: string;
          response_time_ms: number | null;
          service_name: string;
          status: string;
          timestamp: string | null;
        };
        Insert: {
          error_message?: string | null;
          id?: string;
          phone?: string | null;
          provider: string;
          response_time_ms?: number | null;
          service_name: string;
          status: string;
          timestamp?: string | null;
        };
        Update: {
          error_message?: string | null;
          id?: string;
          phone?: string | null;
          provider?: string;
          response_time_ms?: number | null;
          service_name?: string;
          status?: string;
          timestamp?: string | null;
        };
        Relationships: [];
      };
      sms_logs: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          id: string;
          message: string;
          phone: string;
          provider: string;
          status: string;
          transaction_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          message: string;
          phone: string;
          provider: string;
          status: string;
          transaction_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          message?: string;
          phone?: string;
          provider?: string;
          status?: string;
          transaction_id?: string | null;
        };
        Relationships: [];
      };
      suta_analytics: {
        Row: {
          avg_response_time_ms: number | null;
          category: string | null;
          created_at: string | null;
          date: string | null;
          id: string;
          negative_feedback: number | null;
          positive_feedback: number | null;
          question_count: number | null;
          topic: string | null;
        };
        Insert: {
          avg_response_time_ms?: number | null;
          category?: string | null;
          created_at?: string | null;
          date?: string | null;
          id?: string;
          negative_feedback?: number | null;
          positive_feedback?: number | null;
          question_count?: number | null;
          topic?: string | null;
        };
        Update: {
          avg_response_time_ms?: number | null;
          category?: string | null;
          created_at?: string | null;
          date?: string | null;
          id?: string;
          negative_feedback?: number | null;
          positive_feedback?: number | null;
          question_count?: number | null;
          topic?: string | null;
        };
        Relationships: [];
      };
      suta_feedback: {
        Row: {
          conversation_id: string | null;
          created_at: string | null;
          feedback_text: string | null;
          id: string;
          message_id: string;
          question: string;
          rating: string;
          response: string;
          session_id: string | null;
          user_id: string | null;
        };
        Insert: {
          conversation_id?: string | null;
          created_at?: string | null;
          feedback_text?: string | null;
          id?: string;
          message_id: string;
          question: string;
          rating: string;
          response: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          conversation_id?: string | null;
          created_at?: string | null;
          feedback_text?: string | null;
          id?: string;
          message_id?: string;
          question?: string;
          rating?: string;
          response?: string;
          session_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'suta_feedback_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'chatbot_conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      suta_knowledge_base: {
        Row: {
          answer: string;
          category: string;
          created_at: string | null;
          created_by: string | null;
          id: string;
          is_active: boolean | null;
          keywords: string[] | null;
          negative_feedback_count: number | null;
          positive_feedback_count: number | null;
          priority: number | null;
          question: string;
          updated_at: string | null;
          usage_count: number | null;
        };
        Insert: {
          answer: string;
          category: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          keywords?: string[] | null;
          negative_feedback_count?: number | null;
          positive_feedback_count?: number | null;
          priority?: number | null;
          question: string;
          updated_at?: string | null;
          usage_count?: number | null;
        };
        Update: {
          answer?: string;
          category?: string;
          created_at?: string | null;
          created_by?: string | null;
          id?: string;
          is_active?: boolean | null;
          keywords?: string[] | null;
          negative_feedback_count?: number | null;
          positive_feedback_count?: number | null;
          priority?: number | null;
          question?: string;
          updated_at?: string | null;
          usage_count?: number | null;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          category: string;
          description: string | null;
          id: string;
          setting_key: string;
          setting_value: Json;
          updated_at: string | null;
          updated_by: string | null;
        };
        Insert: {
          category: string;
          description?: string | null;
          id?: string;
          setting_key: string;
          setting_value?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Update: {
          category?: string;
          description?: string | null;
          id?: string;
          setting_key?: string;
          setting_value?: Json;
          updated_at?: string | null;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      user_conversations: {
        Row: {
          created_at: string | null;
          id: string;
          last_message_at: string | null;
          last_message_preview: string | null;
          participant_1_id: string;
          participant_2_id: string;
          property_id: string | null;
          subject: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          participant_1_id: string;
          participant_2_id: string;
          property_id?: string | null;
          subject?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          participant_1_id?: string;
          participant_2_id?: string;
          property_id?: string | null;
          subject?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_conversations_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_conversations_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          granted_at: string | null;
          granted_by: string | null;
          id: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Insert: {
          granted_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role: Database['public']['Enums']['app_role'];
          user_id: string;
        };
        Update: {
          granted_at?: string | null;
          granted_by?: string | null;
          id?: string;
          role?: Database['public']['Enums']['app_role'];
          user_id?: string;
        };
        Relationships: [];
      };
      verification_codes: {
        Row: {
          attempts: number | null;
          code: string;
          created_at: string | null;
          email: string | null;
          expires_at: string;
          id: string;
          max_attempts: number | null;
          phone: string | null;
          type: string;
          user_id: string | null;
          verified_at: string | null;
        };
        Insert: {
          attempts?: number | null;
          code: string;
          created_at?: string | null;
          email?: string | null;
          expires_at: string;
          id?: string;
          max_attempts?: number | null;
          phone?: string | null;
          type: string;
          user_id?: string | null;
          verified_at?: string | null;
        };
        Update: {
          attempts?: number | null;
          code?: string;
          created_at?: string | null;
          email?: string | null;
          expires_at?: string;
          id?: string;
          max_attempts?: number | null;
          phone?: string | null;
          type?: string;
          user_id?: string | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      visit_requests: {
        Row: {
          cancellation_reason: string | null;
          cancelled_at: string | null;
          created_at: string | null;
          feedback: string | null;
          id: string;
          notes: string | null;
          owner_id: string | null;
          property_id: string;
          rating: number | null;
          status: string | null;
          tenant_id: string;
          visit_date: string;
          visit_time: string;
          visit_type: string | null;
          visitor_notes: string | null;
        };
        Insert: {
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          feedback?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          property_id: string;
          rating?: number | null;
          status?: string | null;
          tenant_id: string;
          visit_date: string;
          visit_time: string;
          visit_type?: string | null;
          visitor_notes?: string | null;
        };
        Update: {
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          feedback?: string | null;
          id?: string;
          notes?: string | null;
          owner_id?: string | null;
          property_id?: string;
          rating?: number | null;
          status?: string | null;
          tenant_id?: string;
          visit_date?: string;
          visit_time?: string;
          visit_type?: string | null;
          visitor_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'visit_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visit_requests_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'public_properties';
            referencedColumns: ['id'];
          },
        ];
      };
      webhook_logs: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          id: string;
          payload: Json | null;
          processing_result: string;
          signature_provided: string | null;
          signature_valid: boolean | null;
          source_ip: string | null;
          webhook_type: string;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          payload?: Json | null;
          processing_result: string;
          signature_provided?: string | null;
          signature_valid?: boolean | null;
          source_ip?: string | null;
          webhook_type: string;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          payload?: Json | null;
          processing_result?: string;
          signature_provided?: string | null;
          signature_valid?: boolean | null;
          source_ip?: string | null;
          webhook_type?: string;
        };
        Relationships: [];
      };
      whatsapp_logs: {
        Row: {
          created_at: string | null;
          error_message: string | null;
          id: string;
          message: string;
          phone: string;
          provider: string;
          status: string;
          transaction_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          message: string;
          phone: string;
          provider: string;
          status: string;
          transaction_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          message?: string;
          phone?: string;
          provider?: string;
          status?: string;
          transaction_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      public_agencies: {
        Row: {
          agency_name: string | null;
          city: string | null;
          description: string | null;
          id: string | null;
          is_verified: boolean | null;
          logo_url: string | null;
          status: string | null;
          verified_at: string | null;
        };
        Insert: {
          agency_name?: string | null;
          city?: string | null;
          description?: string | null;
          id?: string | null;
          is_verified?: boolean | null;
          logo_url?: string | null;
          status?: string | null;
          verified_at?: string | null;
        };
        Update: {
          agency_name?: string | null;
          city?: string | null;
          description?: string | null;
          id?: string | null;
          is_verified?: boolean | null;
          logo_url?: string | null;
          status?: string | null;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      public_properties: {
        Row: {
          address: string | null;
          amenities: string[] | null;
          ansut_verified: boolean | null;
          bathrooms: number | null;
          bedrooms: number | null;
          charges_amount: number | null;
          city: string | null;
          created_at: string | null;
          deposit_amount: number | null;
          description: string | null;
          has_ac: boolean | null;
          has_garden: boolean | null;
          has_parking: boolean | null;
          id: string | null;
          images: string[] | null;
          is_anonymous: boolean | null;
          furnished: boolean | null;
          latitude: number | null;
          longitude: number | null;
          main_image: string | null;
          monthly_rent: number | null;
          neighborhood: string | null;
          owner_id: string | null;
          property_category: string | null;
          property_type: string | null;
          status: string | null;
          surface_area: number | null;
          title: string | null;
          updated_at: string | null;
          views_count: number | null;
        };
        Insert: {
          address?: string | null;
          amenities?: string[] | null;
          ansut_verified?: boolean | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          charges_amount?: number | null;
          city?: string | null;
          created_at?: string | null;
          deposit_amount?: number | null;
          description?: string | null;
          has_ac?: boolean | null;
          has_garden?: boolean | null;
          has_parking?: boolean | null;
          id?: string | null;
          images?: string[] | null;
          is_anonymous?: boolean | null;
          furnished?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          main_image?: string | null;
          monthly_rent?: number | null;
          neighborhood?: string | null;
          owner_id?: never;
          property_category?: string | null;
          property_type?: string | null;
          status?: string | null;
          surface_area?: number | null;
          title?: string | null;
          updated_at?: string | null;
          views_count?: number | null;
        };
        Update: {
          address?: string | null;
          amenities?: string[] | null;
          ansut_verified?: boolean | null;
          bathrooms?: number | null;
          bedrooms?: number | null;
          charges_amount?: number | null;
          city?: string | null;
          created_at?: string | null;
          deposit_amount?: number | null;
          description?: string | null;
          has_ac?: boolean | null;
          has_garden?: boolean | null;
          has_parking?: boolean | null;
          id?: string | null;
          images?: string[] | null;
          is_anonymous?: boolean | null;
          furnished?: boolean | null;
          latitude?: number | null;
          longitude?: number | null;
          main_image?: string | null;
          monthly_rent?: number | null;
          neighborhood?: string | null;
          owner_id?: never;
          property_category?: string | null;
          property_type?: string | null;
          status?: string | null;
          surface_area?: number | null;
          title?: string | null;
          updated_at?: string | null;
          views_count?: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auto_expire_mandates: { Args: never; Returns: number };
      calculate_profile_score: {
        Args: {
          p_address: string;
          p_avatar_url: string;
          p_bio: string;
          p_city: string;
          p_full_name: string;
          p_phone: string;
        };
        Returns: number;
      };
      calculate_trust_score: {
        Args: {
          p_address: string;
          p_avatar_url: string;
          p_bio: string;
          p_city: string;
          p_cnam_verified: boolean;
          p_facial_status: string;
          p_full_name: string;
          p_is_verified: boolean;
          p_oneci_verified: boolean;
          p_phone: string;
        };
        Returns: number;
      };
      calculate_verification_score: {
        Args: {
          p_cnam_verified: boolean;
          p_facial_status: string;
          p_is_verified: boolean;
          p_oneci_verified: boolean;
        };
        Returns: number;
      };
      check_feature_flag: {
        Args: { flag_key: string; user_id?: string };
        Returns: boolean;
      };
      cleanup_expired_verification_codes: { Args: never; Returns: number };
      cleanup_old_webhook_logs: { Args: never; Returns: number };
      generate_otp: { Args: never; Returns: string };
      generate_reset_token: { Args: never; Returns: string };
      get_platform_stats: { Args: never; Returns: Json };
      get_public_profile: {
        Args: { profile_user_id: string };
        Returns: {
          avatar_url: string;
          city: string;
          cnam_verified: boolean;
          full_name: string;
          is_verified: boolean;
          oneci_verified: boolean;
          trust_score: number;
          user_id: string;
        }[];
      };
      get_public_profiles: {
        Args: { profile_user_ids: string[] };
        Returns: {
          avatar_url: string;
          city: string;
          cnam_verified: boolean;
          full_name: string;
          is_verified: boolean;
          oneci_verified: boolean;
          trust_score: number;
          user_id: string;
        }[];
      };
      get_public_profiles_safe: {
        Args: { profile_user_ids: string[] };
        Returns: {
          avatar_url: string;
          city: string;
          cnam_verified: boolean;
          full_name: string;
          is_verified: boolean;
          oneci_verified: boolean;
          trust_score: number;
          user_id: string;
        }[];
      };
      get_user_roles: {
        Args: { _user_id?: string };
        Returns: Database['public']['Enums']['app_role'][];
      };
      has_role: {
        Args: {
          _role: Database['public']['Enums']['app_role'];
          _user_id: string;
        };
        Returns: boolean;
      };
      increment_property_views: {
        Args: { property_id: string };
        Returns: undefined;
      };
      insert_audit_log: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_entity_id?: string;
          p_entity_type: string;
        };
        Returns: string;
      };
      log_admin_action: {
        Args: {
          p_action: string;
          p_details?: Json;
          p_entity_id?: string;
          p_entity_type: string;
        };
        Returns: string;
      };
      log_facial_verification_attempt: {
        Args: {
          p_document_id?: string;
          p_document_url?: string;
          p_provider?: string;
          p_selfie_url?: string;
          p_user_id: string;
        };
        Returns: string;
      };
      update_facial_verification_status: {
        Args: {
          p_failure_reason?: string;
          p_is_live?: boolean;
          p_is_match?: boolean;
          p_matching_score?: number;
          p_provider_response?: Json;
          p_status: string;
          p_verification_id: string;
        };
        Returns: undefined;
      };
      upsert_suta_analytics: {
        Args: { p_category: string; p_is_positive?: boolean; p_topic: string };
        Returns: undefined;
      };
      verify_otp_code: {
        Args: {
          p_code?: string;
          p_email?: string;
          p_phone?: string;
          p_type?: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: 'admin' | 'moderator' | 'user' | 'trust_agent';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ['admin', 'moderator', 'user', 'trust_agent'],
    },
  },
} as const;
