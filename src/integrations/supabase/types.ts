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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      booking_responses: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          message: string | null
          response: string
          sitter_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          message?: string | null
          response: string
          sitter_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          message?: string | null
          response?: string
          sitter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_responses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_responses_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "sitters"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          created_at: string
          end_time: string
          extension_count: number | null
          id: string
          num_children: number
          payment_status: string | null
          preferred_language: string | null
          request_expires_at: string | null
          request_sent_at: string | null
          service_type: string
          sitter_hourly_rate: number | null
          sitter_id: string | null
          special_notes: string | null
          start_time: string
          status: string
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          booking_date: string
          created_at?: string
          end_time: string
          extension_count?: number | null
          id?: string
          num_children: number
          payment_status?: string | null
          preferred_language?: string | null
          request_expires_at?: string | null
          request_sent_at?: string | null
          service_type?: string
          sitter_hourly_rate?: number | null
          sitter_id?: string | null
          special_notes?: string | null
          start_time: string
          status?: string
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          booking_date?: string
          created_at?: string
          end_time?: string
          extension_count?: number | null
          id?: string
          num_children?: number
          payment_status?: string | null
          preferred_language?: string | null
          request_expires_at?: string | null
          request_sent_at?: string | null
          service_type?: string
          sitter_hourly_rate?: number | null
          sitter_id?: string | null
          special_notes?: string | null
          start_time?: string
          status?: string
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      favorite_sitters: {
        Row: {
          created_at: string
          id: string
          sitter_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sitter_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sitter_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          children_ages: string | null
          created_at: string
          emergency_contact: string | null
          first_name: string | null
          id: string
          last_name: string | null
          num_children: number | null
          num_pets: number | null
          pet_details: string | null
          phone: string | null
          special_needs: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          children_ages?: string | null
          created_at?: string
          emergency_contact?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          num_children?: number | null
          num_pets?: number | null
          pet_details?: string | null
          phone?: string | null
          special_needs?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          children_ages?: string | null
          created_at?: string
          emergency_contact?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          num_children?: number | null
          num_pets?: number | null
          pet_details?: string | null
          phone?: string | null
          special_needs?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
          short_name: string | null
          type: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          name: string
          short_name?: string | null
          type?: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
          short_name?: string | null
          type?: string
        }
        Relationships: []
      }
      sitter_unavailable_dates: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          sitter_id: string
          unavailable_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          sitter_id: string
          unavailable_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          sitter_id?: string
          unavailable_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sitter_unavailable_dates_sitter_id_fkey"
            columns: ["sitter_id"]
            isOneToOne: false
            referencedRelation: "sitters"
            referencedColumns: ["id"]
          },
        ]
      }
      sitters: {
        Row: {
          address: string
          approved_at: string | null
          availability: Json | null
          child_age_groups: Json | null
          created_at: string
          date_of_birth: string
          experience: string
          first_name: string
          grade: string
          hourly_rate: number
          id: string
          languages: string[] | null
          last_name: string
          pet_experience: string | null
          phone: string
          reference_contacts: string | null
          school: string
          special_skills: string | null
          status: string
          transportation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          approved_at?: string | null
          availability?: Json | null
          child_age_groups?: Json | null
          created_at?: string
          date_of_birth: string
          experience: string
          first_name: string
          grade: string
          hourly_rate: number
          id?: string
          languages?: string[] | null
          last_name: string
          pet_experience?: string | null
          phone: string
          reference_contacts?: string | null
          school: string
          special_skills?: string | null
          status?: string
          transportation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          approved_at?: string | null
          availability?: Json | null
          child_age_groups?: Json | null
          created_at?: string
          date_of_birth?: string
          experience?: string
          first_name?: string
          grade?: string
          hourly_rate?: number
          id?: string
          languages?: string[] | null
          last_name?: string
          pet_experience?: string | null
          phone?: string
          reference_contacts?: string | null
          school?: string
          special_skills?: string | null
          status?: string
          transportation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_old_booking_requests: { Args: never; Returns: undefined }
      has_booking_with_parent: {
        Args: { _parent_user_id: string; _sitter_user_id: string }
        Returns: boolean
      }
      has_confirmed_booking_with_sitter: {
        Args: { _parent_user_id: string; _sitter_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_booking_owner: {
        Args: { _booking_id: string; _user_id: string }
        Returns: boolean
      }
      is_sitter_for_booking: {
        Args: { _booking_id: string; _sitter_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "parent" | "sitter" | "admin"
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
      app_role: ["parent", "sitter", "admin"],
    },
  },
} as const
