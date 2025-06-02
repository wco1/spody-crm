import { supabase, supabaseAdmin, getAuthHeaders, withSupabaseAdmin, withSupabase } from './supabase';
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
    return withSupabaseAdmin(async (client) => {
      console.log('Getting all models using admin client...');

      // Используем административный клиент для операций CRM
      const { data, error } = await client
        .from('ai_models')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching models:', error);
        throw error;
      }
      
      return data || [];
    });
  }
  
  /**
   * Получает модель по ID
   * @param id ID модели
   */
  static async getModelById(id: string): Promise<AIModel | null> {
    return withSupabaseAdmin(async (client) => {
      console.log(`Getting model ${id} using admin client...`);

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
    }).catch((err) => {
      console.error(`Error in getModelById for ${id}:`, err);
      return null;
    });
  }
  
  /**
   * Создает новую модель
   * @param model Данные модели
   */
  static async createModel(model: ModelCreateInput): Promise<AIModel | null> {
    return withSupabaseAdmin(async (client) => {
      // Проверяем обязательные поля
      if (!model.name.trim()) {
        throw new Error('Model name is required');
      }
      
      console.log('Creating model using admin client:', model.name);
      
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
    });
  }
  
  /**
   * Обновляет существующую модель
   * @param id ID модели
   * @param updates Обновляемые поля
   */
  static async updateModel(id: string, updates: ModelUpdateInput): Promise<AIModel | null> {
    return withSupabaseAdmin(async (client) => {
      console.log(`Updating model ${id} with admin client:`, JSON.stringify(updates, null, 2));
      
      // Если обновляется имя, проверяем что оно не пустое
      if (updates.name !== undefined && !updates.name.trim()) {
        throw new Error('Model name cannot be empty');
      }
      
      const updateData = {
        ...updates,
        updated_at: new Date()
      };
      
      const response = await client
        .from('ai_models')
        .update(updateData)
        .eq('id', id)
        .select();
      
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
    });
  }
  
  /**
   * Удаляет модель по ID
   * @param id ID модели для удаления
   */
  static async deleteModel(id: string): Promise<boolean> {
    return withSupabaseAdmin(async (client) => {
      console.log(`Attempting to delete model ${id} using admin client...`);
      
      // Используем административный клиент
      let { error } = await client
        .from('ai_models')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Первая попытка удаления модели ${id} не удалась:`, error);
        
        // Пробуем альтернативный способ удаления - сначала создаем хранимую процедуру
        console.log('Пробуем создать хранимую процедуру для удаления...');
        
        try {
          // Создаем хранимую процедуру для удаления (если её еще нет)
          await client.rpc('create_delete_model_function');
        } catch (procCreateErr) {
          console.log('Хранимая процедура уже существует или создана, продолжаем...');
        }
        
        // Пробуем удалить через хранимую процедуру
        const result = await client.rpc('delete_model', { model_id: id });
          
        error = result.error;
        
        if (error) {
          console.error(`Вторая попытка удаления модели ${id} не удалась:`, error);
            throw error;
        }
      }
      
      // Очищаем кэш аватара
      AvatarService.clearCache(id);
      
      console.log(`Модель ${id} успешно удалена`);
      return true;
    });
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
    return withSupabase(async (client) => {
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
        const { error: schemaError } = await client
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
    });
  }
  
  /**
   * Очищает все тестовые модели из базы данных
   * @returns Количество удаленных тестовых моделей
   */
  static async cleanupTestModels(): Promise<number> {
    return withSupabaseAdmin(async (client) => {
      console.log('Cleaning up test models using admin client...');
      
      // Сначала получаем все тестовые модели
      const { data: testModels, error: fetchError } = await client
        .from('ai_models')
        .select('id, name')
        .like('name', '_test_%');
      
      if (fetchError) {
        console.error('Ошибка получения тестовых моделей:', fetchError);
        throw fetchError;
      }
      
      if (!testModels || testModels.length === 0) {
        console.log('Тестовые модели не найдены');
        return 0;
      }
      
      console.log(`Найдено ${testModels.length} тестовых моделей для удаления:`, 
        testModels.map(m => m.name).join(', '));
      
      // Удаляем все тестовые модели одним запросом
      const { error: deleteError } = await client
        .from('ai_models')
        .delete()
        .like('name', '_test_%');
      
      if (deleteError) {
        console.error('Ошибка удаления тестовых моделей:', deleteError);
        
        // Если массовое удаление не сработало, пробуем удалить по одной
        let deletedCount = 0;
        for (const model of testModels) {
          try {
            await this.deleteModel(model.id);
            deletedCount++;
            console.log(`Удалена тестовая модель: ${model.name}`);
          } catch (err) {
            console.error(`Не удалось удалить модель ${model.name}:`, err);
          }
        }
        return deletedCount;
      }
        
      // Очищаем кэш аватаров для всех удаленных моделей
      testModels.forEach(model => {
        AvatarService.clearCache(model.id);
      });
        
      console.log(`Успешно удалено ${testModels.length} тестовых моделей`);
      return testModels.length;
    });
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
      
      return withSupabase(async (client) => {
        // Для авторизации напрямую используем токен
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
      });
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