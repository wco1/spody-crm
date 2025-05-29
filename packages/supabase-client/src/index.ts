import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database, ClientConfig, UserRole } from '@spody/types'

// Получаем URL и ключи из переменных окружения
const getSupabaseConfig = () => {
  const url = process.env.REACT_APP_SUPABASE_URL || 
              process.env.NEXT_PUBLIC_SUPABASE_URL ||
              "https://kulssuzzjwlyacqvawau.supabase.co"
              
  const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bHNzdXp6andseWFjcXZhd2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MTg4MDIsImV4cCI6MjA2MTQ5NDgwMn0.pwiWgJY764y1f_4naIDwhUvr-dFAF-jFvkkJRN-TpVw"

  return { url, anonKey }
}

// Создание клиента с конфигурацией
export const createSpodyClient = (config: ClientConfig): SupabaseClient<Database> => {
  const { url, anonKey } = getSupabaseConfig()
  
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: config.role === 'main_app_user',
      autoRefreshToken: true,
      detectSessionInUrl: config.role === 'main_app_user',
      storage: typeof window !== 'undefined' ? localStorage : undefined
    },
    global: {
      headers: {
        'X-Client-Role': config.role,
        'X-Client-Env': config.env,
        'X-Client-Info': config.role === 'main_app_user' ? 'Spody Main App' : 'Spody CRM System'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: config.role === 'crm_user' ? 10 : 5
      }
    }
  })
}

// Предконфигурированные клиенты
export const createMainAppClient = (env: 'development' | 'production' = 'development') => 
  createSpodyClient({ role: 'main_app_user', env })

export const createCrmClient = (env: 'development' | 'production' = 'development') => 
  createSpodyClient({ role: 'crm_user', env })

// Проверка роли пользователя
export const checkUserRole = async (client: SupabaseClient, requiredRole: UserRole): Promise<boolean> => {
  try {
    const { data: { session } } = await client.auth.getSession()
    if (!session) return false
    
    // В реальном приложении здесь будет проверка роли из профиля пользователя
    // Пока возвращаем true для демо
    return true
  } catch {
    return false
  }
}

// Экспорт типов
export type { Database, ClientConfig, UserRole } from '@spody/types' 