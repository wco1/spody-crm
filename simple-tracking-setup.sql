-- Простое создание таблиц для трекинга без RLS
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

CREATE TABLE IF NOT EXISTS user_traffic_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
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

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_source ON tracking_links(source);
CREATE INDEX IF NOT EXISTS idx_user_traffic_sources_tracking_link_id ON user_traffic_sources(tracking_link_id);

-- Отключаем RLS для простоты
ALTER TABLE tracking_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_traffic_sources DISABLE ROW LEVEL SECURITY; 