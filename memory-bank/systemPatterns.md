# System Patterns - Системные паттерны Spody

**Обновлено**: 25.06.2025 21:30  
**Статус**: Система паттернов обновлена + ссылка на детальную схему БД ✅

## 🏗️ Архитектурные паттерны

### 🔐 Authentication Pattern
```
User Registration → Email Confirmation → Profile Creation → Auth Context
     ↓                     ↓                    ↓              ↓
auth.users table    email_confirmed_at    profiles table   Global State
```

**Критические правила**:
- ВСЕГДА используй `UnifiedAuthContext` для аутентификации
- НЕ используй auth.users напрямую - только через Supabase Auth
- Профили создаются ПОСЛЕ подтверждения email

### 🤖 AI Integration Pattern
```
User Message → OpenRouter API → Streaming Response → Database → UI Update
     ↓              ↓                ↓               ↓         ↓
Chat Context   Prompt Service   Message Chunks   chat_messages  MessageBubble
```

**Реализация**:
- `unifiedOpenRouterService.js` - единая точка AI API
- `unifiedPromptsService.js` - управление промптами + кеширование
- Streaming через WebSocket с аккумуляцией chunks
- Системные промпты ОБНОВЛЯЮТСЯ, а не пропускаются

### 📱 UI/UX Pattern
```
Mobile First → Progressive Enhancement → Adaptive Components
     ↓                ↓                        ↓
Base Styles    Responsive Breakpoints    Context-Aware UI
```

**Принципы**:
- Tailwind utility-first подход
- CSS custom properties для темизации
- React.memo + useMemo для производительности
- Graceful fallbacks для всех компонентов

## 🗄️ Database Schema Patterns

### 📋 Полная документация схемы
**Детальная структура БД**: См. `memory-bank/techContext.md` - полная схема Supabase v2.0
- Все таблицы с CREATE TABLE определениями
- Индексы для производительности
- RLS политики безопасности  
- PostgreSQL функции и триггеры

### 🔑 Ключевые таблицы
```sql
auth.users          -- Supabase Auth (управляется автоматически)
├── profiles        -- Пользовательские профили (1:1)
├── chats           -- Чаты с AI персонажами
│   └── chat_messages -- Сообщения в чатах
├── ai_models       -- AI персонажи
│   └── ai_model_photos -- Фото для профилей и сообщений
└── matches         -- Лайки и матчи (swipe система)
```

### 🛡️ Security Pattern (RLS)
```sql
-- Пользователи видят только свои данные
CREATE POLICY "users_own_data" ON table_name
  FOR ALL USING (user_id = auth.uid());

-- Публичное чтение активных записей
CREATE POLICY "public_read_active" ON table_name  
  FOR SELECT USING (is_active = true);

-- Администраторы имеют полный доступ
CREATE POLICY "admin_full_access" ON table_name
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin')
  );
```

### 🚀 Performance Patterns
```sql
-- UUID первичные ключи везде
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Каскадное удаление для связанных данных
REFERENCES parent_table(id) ON DELETE CASCADE

-- Составные индексы для частых запросов
CREATE INDEX idx_table_user_created ON table(user_id, created_at);

-- GIN индексы для JSONB и массивов
CREATE INDEX idx_table_metadata ON table USING GIN(metadata);
```

## 📸 Photo Feature Pattern

### 🔄 Архитектура фото-системы
```sql
CREATE TABLE ai_model_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  send_priority INTEGER DEFAULT 0, -- 0=профиль, >0=сообщения
  caption TEXT DEFAULT 'Вот моё фото! 📸',
  -- ... другие поля
);
```

**Логика разделения фото**:
- `send_priority = 0` - профильные фото (каталог, профили)
- `send_priority > 0` - фото для сообщений (кнопка 📷)

### 🔄 PostgreSQL функции
```sql
-- Получение следующего фото для отправки
get_next_message_photo_for_model(model_uuid UUID)

-- Ротация приоритета после отправки
rotate_message_photo_priority(model_uuid UUID, used_photo_id UUID)
```

### 🎯 Workflow фото-сообщений
```
1. CRM загружает фото → ai_model_photos (send_priority > 0)
2. User нажимает 📷 → messagePhotoService.getNextPhoto()
3. БД функция get_next_message_photo_for_model()
4. Фото отправляется в чат → chat_messages (message_type: 'photo')
5. БД функция rotate_message_photo_priority()
```

## 🔄 Service Layer Pattern

### 🎯 Unified Services Architecture
```
Frontend Components
       ↓
Context Providers (Auth, Chat, Theme)
       ↓
Unified Services Layer
├── unifiedOpenRouterService.js  -- AI API + промпты
├── unifiedPromptsService.js     -- Промпт менеджмент
├── messagePhotoService.js       -- Фото-сообщения
└── supabaseClient.js           -- Все БД операции
       ↓
External APIs (Supabase, OpenRouter)
```

### 🛠️ Service Patterns
```javascript
// Универсальный паттерн error handling
try {
  const { data, error } = await supabase.operation();
  if (error) throw error;
  return data;
} catch (error) {
  console.error('Service error:', error);
  throw new Error(`Operation failed: ${error.message}`);
}

// Паттерн кеширования
const getCachedData = (key, fetchFn, ttl = 5 * 60 * 1000) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  const data = fetchFn();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
};
```

## 📱 Component Patterns

### 🔄 Optimized Component Pattern
```javascript
// MessageBubbleOptimized.js паттерн
const MessageBubble = React.memo(({ message, isUser, avatar }) => {
  // Мемоизация вычислений
  const bubbleClasses = useMemo(() => 
    getBubbleClasses(isUser, message.type), [isUser, message.type]
  );
  
  // Условный рендер
  if (!message.content) return null;
  
  return <div className={bubbleClasses}>{message.content}</div>;
});
```

### 🎨 Responsive Design Pattern  
```css
/* Mobile-first адаптивность */
.element {
  /* Base mobile styles */
  @apply max-w-[85%] text-sm;
}

/* Progressive enhancement */
@screen sm {
  .element {
    @apply max-w-[80%] text-base;
  }
}

@screen md {
  .element {
    @apply max-w-[75%];
  }
}

@screen lg {
  .element {
    @apply max-w-[70%];
  }
}
```

## 🚀 Performance Patterns

### ⚡ Loading Optimization
```javascript
// Параллельная загрузка данных
const [chatData, messages, avatar] = await Promise.all([
  loadChatInfo(chatId),
  loadMessages(chatId),
  loadAvatar(characterId)
]);

// Виртуализация длинных списков
const VirtualizedMessageList = ({ messages }) => {
  const itemHeight = 60;
  const containerHeight = 400;
  // ... virtual scrolling logic
};
```

### 🔄 State Management Pattern
```javascript
// Context + Reducer для сложного состояния
const ChatContext = createContext();

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_TYPING':
      return { ...state, isTyping: action.payload };
    default:
      return state;
  }
};
```

## 🔐 Security Patterns

### 🛡️ Row Level Security (RLS)
```sql
-- Базовый паттерн пользовательских данных
CREATE POLICY "users_own_data" ON chats
  FOR ALL USING (user_id = auth.uid());

-- Доступ через связанные таблицы
CREATE POLICY "chat_messages_access" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = chat_messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );
```

### 🔑 API Security Pattern
```javascript
// Валидация перед каждым запросом
const validateUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
};

// Sanitization входных данных
const sanitizeInput = (input) => {
  return DOMPurify.sanitize(input.trim());
};
```

## 🚫 Anti-Patterns (Избегать)

### ❌ MOCK_MODELS Anti-Pattern
```javascript
// ❌ НЕ ДЕЛАТЬ - fallback на моки
const models = await loadFromSupabase() || MOCK_MODELS;

// ✅ ПРАВИЛЬНО - только Supabase
const models = await loadFromSupabase();
if (!models?.length) throw new Error('No models found');
```

### ❌ .single() Anti-Pattern
```javascript
// ❌ НЕ ДЕЛАТЬ - вызывает 406/400 ошибки
const { data } = await supabase.from('table').select().single();

// ✅ ПРАВИЛЬНО - массивы + optional chaining
const { data: array } = await supabase.from('table').select();
const item = array?.[0];
```

### ❌ Chat Navigation Anti-Pattern
```javascript
// ❌ НЕ ДЕЛАТЬ - создает дубликаты
if (existingChat) {
  navigate(`/chat/${existingChat.id}`);
}
// Код продолжает выполняться...

// ✅ ПРАВИЛЬНО - immediate return
if (existingChat) {
  navigate(`/chat/${existingChat.id}`);
  return; // КРИТИЧНО!
}
```

## 📊 Monitoring Patterns

### 📈 Performance Monitoring
```javascript
// Structured logging с префиксами
console.log('🚀 [PERFORMANCE]', 'Chat loading started');
console.log('⚡ [OPTIMIZATION]', 'Memoization applied');
console.log('📸 [PHOTO SERVICE]', 'Loading photos for model:', modelId);

// Performance measurements
const start = performance.now();
await operation();
const duration = performance.now() - start;
console.log(`⏱️ [TIMING] Operation took ${duration}ms`);
```

### 🔍 Error Monitoring
```javascript
// Глобальный error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error('🚨 [ERROR BOUNDARY]', error, errorInfo);
    // Отправка в систему мониторинга
  }
}
```

**Статус**: Система паттернов полностью документирована и готова для масштабирования ✅