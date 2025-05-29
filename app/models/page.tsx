'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getDatabaseInfo } from '../utils/supabase';
import Image from 'next/image';
import ModelService, { AIModel } from '../utils/modelService';
import AvatarService from '../utils/avatarService';
import CleanupService from '../utils/cleanupService';

// Интерфейс для ошибок Supabase
interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

// Интерфейс для диагностики базы данных
interface DiagnosticResult {
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
  error?: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<{cleared: boolean, message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Новая модель (для добавления)
  const [newModel, setNewModel] = useState({
    name: '',
    avatar_url: '',
    bio: '',
    traits: [] as string[],
    genres: [] as string[],
    gender: ''
  });

  // Обработчик загрузки файла аватара
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Проверяем, что это изображение
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setError('Можно загружать только изображения');
        return;
      }
      
      // Ограничение по размеру (2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Размер файла не должен превышать 2MB');
        return;
      }
      
      // Создаем URL для предпросмотра
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      setAvatarFile(file);
    }
  };
  
  // Загрузка файла в Supabase Storage и обновление модели
  const uploadAvatar = async (modelId: string) => {
    if (!avatarFile) return null;
    
    try {
      setFileUploading(true);
      
      // Проверка размера файла перед загрузкой
      if (avatarFile.size > 5 * 1024 * 1024) { // 5 МБ
        setError('Размер файла не должен превышать 5MB');
        return null;
      }
      
      // Проверяем формат файла
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(avatarFile.type)) {
        setError(`Неподдерживаемый формат файла. Поддерживаются: ${validTypes.join(', ')}`);
        return null;
      }
      
      const avatarUrl = await ModelService.uploadAvatar(modelId, avatarFile);
      
      // Очищаем превью после успешной загрузки
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      
      // Очищаем кэш для этой модели, чтобы новый аватар отобразился
      AvatarService.clearCache(modelId);
      
      return avatarUrl;
    } catch (err) {
      let errorMessage = 'Не удалось загрузить файл';
      
      if (err instanceof Error) {
        errorMessage += `: ${err.message}`;
      } else if (typeof err === 'object' && err !== null) {
        // Пытаемся извлечь понятное сообщение об ошибке
        const errObj = err as { error?: { message: string }, message?: string };
        if (errObj.error && errObj.error.message) {
          errorMessage += `: ${errObj.error.message}`;
        } else if (errObj.message) {
          errorMessage += `: ${errObj.message}`;
        }
      }
      
      console.error('Ошибка загрузки аватара:', err);
      setError(errorMessage);
      return null;
    } finally {
      setFileUploading(false);
    }
  };

  // Функция для очистки кэша аватаров
  const handleClearCache = (modelId?: string) => {
    try {
      if (modelId) {
        // Очистка кэша для конкретной модели
        AvatarService.clearCache(modelId);
        setCacheStatus({
          cleared: true,
          message: `Кэш аватара для модели ${modelId} успешно очищен`
        });
      } else {
        // Полная очистка кэша
        AvatarService.clearCache();
        setCacheStatus({
          cleared: true,
          message: `Кэш аватаров успешно очищен`
        });
      }
      
      // Автоматически скрываем сообщение через 3 секунды
      setTimeout(() => {
        setCacheStatus(null);
      }, 3000);
    } catch (err) {
      const error = err as Error;
      setError(`Ошибка при очистке кэша: ${error.message}`);
    }
  };

  // Функция для создания тестовой модели
  const createTestModel = async () => {
    try {
      setLoading(true);
      const newModel = await ModelService.createTestModel();
      
      if (newModel) {
        console.log('Тестовая модель успешно создана:', newModel);
        // Обновляем список моделей
        setModels(prevModels => [newModel, ...prevModels]);
      } else {
        setError('Не удалось создать тестовую модель');
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Ошибка при создании тестовой модели:', err);
      setError(`Ошибка при создании тестовой модели: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Функция для очистки всех тестовых моделей
  const cleanupTestModels = async (silent: boolean = false) => {
    try {
      if (!silent && !confirm('Вы уверены, что хотите удалить ВСЕ тестовые модели?')) {
        return 0;
      }
      
      if (!silent) {
        setLoading(true);
        setError('');
      }
      
      // Use the new CleanupService for more comprehensive cleanup
      const deletedCount = await CleanupService.runWithTiming();
      
      if (deletedCount > 0) {
        // Update the model list to remove test models
        setModels(prevModels => prevModels.filter(model => 
          !model.name.startsWith('_test_') && 
          !model.name.startsWith('Test Model') &&
          !model.name.toLowerCase().includes('test')
        ));
        
        if (!silent) {
          setCacheStatus({
            cleared: true,
            message: `Успешно удалено ${deletedCount} тестовых моделей`
          });
          
          // Auto-hide message after 3 seconds
          setTimeout(() => {
            setCacheStatus(null);
          }, 3000);
        } else {
          // For silent cleanup, just update status through console
          console.log(`Автоочистка: удалено ${deletedCount} тестовых моделей`);
        }
      } else if (!silent) {
        setCacheStatus({
          cleared: true,
          message: 'Тестовые модели не найдены'
        });
        
        // Auto-hide message after 3 seconds
        setTimeout(() => {
          setCacheStatus(null);
        }, 3000);
      }
      
      return deletedCount;
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Ошибка при очистке тестовых моделей:', err);
      
      if (!silent) {
        setError(`Ошибка при очистке тестовых моделей: ${err.message}`);
      } else {
        console.error(`Ошибка автоочистки: ${err.message}`);
      }
      
      return 0;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Загрузка списка моделей
  useEffect(() => {
    async function fetchModels() {
      setLoading(true);
      setError('');
      
      try {
        // Убираем создание хранимой процедуры - используем стандартное удаление
        
        // First, aggressively clean up any test models
        try {
          console.log('Выполнение агрессивной очистки тестовых моделей при загрузке страницы...');
          const totalDeleted = await CleanupService.runWithTiming();
          
          if (totalDeleted > 0) {
            console.log(`Успешно удалено ${totalDeleted} тестовых моделей при загрузке страницы`);
            // Отображаем сообщение об автоочистке
            setCacheStatus({
              cleared: true,
              message: `Автоочистка: удалено ${totalDeleted} тестовых моделей`
            });
            
            setTimeout(() => {
              setCacheStatus(null);
            }, 5000);
          }
        } catch (cleanupError) {
          console.error('Ошибка при агрессивной очистке тестовых моделей:', cleanupError);
        }
        
        // Skip the test insertion completely
        console.log('Запуск диагностики базы данных (без тестовой вставки)...');
        const dbInfo = await getDatabaseInfo(true); // Pass true to skip test insertion
        console.log('Результат диагностики:', dbInfo);
        
        // Convert result to DiagnosticResult type
        const diagnosticData: DiagnosticResult = {
          success: dbInfo.success,
          user: dbInfo.user,
          aiModelsCount: dbInfo.aiModelsCount || 0,
          aiModelsData: dbInfo.aiModelsData as AIModel[] || [],
          insertTest: dbInfo.insertTest,
          error: dbInfo.error ? String(dbInfo.error) : undefined
        };
        setDiagnosticResult(diagnosticData);
        
        console.log('Загрузка моделей из таблицы ai_models...');
        
        // Load all models using the service
        const models = await ModelService.getAllModels();
        console.log(`Загружено ${models.length} моделей`);
        
        // Filter out any remaining test models from the display
        const filteredModels = models.filter(model => 
          !model.name.startsWith('_test_') && 
          !model.name.startsWith('Test Model') &&
          !model.name.toLowerCase().includes('test')
        );
        
        if (filteredModels.length < models.length) {
          console.log(`Отфильтровано ${models.length - filteredModels.length} тестовых моделей из отображения`);
        }
        
        setModels(filteredModels);
      } catch (error: unknown) {
        const err = error as Error;
        console.error('Ошибка при загрузке моделей:', err);
        setError('Не удалось загрузить модели. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchModels();
  }, []);

  // Переключение отображения диагностики
  const toggleDiagnostics = () => {
    setShowDiagnostics(!showDiagnostics);
  };

  // Обработчик открытия модального окна для редактирования
  const openEditModal = (model: AIModel) => {
    setSelectedModel(model);
    setIsAddingNew(false);
    setIsModalOpen(true);
  };

  // Обработчик открытия модального окна для добавления
  const openAddModal = () => {
    setSelectedModel(null);
    setIsAddingNew(true);
    setNewModel({
      name: '',
      avatar_url: '',
      bio: '',
      traits: [],
      genres: [],
      gender: ''
    });
    setIsModalOpen(true);
  };

  // Обработчик закрытия модального окна
  const closeModal = () => {
    setIsModalOpen(false);
    // Очищаем превью при закрытии модального окна
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setAvatarFile(null);
  };

  // Проверка корректности URL
  const isValidURL = (url: string): boolean => {
    if (!url) return true; // Пустой URL считаем валидным
    
    try {
      const urlObj = new URL(url);
      
      // Проверяем протокол - разрешаем только http и https
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        console.warn(`Недопустимый протокол в URL: ${urlObj.protocol}`);
        return false;
      }
      
      // Увеличиваем список типичных расширений изображений
      const imageExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', 
        '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP', '.SVG', '.BMP',
        '.avif', '.ico', '.tiff', '.tif'
      ];
      
      // Если URL заканчивается на одно из известных расширений - считаем его изображением
      // Проверяем окончание пути, а не всего URL (чтобы работало с параметрами)
      const hasImageExtension = imageExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      );
      
      // Расширяем список известных хостов для изображений
      const knownImageHosts = [
        'storage.googleapis.com', 'supabase', 'cloudinary.com',
        'i.imgur.com', 'imgur.com', 'res.cloudinary.com',
        'images.unsplash.com', 'unsplash.com', 'drive.google.com', 
        'googleusercontent.com', 'storage.cloud.google.com',
        'kulssuzzjwlyacqvawau.supabase.co', 'vercel.app',
        'amazonaws.com', 's3.amazonaws.com', 'storage.yandexcloud.net',
        'cdn.', 'media.', 'img.', 'photo.', 'pics.', 'static.',
        'images.'
      ];
      
      const isKnownImageHost = knownImageHosts.some(host => 
        urlObj.hostname.includes(host)
      );
      
      // Проверяем содержание URL на ключевые слова, указывающие на изображение
      const imageKeywords = ['image', 'photo', 'picture', 'avatar', 'img', 'pic', 'thumb'];
      const containsImageKeyword = imageKeywords.some(keyword => 
        urlObj.pathname.toLowerCase().includes(keyword)
      );
      
      // Если URL на известном хосте, имеет расширение изображения или содержит ключевое слово - считаем его валидным
      return isKnownImageHost || hasImageExtension || containsImageKeyword;
    } catch {
      return false;
    }
  };

  // Обработчик удаления модели
  const deleteModel = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту модель?')) {
      return;
    }
    
    try {
      setLoading(true);
      const success = await ModelService.deleteModel(id);
      
      if (success) {
        // Обновляем список моделей
        setModels(prevModels => prevModels.filter(model => model.id !== id));
        
        // Если открыто модальное окно для этой модели, закрываем его
        if (selectedModel && selectedModel.id === id) {
          closeModal();
        }
      } else {
        setError('Не удалось удалить модель');
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Ошибка при удалении модели:', err);
      setError(`Не удалось удалить модель: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Обработчик изменений в форме редактирования
  const handleSelectedModelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (selectedModel) {
      console.log(`Updating model field: ${name}, new value: ${value}`);
      
      // Создаем новый объект модели с обновленным значением
      const updatedModel = {
        ...selectedModel,
        [name]: value
      };
      
      // Обновляем состояние с новым объектом
      setSelectedModel(updatedModel);
      
      // Логируем обновленную модель
      console.log('Updated model object:', updatedModel);
    }
  };

  // Обработчик изменений в форме добавления
  const handleNewModelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setNewModel({
      ...newModel,
      [name]: value
    });
  };

  // Обработчик сохранения изменений
  const saveChanges = async () => {
    try {
      // Проверка на пустое имя
      if (isAddingNew) {
        const modelName = newModel.name.trim();
        
        if (!modelName) {
          setError('Название модели не может быть пустым');
          return;
        }
      } else if (selectedModel && !selectedModel.name.trim()) {
        setError('Название модели не может быть пустым');
        return;
      }
      
      if (isAddingNew) {
        // Создание новой модели
        if (uploadMethod === 'file' && avatarFile) {
          // Для файла сначала создаем модель, потом загружаем аватар
          const createdModel = await ModelService.createModel({
            name: newModel.name,
            bio: newModel.bio,
            gender: newModel.gender as 'male' | 'female' | undefined,
            traits: newModel.traits,
            genres: newModel.genres
          });
          
          if (createdModel) {
            // Загружаем аватар и обновляем модель
            const avatarUrl = await uploadAvatar(createdModel.id);
            
            if (avatarUrl) {
              // Обновляем модель с новым URL аватара
              const updatedModel = await ModelService.updateModel(createdModel.id, {
                avatar_url: avatarUrl
              });
              
              // Обновляем список моделей
              if (updatedModel) {
                setModels(prevModels => [updatedModel, ...prevModels]);
              } else {
                setModels(prevModels => [createdModel, ...prevModels]);
              }
            } else {
              // Если не удалось загрузить аватар, все равно добавляем модель
              setModels(prevModels => [createdModel, ...prevModels]);
            }
          }
        } else {
          // URL метод
          const avatarUrl = newModel.avatar_url;
          
          console.log(`Добавление модели с URL аватара: ${avatarUrl}`);
          
          // Проверяем URL если он указан
          if (avatarUrl && !isValidURL(avatarUrl)) {
            console.error(`Некорректный URL аватара: ${avatarUrl}`);
            setError('Указан некорректный URL для аватара');
            return;
          }
          
          // Проверяем, можно ли загрузить изображение
          if (avatarUrl) {
            // Проверяем изображение и логируем результат
            try {
              console.log(`Проверка доступности изображения по URL: ${avatarUrl}`);
              const preloadResult = await preloadImage(avatarUrl);
              console.log(`Результат проверки изображения: ${preloadResult ? 'Доступно' : 'Недоступно'}`);
            } catch (err) {
              console.warn(`Ошибка при проверке доступности изображения: ${err}`);
            }
          }
          
          // Создаем модель с указанным URL аватара
          const createdModel = await ModelService.createModel({
            name: newModel.name,
            bio: newModel.bio,
            avatar_url: avatarUrl,
            gender: newModel.gender as 'male' | 'female' | undefined,
            traits: newModel.traits,
            genres: newModel.genres
          });
          
          if (createdModel) {
            // Обновляем список моделей
            setModels(prevModels => [createdModel, ...prevModels]);
          }
        }
      } else if (selectedModel) {
        // Обновление существующей модели
        console.log('Saving existing model with data:', selectedModel);
        
        if (uploadMethod === 'file' && avatarFile) {
          // Загружаем аватар и получаем URL
          const avatarUrl = await uploadAvatar(selectedModel.id);
          
          // Обновляем модель в базе данных
          if (avatarUrl) {
            console.log('Updating model with new avatar URL:', avatarUrl);
            
            const updatedModel = await ModelService.updateModel(selectedModel.id, {
              name: selectedModel.name,
              bio: selectedModel.bio,
              avatar_url: avatarUrl,
              gender: selectedModel.gender as 'male' | 'female' | undefined,
              traits: selectedModel.traits,
              genres: selectedModel.genres
            });
            
            if (updatedModel) {
              console.log('Model updated successfully with avatar:', updatedModel);
              // Обновляем модель в списке
              setModels(prevModels => prevModels.map(model => 
                model.id === selectedModel.id ? updatedModel : model
              ));
            } else {
              console.error('Failed to update model with avatar');
              setError('Не удалось обновить модель с новым аватаром');
              return;
            }
          } else {
            // Обновляем без аватара
            console.log('Updating model without new avatar');
            
            const updatedModel = await ModelService.updateModel(selectedModel.id, {
              name: selectedModel.name,
              bio: selectedModel.bio,
              gender: selectedModel.gender as 'male' | 'female' | undefined,
              traits: selectedModel.traits,
              genres: selectedModel.genres
            });
            
            if (updatedModel) {
              console.log('Model updated successfully without avatar:', updatedModel);
              // Обновляем модель в списке
              setModels(prevModels => prevModels.map(model => 
                model.id === selectedModel.id ? updatedModel : model
              ));
            } else {
              console.error('Failed to update model without avatar');
              setError('Не удалось обновить модель');
              return;
            }
          }
        } else {
          // URL метод
          const avatarUrl = selectedModel.avatar_url;
          
          // Проверяем URL если он указан
          if (avatarUrl && !isValidURL(avatarUrl)) {
            setError('Указан некорректный URL для аватара');
            return;
          }
          
          // Проверяем, можно ли загрузить изображение
          if (avatarUrl) {
            // Начинаем процесс проверки, но не блокируем сохранение
            preloadImage(avatarUrl).then(success => {
              if (!success) {
                console.warn(`URL аватара недоступен, но модель сохранена: ${avatarUrl}`);
              }
            });
          }
          
          console.log('Updating model with new name:', selectedModel.name);
          
          // Подготавливаем данные для обновления
          const updateData = {
            name: selectedModel.name,
            bio: selectedModel.bio,
            avatar_url: avatarUrl,
            gender: selectedModel.gender as 'male' | 'female' | undefined,
            traits: selectedModel.traits,
            genres: selectedModel.genres
          };
          
          console.log('Update data prepared:', updateData);
          
          // Обновляем модель с текущим URL
          const updatedModel = await ModelService.updateModel(selectedModel.id, updateData);
          
          if (updatedModel) {
            console.log('Model updated successfully:', updatedModel);
            // Обновляем модель в списке
            setModels(prevModels => prevModels.map(model => 
              model.id === selectedModel.id ? updatedModel : model
            ));
            
            // Очищаем кэш для этой модели
            AvatarService.clearCache(selectedModel.id);
          } else {
            console.error('Failed to update model, updatedModel is null');
            setError('Не удалось обновить модель. Проверьте консоль для деталей.');
            return;
          }
        }
      }
      
      // Закрываем модальное окно
      closeModal();
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Ошибка при сохранении изменений:', err);
      setError(`Не удалось сохранить изменения: ${err.message}`);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  // Функция-помощник для отображения краткого текста
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text && text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text || '';
  };

  // Вспомогательная функция для предзагрузки изображения (проверка доступности)
  const preloadImage = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!url || !isValidURL(url)) {
        resolve(false);
        return;
      }
      
      const img = new globalThis.Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // Добавляем таймаут для изображений, которые долго загружаются
      setTimeout(() => resolve(false), 5000);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Управление моделями AI</h1>
        <div className="flex space-x-2">
          <button
            className="btn-primary text-sm py-1.5"
            onClick={openAddModal}
          >
            Добавить модель
          </button>
          <button
            className="btn-secondary text-sm py-1.5"
            onClick={createTestModel}
          >
            Создать тестовую модель
          </button>
          <button
            className="btn-outline text-sm py-1.5"
            onClick={toggleDiagnostics}
          >
            {showDiagnostics ? 'Скрыть диагностику' : 'Показать диагностику'}
          </button>
          <button
            className="btn-outline text-sm py-1.5"
            onClick={() => handleClearCache()}
          >
            Очистить кэш аватаров
          </button>
          <button
            className="btn-outline text-red-500 hover:text-red-700 border-red-200 hover:border-red-300 text-sm py-1.5"
            onClick={() => cleanupTestModels(false)}
          >
            Удалить тестовые модели
          </button>
        </div>
      </div>
      
      {/* Сообщение о статусе очистки кэша */}
      {cacheStatus && (
        <div className={`p-3 rounded-lg ${cacheStatus.cleared ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>
          {cacheStatus.message}
        </div>
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Если данные загружаются - показываем сообщение */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p>Загрузка моделей...</p>
        </div>
      )}

      {/* Диагностическая информация */}
      {showDiagnostics && diagnosticResult && (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Диагностика базы данных</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Статус подключения:</strong> {diagnosticResult.success ? 'Успешно' : 'Ошибка'}</p>
              <p><strong>Пользователь:</strong> {diagnosticResult.user ? `${diagnosticResult.user.email} (${diagnosticResult.user.id})` : 'Не аутентифицирован'}</p>
              <p><strong>Количество моделей:</strong> {diagnosticResult.aiModelsCount || 0}</p>
            </div>
            <div>
              <p><strong>Тест вставки записи:</strong> {diagnosticResult.insertTest?.success ? 'Успешно' : 'Ошибка'}</p>
              {diagnosticResult.insertTest?.message && (
                <p><strong>Сообщение:</strong> {diagnosticResult.insertTest.message}</p>
              )}
              {diagnosticResult.error && (
                <p><strong>Ошибка:</strong> {String(diagnosticResult.error)}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Таблица моделей */}
      {!loading && models.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Аватар
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Имя
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пол
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Создано
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {models.map((model) => (
                <tr key={model.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="relative h-12 w-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                      <Image
                        src={model.avatar_url && isValidURL(model.avatar_url) ? model.avatar_url : (
                          model.gender === 'male' ? '/default-male-avatar.png' : '/default-female-avatar.png'
                        )}
                        alt={model.name}
                        fill
                        sizes="48px"
                        priority={true}
                        unoptimized={true}
                        className="object-cover"
                        onError={(e) => {
                          // При ошибке загрузки заменяем на дефолтный аватар без логирования ошибки
                          const target = e.target as HTMLImageElement;
                          const defaultAvatar = model.gender === 'male' 
                            ? '/default-male-avatar.png' 
                            : '/default-female-avatar.png';
                          
                          console.warn(`Не удалось загрузить аватар по URL: ${target.src}`);
                          target.src = defaultAvatar;
                            
                          // Очищаем кэш некорректного URL-аватара
                          if (model.avatar_url) {
                            AvatarService.clearCache(model.id);
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {truncateText(model.bio)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {model.gender === 'male' ? 'Мужской' : 
                     model.gender === 'female' ? 'Женский' : 'Не указан'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(model.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                    <button 
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => openEditModal(model)}
                      >
                            Редактировать
                          </button>
                          <button
                        className="text-red-600 hover:text-red-900"
                        onClick={() => deleteModel(model.id)}
                          >
                            Удалить
                          </button>
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        onClick={() => handleClearCache(model.id)}
                      >
                        Сбросить кэш
                      </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Нет доступных моделей. Добавьте новую модель или создайте тестовую.</p>
        </div>
      )}

      {/* Модальное окно редактирования/добавления */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {isAddingNew ? 'Добавление новой модели' : 'Редактирование модели'}
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Имя модели
                </label>
                <input
                  type="text"
                  name="name"
                  value={isAddingNew ? newModel.name : selectedModel?.name || ''}
                  onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                  className="w-full input"
                  placeholder="Введите имя модели"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  name="bio"
                  value={isAddingNew ? newModel.bio : selectedModel?.bio || ''}
                  onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                  className="w-full input min-h-[100px]"
                  placeholder="Введите описание модели"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Пол
                </label>
                <select
                  name="gender"
                  value={isAddingNew ? newModel.gender : selectedModel?.gender || ''}
                  onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                  className="w-full input"
                >
                  <option value="">Выберите пол</option>
                  <option value="female">Женский</option>
                  <option value="male">Мужской</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Способ добавления аватара
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="file"
                      checked={uploadMethod === 'file'}
                      onChange={() => setUploadMethod('file')}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Загрузить файл</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="url"
                      checked={uploadMethod === 'url'}
                      onChange={() => setUploadMethod('url')}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Указать URL</span>
                  </label>
                </div>
              </div>
              
              {uploadMethod === 'file' ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Файл аватара
                  </label>
                  <div className="mt-1 flex items-center">
                    <div className="relative rounded-md overflow-hidden">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*"
                        ref={fileInputRef}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        disabled={fileUploading}
                      />
                      <button
                        type="button"
                        className="btn-secondary text-sm py-1.5 px-4 relative"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={fileUploading}
                      >
                        {fileUploading ? 'Загрузка...' : 'Выбрать файл'}
                      </button>
                    </div>
                    {avatarFile && (
                      <span className="ml-2 text-sm text-gray-600">
                        {avatarFile.name} ({Math.round(avatarFile.size / 1024)} KB)
                      </span>
                    )}
                </div>
                
                  {/* Предпросмотр аватара */}
                  {avatarPreview && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-1">Предпросмотр:</p>
                      <div className="relative h-24 w-24 rounded-full overflow-hidden border border-gray-200">
                        <Image
                          src={avatarPreview}
                          alt="Preview"
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                  </div>
                    </div>
                  )}
                  
                  <p className="mt-2 text-xs text-gray-500">
                    Рекомендуемый размер: минимум 300x300 пикселей, квадратное изображение.
                    Максимальный размер файла: 2MB. Форматы: JPG, PNG.
                  </p>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    URL аватара
                  </label>
                  <input
                    type="text"
                    name="avatar_url"
                    value={isAddingNew ? newModel.avatar_url : selectedModel?.avatar_url || ''}
                    onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                    className="w-full input"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button 
                  type="button" 
                  className="btn-outline"
                  onClick={closeModal}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={saveChanges}
                  disabled={fileUploading}
                >
                  {fileUploading ? 'Загрузка...' : 'Сохранить'}
                </button>
                {selectedModel && !isAddingNew && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const result = await ModelService.testUpdateModel(selectedModel.id);
                        console.log('Тест обновления:', result);
                        
                        if (result.success) {
                          alert(`Тест успешен: ${result.message}`);
                          
                          // Если тест успешен и данные вернулись, обновляем модель в интерфейсе
                          if (result.data) {
                            setModels(prevModels => prevModels.map(model => 
                              model.id === selectedModel.id ? result.data as AIModel : model
                            ));
                          }
                          
                          // Перезагружаем список моделей
                          closeModal();
                        } else {
                          setError(`Тест не пройден: ${result.message}`);
                          console.error('Детали ошибки:', result.data);
                        }
                      } catch (err) {
                        console.error('Ошибка при тестировании обновления:', err);
                        setError(`Ошибка при тестировании: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
                      }
                    }}
                  >
                    Тест обновления
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 