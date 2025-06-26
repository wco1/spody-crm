-- Создание таблицы ai_model_photos если её нет
CREATE TABLE IF NOT EXISTS ai_model_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ai_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  display_order INTEGER DEFAULT 1,
  send_priority INTEGER DEFAULT 0, -- 0 = профиль, >0 = сообщения
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_model_id ON ai_model_photos(ai_model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_send_priority ON ai_model_photos(send_priority);

-- RLS политики
ALTER TABLE ai_model_photos ENABLE ROW LEVEL SECURITY;

-- Политика для чтения
DROP POLICY IF EXISTS "Allow read access to ai_model_photos" ON ai_model_photos;
CREATE POLICY "Allow read access to ai_model_photos" 
ON ai_model_photos FOR SELECT 
USING (true);

-- Политика для вставки/обновления/удаления
DROP POLICY IF EXISTS "Allow full access to ai_model_photos" ON ai_model_photos;
CREATE POLICY "Allow full access to ai_model_photos" 
ON ai_model_photos FOR ALL 
USING (true);
