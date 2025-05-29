# Spody Admin Panel

Административная панель (CRM) для управления приложением Spody. Позволяет загружать новых моделей ИИ и предоставляет сводную аналитику поведения пользователей.

## Особенности

- Современный и интуитивно понятный интерфейс на основе Tailwind CSS
- Интерактивные графики и статистика с использованием Recharts
- Управление моделями ИИ (CRUD операции)
- Детальная аналитика поведения пользователей
- Полная изоляция от основного приложения

## Технологии

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **Графики**: Recharts
- **Иконки**: Lucide React
- **Аутентификация**: JWT, Supabase Auth
- **Хранилище данных**: Supabase

## Установка и запуск

### Предварительные требования

- Node.js 18+
- npm или yarn

### Шаги установки

1. Клонируйте репозиторий:

```bash
git clone https://github.com/your-username/spody-admin-panel.git
cd spody-admin-panel
```

2. Установите зависимости:

```bash
npm install
# или
yarn install
```

3. Создайте файл `.env.local` и добавьте необходимые переменные окружения:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_OPENROUTER_API_KEY=your-openrouter-api-key
```

4. Настройте базу данных Supabase:

- Войдите в панель управления Supabase
- Откройте SQL Editor
- Выполните содержимое файла `create-analytics-tables.sql` для создания необходимых таблиц аналитики
- Более подробная инструкция доступна в файле `HOW_TO_SETUP_ANALYTICS.md`

5. Запустите приложение в режиме разработки:

```bash
npm run dev
# или
yarn dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000).

### Сборка для продакшена

Для сборки оптимизированной версии для продакшена:

```bash
npm run build
# или
yarn build
```

Для запуска собранного приложения:

```bash
npm run start
# или
yarn start
```

## Развертывание на внешнем хостинге

Данная CRM-система может быть развернута на любом хостинге, поддерживающем Node.js, или как статический сайт.

### Развертывание на Vercel

1. Настройте проект на Vercel, указав директорию `admin-panel` как корневую.
2. Добавьте переменные окружения в настройках проекта.
3. Vercel автоматически обнаружит Next.js и настроит сборку и развертывание.

### Развертывание на Netlify

1. Создайте файл `netlify.toml` в корне проекта с нужными настройками.
2. Настройте переменные окружения в панели управления Netlify.
3. Разверните проект, указав `npm run build` как команду сборки и `out` как директорию публикации.

## Структура проекта

```
admin-panel/
├── app/                # Основные компоненты и страницы
│   ├── components/     # Переиспользуемые компоненты
│   ├── dashboard/      # Страница дашборда
│   ├── models/         # Управление моделями
│   ├── analytics/      # Аналитика и отчеты
│   ├── auth/           # Аутентификация
│   └── settings/       # Настройки системы
├── public/             # Статические файлы
└── ...
```

## Аналитические данные

Реальные данные для дашборда и аналитики загружаются из таблиц Supabase:

- `ai_models` - информация о моделях ИИ
- `model_usage_stats` - статистика использования моделей
- `user_activity` - активность пользователей по дням
- `analytics_summary` - общая статистическая информация
- `user_retention` - данные о удержании пользователей
- `user_sources` - источники привлечения пользователей

При отсутствии таблиц или данных в них, система автоматически отображает демонстрационные данные. Для переключения на реальные данные необходимо создать и заполнить соответствующие таблицы, как описано в файле `HOW_TO_SETUP_ANALYTICS.md`.

## Доступ к CRM

Для демонстрационного доступа используйте:
- Email: admin@spody.app
- Пароль: admin123

## Лицензия

Данный проект является закрытым и предназначен только для использования в приложении Spody.

# Spody CRM - Модуль управления моделями и аватарами

## Обзор

Этот модуль управления моделями и аватарами предоставляет интерфейс для создания, редактирования и удаления моделей в приложении Spody. Основные функции включают:

- Загрузку и хранение аватаров моделей в Supabase Storage
- Кэширование аватаров для повышения производительности
- Интеграцию с основным приложением Spody через общий механизм получения аватаров
- Резервные аватары при ошибках загрузки
- Прямое редактирование данных моделей

## Архитектура

Система использует следующую архитектуру:

1. **AvatarService** - сервис для работы с аватарами моделей
   - Кэширование аватаров
   - Загрузка в Supabase Storage
   - Валидация URL аватаров
   - Резервные аватары по умолчанию

2. **ModelService** - сервис для работы с моделями
   - CRUD операции с моделями
   - Управление аватарами через AvatarService

3. **Аутентификация** - гибридная система аутентификации
   - Основной метод через Supabase Auth
   - Резервный метод для демо-аккаунта (admin@spody.app)
   - Установка заголовков авторизации для API запросов

## Установка и настройка

### Необходимые компоненты
- Next.js 13+
- Supabase проект с настроенными сервисами Auth и Storage
- Доступ к таблице `ai_models` в базе данных Supabase

### Настройка Supabase Storage

1. Создайте bucket `avatars` в Supabase Storage
2. Настройте RLS политики для доступа:

```sql
-- Публичный доступ для чтения
CREATE POLICY "Public Read Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars' AND path LIKE 'public/%');

-- Доступ для загрузки только аутентифицированным пользователям
CREATE POLICY "Authenticated Users Upload Access"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- Доступ на обновление и удаление только владельцу или администратору
CREATE POLICY "Owner or Admin Update Delete"
ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND (auth.uid() = owner OR auth.role() = 'service_role'));
```

### Таблица ai_models

Структура таблицы `ai_models`:

```sql
CREATE TABLE ai_models (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  traits TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  gender VARCHAR DEFAULT 'female',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);
```

## Использование модуля

### Загрузка аватара

```typescript
// Загрузка аватара через ModelService
async function handleUploadAvatar(modelId: string, file: File) {
  try {
    const avatarUrl = await ModelService.uploadAvatar(modelId, file);
    console.log('Avatar uploaded:', avatarUrl);
    return avatarUrl;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }
}
```

### Управление моделями

```typescript
// Создание новой модели
async function createModel() {
  const newModel = await ModelService.createModel({
    name: 'Имя модели',
    bio: 'Описание модели',
    gender: 'female',
    traits: ['черта1', 'черта2'],
    genres: ['жанр1', 'жанр2']
  });
}

// Обновление модели
async function updateModel(id: string) {
  const updatedModel = await ModelService.updateModel(id, {
    name: 'Новое имя',
    bio: 'Новое описание'
  });
}

// Получение модели по ID
async function getModel(id: string) {
  const model = await ModelService.getModelById(id);
  return model;
}
```

### Работа с кэшем аватаров

```typescript
// Очистка кэша для конкретной модели
AvatarService.clearCache('model-id');

// Полная очистка кэша аватаров
AvatarService.clearCache();

// Получение URL аватара с учетом кэширования
const avatarUrl = await AvatarService.getAvatar('model-id', 'female');
```

## Интеграция с основным приложением

Модуль разработан для совместимости с `newAvatarService.js` в основном приложении Spody. Оба используют:

1. Общий механизм кэширования
2. Общую структуру хранения в Storage
3. Одинаковый механизм резервных аватаров
4. Прямое обращение к таблице `ai_models`

## Диагностика и отладка

1. Проверка состояния аутентификации:
```
localStorage.getItem('isLoggedIn') // Должно быть 'true'
localStorage.getItem('authMethod') // 'supabase' или 'local'
```

2. Проверка доступа к Supabase:
```
supabase.auth.getSession() // Должна вернуть текущую сессию
```

3. Мониторинг запросов в Network инструментах браузера:
   - Проверьте наличие заголовка Authorization в запросах к Supabase
   - Убедитесь, что токен действителен

## Возможные проблемы и решения

1. **Ошибка AuthSessionMissingError**
   - Причина: Истек срок действия сессии или проблема с авторизацией
   - Решение: Выполните выход и повторный вход, проверьте работу AuthCheck компонента

2. **Ошибка 401 при доступе к ai_models**
   - Причина: Отсутствует или неверный токен авторизации
   - Решение: Проверьте заголовки запросов, токен авторизации и RLS политики

3. **Ошибки загрузки аватаров**
   - Причина: Неверные права доступа к хранилищу или некорректный файл
   - Решение: Проверьте RLS политики для Storage, формат и размер файла

## Дополнительная информация

Для получения дополнительной информации о настройке Supabase и работе с моделями обратитесь к документации:

- [Supabase Documentation](https://supabase.io/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Spody API Documentation](https://api.spody.app/docs) (если доступно)

## Функциональность загрузки изображений по URL

В CRM доступны две опции для добавления аватаров моделей:
1. Загрузка изображения с устройства
2. Указание URL изображения

### Поддерживаемые форматы URL изображений

CRM поддерживает следующие форматы URL для аватаров:

1. **Изображения с расширениями** - URL, заканчивающиеся на `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, и другие стандартные форматы изображений.

2. **Изображения с известных хостингов** - URL с доверенных источников изображений, таких как:
   - Unsplash (`images.unsplash.com`)
   - Imgur (`i.imgur.com`)
   - Cloudinary (`res.cloudinary.com`)
   - Placeholder сервисы (`placehold.co`, `placekitten.com`)
   - Supabase Storage (ваш домен supabase)

### Примеры URL изображений для тестирования

Вы можете использовать следующие URL для тестирования функциональности:

- **Unsplash**: `https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop`
- **Placeholder**: `https://placehold.co/150x150`
- **Imgur**: `https://i.imgur.com/wP5ftQo.jpg`
- **PlaceKitten**: `https://placekitten.com/200/300`

### Процесс проверки URL

При указании URL для аватара модели система:
1. Проверяет корректность формата URL
2. Проверяет расширение файла и/или домен на соответствие известным источникам изображений
3. Пытается загрузить изображение для проверки его доступности

### Тестирование валидации URL

Вы можете протестировать валидацию URL с помощью скрипта:
```bash
node test-url-validation.mjs
```

Или через веб-интерфейс:
```bash
npm run dev
node open-website.js
```
