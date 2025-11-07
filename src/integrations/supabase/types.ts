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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      matches: {
        Row: {
          chat_request_sender: string | null
          chat_request_status: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_interaction_at: string | null
          match_score: number | null
          matched_on: string
          status: string
          updated_at: string
          user_1: string
          user_2: string
        }
        Insert: {
          chat_request_sender?: string | null
          chat_request_status?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_interaction_at?: string | null
          match_score?: number | null
          matched_on?: string
          status?: string
          updated_at?: string
          user_1: string
          user_2: string
        }
        Update: {
          chat_request_sender?: string | null
          chat_request_status?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_interaction_at?: string | null
          match_score?: number | null
          matched_on?: string
          status?: string
          updated_at?: string
          user_1?: string
          user_2?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user_1_fkey"
            columns: ["user_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user_2_fkey"
            columns: ["user_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          match_id: string
          receiver_id: string
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          match_id: string
          receiver_id: string
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          receiver_id?: string
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          match_id: string | null
          message: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          match_id?: string | null
          message?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          interested_in:
            | Database["public"]["Enums"]["interested_in_type"]
            | null
          interests: string[] | null
          is_profile_complete: boolean | null
          languages: string[] | null
          languages_spoken: string[] | null
          last_name: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          max_age_preference: number | null
          max_distance_preference: number | null
          min_age_preference: number | null
          nickname: string | null
          personality_prompts: Json | null
          phone_number: string | null
          region: string | null
          religion: string | null
          sexual_orientation:
            | Database["public"]["Enums"]["orientation_type"]
            | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          interested_in?:
            | Database["public"]["Enums"]["interested_in_type"]
            | null
          interests?: string[] | null
          is_profile_complete?: boolean | null
          languages?: string[] | null
          languages_spoken?: string[] | null
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_age_preference?: number | null
          max_distance_preference?: number | null
          min_age_preference?: number | null
          nickname?: string | null
          personality_prompts?: Json | null
          phone_number?: string | null
          region?: string | null
          religion?: string | null
          sexual_orientation?:
            | Database["public"]["Enums"]["orientation_type"]
            | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          interested_in?:
            | Database["public"]["Enums"]["interested_in_type"]
            | null
          interests?: string[] | null
          is_profile_complete?: boolean | null
          languages?: string[] | null
          languages_spoken?: string[] | null
          last_name?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_age_preference?: number | null
          max_distance_preference?: number | null
          min_age_preference?: number | null
          nickname?: string | null
          personality_prompts?: Json | null
          phone_number?: string | null
          region?: string | null
          religion?: string | null
          sexual_orientation?:
            | Database["public"]["Enums"]["orientation_type"]
            | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_descriptions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          created_at: string
          id: string
          last_6am_reset: string | null
          last_onboarding_date: string | null
          mood: string
          onboarding_shown_today: boolean | null
          perfect_sunday: string
          selected_memes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_6am_reset?: string | null
          last_onboarding_date?: string | null
          mood: string
          onboarding_shown_today?: boolean | null
          perfect_sunday: string
          selected_memes: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_6am_reset?: string | null
          last_onboarding_date?: string | null
          mood?: string
          onboarding_shown_today?: boolean | null
          perfect_sunday?: string
          selected_memes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_photos: {
        Row: {
          created_at: string | null
          id: string
          is_main: boolean | null
          photo_slot: number
          photo_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_main?: boolean | null
          photo_slot: number
          photo_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_main?: boolean | null
          photo_slot?: number
          photo_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_daily_matches: {
        Args: never
        Returns: {
          matches_created: number
          users_processed: number
          users_skipped_chat_limit: number
        }[]
      }
      get_date_in_timezone: { Args: { user_timezone: string }; Returns: string }
      is_after_6am_in_timezone: {
        Args: { user_timezone: string }
        Returns: boolean
      }
      should_show_onboarding: {
        Args: { user_id_param: string }
        Returns: boolean
      }
    }
    Enums: {
      gender_type: "male" | "female" | "non_binary" | "other"
      interested_in_type: "men" | "women" | "non_binary" | "everyone"
      orientation_type:
        | "straight"
        | "gay"
        | "lesbian"
        | "bisexual"
        | "pansexual"
        | "asexual"
        | "other"
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
      gender_type: ["male", "female", "non_binary", "other"],
      interested_in_type: ["men", "women", "non_binary", "everyone"],
      orientation_type: [
        "straight",
        "gay",
        "lesbian",
        "bisexual",
        "pansexual",
        "asexual",
        "other",
      ],
    },
  },
} as const
