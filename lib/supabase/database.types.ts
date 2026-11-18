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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      article_analyses: {
        Row: {
          article_id: string
          bias_label: string
          bias_score: number | null
          center_percentage: number
          confidence: number
          created_at: string
          disclaimer: string
          framing_notes: string[]
          id: string
          left_percentage: number
          embedding: string | null
          loaded_terms: string[]
          model: string
          right_percentage: number
          sentiment_label: string
          sentiment_score: number
          summary: string
        }
        Insert: {
          article_id: string
          bias_label: string
          bias_score?: number | null
          center_percentage: number
          confidence: number
          created_at?: string
          disclaimer: string
          embedding: string | null
          framing_notes?: string[]
          id?: string
          left_percentage: number
          loaded_terms?: string[]
          model: string
          right_percentage: number
          sentiment_label: string
          sentiment_score: number
          summary: string
        }
        Update: {
          article_id?: string
          bias_label?: string
          bias_score?: number | null
          center_percentage?: number
          confidence?: number
          created_at?: string
          disclaimer?: string
          embedding?: string | null
          framing_notes?: string[]
          id?: string
          left_percentage?: number
          loaded_terms?: string[]
          model?: string
          right_percentage?: number
          sentiment_label?: string
          sentiment_score?: number
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_analyses_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: true
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          analyzed_at: string | null
          canonical_url: string | null
          created_at: string
          id: string
          image_url: string
          original_url: string
          published_at: string
          raw_text: string
          scraped_at: string
          source_id: string
          title: string
        }
        Insert: {
          analyzed_at?: string | null
          canonical_url?: string | null
          created_at?: string
          id?: string
          image_url: string
          original_url: string
          published_at: string
          raw_text: string
          scraped_at?: string
          source_id: string
          title: string
        }
        Update: {
          analyzed_at?: string | null
          canonical_url?: string | null
          created_at?: string
          id?: string
          image_url?: string
          original_url?: string
          published_at?: string
          raw_text?: string
          scraped_at?: string
          source_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          context: Json
          created_at: string
          id: number
          level: string
          message: string
          scope: string
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: never
          level: string
          message: string
          scope: string
        }
        Update: {
          context?: Json
          created_at?: string
          id?: never
          level?: string
          message?: string
          scope?: string
        }
        Relationships: []
      }
      oxylabs_schedule_runs: {
        Row: {
          created_at: string
          id: string
          oxylabs_job_id: string
          oxylabs_run_id: string | null
          processed_at: string | null
          result_status: string
          schedule_id: string
          summary: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          oxylabs_job_id: string
          oxylabs_run_id?: string | null
          processed_at?: string | null
          result_status: string
          schedule_id: string
          summary?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          oxylabs_job_id?: string
          oxylabs_run_id?: string | null
          processed_at?: string | null
          result_status?: string
          schedule_id?: string
          summary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "oxylabs_schedule_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "oxylabs_schedules"
            referencedColumns: ["schedule_id"]
          },
        ]
      }
      oxylabs_schedules: {
        Row: {
          created_at: string
          cron_expression: string
          id: string
          is_active: boolean
          schedule_id: string
          source_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cron_expression: string
          id?: string
          is_active?: boolean
          schedule_id: string
          source_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          id?: string
          is_active?: boolean
          schedule_id?: string
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oxylabs_schedules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: true
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          listing_url: string
          logo_url: string | null
          name: string
          parser_strategy: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          listing_url: string
          logo_url?: string | null
          name: string
          parser_strategy?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          listing_url?: string
          logo_url?: string | null
          name?: string
          parser_strategy?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_related_articles: {
        Args: {
          exclude_article_id: string
          match_count: number
          query_embedding: string
        }
        Returns: {
          id: string
          image_url: string
          published_at: string
          source_name: string
          title: string
        }[]
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
