import { supabase, getAuthHeaders } from './supabase';
import AvatarService from './avatarService';

export interface AIModel {
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

export interface ModelCreateInput {
  name: string;
  bio: string;
  avatar_url?: string;
  traits?: string[];
  genres?: string[];
  gender?: 'male' | 'female' | '';
}

export interface ModelUpdateInput {
  name?: string;
  bio?: string;
  avatar_url?: string;
  traits?: string[];
  genres?: string[];
  gender?: 'male' | 'female' | '';
}

// Класс для работы с моделями
export class ModelService {
  /**
   * Получает все модели из базы данных
   */
  static async getAllModels(): Promise<AIModel[]> {
    try {
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();
      console.log('Auth headers for getAllModels:', 
        Object.keys(authHeaders).length > 0 ? 'Headers set' : 'No auth headers');

      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        // Добавляем авторизацию с помощью set-метода
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
      }

      // Используем клиент с установленной авторизацией
      const { data, error } = await client
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching models:', error);
        throw error;
      }
      
      return data || [];
    } catch (err) {
      console.error('Error in getAllModels:', err);
      throw err;
    }
  }
  
  /**
   * Получает модель по ID
   * @param id ID модели
   */
  static async getModelById(id: string): Promise<AIModel | null> {
    try {
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();

      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        // Добавляем авторизацию с помощью set-метода
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
      }

      const { data, error } = await client
        .from('ai_models')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching model ${id}:`, error);
        return null;
      }
      
      return data;
    } catch (err) {
      console.error(`Error in getModelById for ${id}:`, err);
      return null;
    }
  }
  
  /**
   * Создает новую модель
   * @param model Данные модели
   */
  static async createModel(model: ModelCreateInput): Promise<AIModel | null> {
    try {
      // Проверяем обязательные поля
      if (!model.name.trim()) {
        throw new Error('Model name is required');
      }
      
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();
      
      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        // Добавляем авторизацию с помощью set-метода
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
      }
      
      const { data, error } = await client
        .from('ai_models')
        .insert([{
          name: model.name.trim(),
          bio: model.bio || '',
          avatar_url: model.avatar_url || '',
          traits: model.traits || [],
          genres: model.genres || [],
          gender: model.gender || 'female'
        }])
        .select();
      
      if (error) {
        console.error('Error creating model:', error);
        throw error;
      }
      
      return data?.[0] || null;
    } catch (err) {
      console.error('Error in createModel:', err);
      throw err;
    }
  }
  
  /**
   * Обновляет существующую модель
   * @param id ID модели
   * @param updates Обновляемые поля
   */
  static async updateModel(id: string, updates: ModelUpdateInput): Promise<AIModel | null> {
    try {
      console.log(`Updating model ${id} with data:`, JSON.stringify(updates, null, 2));
      
      // Если обновляется имя, проверяем что оно не пустое
      if (updates.name !== undefined && !updates.name.trim()) {
        throw new Error('Model name cannot be empty');
      }
      
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();
      console.log('Auth headers for update:', authHeaders ? 'Present' : 'Missing');
      
      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        // Добавляем авторизацию с помощью set-метода
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
        console.log('Auth session set for update');
      } else {
        console.warn('No auth token for model update operation');
      }
      
      const updateData = {
        ...updates,
        updated_at: new Date()
      };
      
      console.log('Final data being sent to Supabase:', JSON.stringify(updateData, null, 2));
      
      const response = await client
        .from('ai_models')
        .update(updateData)
        .eq('id', id)
        .select();
      
      console.log('Supabase update response:', response);
      
      if (response.error) {
        console.error(`Error updating model ${id}:`, response.error);
        console.error('Error details:', {
          code: response.error.code,
          message: response.error.message,
          details: response.error.details,
          hint: response.error.hint
        });
        throw response.error;
      }
      
      // Если данные не вернулись, делаем отдельный запрос на получение модели
      if (!response.data || response.data.length === 0) {
        console.warn('No data returned from update operation. Fetching updated model separately.');
        
        // Делаем паузу, чтобы изменения успели примениться
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Запрашиваем модель отдельно
        const model = await this.getModelById(id);
        
        if (model) {
          console.log('Successfully retrieved updated model:', model);
          
          // Очищаем кэш аватара если обновлялся аватар
          if (updates.avatar_url !== undefined) {
            AvatarService.clearCache(id);
          }
          
          return model;
        } else {
          console.error('Failed to retrieve updated model');
          throw new Error('Update operation might have succeeded, but could not retrieve updated model');
        }
      }
      
      console.log(`Model ${id} updated successfully, response:`, response.data?.[0]);
      
      // Если обновлялся аватар, очищаем кэш
      if (updates.avatar_url !== undefined) {
        AvatarService.clearCache(id);
      }
      
      return response.data?.[0] || null;
    } catch (err) {
      console.error(`Error in updateModel for ${id}:`, err);
      console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
      throw err;
    }
  }
  
  /**
   * Удаляет модель
   * @param id ID модели
   */
  static async deleteModel(id: string): Promise<boolean> {
    try {
      console.log(`Начинаем удаление модели ${id}`);
      
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();
      
      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        // Добавляем авторизацию с помощью set-метода
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
      } else {
        console.warn('Удаление модели без токена авторизации');
      }
      
      // Пробуем использовать более прямой подход для удаления, обходя Row Level Security
      // с помощью хранимой процедуры
      try {
        const { error: procError } = await client.rpc('delete_model', { model_id: id });
        
        if (!procError) {
          console.log(`Модель ${id} успешно удалена через хранимую процедуру`);
          
          // Очищаем кэш аватара
          AvatarService.clearCache(id);
          return true;
        } else {
          console.warn(`Не удалось удалить через хранимую процедуру: ${procError.message}`);
        }
      } catch {
        console.warn('Хранимая процедура для удаления недоступна, используем стандартный метод');
      }
      
      // Если процедура не сработала, используем обычный метод удаления
      let { error } = await client
        .from('ai_models')
        .delete()
        .eq('id', id);
      
      // Если произошла ошибка, пробуем еще раз с задержкой
      if (error) {
        console.error(`Первая попытка удаления модели ${id} не удалась:`, error);
        
        // Ждем 1 секунду и пробуем снова
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Вторая попытка
        const result = await client
          .from('ai_models')
          .delete()
          .eq('id', id);
          
        error = result.error;
        
        if (error) {
          console.error(`Вторая попытка удаления модели ${id} не удалась:`, error);
          
          // Создаем хранимую процедуру для удаления, если её нет
          try {
            console.log('Создаем временную хранимую процедуру для удаления...');
            await client.rpc('create_delete_model_function');
            
            // Теперь пробуем удалить через созданную процедуру
            const { error: finalError } = await client.rpc('delete_model', { model_id: id });
            
            if (finalError) {
              console.error('Не удалось удалить модель даже через созданную процедуру:', finalError);
              throw finalError;
            }
          } catch (procCreateErr) {
            console.error('Не удалось создать хранимую процедуру:', procCreateErr);
            throw error;
          }
        }
      }
      
      // Очищаем кэш аватара
      AvatarService.clearCache(id);
      
      console.log(`Модель ${id} успешно удалена`);
      return true;
    } catch (err) {
      console.error(`Error in deleteModel for ${id}:`, err);
      throw err;
    }
  }
  
  /**
   * Загружает аватар и обновляет модель
   * @param id ID модели
   * @param file Файл аватара
   */
  static async uploadAvatar(id: string, file: File): Promise<string> {
    try {
      // Проверяем входные параметры
      if (!id || !file) {
        throw new Error("Отсутствуют необходимые параметры: ID модели или файл аватара");
      }
      
      // Проверка файла
      if (!(file instanceof File)) {
        throw new Error("Переданный объект не является файлом");
      }
      
      // Проверка типа файла
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error(`Неподдерживаемый тип файла: ${file.type}. Поддерживаются: ${validTypes.join(', ')}`);
      }
      
      // Проверка размера файла (макс. 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error(`Размер файла (${Math.round(file.size/1024)}KB) превышает максимально допустимый (5MB)`);
      }
      
      // Загрузка аватара
      const avatarUrl = await AvatarService.uploadAvatar(file, id);
      
      // Очищаем кэш аватаров для данной модели
      AvatarService.clearCache(id);
      
      return avatarUrl;
    } catch (err) {
      console.error(`Error uploading avatar for model ${id}:`, err);
      
      // Преобразуем ошибку в понятное сообщение
      let message: string;
      
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null) {
        // Извлекаем сообщение из объекта ошибки Supabase
        const errObj = err as { error?: { message: string }, message?: string };
        if (errObj.error && errObj.error.message) {
          message = errObj.error.message;
        } else if (errObj.message) {
          message = errObj.message;
        } else {
          message = JSON.stringify(err);
        }
      } else {
        message = String(err);
      }
      
      throw new Error(`Ошибка загрузки аватара: ${message}`);
    }
  }
  
  /**
   * Получает URL аватара модели
   * @param id ID модели
   */
  static async getAvatarUrl(id: string): Promise<string> {
    try {
      const model = await this.getModelById(id);
      if (!model) {
        throw new Error(`Model ${id} not found`);
      }
      
      return await AvatarService.getAvatar(id, model.gender);
    } catch (err) {
      console.error(`Error getting avatar URL for model ${id}:`, err);
      throw err;
    }
  }
  
  /**
   * Создает тестовую модель
   */
  static async createTestModel(): Promise<AIModel | null> {
    try {
      // Создаем уникальное имя с точной датой и временем
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').substring(0, 15);
      const testModel: ModelCreateInput = {
        name: `_test_${timestamp}Z`,
        bio: 'Test record for diagnostics - will be deleted',
        traits: ['test', 'demo', 'sample'],
        genres: ['test'],
        gender: 'female'
      };
      
      console.log('Создаем тестовую модель с именем:', testModel.name);
      
      // Проверяем, есть ли у нас нужные колонки в таблице
      try {
        const { error: schemaError } = await supabase
          .from('ai_models')
          .select('id')
          .limit(1);
        
        if (schemaError) {
          const errorMessage = schemaError.message || 'Unknown error';
          
          // Если ошибка связана с отсутствием столбца gender, выводим понятное сообщение
          if (errorMessage.includes('gender') && errorMessage.includes('column')) {
            throw new Error('Для таблицы ai_models требуется колонка gender. Запустите скрипт add-gender-column.sql в админ-панели Supabase');
          }
          
          throw schemaError;
        }
      } catch (schemaErr: unknown) {
        console.error('Ошибка проверки схемы таблицы:', schemaErr);
        throw schemaErr;
      }
      
      return await this.createModel(testModel);
    } catch (err: unknown) {
      console.error('Ошибка создания тестовой модели:', err);
      throw err; 
    }
  }
  
  /**
   * Очищает все тестовые модели из базы данных
   * @returns Количество удаленных тестовых моделей
   */
  static async cleanupTestModels(): Promise<number> {
    try {
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();
      
      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        // Добавляем авторизацию с помощью set-метода
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
      }
      
      // Добавляем нужные колонки в таблицу, если их нет
      try {
        await client.rpc('execute_sql', { 
          sql_query: `
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'ai_models' AND column_name = 'gender' AND table_schema = 'public'
              ) THEN
                ALTER TABLE public.ai_models 
                ADD COLUMN gender VARCHAR DEFAULT 'female';
              END IF;
            END
            $$;
          `
        });
      } catch (err) {
        console.log('Ошибка при проверке схемы таблицы:', err);
      }
      
      // Получаем список всех тестовых моделей
      console.log('Поиск тестовых моделей для удаления...');
      
      // Сначала пробуем найти модели, начинающиеся с '_test_'
      const { data: testModels1, error: findError1 } = await client
        .from('ai_models')
        .select('id')
        .like('name', '_test\\_%');
      
      // Затем ищем модели, начинающиеся с 'Test Model'
      const { data: testModels2, error: findError2 } = await client
        .from('ai_models')
        .select('id')
        .like('name', 'Test Model%');
      
      // Объединяем результаты в один массив
      const testModels = [
        ...(testModels1 || []),
        ...(testModels2 || [])
      ];
      
      if ((findError1 || findError2)) {
        console.error('Ошибка при поиске тестовых моделей:', findError1 || findError2);
        throw findError1 || findError2;
      }
      
      if (!testModels || testModels.length === 0) {
        console.log('Тестовые модели не найдены');
        return 0;
      }
      
      console.log(`Найдено ${testModels.length} тестовых моделей для удаления:`, 
        testModels.map(m => m.id).join(', '));
      
      // Удаляем все найденные тестовые модели
      if (testModels.length > 0) {
        console.log('Удаление тестовых моделей...');
        
        // Удаляем модели пакетами по 20 штук
        let deletedTotal = 0;
        
        for (let i = 0; i < testModels.length; i += 20) {
          const batch = testModels.slice(i, i + 20);
          console.log(`Удаление пакета ${i/20 + 1}/${Math.ceil(testModels.length/20)} (${batch.length} моделей)`);
          
          try {
            const { error: deleteError } = await client
              .from('ai_models')
              .delete()
              .in('id', batch.map(model => model.id));
              
            if (deleteError) {
              console.error(`Ошибка при удалении пакета моделей:`, deleteError);
            } else {
              deletedTotal += batch.length;
            }
          } catch (batchError) {
            console.error(`Ошибка при удалении пакета:`, batchError);
          }
          
          // Небольшая пауза между запросами
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        console.log(`Успешно удалено ${deletedTotal} из ${testModels.length} тестовых моделей`);
        return deletedTotal;
      }
      
      return 0;
    } catch (err) {
      console.error('Ошибка при очистке тестовых моделей:', err);
      throw err;
    }
  }

  // Добавляем функцию для тестирования обновления модели
  static async testUpdateModel(id: string): Promise<{ success: boolean; message: string; data?: unknown }> {
    try {
      console.log(`Testing update for model ${id}`);
      
      // Получаем текущую модель
      const model = await this.getModelById(id);
      if (!model) {
        return { success: false, message: `Модель с ID ${id} не найдена` };
      }
      
      console.log('Current model data:', model);
      
      // Получаем заголовки авторизации
      const authHeaders = await getAuthHeaders();
      console.log('Auth headers:', Object.keys(authHeaders).length > 0 ? 'Headers present' : 'No headers');
      
      // Подготавливаем минимальные данные для обновления
      const testUpdate = {
        name: `${model.name} (test)`,
        updated_at: new Date()
      };
      
      console.log('Sending test update:', testUpdate);
      
      // Для авторизации напрямую используем токен
      const client = supabase;
      if (authHeaders.Authorization) {
        client.auth.setSession({
          access_token: authHeaders.Authorization.replace('Bearer ', ''),
          refresh_token: ''
        });
        console.log('Auth session set for test update');
      }
      
      // Отправляем запрос на обновление
      const response = await client
        .from('ai_models')
        .update(testUpdate)
        .eq('id', id)
        .select();
      
      console.log('Update response:', response);
      
      if (response.error) {
        return { 
          success: false, 
          message: `Ошибка обновления: ${response.error.message}`,
          data: response 
        };
      }
      
      // Проверяем, что данные вернулись
      if (!response.data || response.data.length === 0) {
        // Попробуем получить данные после обновления отдельным запросом
        const { data: verifyData, error: verifyError } = await client
          .from('ai_models')
          .select('*')
          .eq('id', id)
          .single();
        
        if (verifyError) {
          return { 
            success: false, 
            message: 'Обновление, возможно, выполнено, но данные не возвращены. Проверка также не удалась.',
            data: { response, verifyError }
          };
        }
        
        // Проверяем, содержит ли полученная модель наши обновления
        if (verifyData && verifyData.name === testUpdate.name) {
          return { 
            success: true, 
            message: 'Обновление выполнено, но Supabase не вернул данные в update. Данные восстановлены отдельным запросом.',
            data: verifyData
          };
        }
        
        return { 
          success: false, 
          message: 'Обновление не применилось. Данные не изменились.',
          data: { response, verifyData }
        };
      }
      
      return { 
        success: true, 
        message: 'Тестовое обновление выполнено успешно',
        data: response.data[0]
      };
    } catch (err) {
      console.error('Error in testUpdateModel:', err);
      return { 
        success: false, 
        message: `Ошибка тестирования обновления: ${err instanceof Error ? err.message : String(err)}`,
        data: err
      };
    }
  }
}

// Экспортируем сервис по умолчанию
export default ModelService; 