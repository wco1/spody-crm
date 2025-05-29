import { getModelAvatar, clearModelCache, clearAllAvatarCache } from './supabase';

// Класс для работы с аватарами моделей, аналогичный newAvatarService.js из основного приложения
export class AvatarService {
  /**
   * Загружает аватар для модели с учетом кэширования
   * @param modelId ID модели
   * @param gender Пол модели (для выбора резервного аватара)
   * @returns URL аватара
   */
  static async getAvatar(modelId: string, gender: string = 'female'): Promise<string> {
    try {
      const avatarUrl = await getModelAvatar(modelId, gender);
      
      // Проверяем валидность полученного URL
      if (avatarUrl.startsWith('http')) {
        const validatedUrl = await this.validateAvatarUrl(avatarUrl);
        if (!validatedUrl) {
          // Если URL невалиден, возвращаем дефолтный аватар по полу
          return gender === 'male' ? '/default-male-avatar.png' : '/default-female-avatar.png';
        }
        return validatedUrl;
      }
      
      return avatarUrl;
    } catch (error) {
      console.warn(`Ошибка при получении аватара для модели ${modelId}:`, error);
      return gender === 'male' ? '/default-male-avatar.png' : '/default-female-avatar.png';
    }
  }
  
  /**
   * Проверяет доступность URL аватара
   * @param url URL для проверки
   * @returns Валидный URL или null, если URL недоступен
   */
  static async validateAvatarUrl(url: string): Promise<string | null> {
    // Если URL пустой или undefined, сразу возвращаем null
    if (!url || url.trim() === '' || url === 'null' || url === 'undefined') {
      return null;
    }
    
    // Проверяем корректность URL
    try {
      // Проверка базовой валидности URL
      const urlObj = new URL(url);
      
      // Проверяем протокол - разрешаем только http и https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.warn(`Недопустимый протокол в URL: ${urlObj.protocol}`);
        return null;
      }
      
      // Проверяем, что URL указывает на изображение (по расширению)
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
      const hasImageExtension = imageExtensions.some(ext => 
        url.toLowerCase().endsWith(ext)
      );

      // Проверяем известные хосты изображений
      const knownImageHosts = [
        'storage.googleapis.com',
        'supabase',
        'cloudinary.com',
        'i.imgur.com',
        'res.cloudinary.com',
        'images.unsplash.com',
        'drive.google.com',
        'kulssuzzjwlyacqvawau.supabase.co'
      ];
      
      const isKnownImageHost = knownImageHosts.some(host => 
        urlObj.hostname.includes(host)
      );
      
      // Если URL на известном хосте или имеет расширение изображения, считаем его валидным
      if (isKnownImageHost || hasImageExtension) {
        return url;
      }
      
      // Для всех остальных URL просто доверяем и возвращаем как есть
      console.log('URL не имеет расширения изображения и не на известном хосте, но всё равно принимаем:', url);
      return url;
      
    } catch (error) {
      // Перехватываем ошибку в случае некорректного URL
      console.warn(`Некорректный формат URL аватара: ${url}`, error);
      return null;
    }
  }
  
  /**
   * Загружает аватар в хранилище и обновляет модель
   * @param file Файл аватара
   * @param modelId ID модели
   * @returns URL загруженного аватара
   */
  static async uploadAvatar(file: File, modelId: string): Promise<string> {
    try {
      const { uploadAvatarAndUpdateModel } = await import('./supabase');
      const result = await uploadAvatarAndUpdateModel(file, modelId);
      
      if (!result.success || !result.url) {
        throw new Error(result.error ? String(result.error) : 'Ошибка загрузки аватара');
      }
      
      return result.url;
    } catch (uploadError) {
      console.error(`Ошибка при загрузке аватара для модели ${modelId}:`, uploadError);
      throw uploadError;
    }
  }
  
  /**
   * Очищает кэш аватаров
   * @param modelId ID модели (опционально, если не указан - очищает весь кэш)
   * @returns Статус очистки
   */
  static clearCache(modelId?: string): boolean {
    try {
      if (modelId) {
        return clearModelCache(modelId);
      }
      return clearAllAvatarCache();
    } catch (cacheError) {
      console.error('Ошибка при очистке кэша аватаров:', cacheError);
      return false;
    }
  }
}

// Экспортируем сервис по умолчанию
export default AvatarService; 