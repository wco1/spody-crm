'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getDatabaseInfo } from '../utils/supabase';
import SafeImage from '../components/SafeImage';
import SimplePhotoUploader from '../components/SimplePhotoUploader';
import ModelService, { AIModel } from '../utils/modelService';
import AvatarService from '../utils/avatarService';
import CleanupService from '../utils/cleanupService';
import { supabaseAdmin as supabase } from '../utils/supabase';

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

// Интерфейс для промптов
interface Prompt {
  id: string;
  model_id: string;
  prompt_text: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Интерфейс для шаблонов промптов
interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  description: string;
  category: string;
  is_default: boolean;
  variables: string[] | string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export default function ModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [currentModelId, setCurrentModelId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Новая модель (для добавления)
  const [newModel, setNewModel] = useState({
    name: '',
    bio: '',
    avatar_url: '',
    gender: '' as 'male' | 'female' | '',
    traits: [] as string[],
    genres: [] as string[],
    prompt_template_id: '',
    custom_prompt: '',
    use_custom_prompt: false,
    is_likes_model: false
  });

  // Новый промпт
  const [newPrompt, setNewPrompt] = useState<Partial<Prompt>>({
    prompt_text: '',
    version: 1,
    is_active: true
  });

  // Утилита для безопасного парсинга variables
  const parseVariables = (variables: string[] | string | any): string[] => {
    if (Array.isArray(variables)) {
      return variables;
    }
    if (typeof variables === 'string') {
      try {
        const parsed = JSON.parse(variables);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [modelsRes, promptsRes, templatesRes] = await Promise.all([
        fetch('/api/models'),
        fetch('/api/prompts'),
        loadPromptTemplates()
      ]);

      if (modelsRes.ok) {
        const modelsData = await modelsRes.json();
        setModels(modelsData || []);
      }

      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        setPrompts(promptsData.prompts || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setError('Ошибка загрузки данных');
    }
    setLoading(false);
  };

  const loadPromptTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts_templates')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      
      const processedData = (data || []).map(template => ({
        ...template,
        variables: parseVariables(template.variables)
      }));
      
      setPromptTemplates(processedData);
      return processedData;
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
      return [];
    }
  };

  // Получить промпты для конкретной модели
  const getModelPrompts = (modelId: string) => {
    return prompts.filter(prompt => prompt.model_id === modelId);
  };

  // Получить шаблон промпта по ID
  const getPromptTemplate = (templateId: string) => {
    return promptTemplates.find(template => template.id === templateId);
  };

  // Создание нового промпта
  const handleCreatePrompt = async () => {
    if (!currentModelId) return;

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: currentModelId,
          ...newPrompt
        })
      });

      if (response.ok) {
        setShowPromptModal(false);
        setNewPrompt({
          prompt_text: '',
          version: 1,
          is_active: true
        });
        loadData();
      }
    } catch (error) {
      console.error('Ошибка создания промпта:', error);
    }
  };

  // Обновление промпта
  const handleUpdatePrompt = async (promptId: string, updates: Partial<Prompt>) => {
    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        setEditingPrompt(null);
        loadData();
      }
    } catch (error) {
      console.error('Ошибка обновления промпта:', error);
    }
  };

  // Удаление промпта
  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот промпт?')) return;

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Ошибка удаления промпта:', error);
    }
  };

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

  // Переключение отображения диагностики
  const toggleDiagnostics = () => {
    setShowDiagnostics(!showDiagnostics);
  };

  // Обработчик открытия модального окна для редактирования
  const openEditModal = (model: AIModel) => {
    setSelectedModel({
      ...model,
      prompt_template_id: model.prompt_template_id || '',
      custom_prompt: model.custom_prompt || '',
      use_custom_prompt: model.use_custom_prompt || false
    });
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
      gender: '',
      prompt_template_id: '',
      custom_prompt: '',
      use_custom_prompt: false,
      is_likes_model: false
    });
    setIsModalOpen(true);
  };

  // Обработчик закрытия модального окна
  const closeModal = () => {
    setIsModalOpen(false);
    setShowPromptModal(false);
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
        'kulssuzzwjlyacqvawau.supabase.co', 'vercel.app',
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
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (selectedModel) {
      console.log(`Updating model field: ${name}, new value: ${value}`);
      
      // Создаем новый объект модели с обновленным значением
      const updatedModel = {
        ...selectedModel,
        [name]: type === 'checkbox' ? checked : value
      };
      
      // Обновляем состояние с новым объектом
      setSelectedModel(updatedModel);
      
      // Логируем обновленную модель
      console.log('Updated model object:', updatedModel);
    }
  };

  // Обработчик изменений в форме добавления
  const handleNewModelChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setNewModel({
      ...newModel,
      [name]: type === 'checkbox' ? checked : value
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
            genres: newModel.genres,
            prompt_template_id: newModel.prompt_template_id || undefined,
            custom_prompt: newModel.custom_prompt || '',
            use_custom_prompt: newModel.use_custom_prompt,
            is_likes_model: newModel.is_likes_model
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
            genres: newModel.genres,
            prompt_template_id: newModel.prompt_template_id || undefined,
            custom_prompt: newModel.custom_prompt || '',
            use_custom_prompt: newModel.use_custom_prompt,
            is_likes_model: newModel.is_likes_model
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
              genres: selectedModel.genres,
              prompt_template_id: selectedModel.prompt_template_id || undefined,
              custom_prompt: selectedModel.custom_prompt || '',
              use_custom_prompt: selectedModel.use_custom_prompt,
              is_likes_model: selectedModel.is_likes_model
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
              genres: selectedModel.genres,
              prompt_template_id: selectedModel.prompt_template_id || undefined,
              custom_prompt: selectedModel.custom_prompt || '',
              use_custom_prompt: selectedModel.use_custom_prompt,
              is_likes_model: selectedModel.is_likes_model
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
            genres: selectedModel.genres,
            prompt_template_id: selectedModel.prompt_template_id || undefined,
            custom_prompt: selectedModel.custom_prompt || '',
            use_custom_prompt: selectedModel.use_custom_prompt,
            is_likes_model: selectedModel.is_likes_model
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

  // Обработчик открытия модального окна для создания промпта
  const openPromptModal = (modelId: string) => {
    setCurrentModelId(modelId);
    setShowPromptModal(true);
  };

  // Диагностическое логирование для изображений
  useEffect(() => {
    if (models.length > 0) {
      console.log('[DEBUG] Модели загружены:', models.length);
      models.forEach((model, index) => {
        console.log(`[DEBUG] Модель ${index + 1}:`, {
          id: model.id,
          name: model.name,
          avatar_url: model.avatar_url,
          hasAvatar: !!model.avatar_url
        });
      });
    }
  }, [models]);

  // Диагностика фото для конкретной модели
  const debugModelPhotos = async (modelId: string, modelName: string) => {
    try {
      const response = await fetch(`/api/models/photos?model_id=${modelId}&debug=true`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        alert(`Ошибка API (${response.status}): ${errorText}`);
        return;
      }
      
      const data = await response.json();
      
      console.log(`🔍 [ФОТО ДИАГНОСТИКА] ${modelName}:`, data);
      
      // Безопасная проверка структуры данных
      if (data && typeof data === 'object') {
        const total = data.total || 0;
        const profileCount = data.profilePhotos?.count || 0;
        const messageCount = data.messagePhotos?.count || 0;
        
        alert(`Диагностика фото для ${modelName}:
        
📊 Общая статистика:
• Всего фото: ${total}
• Профильных фото: ${profileCount}
• Фото для сообщений: ${messageCount}

📝 Детали в консоли браузера`);
      } else {
        alert(`Диагностика фото для ${modelName}: Нет данных или неверный формат ответа`);
      }
      
    } catch (error) {
      console.error('Ошибка диагностики фото:', error);
      alert(`Ошибка получения диагностики фото: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Управление AI моделями и промптами</h1>
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
            className="btn-outline text-blue-600 border-blue-300 hover:border-blue-400 text-sm py-1.5"
            onClick={async () => {
              try {
                const response = await fetch('/api/test-photos');
                const data = await response.json();
                if (data.success) {
                  alert(`✅ Таблица ai_model_photos работает!\n\nНайдено фото: ${data.photosCount}`);
                } else {
                  alert(`❌ Ошибка таблицы ai_model_photos:\n\n${data.error}`);
                }
              } catch (err) {
                alert(`💥 Ошибка проверки: ${err instanceof Error ? err.message : String(err)}`);
              }
            }}
          >
            🔍 Тест фото БД
          </button>
          
          <button
            className="btn-outline text-green-600 border-green-300 hover:border-green-400 text-sm py-1.5"
            onClick={async () => {
              try {
                const response = await fetch('/api/migrate-photos', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                  alert(`✅ ${data.message}`);
                } else {
                  alert(`❌ Ошибка миграции:\n\n${data.error}\n\n${data.hint || ''}`);
                }
              } catch (err) {
                alert(`💥 Ошибка миграции: ${err instanceof Error ? err.message : String(err)}`);
              }
            }}
          >
            🛠️ Миграция БД
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

      {/* Таблица моделей с промптами */}
      {models.length > 0 ? (
        <div className="space-y-4">
          {models.map((model) => (
            <div key={model.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Основная информация о модели */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                      <SafeImage
                        src={model.avatar_url || '/default-avatar.svg'}
                        alt={model.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
                      <p className="text-sm text-gray-600">{truncateText(model.bio, 100)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {model.traits?.slice(0, 3).map(trait => (
                          <span key={trait} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {trait}
                          </span>
                        ))}
                      </div>
                      
                      {/* Информация о промпте */}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {/* Индикатор лайк-модели */}
                        {model.is_likes_model && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs">
                            💖 Лайк-модель
                          </span>
                        )}
                        
                        {model.use_custom_prompt ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                            🔧 Кастомный промпт
                          </span>
                        ) : model.prompt_template_id ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                            📋 {getPromptTemplate(model.prompt_template_id)?.name || 'Шаблон'}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            ⚠️ Промпт не настроен
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openPromptModal(model.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm"
                    >
                      + Промпт
                    </button>
                    
                    <button
                      onClick={() => setExpandedModelId(expandedModelId === model.id ? null : model.id)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      {expandedModelId === model.id ? 'Скрыть' : 'Показать'} промпты ({getModelPrompts(model.id).length})
                    </button>
                    
                    <button
                      onClick={() => debugModelPhotos(model.id, model.name)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      title="Диагностика фото модели"
                    >
                      🔍 Фото
                    </button>
                    
                    <button
                      onClick={() => openEditModal(model)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Редактировать
                    </button>
                    
                    <button
                      onClick={() => deleteModel(model.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>

              {/* Промпты модели (раскрывающийся список) */}
              {expandedModelId === model.id && (
                <div className="p-4 bg-gray-50">
                  <h4 className="text-md font-medium mb-3">Система промптов для {model.name}</h4>
                  
                  {/* Проверяем какая система промптов используется */}
                  {model.use_custom_prompt || model.prompt_template_id ? (
                    /* Новая система промптов */
                    <div className="space-y-3">
                      <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                            ✨ Новая система промптов
                          </span>
                          <span className="text-xs text-blue-600">
                            Активная система
                          </span>
                        </div>
                        
                        {model.use_custom_prompt ? (
                          <div>
                            <h5 className="font-medium text-blue-900 mb-2">🔧 Кастомный промпт:</h5>
                            <div className="bg-white p-3 rounded border text-sm">
                              {model.custom_prompt || 'Промпт не задан'}
                            </div>
                          </div>
                        ) : model.prompt_template_id ? (
                          <div>
                            <h5 className="font-medium text-blue-900 mb-2">📋 Используется шаблон:</h5>
                            {(() => {
                              const template = getPromptTemplate(model.prompt_template_id);
                              if (template) {
                                return (
                                  <div className="bg-white p-3 rounded border">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="font-medium">{template.name}</span>
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                                        {template.category}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                                    <div className="text-sm font-mono bg-gray-50 p-2 rounded">
                                      {template.template.length > 200 
                                        ? template.template.substring(0, 200) + '...'
                                        : template.template
                                      }
                                    </div>
                                    {parseVariables(template.variables).length > 0 && (
                                      <div className="flex gap-1 mt-2">
                                        <span className="text-xs text-gray-500">Переменные:</span>
                                        {parseVariables(template.variables).map((variable, idx) => (
                                          <span key={idx} className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                                            ${variable}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <div className="bg-white p-3 rounded border text-red-600">
                                  ⚠️ Шаблон не найден (ID: {model.prompt_template_id})
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>
                      
                      {/* Показываем старые промпты как неактивные */}
                      {getModelPrompts(model.id).length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                              ⚠️ Устаревшие промпты
                            </span>
                            <span className="text-xs text-yellow-600">
                              Не используются (старая система)
                            </span>
                          </div>
                          <p className="text-sm text-yellow-700 mb-2">
                            Найдены промпты из старой системы. Они больше не используются.
                          </p>
                          <details className="text-sm">
                            <summary className="cursor-pointer text-yellow-800 hover:text-yellow-900">
                              Показать устаревшие промпты ({getModelPrompts(model.id).length})
                            </summary>
                            <div className="mt-2 space-y-2">
                              {getModelPrompts(model.id).map(prompt => (
                                <div key={prompt.id} className="bg-white p-3 rounded border border-yellow-200 opacity-60">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                        Неактивен
                                      </span>
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                        v{prompt.version}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleDeletePrompt(prompt.id)}
                                      className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                                    >
                                      Удалить устаревший
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-700">
                                    {prompt.prompt_text.length > 100 
                                      ? `${prompt.prompt_text.substring(0, 100)}...`
                                      : prompt.prompt_text
                                    }
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Старая система промптов (если новая не настроена) */
                    <div className="space-y-3">
                      <div className="bg-orange-50 border border-orange-200 p-3 rounded">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                            📜 Старая система промптов
                          </span>
                          <span className="text-xs text-orange-600">
                            Рекомендуется перейти на новую систему
                          </span>
                        </div>
                        <p className="text-sm text-orange-700">
                          Для этой модели не настроены новые промпты. Используются промпты из старой системы.
                        </p>
                      </div>
                      
                      {getModelPrompts(model.id).length > 0 ? (
                        <div className="space-y-3">
                          {getModelPrompts(model.id).map(prompt => (
                            <div key={prompt.id} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    prompt.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {prompt.is_active ? 'Активный' : 'Неактивный'}
                                  </span>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                    v{prompt.version}
                                  </span>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingPrompt(prompt)}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Редактировать
                                  </button>
                                  <button
                                    onClick={() => handleDeletePrompt(prompt.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                              
                              {editingPrompt?.id === prompt.id ? (
                                <div className="space-y-3">
                                  <textarea
                                    value={editingPrompt.prompt_text}
                                    onChange={(e) => setEditingPrompt({
                                      ...editingPrompt,
                                      prompt_text: e.target.value
                                    })}
                                    rows={6}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                  />
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                      <label>Версия:</label>
                                      <input
                                        type="number"
                                        value={editingPrompt.version}
                                        onChange={(e) => setEditingPrompt({
                                          ...editingPrompt,
                                          version: parseInt(e.target.value)
                                        })}
                                        className="w-20 border border-gray-300 rounded px-2 py-1"
                                        min="1"
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        checked={editingPrompt.is_active}
                                        onChange={(e) => setEditingPrompt({
                                          ...editingPrompt,
                                          is_active: e.target.checked
                                        })}
                                      />
                                      <label>Активный</label>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleUpdatePrompt(prompt.id, {
                                        prompt_text: editingPrompt.prompt_text,
                                        version: editingPrompt.version,
                                        is_active: editingPrompt.is_active
                                      })}
                                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                                    >
                                      Сохранить
                                    </button>
                                    <button
                                      onClick={() => setEditingPrompt(null)}
                                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
                                    >
                                      Отменить
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {prompt.prompt_text.length > 200 
                                      ? `${prompt.prompt_text.substring(0, 200)}...`
                                      : prompt.prompt_text
                                    }
                                  </p>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Создан: {formatDate(prompt.created_at)} • 
                                    Обновлен: {formatDate(prompt.updated_at)}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-sm">Нет промптов для этой модели</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600">Нет доступных моделей. Добавьте новую модель.</p>
        </div>
      )}

      {/* Модальное окно создания промпта */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Создать новый промпт</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Версия</label>
                <input
                  type="number"
                  value={newPrompt.version}
                  onChange={(e) => setNewPrompt({...newPrompt, version: parseInt(e.target.value)})}
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Текст промпта</label>
                <textarea
                  value={newPrompt.prompt_text}
                  onChange={(e) => setNewPrompt({...newPrompt, prompt_text: e.target.value})}
                  rows={10}
                  placeholder="Введите системный промпт..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={newPrompt.is_active}
                  onChange={(e) => setNewPrompt({...newPrompt, is_active: e.target.checked})}
                />
                <label>Активный</label>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleCreatePrompt} 
                  disabled={!newPrompt.prompt_text}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
                >
                  Создать
                </button>
                <button 
                  onClick={closeModal}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
                >
                  Отменить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования/добавления модели */}
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
                  onChange={(e) => {
                    if (isAddingNew) {
                      setNewModel({...newModel, name: e.target.value});
                    } else if (selectedModel) {
                      setSelectedModel({...selectedModel, name: e.target.value});
                    }
                  }}
                  className="w-full input"
                  placeholder="Введите имя модели"
                />
              </div>

              {/* Добавляем чекбокс для лайк-модели */}
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="is_likes_model"
                  name="is_likes_model"
                  checked={isAddingNew ? newModel.is_likes_model : selectedModel?.is_likes_model || false}
                  onChange={(e) => {
                    if (isAddingNew) {
                      setNewModel({...newModel, is_likes_model: e.target.checked});
                    } else if (selectedModel) {
                      setSelectedModel({...selectedModel, is_likes_model: e.target.checked});
                    }
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_likes_model" className="text-sm font-medium text-gray-700">
                  💖 Показывать в разделе лайков (предустановленные лайки)
                </label>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание
                </label>
                <textarea
                  name="bio"
                  value={isAddingNew ? newModel.bio : selectedModel?.bio || ''}
                  onChange={(e) => {
                    if (isAddingNew) {
                      setNewModel({...newModel, bio: e.target.value});
                    } else if (selectedModel) {
                      setSelectedModel({...selectedModel, bio: e.target.value});
                    }
                  }}
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
                  onChange={(e) => {
                    if (isAddingNew) {
                      setNewModel({...newModel, gender: e.target.value as 'male' | 'female' | ''});
                    } else if (selectedModel) {
                      setSelectedModel({...selectedModel, gender: e.target.value as 'male' | 'female' | ''});
                    }
                  }}
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
                      onChange={(e) => setUploadMethod('file')}
                      className="form-radio h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-2">Загрузить файл</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="url"
                      checked={uploadMethod === 'url'}
                      onChange={(e) => setUploadMethod('url')}
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
                        <SafeImage
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
                    onChange={(e) => {
                      if (isAddingNew) {
                        setNewModel({...newModel, avatar_url: e.target.value});
                      } else if (selectedModel) {
                        setSelectedModel({...selectedModel, avatar_url: e.target.value});
                      }
                    }}
                    className="w-full input"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>
              )}
              
              {/* Современная система управления фото */}
              {!isAddingNew && selectedModel?.id && (
                <div className="space-y-8">
                  
                  {/* БЛОК 1: Аватар модели */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Основной аватар</h3>
                        <p className="text-sm text-gray-600">Главное фото модели, отображается в каталоге и профиле</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Предпросмотр аватара */}
                      <div className="flex-shrink-0">
                        <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          <SafeImage
                            src={selectedModel?.avatar_url || '/default-avatar.png'}
                            alt={selectedModel?.name || 'Модель'}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                      
                      {/* Управление аватаром */}
                      <div className="flex-1">
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                            onClick={() => setUploadMethod('file')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Загрузить файл
                          </button>
                          <button
                            type="button"
                            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
                            onClick={() => setUploadMethod('url')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            Указать URL
                          </button>
                          {selectedModel?.avatar_url && (
                            <button
                              type="button"
                              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                              onClick={() => window.open(selectedModel.avatar_url, '_blank')}
                            >
                              Просмотр
                            </button>
                          )}
                        </div>
                        {fileUploading && (
                          <div className="mt-2 text-sm text-blue-600">Загрузка...</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* БЛОК 2: Галерея профиля */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Галерея профиля</h3>
                        <p className="text-sm text-gray-600">Дополнительные фото в профиле модели (send_priority = 0)</p>
                      </div>
                    </div>
                    
                    <SimplePhotoUploader
                      modelId={selectedModel.id}
                      className="w-full"
                      photoType="profile"
                    />
                  </div>

                  {/* БЛОК 3: Фото для чата */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Фото для сообщений</h3>
                        <p className="text-sm text-gray-600">Фото которые модель отправляет при нажатии кнопки 📷 (send_priority больше 0)</p>
                      </div>
                    </div>
                    
                    <SimplePhotoUploader
                      modelId={selectedModel.id}
                      className="w-full"
                      photoType="message"
                    />
                  </div>

                  {/* Все фото (универсальный контроль) */}
                  <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white">🗂️</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-orange-900">Все фото модели</h3>
                        <p className="text-sm text-orange-700">Полный контроль - удаление любых фото, включая те что не видны в других разделах</p>
                      </div>
                    </div>
                    <SimplePhotoUploader 
                      modelId={selectedModel.id} 
                      photoType="all"
                      className="w-full"
                    />
                  </div>
                  
                </div>
              )}
              
              {/* DEBUG секции - убираем после отладки */}
              {!isAddingNew && !selectedModel?.id && selectedModel && (
                <div className="mb-6 border-t pt-4 space-y-6 bg-yellow-50 p-4 rounded-lg">
                  <div className="text-yellow-800">
                    <h3>🚨 DEBUG: Модель есть, но ID отсутствует</h3>
                    <pre className="text-xs mt-2 bg-yellow-100 p-2 rounded">{JSON.stringify(selectedModel, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {isAddingNew && (
                <div className="mb-6 border-t pt-4 space-y-6 bg-blue-50 p-4 rounded-lg">
                  <div className="text-blue-800">
                    <h3 className="font-semibold">ℹ️ Режим добавления новой модели</h3>
                    <p className="text-sm mt-1">Фото галерея будет доступна после сохранения модели.</p>
                  </div>
                </div>
              )}
              
              {/* Секция шаблонов промптов */}
              <div className="border-t pt-4 mt-6">
                <h3 className="text-md font-medium text-gray-800 mb-4">Настройка промптов</h3>
                
                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="use_custom_prompt"
                      checked={isAddingNew ? newModel.use_custom_prompt : selectedModel?.use_custom_prompt || false}
                      onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Использовать кастомный промпт
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Если отключено, будет использован шаблон промпта
                  </p>
                </div>

                {(isAddingNew ? newModel.use_custom_prompt : selectedModel?.use_custom_prompt) ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Кастомный промпт
                    </label>
                    <textarea
                      name="custom_prompt"
                      value={isAddingNew ? newModel.custom_prompt : selectedModel?.custom_prompt || ''}
                      onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                      rows={6}
                      className="w-full input"
                      placeholder="Введите системный промпт для этой модели..."
                    />
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Шаблон промпта
                    </label>
                    <select
                      name="prompt_template_id"
                      value={isAddingNew ? newModel.prompt_template_id : selectedModel?.prompt_template_id || ''}
                      onChange={isAddingNew ? handleNewModelChange : handleSelectedModelChange}
                      className="w-full input"
                    >
                      <option value="">Выберите шаблон промпта</option>
                      {promptTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.category})
                          {template.is_default ? ' ⭐' : ''}
                        </option>
                      ))}
                    </select>
                    
                    {/* Показываем превью выбранного шаблона */}
                    {(isAddingNew ? newModel.prompt_template_id : selectedModel?.prompt_template_id) && (
                      <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                        {(() => {
                          const templateId = isAddingNew ? newModel.prompt_template_id : selectedModel?.prompt_template_id;
                          const template = getPromptTemplate(templateId || '');
                          if (template) {
                            return (
                              <div>
                                <p className="font-medium text-gray-700 mb-1">{template.description}</p>
                                <p className="text-gray-600 text-xs">
                                  {template.template.length > 200 
                                    ? template.template.substring(0, 200) + '...'
                                    : template.template
                                  }
                                </p>
                                {parseVariables(template.variables).length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    <span className="text-xs text-gray-500">Переменные:</span>
                                    {parseVariables(template.variables).map((variable, idx) => (
                                      <span key={idx} className="px-1 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
                                        ${variable}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 