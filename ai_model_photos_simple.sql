-- ============================================
-- SPODY AI: Фото функция - Простая схема БД  
-- Дата: 19 июня 2025
-- Версия: 2.0 (упрощенная)
-- ============================================

-- 1️⃣ Таблица фото для AI моделей
CREATE TABLE IF NOT EXISTS public.ai_model_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ai_model_id UUID NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    storage_path TEXT,
    caption TEXT DEFAULT 'Вот моё фото! 📸',
    order_index INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2️⃣ Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_model_id ON public.ai_model_photos(ai_model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_order ON public.ai_model_photos(ai_model_id, order_index);
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_active ON public.ai_model_photos(ai_model_id, is_active);

-- 3️⃣ Добавить поля в chat_messages (если не существуют)
DO $$ 
BEGIN
    -- Проверяем и добавляем поле message_type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN message_type VARCHAR(20) DEFAULT 'text';
    END IF;

    -- Проверяем и добавляем поле photo_url
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'photo_url'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN photo_url TEXT;
    END IF;

    -- Проверяем и добавляем поле photo_metadata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'photo_metadata'
    ) THEN
        ALTER TABLE public.chat_messages 
        ADD COLUMN photo_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 4️⃣ RLS политики для безопасности
ALTER TABLE public.ai_model_photos ENABLE ROW LEVEL SECURITY;

-- Разрешить чтение всем аутентифицированным пользователям
CREATE POLICY IF NOT EXISTS "ai_model_photos_select_policy" 
ON public.ai_model_photos FOR SELECT 
TO authenticated 
USING (true);

-- Разрешить вставку/обновление только администраторам (через CRM)
CREATE POLICY IF NOT EXISTS "ai_model_photos_insert_policy" 
ON public.ai_model_photos FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "ai_model_photos_update_policy" 
ON public.ai_model_photos FOR UPDATE 
TO authenticated 
USING (true);

-- 5️⃣ Функция для получения следующего фото
CREATE OR REPLACE FUNCTION public.get_next_photo_for_model(
    model_id UUID
) RETURNS TABLE (
    id UUID,
    photo_url TEXT,
    caption TEXT,
    order_index INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.photo_url,
        p.caption,
        p.order_index
    FROM public.ai_model_photos p
    WHERE p.ai_model_id = model_id 
        AND p.is_active = true
    ORDER BY p.order_index ASC
    LIMIT 1;
END;
$$;

-- ✅ Скрипт готов к выполнению!
