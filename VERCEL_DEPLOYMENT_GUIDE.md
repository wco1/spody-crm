# Гид по деплою Spody CRM на Vercel

## Настройка переменных окружения

### Обязательные переменные

В настройках проекта на Vercel добавьте следующие переменные окружения:

#### 1. NEXT_PUBLIC_SUPABASE_URL
- **Значение**: URL вашего Supabase проекта
- **Пример**: `https://ваш-project-id.supabase.co`
- **Где найти**: Supabase Dashboard → Settings → API → Project URL

#### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Значение**: Anonymous (public) key из Supabase
- **Пример**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Где найти**: Supabase Dashboard → Settings → API → anon public key
- **Примечание**: Это публичный ключ, безопасно использовать в браузере

#### 3. SUPABASE_SERVICE_KEY
- **Значение**: Service Role Key из Supabase
- **Пример**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Где найти**: Supabase Dashboard → Settings → API → service_role secret key
- **⚠️ ВАЖНО**: Это секретный ключ! Не делитесь им публично

### Как добавить переменные на Vercel

1. Откройте ваш проект на [vercel.com](https://vercel.com)
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте каждую переменную:
   - **Name**: имя переменной (например, `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: значение переменной
   - **Environment**: выберите `Production`, `Preview`, и `Development`

### Быстрая настройка

```bash
# Через Vercel CLI (если установлен)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
```

## Проверка настроек

После добавления переменных:

1. Сделайте новый push в ваш репозиторий
2. Vercel автоматически пересоберет проект
3. Проверьте, что ошибка `supabaseUrl is required` исчезла

## Типичные ошибки

### Error: supabaseUrl is required
- **Причина**: Не настроена переменная `NEXT_PUBLIC_SUPABASE_URL`
- **Решение**: Добавьте переменную в настройки Vercel

### Missing NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Причина**: Не настроена переменная `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Решение**: Добавьте анонимный ключ в настройки Vercel

### 503 Service Unavailable в API
- **Причина**: Не настроена переменная `SUPABASE_SERVICE_KEY`
- **Решение**: Добавьте service key в настройки Vercel

### Database connection not available
- **Причина**: Не настроены переменные Supabase или неправильные значения
- **Решение**: Проверьте все три переменные в настройках Vercel

### Переменные не обновляются
- **Причина**: Кэш Vercel
- **Решение**: Сделайте новый деплой или очистите кэш

## Локальная разработка

Для локальной разработки создайте файл `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://ваш-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш-anon-key
SUPABASE_SERVICE_KEY=ваш-service-role-key
```

⚠️ **Не добавляйте `.env.local` в git!**

## Безопасность

- Никогда не коммитьте секретные ключи в git
- Используйте разные ключи для production и development
- Регулярно обновляйте ключи доступа
- Ограничьте доступ к настройкам Vercel
- ANON_KEY можно использовать публично, SERVICE_KEY - только на сервере

## Troubleshooting

### Если деплой все еще падает:

1. Проверьте правильность URL и ключей в Supabase
2. Убедитесь, что переменные добавлены для всех сред (Production, Preview, Development)
3. Сделайте новый push для триггера rebuild
4. Проверьте логи деплоя в Vercel Dashboard

### Проверка подключения к Supabase:

```javascript
// Тестовый API роут
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Service Key exists:', !!process.env.SUPABASE_SERVICE_KEY);
```

## Контакты

Если проблемы остаются, проверьте:
- Настройки RLS в Supabase
- Права доступа таблиц
- Корректность схемы базы данных 