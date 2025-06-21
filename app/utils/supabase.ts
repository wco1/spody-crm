import { createClient } from '@supabase/supabase-js';

// Define a local interface for SupabaseError to match how it's used in models/page.tsx
interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Define a local interface for the AI Model to avoid circular imports
interface AIModel {
  id: string;
  name: string;
  avatar_url: string;
  bio: string;
  traits: string[];
  genres: string[];
  gender?: 'male' | 'female' | '';
  created_at: string;
  updated_at?: string;
  user_id?: string;
}

// Получаем переменные окружения из process.env или из глобального окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://avfdefowtxijmlvocodx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDg0MDksImV4cCI6MjA2NDEyNDQwOX0.vPcqC3Dp3jAE7uhCz-NoLotRV0P02VtHKfP6KstAFTk';
const serviceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w';

// Создаем клиент Supabase с анонимным ключом по умолчанию
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// При необходимости можно использовать клиент с сервисным ключом 
// (временное решение для отладки - не рекомендуется для продакшн)
export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Утилиты для безопасного использования клиентов (оставляю для совместимости)
export const withSupabase = <T>(operation: (client: typeof supabase) => Promise<T>): Promise<T> => {
  return operation(supabase);
};

export const withSupabaseAdmin = <T>(operation: (client: typeof supabaseAdmin) => Promise<T>): Promise<T> => {
  return operation(supabaseAdmin);
};

// Константа для имени bucket'а для аватаров моделей
export const AVATARS_BUCKET = 'ai-models-avatars';

// Кэш аватаров (имитирует работу с newAvatarService из основного приложения)
export const avatarCache: Record<string, string> = {};

// Резервные аватары по умолчанию
export const FALLBACK_AVATARS = {
  male: '/default-male-avatar.png',
  female: '/default-female-avatar.png',
  default: '/default-avatar.png'
};

/**
 * Проверяет существование bucket для аватаров
 * @returns Статус проверки bucket'а
 */
export async function ensureAvatarsBucketExists(): Promise<boolean> {
  if (!supabase) {
    console.error('Supabase client not initialized');
    return false;
  }

  try {
    console.log(`Проверка существования bucket'а ${AVATARS_BUCKET}...`);
    
    // Получаем список всех bucket'ов
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Ошибка при получении списка bucket\'ов:', listError);
      return false;
    }
    
    // Проверяем, существует ли bucket с нужным именем
    const bucketExists = buckets?.some(bucket => bucket.name === AVATARS_BUCKET);
    
    if (bucketExists) {
      console.log(`Bucket ${AVATARS_BUCKET} существует.`);
      return true;
    }
    
    // Если bucket не существует, выводим информативное сообщение
    console.error(`Bucket ${AVATARS_BUCKET} не существует. Необходимо создать его через административную панель Supabase:`);
    console.error(`1. Откройте проект в https://app.supabase.com`);
    console.error(`2. Перейдите в раздел "Storage"`);
    console.error(`3. Создайте новый bucket с именем "${AVATARS_BUCKET}"`);
    console.error(`4. Установите для него параметр "Public" в значение "true" чтобы файлы были доступны публично`);
    
    return false;
  } catch (err) {
    console.error('Непредвиденная ошибка при проверке bucket\'а:', err);
    return false;
  }
}

/**
 * Загружает файл изображения в хранилище Supabase и обновляет кэш
 * @param file Файл для загрузки
 * @param modelId ID модели (для формирования имени файла)
 * @returns Данные об успешной загрузке, включая публичный URL
 */
export async function uploadAvatarAndUpdateModel(file: File, modelId: string): Promise<{ success: boolean; url?: string; error?: Error | unknown }> {
  if (!supabase) {
    return { 
      success: false, 
      error: new Error('Supabase client not initialized. Please check environment variables.') 
    };
  }

  try {
    // Проверка входящих параметров
    if (!file || !modelId) {
      console.error('Не переданы необходимые параметры: file или modelId');
      return { 
        success: false, 
        error: new Error('Не переданы необходимые параметры: file или modelId') 
      };
    }
    
    // Создаем уникальное имя файла
    const fileName = `${modelId}-${Date.now()}.jpg`;
    console.log(`Uploading avatar for model ${modelId} to bucket ${AVATARS_BUCKET}...`);
    console.log(`File info: type=${file.type}, size=${Math.round(file.size / 1024)}KB`);
    
    // Проверяем и создаем bucket, если он не существует
    const bucketReady = await ensureAvatarsBucketExists();
    if (!bucketReady) {
      return { 
        success: false, 
        error: new Error(`Не удалось подготовить хранилище для аватаров (bucket ${AVATARS_BUCKET}). Необходимо создать bucket через панель администратора Supabase.`) 
      };
    }
    
    // Загружаем файл в public директорию bucket'а
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(AVATARS_BUCKET)
      .upload(`public/${fileName}`, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type // Явно указываем тип контента
      });
    
    if (uploadError) {
      console.error('Error uploading avatar:', uploadError);
      console.error('Error details:', JSON.stringify(uploadError, null, 2));
      
      // Если ошибка связана с отсутствием директории, пробуем создать директорию и повторить загрузку
      if (uploadError.message && (
        uploadError.message.includes('not found') || 
        uploadError.message.includes('does not exist')
      )) {
        try {
          console.log('Пробуем создать public директорию и повторно загрузить файл...');
          
          // Создаем директорию с пустым файлом
          await supabase.storage
            .from(AVATARS_BUCKET)
            .upload('public/.keep', new Blob([''], { type: 'text/plain' }));
          
          // Пробуем загрузить снова после создания директории
          const retryUpload = await supabase
            .storage
            .from(AVATARS_BUCKET)
            .upload(`public/${fileName}`, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });
          
          if (retryUpload.error) {
            console.error('Повторная загрузка не удалась:', retryUpload.error);
            return { success: false, error: retryUpload.error };
          }
          
          // Используем данные из повторной загрузки
          const uploadPathData = retryUpload.data;
          if (!uploadPathData || !uploadPathData.path) {
            console.error('Повторная загрузка выполнена, но не получен путь к файлу');
            return {
              success: false,
              error: new Error('Повторная загрузка выполнена, но не получен путь к файлу')
            };
          }
          
          // Получаем публичный URL загруженного файла
          const { data: urlData } = supabase
            .storage
            .from(AVATARS_BUCKET)
            .getPublicUrl(`public/${fileName}`);
          
          if (!urlData || !urlData.publicUrl) {
            console.error('Не удалось получить публичный URL для загруженного файла');
            return { 
              success: false, 
              error: new Error('Не удалось получить публичный URL для загруженного файла') 
            };
          }
          
          const publicUrl = urlData.publicUrl;
          console.log(`Avatar uploaded successfully after retry. Public URL: ${publicUrl}`);
          
          // Обновляем запись в базе данных
          const { error: updateError } = await supabase
            .from('ai_models')
            .update({ 
              avatar_url: publicUrl,
              updated_at: new Date()
            })
            .eq('id', modelId);
          
          if (updateError) {
            console.error('Error updating model with new avatar URL:', updateError);
            console.error('Update error details:', JSON.stringify(updateError, null, 2));
            
            // Даже если обновление не удалось, возвращаем URL успешно загруженного файла
            return { 
              success: true, 
              url: publicUrl,
              error: updateError
            };
          }
          
          // Обновляем кэш аватаров
          avatarCache[modelId] = publicUrl;
          
          return { 
            success: true, 
            url: publicUrl 
          };
        } catch (retryError) {
          console.error('Ошибка при повторной попытке загрузки:', retryError);
          return { success: false, error: retryError };
        }
      } else {
        return { success: false, error: uploadError };
      }
    }
    
    if (!uploadData || !uploadData.path) {
      console.error('Загрузка выполнена, но не получен путь к файлу');
      return { 
        success: false, 
        error: new Error('Загрузка выполнена, но не получен путь к файлу') 
      };
    }
    
    // Получаем публичный URL загруженного файла
    const { data: urlData } = supabase
      .storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(`public/${fileName}`);
    
    if (!urlData || !urlData.publicUrl) {
      console.error('Не удалось получить публичный URL для загруженного файла');
      return { 
        success: false, 
        error: new Error('Не удалось получить публичный URL для загруженного файла') 
      };
    }
    
    const publicUrl = urlData.publicUrl;
    console.log(`Avatar uploaded successfully. Public URL: ${publicUrl}`);
    
    // Обновляем запись в базе данных
    const { error: updateError } = await supabase
      .from('ai_models')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date()
      })
      .eq('id', modelId);
    
    if (updateError) {
      console.error('Error updating model with new avatar URL:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      
      // Даже если обновление не удалось, возвращаем URL успешно загруженного файла
      return { 
        success: true, 
        url: publicUrl,
        error: updateError
      };
    }
    
    // Обновляем кэш аватаров
    avatarCache[modelId] = publicUrl;
    
    return { 
      success: true, 
      url: publicUrl 
    };
  } catch (error) {
    console.error('Unexpected error during avatar upload:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return { success: false, error };
  }
}

/**
 * Загружает файл изображения в хранилище Supabase
 * @param file Файл для загрузки
 * @param filename Имя файла (необязательно, по умолчанию используется уникальное имя)
 * @returns Данные об успешной загрузке, включая публичный URL
 */
export async function uploadAvatarFile(file: File, filename?: string): Promise<{ success: boolean; url?: string; error?: Error | unknown }> {
  try {
    return await withSupabase(async (supabaseClient) => {
      // Создаем уникальное имя файла, если не предоставлено
      const uniqueFileName = filename || `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      
      console.log(`Uploading file ${uniqueFileName} to bucket ${AVATARS_BUCKET}...`);
      console.log(`File info: type=${file.type}, size=${Math.round(file.size / 1024)}KB`);
      
      // Загружаем файл в public директорию bucket'а
      const { data, error } = await supabaseClient
        .storage
        .from(AVATARS_BUCKET)
        .upload(`public/${uniqueFileName}`, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type // Явно указываем тип контента
        });
      
      if (error) {
        console.error('Error uploading file:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return { success: false, error };
      }
      
      // Получаем публичный URL загруженного файла
      const { data: urlData } = supabaseClient
        .storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(`public/${data.path}`);
      
      console.log(`File uploaded successfully. Public URL: ${urlData.publicUrl}`);
      
      return { 
        success: true, 
        url: urlData.publicUrl 
      };
    });
  } catch (error) {
    console.error('Unexpected error during file upload:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    return { success: false, error };
  }
}

/**
 * Очищает кэш аватаров для конкретной модели
 * @param modelId ID модели
 * @returns Статус операции очистки
 */
export function clearModelCache(modelId: string): boolean {
  if (modelId && avatarCache[modelId]) {
    delete avatarCache[modelId];
    return true;
  }
  return false;
}

/**
 * Полная очистка кэша аватаров
 * @returns Статус операции очистки
 */
export function clearAllAvatarCache(): boolean {
  for (const key in avatarCache) {
    delete avatarCache[key];
  }
  return true;
}

/**
 * Получает аватар модели с учетом кэширования
 * @param modelId ID модели
 * @param gender Пол модели (для выбора резервного аватара)
 * @returns URL аватара
 */
export async function getModelAvatar(modelId: string, gender: string = 'default'): Promise<string> {
  // Сначала проверяем кэш
  if (avatarCache[modelId]) {
    return avatarCache[modelId];
  }
  
  try {
    return await withSupabase(async (supabaseClient) => {
      // Если в кэше нет, получаем из базы данных
      const { data, error } = await supabaseClient
        .from('ai_models')
        .select('avatar_url')
        .eq('id', modelId)
        .single();
      
      if (error) {
        throw error;
      }
      
      if (data && data.avatar_url) {
        // Сохраняем в кэш и возвращаем
        avatarCache[modelId] = data.avatar_url;
        return data.avatar_url;
      }
      
      // Если аватара нет, используем резервный
      return FALLBACK_AVATARS[gender as keyof typeof FALLBACK_AVATARS] || FALLBACK_AVATARS.default;
    });
  } catch (error) {
    console.error(`Error getting avatar for model ${modelId}:`, error);
    // При ошибке используем резервный аватар
    return FALLBACK_AVATARS[gender as keyof typeof FALLBACK_AVATARS] || FALLBACK_AVATARS.default;
  }
}

// Определим интерфейс для настроек
interface Settings {
  appName: string;
  appUrl: string;
  adminEmail: string;
  timezone: string;
  enableLogging: boolean;
  openrouterKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  emailNotifications: boolean;
  newUserNotifications: boolean;
  errorNotifications: boolean;
  weeklyDigest: boolean;
  notificationEmail: string;
  dbHost: string;
  dbName: string;
  backupSchedule: string;
  [key: string]: string | boolean; // Для других возможных свойств
}

// Функция для получения настроек
export async function getSettings() {
  return withSupabase(async (client) => {
    const { data, error } = await client
      .from('settings')
      .select('*')
      .single();
    
    if (error) {
      console.error('Error fetching settings:', error);
      return getDefaultSettings();
    }
    
    return data;
  }).catch((error) => {
    console.error('Unexpected error fetching settings:', error);
    return getDefaultSettings();
  });
}

// Функция для получения моковых настроек в случае ошибки
function getDefaultSettings(): Settings {
  return {
    appName: 'Spody Admin',
    appUrl: 'https://admin.spody.app',
    adminEmail: 'admin@spody.app',
    timezone: 'UTC+3',
    enableLogging: true,
    openrouterKey: 'sk-or-v1-1234567890abcdef1234567890abcdef',
    supabaseUrl: 'https://avfdefowtxijmlvocodx.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    emailNotifications: true,
    newUserNotifications: true,
    errorNotifications: true,
    weeklyDigest: false,
    notificationEmail: 'admin@spody.app',
    dbHost: 'avfdefowtxijmlvocodx.supabase.co',
    dbName: 'postgres',
    backupSchedule: 'weekly'
  };
}

// Функция для сохранения настроек
export async function saveSettings(settings: Settings) {
  return withSupabase(async (client) => {
    const { data, error } = await client
      .from('settings')
      .upsert(settings)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving settings:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  }).catch((error) => {
    console.error('Unexpected error saving settings:', error);
    return { success: false, error };
  });
}

// Функция для входа в систему через Supabase
export async function signIn(email: string, password: string) {
  console.log('🔐 [CRM AUTH] Authenticating with Supabase:', { email });
  
  try {
    return await withSupabase(async (client) => {
      // Сначала пробуем через Supabase
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (!error && data.user) {
        console.log('✅ [CRM AUTH] Supabase authentication successful');
        
        // КРИТИЧНО: Проверяем является ли пользователь админом
        const isAdmin = await checkAdminAccess(data.user.id, data.user.email);
        
        if (!isAdmin) {
          console.warn('🚫 [CRM AUTH] User is not admin, access denied:', data.user.email);
          // Выходим из Supabase сессии
          await client.auth.signOut();
          return { 
            success: false, 
            error: { 
              message: 'Доступ запрещен. Только администраторы могут войти в CRM.' 
            } 
          };
        }
        
        console.log('🎉 [CRM AUTH] Admin access confirmed');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('authMethod', 'supabase');
        localStorage.setItem('authUser', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          role: 'admin'
        }));
        return { success: true, user: data.user, session: data.session };
      }
      
      // Проверяем демо-аккаунт без вывода ошибки в консоль
      if (email === 'admin@spody.app' && password === 'admin123') {
        console.log('🔧 [CRM AUTH] Using demo authentication');
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('authMethod', 'local');
        localStorage.setItem('authUser', JSON.stringify({
          id: '1', 
          email: 'admin@spody.app', 
          role: 'admin' 
        }));
        return { 
          success: true, 
          user: { 
            id: '1', 
            email: 'admin@spody.app', 
            role: 'admin' 
          }, 
          session: { 
            access_token: 'mock_token' 
          } 
        };
      }
      
      // Только теперь логируем ошибку если это не демо-аккаунт
      console.error('❌ [CRM AUTH] Authentication error:', error);
      return { success: false, error };
    });
  } catch (error) {
    console.error('💥 [CRM AUTH] Unexpected auth error:', error);
    
    // Если произошла непредвиденная ошибка, также проверяем локально
    if (email === 'admin@spody.app' && password === 'admin123') {
      console.log('🔧 [CRM AUTH] Using fallback auth for demo account after error');
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('authMethod', 'local');
      localStorage.setItem('authUser', JSON.stringify({
        id: '1', 
        email: 'admin@spody.app', 
        role: 'admin' 
      }));
      return { 
        success: true, 
        user: { 
          id: '1', 
          email: 'admin@spody.app', 
          role: 'admin' 
        }, 
        session: { 
          access_token: 'mock_token' 
        } 
      };
    }
    
    return { success: false, error: { message: 'Ошибка авторизации. Проверьте данные и попробуйте снова.' } };
  }
}

/**
 * Проверяет имеет ли пользователь админский доступ к CRM
 * @param userId ID пользователя из Supabase Auth
 * @param email Email пользователя
 * @returns true если пользователь админ, false если нет
 */
async function checkAdminAccess(userId: string, email?: string): Promise<boolean> {
  try {
    console.log('🔍 [CRM AUTH] Checking admin access for:', { userId, email });
    
    return await withSupabaseAdmin(async (adminClient) => {
      // Проверяем в таблице admin_users
      const { data: adminUsers, error } = await adminClient
        .from('admin_users')
        .select('*')
        .or(`user_id.eq.${userId},email.eq.${email}`)
        .eq('is_active', true);
      
      if (error) {
        console.error('❌ [CRM AUTH] Error checking admin access:', error);
        
        // Если таблицы admin_users нет, создаем её и добавляем текущего пользователя как админа
        if (error.code === '42P01') { // Table does not exist
          console.log('📋 [CRM AUTH] admin_users table not found, creating...');
          await createAdminUsersTable();
          
          // Добавляем текущего пользователя как первого админа
          if (email) {
            await addAdminUser(userId, email);
            return true;
          }
        }
        
        return false;
      }
      
      const isAdmin = adminUsers && adminUsers.length > 0;
      console.log(isAdmin ? '✅ [CRM AUTH] User is admin' : '❌ [CRM AUTH] User is not admin');
      
      return isAdmin;
    });
  } catch (error) {
    console.error('💥 [CRM AUTH] Unexpected error checking admin access:', error);
    return false;
  }
}

/**
 * Создает таблицу admin_users для управления админскими аккаунтами CRM
 */
async function createAdminUsersTable(): Promise<void> {
  try {
    console.log('📋 [CRM AUTH] Creating admin_users table...');
    
    await withSupabaseAdmin(async (adminClient) => {
      // Создаем таблицу admin_users
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.admin_users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(50) DEFAULT 'admin',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by UUID REFERENCES auth.users(id)
        );
      `;
      
      const { error: createError } = await adminClient.rpc('exec_sql', {
        query: createTableQuery
      });
      
      if (createError) {
        console.error('❌ [CRM AUTH] Error creating admin_users table:', createError);
        
        // Если rpc не работает, пробуем создать через прямой SQL
        console.log('🔄 [CRM AUTH] Trying alternative table creation method...');
        
        // Создаем таблицу напрямую (это будет работать только если у нас есть права)
        const { error: directError } = await adminClient
          .from('admin_users')
          .select('id')
          .limit(1);
        
        // Если таблица не существует, создаем её через SQL Editor
        if (directError && directError.code === '42P01') {
          console.log('📝 [CRM AUTH] Table does not exist, will create manually');
          throw new Error('NEED_MANUAL_TABLE_CREATION');
        }
        
        throw createError;
      }
      
      // Включаем RLS
      const { error: rlsError } = await adminClient.rpc('exec_sql', {
        query: 'ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;'
      });
      
      if (rlsError) {
        console.warn('⚠️ [CRM AUTH] Could not enable RLS:', rlsError);
      }
      
      // Создаем политику безопасности
      const policyQuery = `
        CREATE POLICY IF NOT EXISTS "Only admins can manage admin users" ON public.admin_users
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid() AND is_active = true
          )
        );
      `;
      
      const { error: policyError } = await adminClient.rpc('exec_sql', {
        query: policyQuery
      });
      
      if (policyError) {
        console.warn('⚠️ [CRM AUTH] Could not create RLS policy:', policyError);
      }
      
      // Создаем индексы
      const indexQueries = [
        'CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);',
        'CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);',
        'CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);'
      ];
      
      for (const indexQuery of indexQueries) {
        const { error: indexError } = await adminClient.rpc('exec_sql', {
          query: indexQuery
        });
        
        if (indexError) {
          console.warn('⚠️ [CRM AUTH] Could not create index:', indexError);
        }
      }
      
      console.log('✅ [CRM AUTH] admin_users table created successfully');
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'NEED_MANUAL_TABLE_CREATION') {
      console.log('📋 [CRM AUTH] Manual table creation required');
      throw new Error('MANUAL_TABLE_CREATION_NEEDED');
    }
    
    console.error('💥 [CRM AUTH] Failed to create admin_users table:', error);
    throw error;
  }
}

/**
 * Добавляет пользователя в админы CRM
 * @param userId ID пользователя из Supabase Auth
 * @param email Email пользователя
 * @param role Роль админа (по умолчанию 'admin')
 */
async function addAdminUser(userId: string, email: string, role: string = 'admin'): Promise<void> {
  try {
    console.log('➕ [CRM AUTH] Adding admin user:', { userId, email, role });
    
    await withSupabaseAdmin(async (adminClient) => {
      const { error } = await adminClient
        .from('admin_users')
        .insert({
          user_id: userId,
          email: email,
          role: role,
          is_active: true,
          created_by: userId
        });
      
      if (error) {
        console.error('❌ [CRM AUTH] Error adding admin user:', error);
        throw error;
      }
      
      console.log('✅ [CRM AUTH] Admin user added successfully');
    });
  } catch (error) {
    console.error('💥 [CRM AUTH] Failed to add admin user:', error);
    throw error;
  }
}

/**
 * Публичная функция для добавления админов (только для существующих админов)
 * @param email Email нового админа
 * @param role Роль (по умолчанию 'admin')
 */
export async function addNewAdmin(email: string, role: string = 'admin'): Promise<{ success: boolean; error?: any }> {
  try {
    console.log('👤 [CRM AUTH] Adding new admin via public function:', { email, role });
    
    // Сначала проверяем что текущий пользователь - админ
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: { message: 'Не авторизован' } };
    }
    
    const isCurrentUserAdmin = await checkAdminAccess(currentUser.id, currentUser.email);
    if (!isCurrentUserAdmin) {
      return { success: false, error: { message: 'Недостаточно прав для добавления админов' } };
    }
    
    // Проверяем существует ли пользователь в Supabase Auth
    const { data: users, error: searchError } = await withSupabaseAdmin(async (adminClient) => {
      return await adminClient.auth.admin.listUsers();
    });
    
    if (searchError) {
      console.error('❌ [CRM AUTH] Error searching users:', searchError);
      return { success: false, error: searchError };
    }
    
    const targetUser = users.users.find(user => user.email === email);
    if (!targetUser) {
      return { success: false, error: { message: 'Пользователь с таким email не найден в системе' } };
    }
    
    // Добавляем в админы
    await addAdminUser(targetUser.id, email, role);
    
    return { success: true };
  } catch (error) {
    console.error('💥 [CRM AUTH] Error in addNewAdmin:', error);
    return { success: false, error };
  }
}

// Функция для выхода из системы
export async function signOut() {
  try {
    await withSupabase(async (client) => {
      const { error } = await client.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        return { success: false, error };
      }
      return { success: true };
    });
    
    // Очищаем локальное состояние авторизации
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authMethod');
    localStorage.removeItem('authUser');
    
    return { success: true };
  } catch (error) {
    console.error('Unexpected error signing out:', error);
    
    // При ошибке всё равно очищаем localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authMethod');
    localStorage.removeItem('authUser');
    
    return { success: false, error };
  }
}

// Функция для получения текущего пользователя
export async function getCurrentUser() {
  try {
    // Проверяем кэшированные данные пользователя
    if (typeof window !== 'undefined') {
      const authMethod = localStorage.getItem('authMethod');
      
      // Если используется локальная авторизация, возвращаем сохраненные данные
      if (authMethod === 'local' && localStorage.getItem('isLoggedIn') === 'true') {
        const userDataStr = localStorage.getItem('authUser');
        if (userDataStr) {
          console.log('Using local auth data from localStorage');
          try {
            return JSON.parse(userDataStr);
          } catch (e) {
            console.error('Error parsing user data from localStorage:', e);
          }
        }
      }
      
      // Если используется Supabase или метод не определен, проверяем через API
      if (authMethod === 'supabase' || !authMethod) {
        try {
          return await withSupabase(async (client) => {
            const { data, error } = await client.auth.getUser();
            
            if (!error && data.user) {
              return data.user;
            }
            return null;
          });
        } catch (supabaseError) {
          console.log('Supabase auth check failed, trying localStorage fallback');
        }
        
        // Если сессия истекла, но есть флаг авторизации, пробуем локальные данные
        if (localStorage.getItem('isLoggedIn') === 'true') {
          const userDataStr = localStorage.getItem('authUser');
          if (userDataStr) {
            try {
              return JSON.parse(userDataStr);
            } catch (e) {
              console.error('Error parsing user data from localStorage:', e);
            }
          }
        }
      }
    }
    
    // Если нет сохраненных данных, возвращаем null
    return null;
  } catch (error) {
    console.error('Unexpected error getting current user:', error);
    
    // При ошибке проверяем локальные данные как запасной вариант
    if (typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true') {
      const userDataStr = localStorage.getItem('authUser');
      if (userDataStr) {
        try {
          return JSON.parse(userDataStr);
        } catch (e) {
          console.error('Error parsing user data from localStorage:', e);
        }
      }
      
      // Если данные некорректны, возвращаем базовую информацию демо-аккаунта
      return {
        id: '1',
        email: 'admin@spody.app',
        role: 'admin'
      };
    }
    
    return null;
  }
}

/**
 * Возвращает заголовки для авторизации API запросов
 * @returns Объект с заголовками авторизации
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    // Попытка получить сессию из Supabase
    const sessionData = await withSupabase(async (client) => {
      const { data } = await client.auth.getSession();
      return data;
    }).catch(() => null);
    
    if (sessionData?.session?.access_token) {
      // Если есть действительная сессия, возвращаем Authorization заголовок
      return {
        'Authorization': `Bearer ${sessionData.session.access_token}`
      };
    }
    
    // Если нет сессии, проверяем локальные данные авторизации
    if (typeof window !== 'undefined') {
      const authMethod = localStorage.getItem('authMethod');
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const authToken = localStorage.getItem('supabase.auth.token');
      
      if (isLoggedIn && authToken) {
        // Используем сохраненный токен, если он есть
        return {
          'Authorization': `Bearer ${authToken}`
        };
      } else if (isLoggedIn && authMethod === 'local') {
        // Для локальной авторизации используем демо-токен
        const demoToken = 'demo_token_for_local_auth';
        localStorage.setItem('supabase.auth.token', demoToken);
        return {
          'Authorization': `Bearer ${demoToken}`,
          'X-Client-Info': 'supabase-js/2.38.4',
          'X-Demo-Auth': 'true'
        };
      }
    }
    
    // По умолчанию возвращаем пустой объект
    return {};
  } catch (error) {
    console.error('Error getting auth headers:', error);
    
    // При ошибке возвращаем пустой объект
    return {};
  }
}

// Интерфейс для результата диагностики базы данных
interface DatabaseInfoResult {
  success: boolean;
  user?: {
    id: string;
    email?: string;
    role?: string;
  } | null;
  aiModelsCount?: number;
  aiModelsData?: AIModel[];
  insertTest?: {
    success: boolean;
    message?: string;
    error?: SupabaseError;
  };
  error?: unknown;
}

// Функция для диагностики базы данных
export async function getDatabaseInfo(skipTestInsert: boolean = true): Promise<DatabaseInfoResult> {
  try {
    console.log('Получение информации о базе данных...');
    
    // Проверяем текущего авторизованного пользователя
    const user = await getCurrentUser();
    
    if (!user) {
      console.error('Ошибка получения информации о пользователе: Auth session missing!');
    } else {
      console.log('Текущий пользователь:', user ? `${user.email} (${user.id})` : 'Не аутентифицирован');
    }
    
    // Проверяем наличие и содержимое таблицы ai_models с обычным ключом
    console.log('Проверка доступа к таблице ai_models с анонимным ключом:');
    
    const modelsResult = await withSupabase(async (client) => {
      const { data: aiModelsData, error: aiModelsError, count } = await client
        .from('ai_models')
        .select('*', { count: 'exact' });
      
      return { data: aiModelsData, error: aiModelsError, count };
    }).catch((error) => {
      console.error('Error accessing ai_models table:', error);
      return { data: null, error, count: 0 };
    });
    
    const { data: aiModelsData, error: aiModelsError, count } = modelsResult;
      
    if (aiModelsError) {
      console.error('Ошибка доступа к таблице ai_models с анонимным ключом:', aiModelsError);
    } else {
      console.log(`Таблица ai_models содержит ${count || 0} записей, доступных с анонимным ключом`);
      
      // Получаем структуру одной из записей, если они есть
      if (aiModelsData && aiModelsData.length > 0) {
        console.log('Структура записи в таблице ai_models:', Object.keys(aiModelsData[0]));
      } else {
        console.log('Таблица ai_models пуста или записи недоступны с анонимным ключом');
      }
    }
    
    // Проверяем возможность вставки записи с анонимным ключом только если не пропускаем тест
    let testInsertResult = { success: false, message: 'Тест вставки пропущен' };
    if (!skipTestInsert) {
      console.log('Проверка возможности добавления записи в таблицу ai_models с анонимным ключом:');
      testInsertResult = await testInsertRecord();
      console.log('Результат проверки вставки:', testInsertResult.success ? 'Успех' : 'Ошибка', testInsertResult.message || '');
    } else {
      console.log('Тест вставки записи пропущен для предотвращения автоматического создания моделей');
    }
    
    return { 
      success: !aiModelsError,
      user: user,
      aiModelsCount: count || 0,
      aiModelsData: aiModelsData || undefined,
      insertTest: testInsertResult
    };
  } catch (error) {
    console.error('Ошибка при диагностике базы данных:', error);
    return { success: false, error };
  }
}

// Вспомогательная функция для проверки возможности вставки записи
async function testInsertRecord() {
  return withSupabase(async (client) => {
    let createdRecordId = null;
    
    try {
      // Check for gender column first
      try {
        const { error: schemaError } = await client
          .from('ai_models')
          .select('gender')
          .limit(1);
        
        if (schemaError) {
          const errorMessage = schemaError.message || 'Unknown error';
          
          if (errorMessage.includes('gender') && errorMessage.includes('column')) {
            return { 
              success: false, 
              message: `Таблица ai_models не содержит необходимую колонку gender. Запустите скрипт add-gender-column.sql`,
              error: schemaError
            };
          }
        }
      } catch (err) {
        console.error('Ошибка при проверке схемы:', err);
      }
      
      // Create unique test record with timestamp to ensure it's clearly identifiable
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').substring(0, 15);
      const testRecord = {
        name: `_test_${timestamp}Z`,
        bio: 'Test record for diagnostics - will be deleted',
        avatar_url: '',
        traits: [],
        genres: [],
        gender: 'female'
      };
      
      console.log('Создаем временную тестовую запись для проверки доступа:', testRecord.name);
      
      // Try to insert test record
      const { data, error } = await client
        .from('ai_models')
        .insert([testRecord])
        .select();
        
      if (error) {
        return { 
          success: false, 
          message: `Невозможно вставить запись: ${error.message}`,
          error 
        };
      }
      
      // If insert successful, save ID for later deletion
      if (data && data.length > 0) {
        createdRecordId = data[0].id;
        console.log(`Тестовая запись создана с ID: ${createdRecordId}, будет удалена после проверки`);
      }
      
      // Insert test successful
      return { 
        success: true,
        message: 'Проверка доступа к вставке записей прошла успешно'
      };
    } finally {
      // Always delete test record in finally block, to guarantee execution even if there's an error
      if (createdRecordId) {
        console.log(`Удаляем тестовую запись с ID: ${createdRecordId}`);
        
        // Make multiple attempts to ensure deletion
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const { error: deleteError } = await client
              .from('ai_models')
              .delete()
              .eq('id', createdRecordId);
              
            if (deleteError) {
              console.error(`Ошибка при удалении тестовой записи ${createdRecordId} (попытка ${attempt}/3):`, deleteError);
              // Wait briefly before retry
              if (attempt < 3) await new Promise(r => setTimeout(r, 500));
            } else {
              console.log(`Тестовая запись ${createdRecordId} успешно удалена`);
              break; // Success, exit retry loop
            }
          } catch (deleteErr) {
            console.error(`Непредвиденная ошибка при удалении тестовой записи ${createdRecordId} (попытка ${attempt}/3):`, deleteErr);
            // Wait briefly before retry
            if (attempt < 3) await new Promise(r => setTimeout(r, 500));
          }
        }
        
        // Verify deletion was successful
        try {
          const { data: checkData } = await client
            .from('ai_models')
            .select('id')
            .eq('id', createdRecordId)
            .single();
            
          if (checkData) {
            console.error(`ВНИМАНИЕ: Тестовая запись ${createdRecordId} не была удалена после трех попыток!`);
            
            // Final emergency deletion attempt
            await client
              .from('ai_models')
              .delete()
              .eq('id', createdRecordId);
          }
        } catch {
          // If record is not found, deletion was successful - ignore error
        }
      }
    }
  }).catch((error: unknown) => {
    const err = error instanceof Error ? error : new Error(String(error));
    return { 
      success: false, 
      message: `Ошибка при тестировании вставки: ${err.message}`,
      error: err
    };
  });
}

/**
 * Создает хранимую процедуру для удаления модели по ID
 * Эта функция будет выполняться от имени администратора, обходя RLS
 */
export async function createDeleteModelFunction() {
  return withSupabase(async (client) => {
    // Создаем функцию для удаления модели (security definer позволяет обойти RLS)
    const { error } = await client.rpc('execute_sql', { 
      sql_query: `
        CREATE OR REPLACE FUNCTION public.delete_model(model_id UUID)
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY DEFINER -- Выполняется от имени создателя функции (администратора)
        AS $$
        DECLARE
          success BOOLEAN;
        BEGIN
          DELETE FROM public.ai_models WHERE id = model_id;
          GET DIAGNOSTICS success = ROW_COUNT;
          RETURN success > 0;
        END;
        $$;
        
        CREATE OR REPLACE FUNCTION public.create_delete_model_function()
        RETURNS VOID
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Функция уже существует, поэтому ничего не делаем
        END;
        $$;
      `
    });
    
    if (error) {
      console.error('Ошибка при создании хранимой процедуры для удаления:', error);
      return false;
    }
    
    console.log('Хранимая процедура для удаления моделей успешно создана');
    return true;
  }).catch((err) => {
    console.error('Непредвиденная ошибка при создании хранимой процедуры:', err);
    return false;
  });
} 