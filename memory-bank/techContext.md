# Tech Context - Технический контекст Spody

**Обновлено**: 25.06.2025 21:20  
**Статус**: ПОЛНАЯ ТЕХНИЧЕСКАЯ ДОКУМЕНТАЦИЯ + ДЕТАЛЬНАЯ СТРУКТУРА SUPABASE ✅

## 🛠️ Основной стек технологий

### Frontend
- **React 18.2.0** - Основной UI фреймворк
- **React Router 6** - Клиентская маршрутизация  
- **Tailwind CSS 3** - Utility-first CSS фреймворк
- **CSS Custom Properties** - Для темизации
- **React.memo, useMemo, useCallback** - Оптимизация производительности

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL 15+ база данных
  - Row Level Security (RLS)
  - Real-time подписки
  - Authentication
  - File Storage (ai-models-avatars bucket)
- **OpenRouter API** - AI модели и стриминг (`mistralai/mistral-medium-3`)

### Build & Development
- **Create React App** - Сборка и разработка
- **ESLint** - Линтинг кода
- **Git** - Контроль версий
- **Vercel** - Деплой и хостинг

## 🗄️ СТРУКТУРА БАЗЫ ДАННЫХ SUPABASE

### 🔐 Схема аутентификации

#### `auth.users` (Управляется Supabase)
**Назначение**: Основная таблица аутентификации Supabase
```sql
auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMP WITH TIME ZONE,
  phone_confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sign_in_at TIMESTAMP WITH TIME ZONE,
  raw_user_meta_data JSONB,
  raw_app_meta_data JSONB,
  -- другие системные поля Supabase Auth
)
```
**Особенности**:
- Управляется Supabase Auth автоматически
- НЕ `public.users` - это распространенная ошибка
- Email confirmation через `emailRedirectTo`

### 👤 Схема пользователей

#### `public.profiles`
**Назначение**: Профили пользователей приложения
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  preferences JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}', -- UTM параметры, источники трафика
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_metadata ON profiles USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
```

**RLS Политики**:
```sql
-- Пользователи могут управлять своими профилями
CREATE POLICY "users_manage_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Все могут читать активные профили
CREATE POLICY "public_read_active_profiles" ON profiles
  FOR SELECT USING (is_active = true);

-- Администраторы могут управлять всеми профилями  
CREATE POLICY "admins_manage_all_profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );
```

### 🤖 Схема AI моделей

#### `public.ai_models`
**Назначение**: AI персонажи для общения
```sql
CREATE TABLE IF NOT EXISTS public.ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  traits TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  gender VARCHAR(20) DEFAULT 'female' CHECK (gender IN ('male', 'female', 'non_binary')),
  age INTEGER,
  location TEXT,
  interests TEXT[],
  personality_traits TEXT[],
  custom_prompt TEXT, -- Кастомный промпт для AI
  template_prompt TEXT, -- Шаблонный промпт  
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  popularity_score INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  average_rating DECIMAL(3,1) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_ai_models_name ON ai_models(name);
CREATE INDEX IF NOT EXISTS idx_ai_models_gender ON ai_models(gender);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_active ON ai_models(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_models_is_premium ON ai_models(is_premium);
CREATE INDEX IF NOT EXISTS idx_ai_models_popularity ON ai_models(popularity_score);
CREATE INDEX IF NOT EXISTS idx_ai_models_traits ON ai_models USING GIN(traits);
CREATE INDEX IF NOT EXISTS idx_ai_models_genres ON ai_models USING GIN(genres);
```

#### `public.ai_model_photos`
**Назначение**: Фотографии AI моделей (профильные и для сообщений)
```sql
CREATE TABLE IF NOT EXISTS public.ai_model_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  storage_path TEXT, -- путь в Supabase Storage
  display_order INTEGER DEFAULT 0,
  send_priority INTEGER DEFAULT 0, -- 0=профиль, >0=сообщения
  caption TEXT DEFAULT 'Вот моё фото! 📸',
  is_primary BOOLEAN DEFAULT false,
  is_premium_only BOOLEAN DEFAULT false,
  photo_tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Логика разделения фото**:
- `send_priority = 0` - профильные фото (отображение в каталоге)
- `send_priority > 0` - фото для сообщений (кнопка 📷 в чате)

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_model_id ON ai_model_photos(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_send_priority ON ai_model_photos(send_priority);
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_display_order ON ai_model_photos(display_order);
CREATE INDEX IF NOT EXISTS idx_ai_model_photos_is_primary ON ai_model_photos(is_primary);
```

**PostgreSQL функции для фото**:
```sql
-- Получение следующего фото для отправки
CREATE OR REPLACE FUNCTION get_next_message_photo_for_model(model_uuid UUID)
RETURNS TABLE (id UUID, photo_url TEXT, caption TEXT, send_priority INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.photo_url, p.caption, p.send_priority
  FROM ai_model_photos p
  WHERE p.model_id = model_uuid 
    AND p.send_priority > 0
  ORDER BY p.send_priority ASC, p.created_at ASC
  LIMIT 1;
END;
$$;

-- Ротация приоритетов фото после отправки
CREATE OR REPLACE FUNCTION rotate_message_photo_priority(model_uuid UUID, used_photo_id UUID)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  max_priority INTEGER;
BEGIN
  SELECT COALESCE(MAX(send_priority), 0) INTO max_priority
  FROM ai_model_photos 
  WHERE model_id = model_uuid AND send_priority > 0;
  
  UPDATE ai_model_photos 
  SET send_priority = max_priority + 1
  WHERE id = used_photo_id;
END;
$$;
```

### 💬 Схема чатов и сообщений

#### `public.chats`
**Назначение**: Чаты между пользователями и AI персонажами
```sql
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  character_name TEXT, -- кеш имени персонажа
  character_avatar TEXT, -- кеш аватара персонажа
  match_id UUID, -- связь с matches если из свайпа
  title TEXT DEFAULT 'Новый чат',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  is_active BOOLEAN DEFAULT true,
  last_message_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_character_id ON chats(character_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
```

#### `public.chat_messages`
**Назначение**: Сообщения в чатах
```sql
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'photo', 'system')),
  is_user BOOLEAN NOT NULL,
  photo_url TEXT, -- для фото-сообщений
  photo_metadata JSONB, -- метаданные фото (размер, приоритет и т.д.)
  metadata JSONB DEFAULT '{}',
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_message_type ON chat_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_chat_messages_is_user ON chat_messages(is_user);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
```

### 💝 Схема свайпинга и мэтчей

#### `public.matches`
**Назначение**: Мэтчи между пользователями и AI персонажами
```sql
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES ai_models(id) ON DELETE CASCADE NOT NULL,
  is_liked BOOLEAN NOT NULL,
  is_matched BOOLEAN DEFAULT false,
  matched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Индексы**:
```sql
CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_character_id ON matches(character_id);
CREATE INDEX IF NOT EXISTS idx_matches_is_matched ON matches(is_matched);
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_user_character_unique ON matches(user_id, character_id);
```

### 📊 Аналитика и трекинг

#### `public.tracking_links`
**Назначение**: Трекинговые ссылки для аналитики
```sql
CREATE TABLE IF NOT EXISTS public.tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL, -- utm_source
  medium TEXT NOT NULL, -- utm_medium  
  campaign TEXT NOT NULL, -- utm_campaign
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `public.link_clicks`
**Назначение**: Клики по трекинговым ссылкам
```sql
CREATE TABLE IF NOT EXISTS public.link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_link_id UUID REFERENCES tracking_links(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `public.model_usage_stats`
**Назначение**: Статистика использования AI моделей
```sql
CREATE TABLE IF NOT EXISTS public.model_usage_stats (
  id SERIAL PRIMARY KEY,
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  message_count INTEGER NOT NULL DEFAULT 0,
  avg_response_time NUMERIC(5,2) NOT NULL DEFAULT 0,
  avg_rating NUMERIC(3,1) NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 🔧 Системные функции

#### Автоматические триггеры
```sql
-- Обновление updated_at при изменении записи
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Применение триггера ко всем таблицам
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at 
  BEFORE UPDATE ON ai_models FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at 
  BEFORE UPDATE ON chats FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at 
  BEFORE UPDATE ON chat_messages FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

#### RLS (Row Level Security) политики

**Общие принципы**:
- Пользователи видят только свои данные
- Администраторы имеют полный доступ
- Публичный доступ только к активным AI моделям

**Основные политики**:
```sql
-- Chats: пользователи управляют своими чатами
CREATE POLICY "users_manage_own_chats" ON chats
  FOR ALL USING (user_id = auth.uid());

-- Chat messages: доступ через связанный чат
CREATE POLICY "users_access_chat_messages" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

-- AI models: публичный доступ к активным
CREATE POLICY "public_read_active_models" ON ai_models
  FOR SELECT USING (is_active = true);

-- Matches: пользователи управляют своими мэтчами
CREATE POLICY "users_manage_own_matches" ON matches
  FOR ALL USING (user_id = auth.uid());
```

## 🎯 Архитектурные особенности

### Безопасность данных
- **Row Level Security** включен на всех таблицах
- **UUID** используются для всех первичных ключей
- **Cascading deletes** для связанных данных
- **Проверочные ограничения** для статусов и типов

### Производительность
- **Составные индексы** для часто используемых запросов
- **GIN индексы** для JSONB и массивов
- **Частичные индексы** для булевых полей
- **Автоматические триггеры** для метаданных

### Масштабируемость
- **JSONB поля** для гибкой схемы метаданных
- **Временные зоны** для глобального использования
- **Soft deletes** через is_deleted/is_active
- **Разделение фото** по назначению (профиль/сообщения)

## 🔌 Интеграции

### Supabase Storage
- **Bucket**: `ai-models-avatars`
- **Политики**: Публичное чтение, авторизованная загрузка
- **Форматы**: JPG, PNG, WebP, GIF
- **Ограничения**: 5MB на файл

### OpenRouter API
- **Модель**: `mistralai/mistral-medium-3`
- **Стриминг**: WebSocket соединения
- **Промпты**: Кастомные + шаблонные
- **Fallback**: Обработка ошибок API

### Environment Variables
```bash
REACT_APP_SUPABASE_URL=https://[project-id].supabase.co
REACT_APP_SUPABASE_ANON_KEY=[anon-key]
REACT_APP_OPENROUTER_API_KEY=[openrouter-key]
```

## 📦 Версионирование схемы

### Текущая версия: 2.0
- **Photo Feature**: Полная поддержка фото в сообщениях
- **Advanced Analytics**: Трекинг и LTV аналитика
- **RLS Security**: Комплексные политики безопасности
- **Performance**: Оптимизированные индексы

### История изменений
- **v1.0**: Базовая схема (profiles, ai_models, chats, messages)
- **v1.5**: Добавлены matches, ai_model_photos
- **v2.0**: Аналитика, трекинг, оптимизация производительности

**Статус**: PRODUCTION READY ✅  
**Последнее обновление**: 25.06.2025  
**Следующая версия**: 2.1 (планируется добавление push-уведомлений) 