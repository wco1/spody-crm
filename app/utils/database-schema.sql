-- Таблица для трекинговых ссылок
CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL,
  medium TEXT NOT NULL,
  campaign TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_tracking_links_short_code ON tracking_links(short_code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_source ON tracking_links(source);
CREATE INDEX IF NOT EXISTS idx_tracking_links_created_at ON tracking_links(created_at);

-- Таблица для отслеживания кликов по ссылкам
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_link_id UUID REFERENCES tracking_links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для таблицы кликов
CREATE INDEX IF NOT EXISTS idx_link_clicks_tracking_link_id ON link_clicks(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_user_id ON link_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);

-- Добавляем поле metadata в таблицу profiles для хранения UTM параметров
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Индекс для поиска по метаданным
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON profiles USING GIN(metadata);

-- Функция для автоматического обновления conversion_rate
CREATE OR REPLACE FUNCTION update_tracking_link_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tracking_links 
  SET conversion_rate = CASE 
    WHEN clicks > 0 THEN (conversions::DECIMAL / clicks::DECIMAL) * 100 
    ELSE 0 
  END
  WHERE id = NEW.tracking_link_id OR id = OLD.tracking_link_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления conversion_rate
DROP TRIGGER IF EXISTS trigger_update_conversion_rate ON link_clicks;
CREATE TRIGGER trigger_update_conversion_rate
  AFTER INSERT OR UPDATE OR DELETE ON link_clicks
  FOR EACH ROW
  EXECUTE FUNCTION update_tracking_link_conversion_rate();

-- RLS политики для tracking_links
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Администраторы могут управлять трекинговыми ссылками" ON tracking_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Все могут читать активные трекинговые ссылки" ON tracking_links
  FOR SELECT USING (is_active = true);

-- RLS политики для link_clicks
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Администраторы могут просматривать все клики" ON link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Все могут добавлять клики" ON link_clicks
  FOR INSERT WITH CHECK (true);

-- Представление для аналитики источников
CREATE OR REPLACE VIEW user_sources_analytics AS
SELECT 
  COALESCE(metadata->>'utm_source', 'Прямые переходы') as source,
  COALESCE(metadata->>'utm_medium', 'direct') as medium,
  COALESCE(metadata->>'utm_campaign', '') as campaign,
  COUNT(*) as users_count,
  COUNT(CASE WHEN last_seen_at > created_at + INTERVAL '1 day' THEN 1 END) as returned_users,
  AVG(EXTRACT(EPOCH FROM (COALESCE(last_seen_at, NOW()) - created_at)) / 86400) as avg_lifetime_days
FROM profiles
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 
  COALESCE(metadata->>'utm_source', 'Прямые переходы'),
  COALESCE(metadata->>'utm_medium', 'direct'),
  COALESCE(metadata->>'utm_campaign', '');

-- Представление для LTV аналитики
CREATE OR REPLACE VIEW ltv_analytics AS
WITH user_stats AS (
  SELECT 
    p.id,
    p.created_at,
    p.last_seen_at,
    COUNT(m.id) as messages_count,
    COUNT(DISTINCT c.id) as conversations_count,
    EXTRACT(EPOCH FROM (COALESCE(p.last_seen_at, NOW()) - p.created_at)) / 86400 as lifetime_days
  FROM profiles p
  LEFT JOIN messages m ON m.user_id = p.id
  LEFT JOIN conversations c ON c.user_id = p.id
  WHERE p.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY p.id, p.created_at, p.last_seen_at
)
SELECT 
  AVG(messages_count) as avg_messages_per_user,
  AVG(lifetime_days) as avg_lifetime_days,
  AVG(messages_count * (lifetime_days / 30)) as avg_ltv,
  COUNT(CASE WHEN messages_count >= 3 THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100 as conversion_to_active,
  COUNT(CASE WHEN lifetime_days > 1 THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL * 100 as conversion_to_return
FROM user_stats; 