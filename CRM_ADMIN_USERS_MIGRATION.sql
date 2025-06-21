-- ============================================================================
-- CRM ADMIN USERS MIGRATION
-- Создание системы авторизации для Spody CRM
-- Дата: 21.06.2025
-- ============================================================================

-- Создаем таблицу админских пользователей CRM
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Включаем Row Level Security для безопасности
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Создаем политику: только админы могут управлять админами
CREATE POLICY "Only admins can manage admin users" ON public.admin_users
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

-- Комментарии для документации
COMMENT ON TABLE public.admin_users IS 'Таблица администраторов CRM системы Spody';
COMMENT ON COLUMN public.admin_users.user_id IS 'Ссылка на пользователя в auth.users';
COMMENT ON COLUMN public.admin_users.email IS 'Email администратора (дублирует из auth для удобства)';
COMMENT ON COLUMN public.admin_users.role IS 'Роль администратора (admin, super_admin и т.д.)';
COMMENT ON COLUMN public.admin_users.is_active IS 'Активен ли аккаунт администратора';

-- Вставляем первого супер-админа (замените на ваш email)
-- ВАЖНО: Раскомментируйте и измените email на ваш реальный email
/*
INSERT INTO public.admin_users (user_id, email, role, is_active, created_by)
SELECT 
  id as user_id,
  email,
  'super_admin' as role,
  true as is_active,
  id as created_by
FROM auth.users 
WHERE email = 'your-admin-email@example.com'  -- ЗАМЕНИТЕ НА ВАШ EMAIL
ON CONFLICT (email) DO NOTHING;
*/

-- Проверяем результат
SELECT 
  'admin_users table created successfully' as status,
  COUNT(*) as admin_count
FROM public.admin_users; 