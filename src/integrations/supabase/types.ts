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
          id: string
          num_children: number
          payment_status: string | null
          preferred_language: string | null
          request_expires_at: string | null
          request_sent_at: string | null
          sitter_hourly_rate: number | null
          sitter_id: string | null
          sitter_name: string | null
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
          id?: string
          num_children: number
          payment_status?: string | null
          preferred_language?: string | null
          request_expires_at?: string | null
          request_sent_at?: string | null
          sitter_hourly_rate?: number | null
          sitter_id?: string | null
          sitter_name?: string | null
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
          id?: string
          num_children?: number
          payment_status?: string | null
          preferred_language?: string | null
          request_expires_at?: string | null
          request_sent_at?: string | null
          sitter_hourly_rate?: number | null
          sitter_id?: string | null
          sitter_name?: string | null
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
          address: string
          children_ages: string
          created_at: string
          emergency_contact: string | null
          first_name: string
          id: string
          last_name: string
          num_children: number
          phone: string
          special_needs: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          children_ages: string
          created_at?: string
          emergency_contact?: string | null
          first_name: string
          id?: string
          last_name: string
          num_children: number
          phone: string
          special_needs?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          children_ages?: string
          created_at?: string
          emergency_contact?: string | null
          first_name?: string
          id?: string
          last_name?: string
          num_children?: number
          phone?: string
          special_needs?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
