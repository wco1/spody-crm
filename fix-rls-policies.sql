-- Настройка RLS политик для таблиц промптов
-- Выполнить в Supabase SQL Editor

-- 1. Включаем RLS для prompts_templates
ALTER TABLE prompts_templates ENABLE ROW LEVEL SECURITY;

-- 2. Политики для prompts_templates
-- Чтение: все аутентифицированные пользователи
CREATE POLICY "prompts_templates_read" ON prompts_templates 
FOR SELECT 
TO authenticated 
USING (true);

-- Вставка: только аутентифицированные пользователи
CREATE POLICY "prompts_templates_insert" ON prompts_templates 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Обновление: только аутентифицированные пользователи
CREATE POLICY "prompts_templates_update" ON prompts_templates 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Удаление: только аутентифицированные пользователи
CREATE POLICY "prompts_templates_delete" ON prompts_templates 
FOR DELETE 
TO authenticated 
USING (true);

-- 3. Проверяем и обновляем политики для ai_models (если нужно)
-- Чтение ai_models
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_models' AND policyname = 'ai_models_read') THEN
        CREATE POLICY "ai_models_read" ON ai_models 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Обновление ai_models для новых полей
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_models' AND policyname = 'ai_models_update') THEN
        CREATE POLICY "ai_models_update" ON ai_models 
        FOR UPDATE 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 4. Предоставляем права на использование последовательностей (если есть)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 