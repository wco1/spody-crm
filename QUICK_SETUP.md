# Быстрая настройка CRM системы

## Проблема: "Переменные окружения Supabase не настроены"

Если вы видите ошибку "Переменные окружения Supabase не настроены", выполните следующие шаги:

### 1. Скопируйте файл с примером

```bash
cp env.example .env.local
```

### 2. Отредактируйте файл `.env.local`

Откройте файл `.env.local` и замените значения-заглушки на реальные:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 3. Где взять значения Supabase

1. Откройте [app.supabase.com](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в Settings → API
4. Скопируйте:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_KEY`

### 4. Перезапустите приложение

```bash
npm run dev
```

## Альтернативное решение для тестирования

Если у вас нет доступа к Supabase, можете использовать демо-режим:

```bash
# Установите переменные окружения в терминале
export NEXT_PUBLIC_SUPABASE_URL=https://demo.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=demo_key
export SUPABASE_SERVICE_KEY=demo_service_key

# Запустите приложение
npm run dev
```

⚠️ **Важно**: В демо-режиме функции базы данных не будут работать, но интерфейс загрузится.

## Проверка настройки

После настройки переменных окружения:

1. Перейдите на [http://localhost:3000](http://localhost:3000)
2. Если видите панель авторизации - настройка прошла успешно
3. Используйте `admin@spody.app` / `admin123` для входа в демо-режиме

## Возможные проблемы

- **Файл .env.local не найден**: Убедитесь, что файл создан в корне папки `crm-standalone`
- **Переменные не загружаются**: Перезапустите сервер разработки (`Ctrl+C`, затем `npm run dev`)
- **Ошибки подключения**: Проверьте правильность URL и ключей Supabase 