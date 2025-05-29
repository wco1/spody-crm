-- Скрипт для создания таблиц аналитики в Supabase
-- Этот скрипт создаёт необходимые таблицы для работы модуля аналитики

-- Таблица для хранения статистики использования моделей
CREATE TABLE IF NOT EXISTS model_usage_stats (
  id SERIAL PRIMARY KEY,
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  message_count INTEGER NOT NULL DEFAULT 0,
  avg_response_time NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,1) NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для быстрого поиска по model_id
CREATE INDEX IF NOT EXISTS idx_model_usage_stats_model_id ON model_usage_stats(model_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_model_usage_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_model_usage_stats_timestamp ON model_usage_stats;
CREATE TRIGGER update_model_usage_stats_timestamp
BEFORE UPDATE ON model_usage_stats
FOR EACH ROW
EXECUTE FUNCTION update_model_usage_stats_timestamp();

-- Таблица для хранения ежедневной активности пользователей
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  active_users INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  avg_session_time NUMERIC(6,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем уникальный индекс по дате, если его еще нет
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_date_unique ON user_activity(date);

-- Индекс для быстрого поиска по дате
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity(date);

-- Представление для получения статистики за последние 30 дней
CREATE OR REPLACE VIEW last_30_days_activity AS
SELECT * FROM user_activity
WHERE date > (CURRENT_DATE - INTERVAL '30 days')
ORDER BY date ASC;

-- Таблица для сводной аналитики
CREATE TABLE IF NOT EXISTS analytics_summary (
  id SERIAL PRIMARY KEY,
  total_users INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  active_sessions INTEGER NOT NULL DEFAULT 0,
  total_messages INTEGER NOT NULL DEFAULT 0,
  avg_messages_per_user NUMERIC(6,1) NOT NULL DEFAULT 0,
  avg_session_time NUMERIC(6,1) NOT NULL DEFAULT 0,
  registration_rate NUMERIC(5,1) NOT NULL DEFAULT 0,
  retention_rate NUMERIC(5,1) NOT NULL DEFAULT 0,
  bounce_rate NUMERIC(5,1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Обеспечиваем, что в таблице может быть только одна запись
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_summary_singleton ON analytics_summary((id IS NOT NULL));

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_analytics_summary_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_analytics_summary_timestamp ON analytics_summary;
CREATE TRIGGER update_analytics_summary_timestamp
BEFORE UPDATE ON analytics_summary
FOR EACH ROW
EXECUTE FUNCTION update_analytics_summary_timestamp();

-- Добавляем начальные данные, если таблицы пустые
INSERT INTO analytics_summary (id, total_users, new_users, active_sessions, total_messages, 
                              avg_messages_per_user, avg_session_time, registration_rate, 
                              retention_rate, bounce_rate)
SELECT 1, 12458, 1245, 856, 1254879, 101, 754.0, 24.8, 68.3, 31.7
WHERE NOT EXISTS (SELECT 1 FROM analytics_summary);

-- Заполняем тестовыми данными таблицу user_activity за последние 30 дней
DO $$
DECLARE
  i INTEGER;
  current_date DATE := CURRENT_DATE;
  random_active INTEGER;
  random_new INTEGER;
  random_messages INTEGER;
  random_session NUMERIC(6,1);
BEGIN
  -- Проверяем, есть ли уже данные за последние 30 дней
  IF NOT EXISTS (SELECT 1 FROM user_activity WHERE date > (CURRENT_DATE - INTERVAL '30 days') LIMIT 1) THEN
    FOR i IN 1..30 LOOP
      -- Генерируем случайные значения для демонстрации
      random_active := 100 + floor(random() * 300);
      random_new := 10 + floor(random() * 100);
      random_messages := 5000 + floor(random() * 10000);
      random_session := 60.0 + (random() * 300);
      
      -- Вставляем данные
      INSERT INTO user_activity (date, active_users, new_users, total_messages, avg_session_time)
      VALUES (current_date - (i || ' days')::INTERVAL, random_active, random_new, random_messages, random_session);
    END LOOP;
  END IF;
END $$;

-- Заполняем статистику использования моделей из таблицы ai_models
INSERT INTO model_usage_stats (model_id, message_count, avg_response_time, avg_rating, active_users)
SELECT 
  id, 
  floor(random() * 50000) + 5000, -- message_count
  (random() * 2 + 0.5)::NUMERIC(5,2), -- avg_response_time
  (random() * 2 + 3)::NUMERIC(3,1), -- avg_rating
  floor(random() * 2000) + 100 -- active_users
FROM ai_models
WHERE NOT EXISTS (
  SELECT 1 FROM model_usage_stats WHERE model_usage_stats.model_id = ai_models.id
);

-- Создаем политики доступа RLS для таблиц аналитики
-- Политика доступа для просмотра статистики использования моделей
ALTER TABLE model_usage_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read model_usage_stats" ON model_usage_stats;
CREATE POLICY "Admins can read model_usage_stats" 
ON model_usage_stats FOR SELECT 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users
  )
);

-- Политика доступа для просмотра активности пользователей
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read user_activity" ON user_activity;
CREATE POLICY "Admins can read user_activity" 
ON user_activity FOR SELECT 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users
  )
);

-- Политика доступа для просмотра сводной аналитики
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read analytics_summary" ON analytics_summary;
CREATE POLICY "Admins can read analytics_summary" 
ON analytics_summary FOR SELECT 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users
  )
);

-- Примечание: Таблица admin_users должна существовать и содержать список администраторов
-- Если таблица не существует, создаем её
CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем уникальный индекс по user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id); 