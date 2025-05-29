-- Создаем таблицу настроек
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_name TEXT NOT NULL DEFAULT 'Spody Admin',
  app_url TEXT NOT NULL DEFAULT 'https://admin.spody.app',
  admin_email TEXT NOT NULL DEFAULT 'admin@spody.app',
  timezone TEXT NOT NULL DEFAULT 'UTC+3',
  enable_logging BOOLEAN NOT NULL DEFAULT true,
  openrouter_key TEXT,
  supabase_url TEXT,
  supabase_key TEXT,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  new_user_notifications BOOLEAN NOT NULL DEFAULT true,
  error_notifications BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  notification_email TEXT,
  db_host TEXT,
  db_name TEXT DEFAULT 'postgres',
  backup_schedule TEXT DEFAULT 'weekly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS settings_id_idx ON settings (id);

-- Создаем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Добавляем Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Создаем политику, чтобы только аутентифицированные пользователи могли читать и изменять настройки
CREATE POLICY "Authenticated users can read settings" 
  ON settings FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" 
  ON settings FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert settings" 
  ON settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Вставляем начальные данные, если таблица пуста
INSERT INTO settings (
  app_name, app_url, admin_email, timezone, enable_logging,
  openrouter_key, supabase_url, supabase_key,
  email_notifications, new_user_notifications, error_notifications, weekly_digest,
  notification_email, db_host, db_name, backup_schedule
)
SELECT 
  'Spody Admin', 'https://admin.spody.app', 'admin@spody.app', 'UTC+3', true,
  'sk-or-v1-1234567890abcdef1234567890abcdef', 'https://kulssuzzjwlyacqvawau.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  true, true, true, false,
  'admin@spody.app', 'kulssuzzjwlyacqvawau.supabase.co', 'postgres', 'weekly'
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1); 