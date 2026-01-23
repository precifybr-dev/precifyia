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
      fixed_costs: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          value_per_item: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          value_per_item?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          value_per_item?: number
        }
        Relationships: []
      }
      fixed_expenses: {
        Row: {
          created_at: string
          id: string
          monthly_value: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_value?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_value?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          sub_recipe_id?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
          updated_at: string
          user_id: string
          value: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          updated_at?: string
          user_id: string
          value?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          updated_at?: string
          user_id?: string
          value?: number
          year?: number
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
          monthly_revenue: number | null
          onboarding_step: string
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
          monthly_revenue?: number | null
          onboarding_step?: string
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
          monthly_revenue?: number | null
          onboarding_step?: string
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
          suggested_price?: number
          total_cost?: number
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
          total_cost?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string
          yield_quantity?: number
        }
        Relationships: []
      }
      variable_costs: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
          value_per_item: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
          value_per_item?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
          value_per_item?: number
        }
        Relationships: []
      }
      variable_expenses: {
        Row: {
          created_at: string
          id: string
          monthly_value: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_value?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_value?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_recipe: { Args: { _recipe_id: string }; Returns: boolean }
      user_owns_sub_recipe: {
        Args: { _sub_recipe_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
