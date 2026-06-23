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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      churches: {
        Row: {
          code: string | null
          created_at: string
          created_by: string | null
          id: string
          location: string | null
          name: string
          pastor_name: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name: string
          pastor_name?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          location?: string | null
          name?: string
          pastor_name?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          report_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          report_id: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          report_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_attachments_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          active_cell_leaders: number | null
          active_members: number | null
          approved_at: string | null
          approved_by: string | null
          avg_cell_attendance: number | null
          cell_meetings_held: number | null
          children_attendance: number | null
          church_id: string | null
          created_at: string
          department_id: string | null
          female_attendance: number | null
          first_timers: number | null
          follow_ups: number | null
          holy_ghost_receivers: number | null
          id: string
          male_attendance: number | null
          month: number | null
          new_converts: number | null
          notes: string | null
          num_cells: number | null
          num_outreaches: number | null
          offering_amount: number | null
          outreach_programs: number | null
          partnership_amount: number | null
          prayer_meetings: number | null
          programs_held: number | null
          rejection_reason: string | null
          report_date: string
          reporting_period: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          souls_reached: number | null
          souls_won: number | null
          special_events: number | null
          special_giving: number | null
          status: Database["public"]["Enums"]["report_status"]
          submitted_at: string | null
          submitted_by: string
          total_attendance: number | null
          unit_id: string | null
          updated_at: string
          week_number: number | null
          year: number
        }
        Insert: {
          active_cell_leaders?: number | null
          active_members?: number | null
          approved_at?: string | null
          approved_by?: string | null
          avg_cell_attendance?: number | null
          cell_meetings_held?: number | null
          children_attendance?: number | null
          church_id?: string | null
          created_at?: string
          department_id?: string | null
          female_attendance?: number | null
          first_timers?: number | null
          follow_ups?: number | null
          holy_ghost_receivers?: number | null
          id?: string
          male_attendance?: number | null
          month?: number | null
          new_converts?: number | null
          notes?: string | null
          num_cells?: number | null
          num_outreaches?: number | null
          offering_amount?: number | null
          outreach_programs?: number | null
          partnership_amount?: number | null
          prayer_meetings?: number | null
          programs_held?: number | null
          rejection_reason?: string | null
          report_date?: string
          reporting_period?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          souls_reached?: number | null
          souls_won?: number | null
          special_events?: number | null
          special_giving?: number | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          submitted_by: string
          total_attendance?: number | null
          unit_id?: string | null
          updated_at?: string
          week_number?: number | null
          year: number
        }
        Update: {
          active_cell_leaders?: number | null
          active_members?: number | null
          approved_at?: string | null
          approved_by?: string | null
          avg_cell_attendance?: number | null
          cell_meetings_held?: number | null
          children_attendance?: number | null
          church_id?: string | null
          created_at?: string
          department_id?: string | null
          female_attendance?: number | null
          first_timers?: number | null
          follow_ups?: number | null
          holy_ghost_receivers?: number | null
          id?: string
          male_attendance?: number | null
          month?: number | null
          new_converts?: number | null
          notes?: string | null
          num_cells?: number | null
          num_outreaches?: number | null
          offering_amount?: number | null
          outreach_programs?: number | null
          partnership_amount?: number | null
          prayer_meetings?: number | null
          programs_held?: number | null
          rejection_reason?: string | null
          report_date?: string
          reporting_period?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          souls_reached?: number | null
          souls_won?: number | null
          special_events?: number | null
          special_giving?: number | null
          status?: Database["public"]["Enums"]["report_status"]
          submitted_at?: string | null
          submitted_by?: string
          total_attendance?: number | null
          unit_id?: string | null
          updated_at?: string
          week_number?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "reports_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          church_id: string | null
          code: string | null
          created_at: string
          department_id: string
          id: string
          leader_name: string | null
          name: string
          updated_at: string
        }
        Insert: {
          church_id?: string | null
          code?: string | null
          created_at?: string
          department_id: string
          id?: string
          leader_name?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          church_id?: string | null
          code?: string | null
          created_at?: string
          department_id?: string
          id?: string
          leader_name?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "units_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_assignments: {
        Row: {
          church_id: string | null
          created_at: string
          department_id: string | null
          id: string
          scope: Database["public"]["Enums"]["assignment_scope"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          church_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          scope: Database["public"]["Enums"]["assignment_scope"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          church_id?: string | null
          created_at?: string
          department_id?: string | null
          id?: string
          scope?: Database["public"]["Enums"]["assignment_scope"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_assignments_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assignments_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_assignments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_sub_admin: { Args: { _user_id: string }; Returns: boolean }
      user_church_ids: { Args: { _user_id: string }; Returns: string[] }
      user_department_ids: { Args: { _user_id: string }; Returns: string[] }
      user_unit_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "main_admin" | "sub_admin" | "submitter"
      assignment_scope: "church" | "department" | "unit"
      report_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
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
      app_role: ["main_admin", "sub_admin", "submitter"],
      assignment_scope: ["church", "department", "unit"],
      report_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
    },
  },
} as const
