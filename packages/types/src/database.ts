// Generated types for Supabase Database
export interface Database {
  public: {
    Tables: {
      ai_models: {
        Row: {
          id: string
          name: string
          avatar_url: string | null
          bio: string | null
          traits: string[] | null
          genres: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          avatar_url?: string | null
          bio?: string | null
          traits?: string[] | null
          genres?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          avatar_url?: string | null
          bio?: string | null
          traits?: string[] | null
          genres?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          username: string | null
          avatar_url: string | null
          age: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username?: string | null
          avatar_url?: string | null
          age?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string | null
          avatar_url?: string | null
          age?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          user_id: string
          ai_model_id: string
          character_id: string | null
          character_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_model_id: string
          character_id?: string | null
          character_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_model_id?: string
          character_id?: string | null
          character_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string | null
          content: string
          is_user: boolean
          is_system: boolean
          sender: string | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id?: string | null
          content: string
          is_user?: boolean
          is_system?: boolean
          sender?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string | null
          content?: string
          is_user?: boolean
          is_system?: boolean
          sender?: string | null
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          user_id: string
          ai_model_id: string
          liked: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ai_model_id: string
          liked?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ai_model_id?: string
          liked?: boolean
          created_at?: string
        }
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
  }
}

// User roles for RLS
export type UserRole = 'main_app_user' | 'crm_user' | 'admin'

// Client configuration
export interface ClientConfig {
  role: UserRole
  env: 'development' | 'production'
} 