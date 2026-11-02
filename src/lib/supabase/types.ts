export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * ⚠️ FICHIER GÉNÉRÉ — ne pas éditer à la main.
 *
 * Généré par `scripts/generate-types-from-migrations.mjs` à partir des
 * migrations SQL de `supabase/migrations/` (DAT-001).
 *
 * Régénération après toute nouvelle migration :
 * ```bash
 * bun run scripts/generate-types-from-migrations.mjs
 * ```
 *
 * Source de vérité : 93 migrations SQL, 52 tables
 * publiques, 40 enums.
 *
 * MODE DE COMPATIBILITÉ (par défaut) :
 *  - Couverture complète : 52/52 tables, colonnes exactes
 *    (nullabilité, defaults), Relationships (FK) typées.
 *  - Les colonnes enum sont rendues `string` SAUF `users.role`,
 *    `users.active_role` et `otp_codes.type` (déjà strictes dans l'ancien
 *    fichier, contrat conservé) ; jsonb/json rendus `unknown` (comme
 *    l'ancien fichier). Raison : ~50 erreurs TS bloqueraient src/app/api/**
 *    en mode strict (Record<string, unknown> non assignable à Json, filtres
 *    `.eq()` sur des `string` arbitraires…). Les enums PostgreSQL restent
 *    intégralement typés dans `Enums` + alias exportés ci-dessous.
 *  - Bascule future vers le mode strict Supabase (enums + Json partout) :
 *    `TYPES_ENUM_STRICT=1 bun run scripts/generate-types-from-migrations.mjs`
 *    — à activer après correction des fichiers listés dans le worklog DAT-001.
 */

export interface Database {
  public: {
    Tables: {
      agency_agent_properties: {
        Row: {
          id: string
          assigned_at: string
          agent_id: string
          property_id: string
        }
        Insert: {
          id?: string
          assigned_at?: string
          agent_id: string
          property_id: string
        }
        Update: {
          id?: string
          assigned_at?: string
          agent_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agency_agent_properties_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agency_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_agent_properties_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      agency_agents: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          role: string
          status: string
          avatar_url: string | null
          created_at: string
          updated_at: string
          agency_id: string
          user_id: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          role?: string
          status?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          agency_id: string
          user_id?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          role?: string
          status?: string
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          agency_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'agency_agents_agency_id_fkey'
            columns: ['agency_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agency_agents_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      agent_feedback: {
        Row: {
          id: string
          rating: number
          comment: string | null
          created_at: string
          agent_id: string
          tc_id: string
        }
        Insert: {
          id?: string
          rating: number
          comment?: string | null
          created_at?: string
          agent_id: string
          tc_id: string
        }
        Update: {
          id?: string
          rating?: number
          comment?: string | null
          created_at?: string
          agent_id?: string
          tc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'agent_feedback_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'verification_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'agent_feedback_tc_id_fkey'
            columns: ['tc_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      applications: {
        Row: {
          id: string
          rental_file_id: string
          property_id: string
          tenant_id: string
          status: string
          motivation: string | null
          employment_type: string | null
          monthly_income: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rental_file_id: string
          property_id: string
          tenant_id: string
          status?: string
          motivation?: string | null
          employment_type?: string | null
          monthly_income?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rental_file_id?: string
          property_id?: string
          tenant_id?: string
          status?: string
          motivation?: string | null
          employment_type?: string | null
          monthly_income?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'applications_rental_file_id_fkey'
            columns: ['rental_file_id']
            isOneToOne: false
            referencedRelation: 'rental_files'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'applications_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'applications_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          action?: string
          entity?: string
          entity_id?: string | null
          details?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      backups: {
        Row: {
          id: string
          file_name: string
          status: string
          size: string | null
          storage_path: string | null
          type: string
          error_message: string | null
          created_by: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          file_name: string
          status?: string
          size?: string | null
          storage_path?: string | null
          type?: string
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          file_name?: string
          status?: string
          size?: string | null
          storage_path?: string | null
          type?: string
          error_message?: string | null
          created_by?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'backups_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      certifications: {
        Row: {
          id: string
          type: string
          status: string
          notes: string | null
          revoked_at: string | null
          revocation_reason: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
          user_id: string
          granted_by_id: string
          property_id: string | null
        }
        Insert: {
          id?: string
          type: string
          status?: string
          notes?: string | null
          revoked_at?: string | null
          revocation_reason?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
          granted_by_id: string
          property_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          notes?: string | null
          revoked_at?: string | null
          revocation_reason?: string | null
          expires_at?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
          granted_by_id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'certifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'certifications_granted_by_id_fkey'
            columns: ['granted_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'certifications_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      commissions: {
        Row: {
          id: string
          amount: number
          rate: number
          status: string
          description: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
          agent_id: string
          agency_id: string
          mandat_id: string | null
          lease_id: string | null
        }
        Insert: {
          id?: string
          amount: number
          rate: number
          status?: string
          description?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
          agent_id: string
          agency_id: string
          mandat_id?: string | null
          lease_id?: string | null
        }
        Update: {
          id?: string
          amount?: number
          rate?: number
          status?: string
          description?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
          agent_id?: string
          agency_id?: string
          mandat_id?: string | null
          lease_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'commissions_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'agency_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commissions_agency_id_fkey'
            columns: ['agency_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commissions_mandat_id_fkey'
            columns: ['mandat_id']
            isOneToOne: false
            referencedRelation: 'mandats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'commissions_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          }
        ]
      }
      connection_logs: {
        Row: {
          id: string
          ip_address: string | null
          user_agent: string | null
          device: string | null
          location: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          device?: string | null
          location?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          device?: string | null
          location?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'connection_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          last_message_at?: string | null
          created_at?: string
          property_id?: string | null
          participant1_id?: string
          participant2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_participant1_id_fkey'
            columns: ['participant1_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'conversations_participant2_id_fkey'
            columns: ['participant2_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      default_conditions: {
        Row: {
          key: string
          value: unknown
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          key?: string
          value?: unknown
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: unknown
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      deposit_refunds: {
        Row: {
          id: string
          lease_id: string
          deposit_amount: number
          refund_amount: number | null
          deductions: number
          deduction_reason: string | null
          justification_url: string | null
          status: string
          decided_by_id: string | null
          decided_at: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lease_id: string
          deposit_amount: number
          refund_amount?: number | null
          deductions?: number
          deduction_reason?: string | null
          justification_url?: string | null
          status?: string
          decided_by_id?: string | null
          decided_at?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lease_id?: string
          deposit_amount?: number
          refund_amount?: number | null
          deductions?: number
          deduction_reason?: string | null
          justification_url?: string | null
          status?: string
          decided_by_id?: string | null
          decided_at?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'deposit_refunds_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: true
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'deposit_refunds_decided_by_id_fkey'
            columns: ['decided_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      disputes: {
        Row: {
          id: string
          type: string
          description: string
          status: string
          priority: string
          resolution: string | null
          tc_comment: string | null
          investigation_notes: string | null
          evidence_urls: string
          is_escalated: boolean
          escalated_at: string | null
          escalation_reason: string | null
          created_at: string
          updated_at: string
          lease_id: string
          reported_by_id: string
          resolved_by_id: string | null
          handled_by_id: string | null
        }
        Insert: {
          id?: string
          type: string
          description: string
          status?: string
          priority?: string
          resolution?: string | null
          tc_comment?: string | null
          investigation_notes?: string | null
          evidence_urls?: string
          is_escalated?: boolean
          escalated_at?: string | null
          escalation_reason?: string | null
          created_at?: string
          updated_at?: string
          lease_id: string
          reported_by_id: string
          resolved_by_id?: string | null
          handled_by_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          description?: string
          status?: string
          priority?: string
          resolution?: string | null
          tc_comment?: string | null
          investigation_notes?: string | null
          evidence_urls?: string
          is_escalated?: boolean
          escalated_at?: string | null
          escalation_reason?: string | null
          created_at?: string
          updated_at?: string
          lease_id?: string
          reported_by_id?: string
          resolved_by_id?: string | null
          handled_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'disputes_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disputes_reported_by_id_fkey'
            columns: ['reported_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disputes_resolved_by_id_fkey'
            columns: ['resolved_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'disputes_handled_by_id_fkey'
            columns: ['handled_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      facial_verifications: {
        Row: {
          uuid: string
          user_id: string
          provider: string
          document_id: string | null
          selfie_url: string | null
          status: string
          matching_score: number | null
          is_match: boolean | null
          is_live: boolean | null
          provider_response: unknown | null
          failure_reason: string | null
          created_at: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          uuid?: string
          user_id: string
          provider: string
          document_id?: string | null
          selfie_url?: string | null
          status?: string
          matching_score?: number | null
          is_match?: boolean | null
          is_live?: boolean | null
          provider_response?: unknown | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          uuid?: string
          user_id?: string
          provider?: string
          document_id?: string | null
          selfie_url?: string | null
          status?: string
          matching_score?: number | null
          is_match?: boolean | null
          is_live?: boolean | null
          provider_response?: unknown | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'facial_verifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      fraud_alerts: {
        Row: {
          id: string
          status: string
          description: string
          auto_detected: boolean
          resolution: string | null
          created_at: string
          updated_at: string
          suspect_id: string
          reporter_id: string
        }
        Insert: {
          id?: string
          status?: string
          description: string
          auto_detected?: boolean
          resolution?: string | null
          created_at?: string
          updated_at?: string
          suspect_id: string
          reporter_id: string
        }
        Update: {
          id?: string
          status?: string
          description?: string
          auto_detected?: boolean
          resolution?: string | null
          created_at?: string
          updated_at?: string
          suspect_id?: string
          reporter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fraud_alerts_suspect_id_fkey'
            columns: ['suspect_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fraud_alerts_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      inventory_report_items: {
        Row: {
          id: string
          designation: string
          designation_order: number
          kitchen: string | null
          main_bathroom: string | null
          other_bathroom: string | null
          other_room1: string | null
          other_room2: string | null
          observations: string | null
          report_id: string
        }
        Insert: {
          id?: string
          designation: string
          designation_order: number
          kitchen?: string | null
          main_bathroom?: string | null
          other_bathroom?: string | null
          other_room1?: string | null
          other_room2?: string | null
          observations?: string | null
          report_id: string
        }
        Update: {
          id?: string
          designation?: string
          designation_order?: number
          kitchen?: string | null
          main_bathroom?: string | null
          other_bathroom?: string | null
          other_room1?: string | null
          other_room2?: string | null
          observations?: string | null
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_report_items_report_id_fkey'
            columns: ['report_id']
            isOneToOne: false
            referencedRelation: 'inventory_reports'
            referencedColumns: ['id']
          }
        ]
      }
      inventory_reports: {
        Row: {
          id: string
          type: string
          status: string
          completed_at: string | null
          owner_signed_at: string | null
          tenant_signed_at: string | null
          general_observations: string | null
          total_keys: number | null
          created_at: string
          updated_at: string
          property_id: string
          reviewer_id: string
          lease_id: string | null
        }
        Insert: {
          id?: string
          type: string
          status?: string
          completed_at?: string | null
          owner_signed_at?: string | null
          tenant_signed_at?: string | null
          general_observations?: string | null
          total_keys?: number | null
          created_at?: string
          updated_at?: string
          property_id: string
          reviewer_id: string
          lease_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          completed_at?: string | null
          owner_signed_at?: string | null
          tenant_signed_at?: string | null
          general_observations?: string | null
          total_keys?: number | null
          created_at?: string
          updated_at?: string
          property_id?: string
          reviewer_id?: string
          lease_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_reports_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_reports_reviewer_id_fkey'
            columns: ['reviewer_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_reports_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          }
        ]
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
          contract_url: string | null
          cryptoneo_operation_id: string | null
          renewal_status: string | null
          renewal_requested_at: string | null
          renewal_notes: string | null
          renewed_lease_id: string | null
          reminder_sent_at: string | null
          renewal_reminder_sent_at: string | null
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
          contract_url?: string | null
          cryptoneo_operation_id?: string | null
          renewal_status?: string | null
          renewal_requested_at?: string | null
          renewal_notes?: string | null
          renewed_lease_id?: string | null
          reminder_sent_at?: string | null
          renewal_reminder_sent_at?: string | null
        }
        Update: {
          id?: string
          status?: string
          start_date?: string
          end_date?: string
          monthly_rent?: number
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
          property_id?: string
          tenant_id?: string
          owner_id?: string
          rental_file_id?: string
          contract_url?: string | null
          cryptoneo_operation_id?: string | null
          renewal_status?: string | null
          renewal_requested_at?: string | null
          renewal_notes?: string | null
          renewed_lease_id?: string | null
          reminder_sent_at?: string | null
          renewal_reminder_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'leases_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_rental_file_id_fkey'
            columns: ['rental_file_id']
            isOneToOne: false
            referencedRelation: 'rental_files'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'leases_renewed_lease_id_fkey'
            columns: ['renewed_lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          }
        ]
      }
      maintenance_comments: {
        Row: {
          id: string
          content: string
          created_at: string
          maintenance_request_id: string
          author_id: string
        }
        Insert: {
          id?: string
          content: string
          created_at?: string
          maintenance_request_id: string
          author_id: string
        }
        Update: {
          id?: string
          content?: string
          created_at?: string
          maintenance_request_id?: string
          author_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_comments_maintenance_request_id_fkey'
            columns: ['maintenance_request_id']
            isOneToOne: false
            referencedRelation: 'maintenance_requests'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_comments_author_id_fkey'
            columns: ['author_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      maintenance_requests: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          images: string
          scheduled_at: string | null
          resolution: string | null
          created_at: string
          updated_at: string
          lease_id: string
          tenant_id: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          status?: string
          priority?: string
          images?: string
          scheduled_at?: string | null
          resolution?: string | null
          created_at?: string
          updated_at?: string
          lease_id: string
          tenant_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: string
          priority?: string
          images?: string
          scheduled_at?: string | null
          resolution?: string | null
          created_at?: string
          updated_at?: string
          lease_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'maintenance_requests_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
          contract_url: string | null
          owner_signature_image: string | null
          agency_signature_image: string | null
          cryptoneo_operation_id: string | null
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
          contract_url?: string | null
          owner_signature_image?: string | null
          agency_signature_image?: string | null
          cryptoneo_operation_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          commission_rate?: number
          commission_type?: string
          fixed_commission?: number | null
          start_date?: string
          end_date?: string
          conditions?: string | null
          owner_signed_at?: string | null
          agency_signed_at?: string | null
          terminated_at?: string | null
          termination_reason?: string | null
          created_at?: string
          updated_at?: string
          property_id?: string
          owner_id?: string
          agency_id?: string
          contract_url?: string | null
          owner_signature_image?: string | null
          agency_signature_image?: string | null
          cryptoneo_operation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mandats_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mandats_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mandats_agency_id_fkey'
            columns: ['agency_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      message_attachments: {
        Row: {
          id: string
          message_id: string
          file_name: string
          file_type: string
          file_size: number
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_name: string
          file_type: string
          file_size: number
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          url?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'message_attachments_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'messages'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          content?: string
          is_read?: boolean
          created_at?: string
          conversation_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      mission_access_tokens: {
        Row: {
          id: string
          mission_id: string
          token_hash: string
          channel: string
          expires_at: string
          opened_at: string | null
          submitted_at: string | null
          revoked_at: string | null
          user_agent: string | null
          created_by: string
          created_at: string
          last_used_at: string | null
        }
        Insert: {
          id?: string
          mission_id: string
          token_hash: string
          channel?: string
          expires_at: string
          opened_at?: string | null
          submitted_at?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          created_by: string
          created_at?: string
          last_used_at?: string | null
        }
        Update: {
          id?: string
          mission_id?: string
          token_hash?: string
          channel?: string
          expires_at?: string
          opened_at?: string | null
          submitted_at?: string | null
          revoked_at?: string | null
          user_agent?: string | null
          created_by?: string
          created_at?: string
          last_used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mission_access_tokens_mission_id_fkey'
            columns: ['mission_id']
            isOneToOne: false
            referencedRelation: 'missions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mission_access_tokens_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      missions: {
        Row: {
          id: string
          type: string
          status: string
          priority: string
          notes: string | null
          report_url: string | null
          photo_urls: string
          scheduled_at: string
          completed_at: string | null
          feedback: string | null
          created_at: string
          updated_at: string
          property_id: string
          agent_id: string
          tc_id: string
          inventory_report_id: string | null
        }
        Insert: {
          id?: string
          type: string
          status?: string
          priority?: string
          notes?: string | null
          report_url?: string | null
          photo_urls?: string
          scheduled_at: string
          completed_at?: string | null
          feedback?: string | null
          created_at?: string
          updated_at?: string
          property_id: string
          agent_id: string
          tc_id: string
          inventory_report_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          status?: string
          priority?: string
          notes?: string | null
          report_url?: string | null
          photo_urls?: string
          scheduled_at?: string
          completed_at?: string | null
          feedback?: string | null
          created_at?: string
          updated_at?: string
          property_id?: string
          agent_id?: string
          tc_id?: string
          inventory_report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'missions_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_agent_id_fkey'
            columns: ['agent_id']
            isOneToOne: false
            referencedRelation: 'verification_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_tc_id_fkey'
            columns: ['tc_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'missions_inventory_report_id_fkey'
            columns: ['inventory_report_id']
            isOneToOne: true
            referencedRelation: 'inventory_reports'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          user_id?: string
          messages?: boolean
          dossier_updates?: boolean
          visit_reminders?: boolean
          payment_alerts?: boolean
          promotions?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          action_url?: string | null
          entity_id?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      oneci_verifications: {
        Row: {
          id: string
          user_id: string
          method: string
          status: string
          score: number | null
          provider_response: unknown | null
          failure_reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          method: string
          status: string
          score?: number | null
          provider_response?: unknown | null
          failure_reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          method?: string
          status?: string
          score?: number | null
          provider_response?: unknown | null
          failure_reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'oneci_verifications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      otp_codes: {
        Row: {
          id: string
          phone: string | null
          email: string | null
          code: string
          type: Database['public']['Enums']['otp_type']
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
          type: Database['public']['Enums']['otp_type']
          expires_at: string
          is_used?: boolean
          created_at?: string
          user_id: string
        }
        Update: {
          id?: string
          phone?: string | null
          email?: string | null
          code?: string
          type?: Database['public']['Enums']['otp_type']
          expires_at?: string
          is_used?: boolean
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'otp_codes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
          property_id: string | null
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
          property_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          url?: string
          name?: string
          status?: string
          tc_comment?: string | null
          created_at?: string
          owner_file_id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'owner_file_documents_owner_file_id_fkey'
            columns: ['owner_file_id']
            isOneToOne: false
            referencedRelation: 'owner_files'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'owner_file_documents_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
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
          owner_id?: string
          reviewed_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'owner_files_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'owner_files_reviewed_by_id_fkey'
            columns: ['reviewed_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      ownership_documents: {
        Row: {
          id: string
          type: string
          url: string
          name: string
          status: string
          tc_comment: string | null
          created_at: string
          owner_id: string
          reviewed_by_id: string | null
          property_id: string | null
        }
        Insert: {
          id?: string
          type: string
          url: string
          name: string
          status?: string
          tc_comment?: string | null
          created_at?: string
          owner_id: string
          reviewed_by_id?: string | null
          property_id?: string | null
        }
        Update: {
          id?: string
          type?: string
          url?: string
          name?: string
          status?: string
          tc_comment?: string | null
          created_at?: string
          owner_id?: string
          reviewed_by_id?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ownership_documents_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ownership_documents_reviewed_by_id_fkey'
            columns: ['reviewed_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ownership_documents_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      payment_attempts: {
        Row: {
          id: string
          payment_id: string
          amount: number
          method: string | null
          operator_transaction_id: string | null
          partner_transaction_id: string | null
          status: string
          failure_reason: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          payment_id: string
          amount: number
          method?: string | null
          operator_transaction_id?: string | null
          partner_transaction_id?: string | null
          status?: string
          failure_reason?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          payment_id?: string
          amount?: number
          method?: string | null
          operator_transaction_id?: string | null
          partner_transaction_id?: string | null
          status?: string
          failure_reason?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payment_attempts_payment_id_fkey'
            columns: ['payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          }
        ]
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
          amount_paid: number
          reminder_3d_sent_at: string | null
          reminder_1d_sent_at: string | null
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
          amount_paid?: number
          reminder_3d_sent_at?: string | null
          reminder_1d_sent_at?: string | null
        }
        Update: {
          id?: string
          amount?: number
          status?: string
          due_date?: string
          paid_at?: string | null
          reference?: string | null
          method?: string | null
          operator_transaction_id?: string | null
          operator_phone_number?: string | null
          payment_operator_data?: unknown | null
          created_at?: string
          updated_at?: string
          lease_id?: string
          tenant_id?: string
          amount_paid?: number
          reminder_3d_sent_at?: string | null
          reminder_1d_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payments_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          value: string
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string | null
          updated_at?: string
        }
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
          featured: boolean
          views_count: number
          created_at: string
          updated_at: string
          owner_id: string
          has_balcony: boolean
          has_terrace: boolean
          has_kitchen: boolean
          has_box: boolean
          listing_expires_at: string | null
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
          featured?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
          owner_id: string
          has_balcony?: boolean
          has_terrace?: boolean
          has_kitchen?: boolean
          has_box?: boolean
          listing_expires_at?: string | null
        }
        Update: {
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
          featured?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
          owner_id?: string
          has_balcony?: boolean
          has_terrace?: boolean
          has_kitchen?: boolean
          has_box?: boolean
          listing_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'properties_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
          is_published: boolean
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
          is_published?: boolean
        }
        Update: {
          id?: string
          name?: string
          type?: string
          url?: string
          description?: string | null
          expiry_date?: string | null
          created_at?: string
          updated_at?: string
          property_id?: string
          is_published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'property_documents_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          url?: string
          order?: number
          created_at?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'property_images_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
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
          status: string
          moderated_at: string | null
          moderated_by_id: string | null
          moderation_reason: string | null
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
          status?: string
          moderated_at?: string | null
          moderated_by_id?: string | null
          moderation_reason?: string | null
        }
        Update: {
          id?: string
          score?: number
          comment?: string | null
          reply?: string | null
          replied_at?: string | null
          property_id?: string | null
          created_at?: string
          lease_id?: string
          from_user_id?: string
          to_user_id?: string
          status?: string
          moderated_at?: string | null
          moderated_by_id?: string | null
          moderation_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'ratings_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ratings_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ratings_from_user_id_fkey'
            columns: ['from_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ratings_to_user_id_fkey'
            columns: ['to_user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'ratings_moderated_by_id_fkey'
            columns: ['moderated_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      rent_receipts: {
        Row: {
          id: string
          payment_id: string
          lease_id: string
          receipt_number: string
          period_start: string | null
          period_end: string | null
          amount: number
          currency: string
          tenant_snapshot: unknown | null
          landlord_snapshot: unknown | null
          property_snapshot: unknown | null
          issued_at: string
          created_at: string
        }
        Insert: {
          id?: string
          payment_id: string
          lease_id: string
          receipt_number: string
          period_start?: string | null
          period_end?: string | null
          amount: number
          currency?: string
          tenant_snapshot?: unknown | null
          landlord_snapshot?: unknown | null
          property_snapshot?: unknown | null
          issued_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          payment_id?: string
          lease_id?: string
          receipt_number?: string
          period_start?: string | null
          period_end?: string | null
          amount?: number
          currency?: string
          tenant_snapshot?: unknown | null
          landlord_snapshot?: unknown | null
          property_snapshot?: unknown | null
          issued_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rent_receipts_payment_id_fkey'
            columns: ['payment_id']
            isOneToOne: true
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rent_receipts_lease_id_fkey'
            columns: ['lease_id']
            isOneToOne: false
            referencedRelation: 'leases'
            referencedColumns: ['id']
          }
        ]
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
        Update: {
          id?: string
          type?: string
          url?: string
          name?: string
          status?: string
          tc_comment?: string | null
          created_at?: string
          rental_file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rental_file_documents_rental_file_id_fkey'
            columns: ['rental_file_id']
            isOneToOne: false
            referencedRelation: 'rental_files'
            referencedColumns: ['id']
          }
        ]
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
          file_type: string
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
          file_type?: string
        }
        Update: {
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
          tenant_id?: string
          reviewed_by_id?: string | null
          file_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'rental_files_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'rental_files_reviewed_by_id_fkey'
            columns: ['reviewed_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      search_alerts: {
        Row: {
          id: string
          user_id: string
          name: string
          is_active: boolean
          city: string | null
          property_type: string | null
          min_price: number | null
          max_price: number | null
          search_query: string | null
          last_notified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          is_active?: boolean
          city?: string | null
          property_type?: string | null
          min_price?: number | null
          max_price?: number | null
          search_query?: string | null
          last_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          is_active?: boolean
          city?: string | null
          property_type?: string | null
          min_price?: number | null
          max_price?: number | null
          search_query?: string | null
          last_notified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'search_alerts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      service_usage_logs: {
        Row: {
          id: string
          service_name: string
          provider: string
          status: string
          error_message: string | null
          response_time_ms: number | null
          timestamp: string
          user_id: string | null
          metadata: unknown | null
        }
        Insert: {
          id?: string
          service_name: string
          provider: string
          status: string
          error_message?: string | null
          response_time_ms?: number | null
          timestamp?: string
          user_id?: string | null
          metadata?: unknown | null
        }
        Update: {
          id?: string
          service_name?: string
          provider?: string
          status?: string
          error_message?: string | null
          response_time_ms?: number | null
          timestamp?: string
          user_id?: string | null
          metadata?: unknown | null
        }
        Relationships: [
          {
            foreignKeyName: 'service_usage_logs_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      sessions: {
        Row: {
          id: string
          token: string
          user_id: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          token: string
          user_id: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          token?: string
          user_id?: string
          expires_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      signalements: {
        Row: {
          id: string
          reason: string
          description: string
          status: string
          admin_notes: string | null
          resolution: string | null
          entity_type: string
          entity_id: string
          created_at: string
          updated_at: string
          reporter_id: string
          handled_by_id: string | null
        }
        Insert: {
          id?: string
          reason: string
          description: string
          status?: string
          admin_notes?: string | null
          resolution?: string | null
          entity_type: string
          entity_id: string
          created_at?: string
          updated_at?: string
          reporter_id: string
          handled_by_id?: string | null
        }
        Update: {
          id?: string
          reason?: string
          description?: string
          status?: string
          admin_notes?: string | null
          resolution?: string | null
          entity_type?: string
          entity_id?: string
          created_at?: string
          updated_at?: string
          reporter_id?: string
          handled_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'signalements_reporter_id_fkey'
            columns: ['reporter_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'signalements_handled_by_id_fkey'
            columns: ['handled_by_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      signature_aliases: {
        Row: {
          id: string
          alias_certificat: string
          first_name: string
          last_name: string
          gender: string | null
          email: string
          phone: string | null
          organisation: string | null
          type_piece: string
          hash_piece: string | null
          certificate_data: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          alias_certificat: string
          first_name: string
          last_name: string
          gender?: string | null
          email: string
          phone?: string | null
          organisation?: string | null
          type_piece?: string
          hash_piece?: string | null
          certificate_data?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          alias_certificat?: string
          first_name?: string
          last_name?: string
          gender?: string | null
          email?: string
          phone?: string | null
          organisation?: string | null
          type_piece?: string
          hash_piece?: string | null
          certificate_data?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'signature_aliases_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      users: {
        Row: {
          id: string
          phone: string | null
          email: string
          password_hash: string
          first_name: string
          last_name: string
          role: Database['public']['Enums']['user_role']
          active_role: Database['public']['Enums']['user_role']
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
          id?: string
          phone?: string | null
          email: string
          password_hash: string
          first_name: string
          last_name: string
          role?: Database['public']['Enums']['user_role']
          active_role?: Database['public']['Enums']['user_role']
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
        Update: {
          id?: string
          phone?: string | null
          email?: string
          password_hash?: string
          first_name?: string
          last_name?: string
          role?: Database['public']['Enums']['user_role']
          active_role?: Database['public']['Enums']['user_role']
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
        Relationships: []
      }
      validation_slas: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          submitted_at: string
          deadline_at: string
          completed_at: string | null
          is_overdue: boolean
          created_at: string
          reviewer_id: string | null
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          submitted_at: string
          deadline_at: string
          completed_at?: string | null
          is_overdue?: boolean
          created_at?: string
          reviewer_id?: string | null
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          submitted_at?: string
          deadline_at?: string
          completed_at?: string | null
          is_overdue?: boolean
          created_at?: string
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'validation_slas_reviewer_id_fkey'
            columns: ['reviewer_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      verification_agents: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          tc_id: string
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          tc_id: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          tc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'verification_agents_tc_id_fkey'
            columns: ['tc_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
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
          assigned_agent_id: string | null
          created_at: string
          updated_at: string
          property_id: string
          tenant_id: string
          tenant_rating: number | null
          tenant_review: string | null
          reminder_sent_at: string | null
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
          assigned_agent_id?: string | null
          created_at?: string
          updated_at?: string
          property_id: string
          tenant_id: string
          tenant_rating?: number | null
          tenant_review?: string | null
          reminder_sent_at?: string | null
        }
        Update: {
          id?: string
          visit_type?: string
          requested_date?: string
          time_slot?: string
          status?: string
          counter_date?: string | null
          counter_time_slot?: string | null
          owner_comment?: string | null
          tenant_message?: string | null
          assigned_agent_id?: string | null
          created_at?: string
          updated_at?: string
          property_id?: string
          tenant_id?: string
          tenant_rating?: number | null
          tenant_review?: string | null
          reminder_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_visit_requests_assigned_agent'
            columns: ['assigned_agent_id']
            isOneToOne: false
            referencedRelation: 'agency_agents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visit_requests_property_id_fkey'
            columns: ['property_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'visit_requests_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      agency_agent_role: 'ADMIN' | 'AGENT' | 'READ_ONLY'
      agency_agent_status: 'ACTIVE' | 'INACTIVE'
      certification_status:
    | 'PENDING'
    | 'GRANTED'
    | 'REVOKED'
    | 'EXPIRED'
      certification_type: 'USER_IDENTITY' | 'PROPERTY' | 'AGENCY'
      commission_status: 'PENDING' | 'PAID' | 'CANCELLED'
      dispute_status:
    | 'OPEN'
    | 'IN_REVIEW'
    | 'RESOLVED'
    | 'CLOSED'
      dispute_type:
    | 'UNPAID_RENT'
    | 'PROPERTY_DAMAGE'
    | 'HARASSMENT'
    | 'FRAUD'
    | 'OTHER'
      document_status: 'PENDING' | 'VALIDATED' | 'REJECTED'
      document_type:
    | 'ID_CARD'
    | 'PASSPORT'
    | 'PAY_SLIP'
    | 'EMPLOYMENT_CONTRACT'
    | 'WORK_CERTIFICATE'
    | 'BANK_STATEMENT'
    | 'GUARANTOR_ID'
    | 'GUARANTOR_INCOME_PROOF'
    | 'PROOF_OF_ADDRESS'
    | 'PARENT_ADDRESS_PROOF'
    | 'RCCM_REGISTRATION'
    | 'TAX_DECLARATION'
    | 'SCHOOL_CERTIFICATE'
    | 'SCHOLARSHIP_CERTIFICATE'
    | 'PROPERTY_TITLE'
    | 'UTILITY_BILL'
    | 'BANK_ACCOUNT_DETAILS'
    | 'OTHER'
      dossier_priority: 'NORMAL' | 'HIGH' | 'URGENT'
      employment_type:
    | 'CDI'
    | 'CDD'
    | 'FREELANCE'
    | 'RETIRED'
    | 'OTHER'
      fraud_alert_status:
    | 'OPEN'
    | 'INVESTIGATING'
    | 'CONFIRMED'
    | 'DISMISSED'
      inventory_status:
    | 'DRAFT'
    | 'COMPLETED'
    | 'SIGNED_OWNER'
    | 'SIGNED_TENANT'
    | 'SIGNED_BOTH'
      inventory_type: 'INVENTORY_ENTRANCE' | 'INVENTORY_EXIT'
      lease_status:
    | 'DRAFT'
    | 'PENDING_SIGNATURE'
    | 'ACTIVE'
    | 'TERMINATED'
    | 'EXPIRED'
    | 'CANCELLED'
      maintenance_priority:
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'
    | 'URGENT'
      maintenance_status:
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'RESOLVED'
    | 'CLOSED'
      mandat_status:
    | 'DRAFT'
    | 'PENDING_SIGNATURE'
    | 'ACTIVE'
    | 'TERMINATED'
    | 'EXPIRED'
      mandat_type: 'GESTION_COMPLETE' | 'GESTION_LOCATION' | 'MANDAT_SIMPLE'
      mission_status:
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
      mission_type: 'PROPERTY_VERIFICATION' | 'INVENTORY_REPORT'
      notification_type:
    | 'MESSAGE'
    | 'DOSSIER_UPDATE'
    | 'VISIT_REMINDER'
    | 'PAYMENT_ALERT'
    | 'PROMOTION'
    | 'SYSTEM'
    | 'MISSION_ASSIGNED'
    | 'MISSION_COMPLETED'
    | 'DISPUTE_ASSIGNED'
    | 'DISPUTE_UPDATE'
    | 'PROPERTY_VERIFICATION'
    | 'VERIFICATION_RESULT'
    | 'MAINTENANCE'
    | 'LEASE_UPDATE'
    | 'SECURITY'
    | 'APPLICATION'
    | 'REVIEW'
    | 'FRAUD_ALERT'
    | 'CERTIFICATION'
      otp_type:
    | 'LOGIN'
    | 'EMAIL_VERIFY'
    | 'PASSWORD_RESET'
    | 'BAIL_SIGNATURE'
    | 'EMAIL_CHANGE'
    | 'PHONE_CHANGE'
    | 'PHONE_VERIFY'
      ownership_doc_type:
    | 'TITRE_FONCIER'
    | 'ACTE_NOTARIE'
    | 'ATTESTATION_PROPRIETE'
    | 'RCCM'
    | 'AGREMENT'
      payment_method:
    | 'ORANGE_MONEY'
    | 'MTN_MOMO'
    | 'MOOV_MONEY'
    | 'WAVE'
      payment_status:
    | 'PENDING'
    | 'PAID'
    | 'LATE'
    | 'PARTIAL'
    | 'CANCELLED'
    | 'PROCESSING'
      property_doc_type:
    | 'DIAGNOSTIC_DPE'
    | 'DIAGNOSTIC_AMIANTE'
    | 'DIAGNOSTIC_PLOMB'
    | 'DIAGNOSTIC_GAZ'
    | 'DIAGNOSTIC_ELECTRICITE'
    | 'DIAGNOSTIC_ERP'
    | 'ASSURANCE_HABITATION'
    | 'ASSURANCE_RC'
    | 'PERMIS_CONSTRUIRE'
    | 'ATTESTATION_CONFORMITE'
    | 'PLAN_BATIMENT'
    | 'AUTRE'
      property_status:
    | 'DRAFT'
    | 'PENDING_VERIFICATION'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'CLOSED'
    | 'RENTED'
      property_type:
    | 'APPARTEMENT'
    | 'MAISON'
    | 'STUDIO'
    | 'DUPLEX'
    | 'PENTHOUSE'
    | 'VILLA'
      rental_file_status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'TC_REVIEW'
    | 'VALIDATED'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'EXPIRED'
      rental_file_type: 'STANDARD' | 'FAMILLE' | 'COLOCATION'
      rental_status: 'disponible' | 'loue' | 'reserve'
      room_condition: 'BON' | 'MAUVAIS'
      signalement_reason:
    | 'INAPPROPRIATE_CONTENT'
    | 'FRAUD'
    | 'SPAM'
    | 'HARASSMENT'
    | 'FALSE_INFORMATION'
    | 'OTHER'
      signalement_status:
    | 'PENDING'
    | 'IN_REVIEW'
    | 'VALIDATED'
    | 'REJECTED'
    | 'ESCALATED'
    | 'RESOLVED'
      tenant_category: 'SALARIE' | 'ENTREPRENEUR' | 'ETUDIANT'
      user_role:
    | 'LOCATAIRE'
    | 'PROPRIETAIRE'
    | 'AGENCE'
    | 'ADMIN'
    | 'TIERS_CONFIANCE'
      validation_sla_entity_type: 'RENTAL_FILE' | 'OWNER_PROFILE' | 'AGENCY'
      visit_request_status:
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'COUNTER_PROPOSED'
    | 'COMPLETED'
    | 'CANCELLED'
      visit_type: 'PHYSICAL' | 'VIRTUAL'
    }
    CompositeTypes: Record<string, never>
  }
}

// ─── Alias pratiques (compatibilité avec l'ancien fichier hand-written) ─────
export type AgencyAgentRole = Database['public']['Enums']['agency_agent_role']
export type AgencyAgentStatus = Database['public']['Enums']['agency_agent_status']
export type CertificationStatus = Database['public']['Enums']['certification_status']
export type CertificationType = Database['public']['Enums']['certification_type']
export type CommissionStatus = Database['public']['Enums']['commission_status']
export type DisputeStatus = Database['public']['Enums']['dispute_status']
export type DisputeType = Database['public']['Enums']['dispute_type']
export type DocumentStatus = Database['public']['Enums']['document_status']
export type DocumentType = Database['public']['Enums']['document_type']
export type DossierPriority = Database['public']['Enums']['dossier_priority']
export type EmploymentType = Database['public']['Enums']['employment_type']
export type FraudAlertStatus = Database['public']['Enums']['fraud_alert_status']
export type InventoryStatus = Database['public']['Enums']['inventory_status']
export type InventoryType = Database['public']['Enums']['inventory_type']
export type LeaseStatus = Database['public']['Enums']['lease_status']
export type MaintenancePriority = Database['public']['Enums']['maintenance_priority']
export type MaintenanceStatus = Database['public']['Enums']['maintenance_status']
export type MandatStatus = Database['public']['Enums']['mandat_status']
export type MandatType = Database['public']['Enums']['mandat_type']
export type MissionStatus = Database['public']['Enums']['mission_status']
export type MissionType = Database['public']['Enums']['mission_type']
export type NotificationType = Database['public']['Enums']['notification_type']
export type OtpType = Database['public']['Enums']['otp_type']
export type OwnershipDocType = Database['public']['Enums']['ownership_doc_type']
export type PaymentMethod = Database['public']['Enums']['payment_method']
export type PaymentStatus = Database['public']['Enums']['payment_status']
export type PropertyDocType = Database['public']['Enums']['property_doc_type']
export type PropertyStatus = Database['public']['Enums']['property_status']
export type PropertyType = Database['public']['Enums']['property_type']
export type RentalFileStatus = Database['public']['Enums']['rental_file_status']
export type RentalFileType = Database['public']['Enums']['rental_file_type']
export type RentalStatus = Database['public']['Enums']['rental_status']
export type RoomCondition = Database['public']['Enums']['room_condition']
export type SignalementReason = Database['public']['Enums']['signalement_reason']
export type SignalementStatus = Database['public']['Enums']['signalement_status']
export type TenantCategory = Database['public']['Enums']['tenant_category']
export type UserRole = Database['public']['Enums']['user_role']
export type ValidationSlaEntityType = Database['public']['Enums']['validation_sla_entity_type']
export type VisitRequestStatus = Database['public']['Enums']['visit_request_status']
export type VisitType = Database['public']['Enums']['visit_type']
