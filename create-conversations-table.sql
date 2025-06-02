-- Создание таблицы conversations для staging базы
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Новая беседа',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_model_id ON conversations(model_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);

-- RLS политики
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Пользователи могут управлять своими беседами" ON conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Администраторы могут просматривать все беседы" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  ); 