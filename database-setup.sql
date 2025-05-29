-- Создание таблицы для трекинговых ссылок
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  source VARCHAR(100) NOT NULL,
  medium VARCHAR(100),
  campaign VARCHAR(100),
  content VARCHAR(100),
  term VARCHAR(100),
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для источников трафика пользователей
CREATE TABLE IF NOT EXISTS user_traffic_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tracking_link_id UUID REFERENCES tracking_links(id) ON DELETE SET NULL,
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_content VARCHAR(100),
  utm_term VARCHAR(100),
  referrer_url TEXT,
  referrer_category VARCHAR(50),
  first_visit_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_source ON tracking_links(source);
CREATE INDEX IF NOT EXISTS idx_user_traffic_sources_user_id ON user_traffic_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_user_traffic_sources_tracking_link_id ON user_traffic_sources(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_user_traffic_sources_category ON user_traffic_sources(referrer_category);
CREATE INDEX IF NOT EXISTS idx_user_traffic_sources_created_at ON user_traffic_sources(created_at);

-- Триггер для автоматического обновления updated_at в tracking_links
CREATE OR REPLACE FUNCTION update_tracking_links_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tracking_links_timestamp
BEFORE UPDATE ON tracking_links
FOR EACH ROW
EXECUTE FUNCTION update_tracking_links_timestamp();

-- RLS (Row Level Security) политики
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_traffic_sources ENABLE ROW LEVEL SECURITY;

-- Политика для tracking_links - полный доступ для аутентифицированных пользователей
CREATE POLICY "tracking_links_policy" ON tracking_links
FOR ALL USING (auth.role() = 'authenticated');

-- Политика для user_traffic_sources - полный доступ для аутентифицированных пользователей
CREATE POLICY "user_traffic_sources_policy" ON user_traffic_sources
FOR ALL USING (auth.role() = 'authenticated');

-- Комментарии к таблицам
COMMENT ON TABLE tracking_links IS 'Таблица для хранения трекинговых ссылок с UTM-параметрами';
COMMENT ON TABLE user_traffic_sources IS 'Таблица для хранения информации об источниках трафика пользователей';

-- Комментарии к колонкам
COMMENT ON COLUMN tracking_links.code IS 'Уникальный код для идентификации ссылки';
COMMENT ON COLUMN tracking_links.source IS 'UTM источник (utm_source)';
COMMENT ON COLUMN tracking_links.medium IS 'UTM канал (utm_medium)';
COMMENT ON COLUMN tracking_links.campaign IS 'UTM кампания (utm_campaign)';
COMMENT ON COLUMN tracking_links.content IS 'UTM контент (utm_content)';
COMMENT ON COLUMN tracking_links.term IS 'UTM ключевое слово (utm_term)';

COMMENT ON COLUMN user_traffic_sources.referrer_category IS 'Категория источника: Поиск, Соцсети, Прямые переходы, Рефералы, Другие';
COMMENT ON COLUMN user_traffic_sources.first_visit_at IS 'Время первого посещения с данными UTM-параметрами'; 