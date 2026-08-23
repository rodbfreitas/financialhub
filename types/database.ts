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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          active: boolean
          bank_connection_id: string | null
          created_at: string
          currency: string
          current_balance: number
          deleted_at: string | null
          external_account_id: string | null
          household_id: string
          id: string
          institution_name: string | null
          name: string
          profile_id: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          bank_connection_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          external_account_id?: string | null
          household_id: string
          id?: string
          institution_name?: string | null
          name: string
          profile_id: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          bank_connection_id?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          external_account_id?: string | null
          household_id?: string
          id?: string
          institution_name?: string | null
          name?: string
          profile_id?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_accounts_bank_connection"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_accounts_external_account"
            columns: ["external_account_id"]
            isOneToOne: false
            referencedRelation: "external_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          current_value: number
          household_id: string
          id: string
          name: string
          profile_id: string | null
          type: string
          updated_at: string
          valuation_date: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          household_id: string
          id?: string
          name: string
          profile_id?: string | null
          type: string
          updated_at?: string
          valuation_date?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          household_id?: string
          id?: string
          name?: string
          profile_id?: string | null
          type?: string
          updated_at?: string
          valuation_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          household_id: string | null
          id: string
          ip_hash: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          household_id?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          household_id?: string | null
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_connections: {
        Row: {
          consent_expires_at: string | null
          created_at: string
          household_id: string
          id: string
          institution_id: string | null
          institution_name: string
          last_sync_at: string | null
          next_sync_at: string | null
          profile_id: string | null
          provider: string
          provider_connection_id: string
          status: Database["public"]["Enums"]["bank_connection_status"]
          updated_at: string
        }
        Insert: {
          consent_expires_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          institution_id?: string | null
          institution_name: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          profile_id?: string | null
          provider?: string
          provider_connection_id: string
          status?: Database["public"]["Enums"]["bank_connection_status"]
          updated_at?: string
        }
        Update: {
          consent_expires_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          institution_id?: string | null
          institution_name?: string
          last_sync_at?: string | null
          next_sync_at?: string | null
          profile_id?: string | null
          provider?: string
          provider_connection_id?: string
          status?: Database["public"]["Enums"]["bank_connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_connections_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_items: {
        Row: {
          budget_id: string
          category_id: string
          created_at: string
          id: string
          planned_amount: number
          subcategory_id: string | null
        }
        Insert: {
          budget_id: string
          category_id: string
          created_at?: string
          id?: string
          planned_amount: number
          subcategory_id?: string | null
        }
        Update: {
          budget_id?: string
          category_id?: string
          created_at?: string
          id?: string
          planned_amount?: number
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budget_performance"
            referencedColumns: ["budget_id"]
          },
          {
            foreignKeyName: "budget_items_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          end_date: string
          household_id: string
          id: string
          name: string
          period_type: Database["public"]["Enums"]["budget_period_type"]
          profile_id: string | null
          start_date: string
          total_limit: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          household_id: string
          id?: string
          name: string
          period_type?: Database["public"]["Enums"]["budget_period_type"]
          profile_id?: string | null
          start_date: string
          total_limit?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          household_id?: string
          id?: string
          name?: string
          period_type?: Database["public"]["Enums"]["budget_period_type"]
          profile_id?: string | null
          start_date?: string
          total_limit?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          display_order: number
          household_id: string
          icon: string | null
          id: string
          is_system: boolean
          name: string
          type: Database["public"]["Enums"]["transaction_type"] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_order?: number
          household_id: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_order?: number
          household_id?: string
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      categorization_rules: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          household_id: string
          id: string
          match_type: Database["public"]["Enums"]["match_type"]
          match_value: string
          priority: number
          subcategory_id: string | null
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          household_id: string
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          match_value: string
          priority?: number
          subcategory_id?: string | null
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          household_id?: string
          id?: string
          match_type?: Database["public"]["Enums"]["match_type"]
          match_value?: string
          priority?: number
          subcategory_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorization_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categorization_rules_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_card_bills: {
        Row: {
          closing_date: string
          created_at: string
          credit_card_id: string
          due_date: string
          external_id: string | null
          household_id: string
          id: string
          reference_month: string
          status: Database["public"]["Enums"]["credit_card_bill_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          closing_date: string
          created_at?: string
          credit_card_id: string
          due_date: string
          external_id?: string | null
          household_id: string
          id?: string
          reference_month: string
          status?: Database["public"]["Enums"]["credit_card_bill_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          closing_date?: string
          created_at?: string
          credit_card_id?: string
          due_date?: string
          external_id?: string | null
          household_id?: string
          id?: string
          reference_month?: string
          status?: Database["public"]["Enums"]["credit_card_bill_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_card_bills_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_card_bills_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_cards: {
        Row: {
          active: boolean
          bank_connection_id: string | null
          brand: string | null
          closing_day: number
          created_at: string
          credit_limit: number | null
          deleted_at: string | null
          due_day: number
          external_card_id: string | null
          household_id: string
          id: string
          institution_name: string | null
          last_four_digits: string | null
          name: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bank_connection_id?: string | null
          brand?: string | null
          closing_day: number
          created_at?: string
          credit_limit?: number | null
          deleted_at?: string | null
          due_day: number
          external_card_id?: string | null
          household_id: string
          id?: string
          institution_name?: string | null
          last_four_digits?: string | null
          name: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bank_connection_id?: string | null
          brand?: string | null
          closing_day?: number
          created_at?: string
          credit_limit?: number | null
          deleted_at?: string | null
          due_day?: number
          external_card_id?: string | null
          household_id?: string
          id?: string
          institution_name?: string | null
          last_four_digits?: string | null
          name?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_cards_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_cards_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_credit_cards_bank_connection"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_credit_cards_external_account"
            columns: ["external_card_id"]
            isOneToOne: false
            referencedRelation: "external_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_event_evidence: {
        Row: {
          created_at: string
          document_id: string
          id: string
          interpreted_event_id: string
          role: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          interpreted_event_id: string
          role?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          interpreted_event_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_event_evidence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_event_evidence_interpreted_event_id_fkey"
            columns: ["interpreted_event_id"]
            isOneToOne: false
            referencedRelation: "interpreted_financial_events"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          created_at: string
          height: number | null
          id: string
          page_number: number
          raw_text: string | null
          run_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          page_number: number
          raw_text?: string | null
          run_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          page_number?: number
          raw_text?: string | null
          run_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "document_processing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string
          error_code: string | null
          error_detail: Json | null
          extractor_model: string | null
          extractor_provider: string | null
          household_id: string
          id: string
          interpreter_model: string | null
          interpreter_provider: string | null
          metrics: Json | null
          pipeline_version: string
          run_number: number
          started_at: string | null
          status: Database["public"]["Enums"]["document_processing_run_status"]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id: string
          error_code?: string | null
          error_detail?: Json | null
          extractor_model?: string | null
          extractor_provider?: string | null
          household_id: string
          id?: string
          interpreter_model?: string | null
          interpreter_provider?: string | null
          metrics?: Json | null
          pipeline_version?: string
          run_number?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["document_processing_run_status"]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string
          error_code?: string | null
          error_detail?: Json | null
          extractor_model?: string | null
          extractor_provider?: string | null
          household_id?: string
          id?: string
          interpreter_model?: string | null
          interpreter_provider?: string | null
          metrics?: Json | null
          pipeline_version?: string
          run_number?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["document_processing_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_runs_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      document_review_decisions: {
        Row: {
          created_at: string
          decided_by: string | null
          decision_action: string
          document_id: string | null
          household_id: string
          id: string
          interpreted_event_id: string | null
          notes: string | null
          reconciliation_candidate_id: string | null
        }
        Insert: {
          created_at?: string
          decided_by?: string | null
          decision_action: string
          document_id?: string | null
          household_id: string
          id?: string
          interpreted_event_id?: string | null
          notes?: string | null
          reconciliation_candidate_id?: string | null
        }
        Update: {
          created_at?: string
          decided_by?: string | null
          decision_action?: string
          document_id?: string | null
          household_id?: string
          id?: string
          interpreted_event_id?: string | null
          notes?: string | null
          reconciliation_candidate_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_review_decisions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_review_decisions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_review_decisions_interpreted_event_id_fkey"
            columns: ["interpreted_event_id"]
            isOneToOne: false
            referencedRelation: "interpreted_financial_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_review_decisions_reconciliation_candidate_id_fkey"
            columns: ["reconciliation_candidate_id"]
            isOneToOne: false
            referencedRelation: "reconciliation_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      external_accounts: {
        Row: {
          bank_connection_id: string
          created_at: string
          id: string
          metadata: Json | null
          name: string
          provider_account_id: string
          type: string
        }
        Insert: {
          bank_connection_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          provider_account_id: string
          type: string
        }
        Update: {
          bank_connection_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          provider_account_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_accounts_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      external_transactions: {
        Row: {
          bank_connection_id: string
          household_id: string
          id: string
          normalized_hash: string | null
          processed_at: string | null
          provider_transaction_id: string
          raw_payload: Json
          received_at: string
        }
        Insert: {
          bank_connection_id: string
          household_id: string
          id?: string
          normalized_hash?: string | null
          processed_at?: string | null
          provider_transaction_id: string
          raw_payload: Json
          received_at?: string
        }
        Update: {
          bank_connection_id?: string
          household_id?: string
          id?: string
          normalized_hash?: string | null
          processed_at?: string | null
          provider_transaction_id?: string
          raw_payload?: Json
          received_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_transactions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_entities: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string
          entity_type: Database["public"]["Enums"]["extracted_entity_type"]
          id: string
          metadata: Json | null
          normalized_value: string | null
          raw_value: string
          run_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id: string
          entity_type: Database["public"]["Enums"]["extracted_entity_type"]
          id?: string
          metadata?: Json | null
          normalized_value?: string | null
          raw_value: string
          run_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string
          entity_type?: Database["public"]["Enums"]["extracted_entity_type"]
          id?: string
          metadata?: Json | null
          normalized_value?: string | null
          raw_value?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_entities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_entities_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "document_processing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_financial_events: {
        Row: {
          created_at: string
          direction: string | null
          document_id: string
          extraction_confidence: number | null
          household_id: string
          id: string
          parsed_amount: number | null
          parsed_date: string | null
          raw_amount: string | null
          raw_date: string | null
          raw_description: string | null
          raw_payload: Json | null
          run_id: string
          source_bbox: Json | null
          source_event_index: number
          source_page: number | null
        }
        Insert: {
          created_at?: string
          direction?: string | null
          document_id: string
          extraction_confidence?: number | null
          household_id: string
          id?: string
          parsed_amount?: number | null
          parsed_date?: string | null
          raw_amount?: string | null
          raw_date?: string | null
          raw_description?: string | null
          raw_payload?: Json | null
          run_id: string
          source_bbox?: Json | null
          source_event_index: number
          source_page?: number | null
        }
        Update: {
          created_at?: string
          direction?: string | null
          document_id?: string
          extraction_confidence?: number | null
          household_id?: string
          id?: string
          parsed_amount?: number | null
          parsed_date?: string | null
          raw_amount?: string | null
          raw_date?: string | null
          raw_description?: string | null
          raw_payload?: Json | null
          run_id?: string
          source_bbox?: Json | null
          source_event_index?: number
          source_page?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extracted_financial_events_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_financial_events_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_financial_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "document_processing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_documents: {
        Row: {
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          file_size_bytes: number
          household_id: string
          id: string
          import_id: string | null
          institution_name: string | null
          mime_type: string
          original_filename: string
          profile_id: string | null
          sha256: string
          status: Database["public"]["Enums"]["financial_document_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_size_bytes: number
          household_id: string
          id?: string
          import_id?: string | null
          institution_name?: string | null
          mime_type: string
          original_filename: string
          profile_id?: string | null
          sha256: string
          status?: Database["public"]["Enums"]["financial_document_status"]
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          file_size_bytes?: number
          household_id?: string
          id?: string
          import_id?: string | null
          institution_name?: string | null
          mime_type?: string
          original_filename?: string
          profile_id?: string | null
          sha256?: string
          status?: Database["public"]["Enums"]["financial_document_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_documents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_documents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_event_relations: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          household_id: string
          id: string
          metadata: Json | null
          relation_type: Database["public"]["Enums"]["reconciliation_relation_type"]
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          household_id: string
          id?: string
          metadata?: Json | null
          relation_type: Database["public"]["Enums"]["reconciliation_relation_type"]
          source_entity_id: string
          source_entity_type: string
          target_entity_id: string
          target_entity_type: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          household_id?: string
          id?: string
          metadata?: Json | null
          relation_type?: Database["public"]["Enums"]["reconciliation_relation_type"]
          source_entity_id?: string
          source_entity_type?: string
          target_entity_id?: string
          target_entity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_event_relations_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_goals: {
        Row: {
          created_at: string
          current_amount: number
          description: string | null
          household_id: string
          id: string
          monthly_contribution: number | null
          name: string
          profile_id: string | null
          status: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_amount?: number
          description?: string | null
          household_id: string
          id?: string
          monthly_contribution?: number | null
          name: string
          profile_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount: number
          target_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_amount?: number
          description?: string | null
          household_id?: string
          id?: string
          monthly_contribution?: number | null
          name?: string
          profile_id?: string | null
          status?: Database["public"]["Enums"]["goal_status"]
          target_amount?: number
          target_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_goals_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["household_role"]
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          household_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["household_role"]
          status: Database["public"]["Enums"]["household_member_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["household_member_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["household_role"]
          status?: Database["public"]["Enums"]["household_member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          default_currency: string
          deleted_at: string | null
          id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          deleted_at?: string | null
          id?: string
          name: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          deleted_at?: string | null
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_rows: {
        Row: {
          confidence_score: number | null
          created_at: string
          duplicate_candidate_id: string | null
          id: string
          import_id: string
          parsed_amount: number | null
          parsed_date: string | null
          parsed_description: string | null
          raw_data: Json
          status: Database["public"]["Enums"]["import_row_status"]
          suggested_category_id: string | null
          suggested_profile_id: string | null
          validation_errors: Json | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          duplicate_candidate_id?: string | null
          id?: string
          import_id: string
          parsed_amount?: number | null
          parsed_date?: string | null
          parsed_description?: string | null
          raw_data: Json
          status?: Database["public"]["Enums"]["import_row_status"]
          suggested_category_id?: string | null
          suggested_profile_id?: string | null
          validation_errors?: Json | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          duplicate_candidate_id?: string | null
          id?: string
          import_id?: string
          parsed_amount?: number | null
          parsed_date?: string | null
          parsed_description?: string | null
          raw_data?: Json
          status?: Database["public"]["Enums"]["import_row_status"]
          suggested_category_id?: string | null
          suggested_profile_id?: string | null
          validation_errors?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_duplicate_candidate_id_fkey"
            columns: ["duplicate_candidate_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_suggested_profile_id_fkey"
            columns: ["suggested_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          account_id: string | null
          column_mapping: Json | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          credit_card_id: string | null
          duplicate_rows: number
          error_rows: number
          filename: string
          household_id: string
          id: string
          imported_rows: number
          raw_headers: Json | null
          source_type: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string | null
          total_rows: number
          valid_rows: number
        }
        Insert: {
          account_id?: string | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          credit_card_id?: string | null
          duplicate_rows?: number
          error_rows?: number
          filename: string
          household_id: string
          id?: string
          imported_rows?: number
          raw_headers?: Json | null
          source_type: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          total_rows?: number
          valid_rows?: number
        }
        Update: {
          account_id?: string | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          credit_card_id?: string | null
          duplicate_rows?: number
          error_rows?: number
          filename?: string
          household_id?: string
          id?: string
          imported_rows?: number
          raw_headers?: Json | null
          source_type?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          total_rows?: number
          valid_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "imports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          description: string
          household_id: string
          id: string
          installment_count: number
          profile_id: string
          start_date: string
          subcategory_id: string | null
          total_amount: number
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description: string
          household_id: string
          id?: string
          installment_count: number
          profile_id: string
          start_date: string
          subcategory_id?: string | null
          total_amount: number
        }
        Update: {
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string
          household_id?: string
          id?: string
          installment_count?: number
          profile_id?: string
          start_date?: string
          subcategory_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreted_financial_events: {
        Row: {
          account_id_suggested: string | null
          amount: number | null
          category_id_suggested: string | null
          created_at: string
          credit_card_id_suggested: string | null
          effective_date: string | null
          event_type: Database["public"]["Enums"]["financial_event_type"]
          extracted_event_id: string
          id: string
          installment_current: number | null
          installment_total: number | null
          interpretation_confidence: number | null
          interpretation_version: number
          is_current: boolean
          merchant_normalized: string | null
          profile_id_suggested: string | null
          reason_codes: Json | null
          subcategory_id_suggested: string | null
        }
        Insert: {
          account_id_suggested?: string | null
          amount?: number | null
          category_id_suggested?: string | null
          created_at?: string
          credit_card_id_suggested?: string | null
          effective_date?: string | null
          event_type?: Database["public"]["Enums"]["financial_event_type"]
          extracted_event_id: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          interpretation_confidence?: number | null
          interpretation_version?: number
          is_current?: boolean
          merchant_normalized?: string | null
          profile_id_suggested?: string | null
          reason_codes?: Json | null
          subcategory_id_suggested?: string | null
        }
        Update: {
          account_id_suggested?: string | null
          amount?: number | null
          category_id_suggested?: string | null
          created_at?: string
          credit_card_id_suggested?: string | null
          effective_date?: string | null
          event_type?: Database["public"]["Enums"]["financial_event_type"]
          extracted_event_id?: string
          id?: string
          installment_current?: number | null
          installment_total?: number | null
          interpretation_confidence?: number | null
          interpretation_version?: number
          is_current?: boolean
          merchant_normalized?: string | null
          profile_id_suggested?: string | null
          reason_codes?: Json | null
          subcategory_id_suggested?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interpreted_financial_events_account_id_suggested_fkey"
            columns: ["account_id_suggested"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreted_financial_events_category_id_suggested_fkey"
            columns: ["category_id_suggested"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreted_financial_events_credit_card_id_suggested_fkey"
            columns: ["credit_card_id_suggested"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreted_financial_events_extracted_event_id_fkey"
            columns: ["extracted_event_id"]
            isOneToOne: false
            referencedRelation: "extracted_financial_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreted_financial_events_profile_id_suggested_fkey"
            columns: ["profile_id_suggested"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreted_financial_events_subcategory_id_suggested_fkey"
            columns: ["subcategory_id_suggested"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          created_at: string
          current_balance: number
          due_date: string | null
          household_id: string
          id: string
          interest_rate: number | null
          name: string
          profile_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_balance?: number
          due_date?: string | null
          household_id: string
          id?: string
          interest_rate?: number | null
          name: string
          profile_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          due_date?: string | null
          household_id?: string
          id?: string
          interest_rate?: number | null
          name?: string
          profile_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_snapshots: {
        Row: {
          created_at: string
          household_id: string
          id: string
          net_worth: number
          snapshot_date: string
          total_accounts: number
          total_assets: number
          total_credit_card_debt: number
          total_liabilities: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          net_worth?: number
          snapshot_date?: string
          total_accounts?: number
          total_assets?: number
          total_credit_card_debt?: number
          total_liabilities?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          net_worth?: number
          snapshot_date?: string
          total_accounts?: number
          total_assets?: number
          total_credit_card_debt?: number
          total_liabilities?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "net_worth_snapshots_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          household_id: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      processing_artifacts: {
        Row: {
          artifact_type: string
          content: Json | null
          created_at: string
          id: string
          run_id: string
          storage_path: string | null
        }
        Insert: {
          artifact_type: string
          content?: Json | null
          created_at?: string
          id?: string
          run_id: string
          storage_path?: string | null
        }
        Update: {
          artifact_type?: string
          content?: Json | null
          created_at?: string
          id?: string
          run_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processing_artifacts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "document_processing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_access: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_access_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          linked_user_id: string | null
          name: string
          type: Database["public"]["Enums"]["profile_type"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          linked_user_id?: string | null
          name: string
          type: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          linked_user_id?: string | null
          name?: string
          type?: Database["public"]["Enums"]["profile_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_candidates: {
        Row: {
          candidate_id: string
          candidate_type: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          evidence: Json | null
          household_id: string
          id: string
          interpreted_event_id: string
          relation_type_suggested: Database["public"]["Enums"]["reconciliation_relation_type"]
          score: number
          score_version: number
          status: Database["public"]["Enums"]["reconciliation_candidate_status"]
        }
        Insert: {
          candidate_id: string
          candidate_type: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          evidence?: Json | null
          household_id: string
          id?: string
          interpreted_event_id: string
          relation_type_suggested: Database["public"]["Enums"]["reconciliation_relation_type"]
          score: number
          score_version?: number
          status?: Database["public"]["Enums"]["reconciliation_candidate_status"]
        }
        Update: {
          candidate_id?: string
          candidate_type?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          evidence?: Json | null
          household_id?: string
          id?: string
          interpreted_event_id?: string
          relation_type_suggested?: Database["public"]["Enums"]["reconciliation_relation_type"]
          score?: number
          score_version?: number
          status?: Database["public"]["Enums"]["reconciliation_candidate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_candidates_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reconciliation_candidates_interpreted_event_id_fkey"
            columns: ["interpreted_event_id"]
            isOneToOne: false
            referencedRelation: "interpreted_financial_events"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          description: string
          end_date: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          household_id: string
          id: string
          interval: number
          next_occurrence: string
          profile_id: string
          start_date: string
          subcategory_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description: string
          end_date?: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          household_id: string
          id?: string
          interval?: number
          next_occurrence: string
          profile_id: string
          start_date: string
          subcategory_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          description?: string
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          household_id?: string
          id?: string
          interval?: number
          next_occurrence?: string
          profile_id?: string
          start_date?: string
          subcategory_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          active: boolean
          category_id: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category_id: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          account_id: string | null
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          credit_card_id: string | null
          frequency: Database["public"]["Enums"]["recurrence_frequency"]
          household_id: string
          id: string
          name: string
          next_charge_date: string
          profile_id: string
          subcategory_id: string | null
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          household_id: string
          id?: string
          name: string
          next_charge_date: string
          profile_id: string
          subcategory_id?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          credit_card_id?: string | null
          frequency?: Database["public"]["Enums"]["recurrence_frequency"]
          household_id?: string
          id?: string
          name?: string
          next_charge_date?: string
          profile_id?: string
          subcategory_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_evidence_links: {
        Row: {
          created_at: string
          document_id: string
          id: string
          interpreted_event_id: string | null
          transaction_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          interpreted_event_id?: string | null
          transaction_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          interpreted_event_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_evidence_links_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "financial_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_evidence_links_interpreted_event_id_fkey"
            columns: ["interpreted_event_id"]
            isOneToOne: false
            referencedRelation: "interpreted_financial_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_evidence_links_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_splits: {
        Row: {
          amount: number
          category_id: string
          created_at: string
          id: string
          profile_id: string | null
          subcategory_id: string | null
          transaction_id: string
        }
        Insert: {
          amount: number
          category_id: string
          created_at?: string
          id?: string
          profile_id?: string | null
          subcategory_id?: string | null
          transaction_id: string
        }
        Update: {
          amount?: number
          category_id?: string
          created_at?: string
          id?: string
          profile_id?: string | null
          subcategory_id?: string | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_splits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_splits_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          tag_id: string
          transaction_id: string
        }
        Insert: {
          tag_id: string
          transaction_id: string
        }
        Update: {
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          credit_card_bill_id: string | null
          credit_card_id: string | null
          currency: string
          deduplication_hash: string | null
          deleted_at: string | null
          description: string
          external_id: string | null
          external_source: string | null
          household_id: string
          id: string
          import_id: string | null
          installment_number: number | null
          installment_plan_id: string | null
          merchant: string | null
          nature: Database["public"]["Enums"]["transaction_nature"]
          notes: string | null
          profile_id: string
          recurring_transaction_id: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["transaction_status"]
          subcategory_id: string | null
          transaction_date: string
          transfer_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_card_bill_id?: string | null
          credit_card_id?: string | null
          currency?: string
          deduplication_hash?: string | null
          deleted_at?: string | null
          description: string
          external_id?: string | null
          external_source?: string | null
          household_id: string
          id?: string
          import_id?: string | null
          installment_number?: number | null
          installment_plan_id?: string | null
          merchant?: string | null
          nature?: Database["public"]["Enums"]["transaction_nature"]
          notes?: string | null
          profile_id: string
          recurring_transaction_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          subcategory_id?: string | null
          transaction_date: string
          transfer_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_card_bill_id?: string | null
          credit_card_id?: string | null
          currency?: string
          deduplication_hash?: string | null
          deleted_at?: string | null
          description?: string
          external_id?: string | null
          external_source?: string | null
          household_id?: string
          id?: string
          import_id?: string | null
          installment_number?: number | null
          installment_plan_id?: string | null
          merchant?: string | null
          nature?: Database["public"]["Enums"]["transaction_nature"]
          notes?: string | null
          profile_id?: string
          recurring_transaction_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          subcategory_id?: string | null
          transaction_date?: string
          transfer_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transactions_import"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_bill_id_fkey"
            columns: ["credit_card_bill_id"]
            isOneToOne: false
            referencedRelation: "credit_card_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_credit_card_id_fkey"
            columns: ["credit_card_id"]
            isOneToOne: false
            referencedRelation: "credit_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_installment_plan_id_fkey"
            columns: ["installment_plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      budget_performance: {
        Row: {
          budget_id: string | null
          category_id: string | null
          household_id: string | null
          planned_amount: number | null
          profile_id: string | null
          realized_amount: number | null
          subcategory_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      category_spending: {
        Row: {
          category_id: string | null
          category_name: string | null
          household_id: string | null
          month: string | null
          profile_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_cash_flow: {
        Row: {
          balance: number | null
          expenses: number | null
          household_id: string | null
          income: number | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      net_worth_history: {
        Row: {
          as_of_date: string | null
          household_id: string | null
          net_worth: number | null
          total_assets: number | null
          total_liabilities: number | null
        }
        Relationships: []
      }
      profile_spending: {
        Row: {
          expenses: number | null
          household_id: string | null
          income: number | null
          month: string | null
          profile_id: string | null
          profile_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_summary: {
        Row: {
          active_subscriptions: number | null
          annual_cost: number | null
          household_id: string | null
          monthly_cost: number | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_household_invite: { Args: { p_token: string }; Returns: string }
      adjust_account_balance: {
        Args: { p_account_id: string; p_delta: number }
        Returns: {
          active: boolean
          bank_connection_id: string | null
          created_at: string
          currency: string
          current_balance: number
          deleted_at: string | null
          external_account_id: string | null
          household_id: string
          id: string
          institution_name: string | null
          name: string
          profile_id: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_profile: { Args: { p_profile_id: string }; Returns: boolean }
      dashboard_monthly_summary: {
        Args: { p_household_id: string; p_month: string; p_profile_id?: string }
        Returns: {
          balance: number
          budget_limit: number
          budget_realized: number
          credit_card_total: number
          expenses: number
          income: number
          savings_rate: number
        }[]
      }
      get_invite_preview: {
        Args: { p_token: string }
        Returns: {
          email: string
          household_name: string
          role: Database["public"]["Enums"]["household_role"]
        }[]
      }
      has_household_role: {
        Args: {
          p_household_id: string
          p_required_role: Database["public"]["Enums"]["household_role"]
        }
        Returns: boolean
      }
      is_household_member: {
        Args: { p_household_id: string }
        Returns: boolean
      }
      replace_transaction_splits: {
        Args: { p_splits: Json; p_transaction_id: string }
        Returns: {
          amount: number
          category_id: string
          created_at: string
          id: string
          profile_id: string | null
          subcategory_id: string | null
          transaction_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "transaction_splits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      snapshot_net_worth: {
        Args: { p_household_id: string }
        Returns: undefined
      }
      upsert_credit_card_bill_delta: {
        Args: {
          p_closing_date: string
          p_credit_card_id: string
          p_delta: number
          p_due_date: string
          p_household_id: string
          p_reference_month: string
        }
        Returns: {
          closing_date: string
          created_at: string
          credit_card_id: string
          due_date: string
          external_id: string | null
          household_id: string
          id: string
          reference_month: string
          status: Database["public"]["Enums"]["credit_card_bill_status"]
          total_amount: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "credit_card_bills"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      account_type:
        | "checking"
        | "savings"
        | "wallet"
        | "digital"
        | "investment"
        | "other"
      bank_connection_status:
        | "connected"
        | "syncing"
        | "error"
        | "consent_expiring"
        | "disconnected"
      budget_period_type: "monthly" | "custom"
      credit_card_bill_status: "open" | "closed" | "paid" | "overdue"
      document_processing_run_status:
        | "queued"
        | "running"
        | "succeeded"
        | "partial"
        | "failed"
        | "cancelled"
      document_type:
        | "fatura_cartao"
        | "extrato_bancario"
        | "boleto"
        | "comprovante_pagamento"
        | "comprovante_pix"
        | "comprovante_transferencia"
        | "documento_bancario_generico"
        | "documento_desconhecido"
      extracted_entity_type:
        | "institution"
        | "merchant"
        | "person"
        | "account"
        | "credit_card"
        | "bill"
        | "boleto"
        | "identifier"
      financial_document_status:
        | "received"
        | "processing"
        | "ready_for_review"
        | "reviewed"
        | "partial"
        | "failed"
        | "archived"
      financial_event_type:
        | "purchase"
        | "income"
        | "payment"
        | "transfer"
        | "pix_sent"
        | "pix_received"
        | "boleto_payment"
        | "card_payment"
        | "refund"
        | "fee"
        | "interest"
        | "penalty"
        | "yield"
        | "withdrawal"
        | "deposit"
        | "installment"
        | "direct_debit"
        | "unknown"
      goal_status: "in_progress" | "completed" | "paused" | "cancelled"
      household_member_status: "invited" | "active" | "suspended"
      household_role: "owner" | "admin" | "member" | "viewer"
      import_row_status:
        | "pending"
        | "suggested"
        | "confirmed"
        | "ignored"
        | "duplicate"
      import_status:
        | "uploaded"
        | "processing"
        | "review"
        | "confirmed"
        | "completed"
        | "failed"
        | "cancelled"
      match_type: "contains" | "equals" | "starts_with" | "regex"
      profile_type: "individual" | "shared"
      reconciliation_candidate_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "expired"
      reconciliation_relation_type:
        | "DUPLICATE"
        | "RELATED"
        | "SETTLEMENT"
        | "TRANSFER_PAIR"
        | "REFUND"
        | "INSTALLMENT"
        | "BILL_PAYMENT"
      recurrence_frequency:
        | "weekly"
        | "monthly"
        | "quarterly"
        | "semiannual"
        | "annual"
        | "custom"
      transaction_nature: "individual" | "shared"
      transaction_source:
        | "manual"
        | "csv"
        | "xlsx"
        | "ofx"
        | "pdf"
        | "open_finance"
        | "api"
        | "ai"
      transaction_status: "posted" | "pending" | "planned" | "cancelled"
      transaction_type: "income" | "expense" | "transfer" | "adjustment"
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
      account_type: [
        "checking",
        "savings",
        "wallet",
        "digital",
        "investment",
        "other",
      ],
      bank_connection_status: [
        "connected",
        "syncing",
        "error",
        "consent_expiring",
        "disconnected",
      ],
      budget_period_type: ["monthly", "custom"],
      credit_card_bill_status: ["open", "closed", "paid", "overdue"],
      document_processing_run_status: [
        "queued",
        "running",
        "succeeded",
        "partial",
        "failed",
        "cancelled",
      ],
      document_type: [
        "fatura_cartao",
        "extrato_bancario",
        "boleto",
        "comprovante_pagamento",
        "comprovante_pix",
        "comprovante_transferencia",
        "documento_bancario_generico",
        "documento_desconhecido",
      ],
      extracted_entity_type: [
        "institution",
        "merchant",
        "person",
        "account",
        "credit_card",
        "bill",
        "boleto",
        "identifier",
      ],
      financial_document_status: [
        "received",
        "processing",
        "ready_for_review",
        "reviewed",
        "partial",
        "failed",
        "archived",
      ],
      financial_event_type: [
        "purchase",
        "income",
        "payment",
        "transfer",
        "pix_sent",
        "pix_received",
        "boleto_payment",
        "card_payment",
        "refund",
        "fee",
        "interest",
        "penalty",
        "yield",
        "withdrawal",
        "deposit",
        "installment",
        "direct_debit",
        "unknown",
      ],
      goal_status: ["in_progress", "completed", "paused", "cancelled"],
      household_member_status: ["invited", "active", "suspended"],
      household_role: ["owner", "admin", "member", "viewer"],
      import_row_status: [
        "pending",
        "suggested",
        "confirmed",
        "ignored",
        "duplicate",
      ],
      import_status: [
        "uploaded",
        "processing",
        "review",
        "confirmed",
        "completed",
        "failed",
        "cancelled",
      ],
      match_type: ["contains", "equals", "starts_with", "regex"],
      profile_type: ["individual", "shared"],
      reconciliation_candidate_status: [
        "pending",
        "accepted",
        "rejected",
        "expired",
      ],
      reconciliation_relation_type: [
        "DUPLICATE",
        "RELATED",
        "SETTLEMENT",
        "TRANSFER_PAIR",
        "REFUND",
        "INSTALLMENT",
        "BILL_PAYMENT",
      ],
      recurrence_frequency: [
        "weekly",
        "monthly",
        "quarterly",
        "semiannual",
        "annual",
        "custom",
      ],
      transaction_nature: ["individual", "shared"],
      transaction_source: [
        "manual",
        "csv",
        "xlsx",
        "ofx",
        "pdf",
        "open_finance",
        "api",
        "ai",
      ],
      transaction_status: ["posted", "pending", "planned", "cancelled"],
      transaction_type: ["income", "expense", "transfer", "adjustment"],
    },
  },
} as const
