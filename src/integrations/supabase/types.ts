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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          target_roles: Database["public"]["Enums"]["app_role"][] | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          target_roles?: Database["public"]["Enums"]["app_role"][] | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          action_type: string
          admin_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          action_type: string
          admin_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          action_type?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      collaborators: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fixed_costs: {
        Row: {
          created_at: string
          id: string
          name: string
          store_id: string | null
          updated_at: string
          user_id: string
          value_per_item: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_id?: string | null
          updated_at?: string
          user_id: string
          value_per_item?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
          value_per_item?: number
        }
        Relationships: [
          {
            foreignKeyName: "fixed_costs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_expenses: {
        Row: {
          created_at: string
          id: string
          monthly_value: number
          name: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_value?: number
          name: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_value?: number
          name?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ifood_import_usage: {
        Row: {
          created_at: string
          id: string
          import_type: string
          imported_count: number
          store_name: string | null
          store_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          import_type: string
          imported_count?: number
          store_name?: string | null
          store_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          import_type?: string
          imported_count?: number
          store_name?: string | null
          store_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          code: number
          color: string | null
          correction_factor: number | null
          created_at: string
          id: string
          is_sub_recipe: boolean | null
          name: string
          purchase_price: number
          purchase_quantity: number
          store_id: string | null
          sub_recipe_id: string | null
          unit: string
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code?: number
          color?: string | null
          correction_factor?: number | null
          created_at?: string
          id?: string
          is_sub_recipe?: boolean | null
          name: string
          purchase_price?: number
          purchase_quantity?: number
          store_id?: string | null
          sub_recipe_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: number
          color?: string | null
          correction_factor?: number | null
          created_at?: string
          id?: string
          is_sub_recipe?: boolean | null
          name?: string
          purchase_price?: number
          purchase_quantity?: number
          store_id?: string | null
          sub_recipe_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_sub_recipe_id_fkey"
            columns: ["sub_recipe_id"]
            isOneToOne: false
            referencedRelation: "sub_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_revenues: {
        Row: {
          created_at: string
          id: string
          month: number
          store_id: string | null
          updated_at: string
          user_id: string
          value: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          store_id?: string | null
          updated_at?: string
          user_id: string
          value?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          store_id?: string | null
          updated_at?: string
          user_id?: string
          value?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_revenues_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string
          currency: string
          expires_at: string | null
          external_id: string | null
          external_url: string | null
          id: string
          paid_at: string | null
          plan_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          paid_at?: string | null
          plan_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          expires_at?: string | null
          external_id?: string | null
          external_url?: string | null
          id?: string
          paid_at?: string | null
          plan_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_events: {
        Row: {
          created_at: string
          event_category: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_category?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_category?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          business_type: string | null
          cost_limit_percent: number | null
          created_at: string
          default_cmv: number | null
          id: string
          ifood_average_ticket: number | null
          ifood_base_rate: number | null
          ifood_coupon_absorber: string | null
          ifood_coupon_type: string | null
          ifood_coupon_value: number | null
          ifood_delivery_absorber: string | null
          ifood_delivery_fee: number | null
          ifood_has_delivery_fee: boolean | null
          ifood_monthly_orders: number | null
          ifood_offers_coupon: boolean | null
          ifood_orders_with_coupon: number | null
          ifood_plan_type: string | null
          ifood_real_percentage: number | null
          last_access_at: string | null
          monthly_revenue: number | null
          onboarding_step: string
          subscription_expires_at: string | null
          subscription_status: string
          tax_regime: string | null
          updated_at: string
          user_id: string
          user_plan: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          cost_limit_percent?: number | null
          created_at?: string
          default_cmv?: number | null
          id?: string
          ifood_average_ticket?: number | null
          ifood_base_rate?: number | null
          ifood_coupon_absorber?: string | null
          ifood_coupon_type?: string | null
          ifood_coupon_value?: number | null
          ifood_delivery_absorber?: string | null
          ifood_delivery_fee?: number | null
          ifood_has_delivery_fee?: boolean | null
          ifood_monthly_orders?: number | null
          ifood_offers_coupon?: boolean | null
          ifood_orders_with_coupon?: number | null
          ifood_plan_type?: string | null
          ifood_real_percentage?: number | null
          last_access_at?: string | null
          monthly_revenue?: number | null
          onboarding_step?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          tax_regime?: string | null
          updated_at?: string
          user_id: string
          user_plan?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          cost_limit_percent?: number | null
          created_at?: string
          default_cmv?: number | null
          id?: string
          ifood_average_ticket?: number | null
          ifood_base_rate?: number | null
          ifood_coupon_absorber?: string | null
          ifood_coupon_type?: string | null
          ifood_coupon_value?: number | null
          ifood_delivery_absorber?: string | null
          ifood_delivery_fee?: number | null
          ifood_has_delivery_fee?: boolean | null
          ifood_monthly_orders?: number | null
          ifood_offers_coupon?: boolean | null
          ifood_orders_with_coupon?: number | null
          ifood_plan_type?: string | null
          ifood_real_percentage?: number | null
          last_access_at?: string | null
          monthly_revenue?: number | null
          onboarding_step?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          tax_regime?: string | null
          updated_at?: string
          user_id?: string
          user_plan?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          cost: number
          created_at: string
          id: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          ingredient_id: string
          quantity: number
          recipe_id: string
          unit?: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          cmv_target: number | null
          cost_per_serving: number
          created_at: string
          id: string
          name: string
          servings: number
          store_id: string | null
          suggested_price: number
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cmv_target?: number | null
          cost_per_serving?: number
          created_at?: string
          id?: string
          name: string
          servings?: number
          store_id?: string | null
          suggested_price?: number
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cmv_target?: number | null
          cost_per_serving?: number
          created_at?: string
          id?: string
          name?: string
          servings?: number
          store_id?: string | null
          suggested_price?: number
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      stores: {
        Row: {
          business_type: string | null
          created_at: string
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          business_type?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          business_type?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sub_recipe_ingredients: {
        Row: {
          cost: number
          created_at: string
          id: string
          ingredient_id: string
          quantity: number
          sub_recipe_id: string
          unit: string
        }
        Insert: {
          cost?: number
          created_at?: string
          id?: string
          ingredient_id: string
          quantity: number
          sub_recipe_id: string
          unit?: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          ingredient_id?: string
          quantity?: number
          sub_recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_recipe_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_recipe_ingredients_sub_recipe_id_fkey"
            columns: ["sub_recipe_id"]
            isOneToOne: false
            referencedRelation: "sub_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_recipes: {
        Row: {
          code: number
          created_at: string
          id: string
          name: string
          store_id: string | null
          total_cost: number
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string
          yield_quantity: number
        }
        Insert: {
          code?: number
          created_at?: string
          id?: string
          name: string
          store_id?: string | null
          total_cost?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id: string
          yield_quantity?: number
        }
        Update: {
          code?: number
          created_at?: string
          id?: string
          name?: string
          store_id?: string | null
          total_cost?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
          yield_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "sub_recipes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      support_abuse_alerts: {
        Row: {
          admin_id: string
          alert_message: string
          alert_type: string
          created_at: string
          id: string
          is_read: boolean | null
          metadata: Json | null
        }
        Insert: {
          admin_id: string
          alert_message: string
          alert_type: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
        }
        Update: {
          admin_id?: string
          alert_message?: string
          alert_type?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          metadata?: Json | null
        }
        Relationships: []
      }
      support_consent: {
        Row: {
          expires_at: string
          granted_at: string
          granted_ip: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          revoked_at: string | null
          ticket_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string
          granted_at?: string
          granted_ip?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          revoked_at?: string | null
          ticket_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string
          granted_at?: string
          granted_ip?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          revoked_at?: string | null
          ticket_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_consent_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_session_logs: {
        Row: {
          access_type: string
          actions_log: Json | null
          admin_id: string
          admin_ip: string | null
          admin_user_agent: string | null
          auto_ended: boolean | null
          consent_id: string | null
          duration_seconds: number | null
          end_reason: string | null
          ended_at: string | null
          id: string
          session_token: string
          started_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          actions_log?: Json | null
          admin_id: string
          admin_ip?: string | null
          admin_user_agent?: string | null
          auto_ended?: boolean | null
          consent_id?: string | null
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          session_token: string
          started_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          actions_log?: Json | null
          admin_id?: string
          admin_ip?: string | null
          admin_user_agent?: string | null
          auto_ended?: boolean | null
          consent_id?: string | null
          duration_seconds?: number | null
          end_reason?: string | null
          ended_at?: string | null
          id?: string
          session_token?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_session_logs_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "support_consent"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          id: string
          message: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          ticket_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          ticket_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          id?: string
          message?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          ticket_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          note: string
          ticket_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          note: string
          ticket_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          note?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          external_id: string | null
          id: string
          payment_method: string | null
          plan_type: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string | null
          status: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          external_id?: string | null
          id?: string
          payment_method?: string | null
          plan_type?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          is_protected: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_protected?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_protected?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_security: {
        Row: {
          created_at: string
          id: string
          last_mfa_code: string | null
          mfa_code_expires_at: string | null
          mfa_enabled: boolean
          mfa_secret: string | null
          mfa_verified: boolean
          must_change_password: boolean
          password_changed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_mfa_code?: string | null
          mfa_code_expires_at?: string | null
          mfa_enabled?: boolean
          mfa_secret?: string | null
          mfa_verified?: boolean
          must_change_password?: boolean
          password_changed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_mfa_code?: string | null
          mfa_code_expires_at?: string | null
          mfa_enabled?: boolean
          mfa_secret?: string | null
          mfa_verified?: boolean
          must_change_password?: boolean
          password_changed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          duration_seconds: number | null
          ended_at: string | null
          events_count: number | null
          id: string
          page_views: number | null
          session_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          duration_seconds?: number | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          page_views?: number | null
          session_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          duration_seconds?: number | null
          ended_at?: string | null
          events_count?: number | null
          id?: string
          page_views?: number | null
          session_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      variable_costs: {
        Row: {
          created_at: string
          id: string
          name: string
          store_id: string | null
          updated_at: string
          user_id: string
          value_per_item: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_id?: string | null
          updated_at?: string
          user_id: string
          value_per_item?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
          value_per_item?: number
        }
        Relationships: [
          {
            foreignKeyName: "variable_costs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      variable_expenses: {
        Row: {
          created_at: string
          id: string
          monthly_value: number
          name: string
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_value?: number
          name: string
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_value?: number
          name?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_metrics: {
        Row: {
          basic_plan_users: number | null
          free_plan_users: number | null
          pro_plan_users: number | null
          total_users: number | null
          users_month: number | null
          users_today: number | null
          users_week: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      count_admin_sessions_today: {
        Args: { _admin_id: string }
        Returns: number
      }
      count_user_stores: { Args: { _user_id: string }; Returns: number }
      current_user_is_master: { Args: never; Returns: boolean }
      get_active_consent: {
        Args: { _user_id: string }
        Returns: {
          consent_id: string
          expires_at: string
          ticket_id: string
        }[]
      }
      get_all_users_admin: {
        Args: never
        Returns: {
          business_name: string
          created_at: string
          email: string
          id: string
          last_access_at: string
          last_sign_in_at: string
          onboarding_step: string
          subscription_expires_at: string
          subscription_status: string
          user_plan: string
        }[]
      }
      get_average_session_duration: {
        Args: never
        Returns: {
          avg_duration_minutes: number
          sessions_today: number
          total_sessions: number
        }[]
      }
      get_churn_risk_users: {
        Args: never
        Returns: {
          business_name: string
          days_since_active: number
          email: string
          last_activity: string
          previous_activity_level: string
          user_id: string
          user_plan: string
        }[]
      }
      get_collaborator_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_daily_active_users: {
        Args: { days_back?: number }
        Returns: {
          active_users: number
          activity_date: string
        }[]
      }
      get_event_stats_by_category: {
        Args: { days_back?: number }
        Returns: {
          event_category: string
          event_count: number
          unique_users: number
        }[]
      }
      get_expiring_users_by_plan: {
        Args: { days_ahead?: number }
        Returns: {
          plan_type: string
          potential_revenue: number
          user_count: number
        }[]
      }
      get_financial_summary: {
        Args: never
        Returns: {
          average_ticket: number
          conversion_rate: number
          failed_links: number
          mrr: number
          paid_links: number
          pending_links: number
          projected_next_month: number
          total_payment_links: number
          total_revenue: number
        }[]
      }
      get_inactive_users: {
        Args: { inactive_days?: number }
        Returns: {
          business_name: string
          days_inactive: number
          email: string
          last_activity: string
          user_id: string
        }[]
      }
      get_most_used_features: {
        Args: { days_back?: number }
        Returns: {
          feature_name: string
          unique_users: number
          usage_count: number
        }[]
      }
      get_mrr_stats: {
        Args: never
        Returns: {
          mrr: number
          plan_type: string
          user_count: number
        }[]
      }
      get_recent_users: {
        Args: { limit_count?: number }
        Returns: {
          business_name: string
          created_at: string
          email: string
          id: string
          onboarding_step: string
          user_plan: string
        }[]
      }
      get_registration_stats: {
        Args: { days_back?: number }
        Returns: {
          registration_date: string
          user_count: number
        }[]
      }
      get_renewal_stats: {
        Args: never
        Returns: {
          expiring_15_days: number
          expiring_30_days: number
          expiring_7_days: number
          expiring_today: number
          potential_revenue_15_days: number
          potential_revenue_30_days: number
          potential_revenue_7_days: number
          potential_revenue_today: number
        }[]
      }
      get_revenue_by_period: {
        Args: { days_back?: number }
        Returns: {
          payment_count: number
          period_date: string
          revenue: number
        }[]
      }
      get_revenue_by_plan: {
        Args: never
        Returns: {
          monthly_revenue: number
          percentage: number
          plan_type: string
          user_count: number
        }[]
      }
      get_usage_by_hour: {
        Args: { days_back?: number }
        Returns: {
          event_count: number
          hour_of_day: number
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_permission"][]
      }
      get_user_security: {
        Args: { _user_id: string }
        Returns: {
          mfa_enabled: boolean
          mfa_verified: boolean
          must_change_password: boolean
        }[]
      }
      has_active_consent: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_collaborator: { Args: { _user_id: string }; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      user_owns_recipe: { Args: { _recipe_id: string }; Returns: boolean }
      user_owns_store: { Args: { _store_id: string }; Returns: boolean }
      user_owns_sub_recipe: {
        Args: { _sub_recipe_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_permission:
        | "view_users"
        | "edit_users"
        | "impersonate_user"
        | "reset_password"
        | "view_financials"
        | "view_metrics"
        | "manage_plans"
        | "respond_support"
        | "manage_collaborators"
        | "view_logs"
      app_role:
        | "user"
        | "admin"
        | "master"
        | "suporte"
        | "financeiro"
        | "analista"
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
      app_permission: [
        "view_users",
        "edit_users",
        "impersonate_user",
        "reset_password",
        "view_financials",
        "view_metrics",
        "manage_plans",
        "respond_support",
        "manage_collaborators",
        "view_logs",
      ],
      app_role: [
        "user",
        "admin",
        "master",
        "suporte",
        "financeiro",
        "analista",
      ],
    },
  },
} as const
