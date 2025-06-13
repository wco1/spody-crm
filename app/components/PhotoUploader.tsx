/**
 * PhotoUploader Component
 * Multiple photo upload interface for AI models in CRM
 * Supports drag & drop, preview, reordering, and primary photo selection
 * 
 * Created: 2025-01-27
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../utils/supabase';

interface Photo {
  id: string;
  photo_url: string;
  storage_path: string;
  is_primary: boolean;
  display_order: number;
  uploaded_at: string;
}

interface PhotoUploaderProps {
  modelId: string;
  onPhotosUpdate?: (photos: Photo[]) => void;
  maxPhotos?: number;
  className?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PHOTOS_BUCKET = 'ai-models-avatars';

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  modelId,
  onPhotosUpdate,
  maxPhotos = 6,
  className = ''
}) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [photoUrl, setPhotoUrl] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка существующих фото
  const loadPhotos = useCallback(async () => {
    if (!modelId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ai_model_photos')
        .select('*')
        .eq('model_id', modelId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      setPhotos(data || []);
      onPhotosUpdate?.(data || []);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  }, [modelId, onPhotosUpdate]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Валидация файла
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Неподдерживаемый тип файла: ${file.type}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `Файл слишком большой: ${(file.size / 1024 / 1024).toFixed(1)}MB (макс. 5MB)`;
    }
    
    return null;
  };

  // Загрузка файла
  const uploadFile = async (file: File, isPrimary: boolean = false): Promise<Photo | null> => {
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    // Генерируем имя файла
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${modelId}/photo_${timestamp}.${fileExt}`;

    // Загружаем в Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Ошибка загрузки: ${uploadError.message}`);
    }

    // Получаем публичный URL
    const { data: urlData } = supabase.storage
      .from(PHOTOS_BUCKET)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Не удалось получить URL');
    }

    // Если делаем primary, сначала убираем флаг с других
    if (isPrimary) {
      await supabase
        .from('ai_model_photos')
        .update({ is_primary: false })
        .eq('model_id', modelId);
    }

    // Сохраняем в БД
    const { data: photoData, error: dbError } = await supabase
      .from('ai_model_photos')
      .insert({
        model_id: modelId,
        photo_url: urlData.publicUrl,
        storage_path: fileName,
        is_primary: isPrimary || photos.length === 0, // Первое фото автоматически primary
        display_order: photos.length
      })
      .select()
      .single();

    if (dbError) {
      // Удаляем файл из Storage если БД операция провалилась
      await supabase.storage.from(PHOTOS_BUCKET).remove([fileName]);
      throw new Error(`Ошибка БД: ${dbError.message}`);
    }

    return photoData;
  };

  // Добавление фото по URL
  const addPhotoByUrl = async (url: string, isPrimary: boolean = false): Promise<Photo | null> => {
    if (!url.trim()) {
      throw new Error('URL не может быть пустым');
    }

    // Простая валидация URL
    try {
      new URL(url);
    } catch {
      throw new Error('Некорректный URL');
    }

    // Если делаем primary, сначала убираем флаг с других
    if (isPrimary) {
      await supabase
        .from('ai_model_photos')
        .update({ is_primary: false })
        .eq('model_id', modelId);
    }

    // Сохраняем в БД
    const { data: photoData, error: dbError } = await supabase
      .from('ai_model_photos')
      .insert({
        model_id: modelId,
        photo_url: url,
        storage_path: '', // Пустой для URL загрузок
        is_primary: isPrimary || photos.length === 0,
        display_order: photos.length
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Ошибка БД: ${dbError.message}`);
    }

    return photoData;
  };

  // Обработка выбора файлов
  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (remainingSlots <= 0) {
      setError(`Максимальное количество фото: ${maxPhotos}`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    try {
      setUploading(true);
      setError(null);

      const uploadPromises = filesToUpload.map((file, index) => 
        uploadFile(file, photos.length === 0 && index === 0)
      );

      const uploadedPhotos = await Promise.all(uploadPromises);
      const successfulUploads = uploadedPhotos.filter(Boolean) as Photo[];

      if (successfulUploads.length > 0) {
        await loadPhotos(); // Перезагружаем все фото
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setUploading(false);
    }
  };

  // Обработка добавления фото по URL
  const handleAddByUrl = async () => {
    if (!photoUrl.trim()) {
      setError('Введите URL фото');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      await addPhotoByUrl(photoUrl, photos.length === 0);
      setPhotoUrl('');
      await loadPhotos();

    } catch (err) {
      console.error('URL upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка добавления по URL');
    } finally {
      setUploading(false);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  // Установка primary фото
  const setPrimaryPhoto = async (photoId: string) => {
    try {
      // Сбрасываем все primary
      await supabase
        .from('ai_model_photos')
        .update({ is_primary: false })
        .eq('model_id', modelId);

      // Устанавливаем новое primary
      await supabase
        .from('ai_model_photos')
        .update({ is_primary: true })
        .eq('id', photoId);

      await loadPhotos();
    } catch (err) {
      console.error('Error setting primary:', err);
      setError('Ошибка установки главного фото');
    }
  };

  // Удаление фото
  const deletePhoto = async (photo: Photo) => {
    if (!confirm('Удалить это фото?')) return;

    try {
      // Удаляем из Storage
      if (photo.storage_path) {
        await supabase.storage
          .from(PHOTOS_BUCKET)
          .remove([photo.storage_path]);
      }

      // Удаляем из БД
      await supabase
        .from('ai_model_photos')
        .delete()
        .eq('id', photo.id);

      await loadPhotos();
    } catch (err) {
      console.error('Error deleting photo:', err);
      setError('Ошибка удаления фото');
    }
  };

  // Обновление порядка
  const updateOrder = async (newPhotos: Photo[]) => {
    try {
      const updates = newPhotos.map((photo, index) => 
        supabase
          .from('ai_model_photos')
          .update({ display_order: index })
          .eq('id', photo.id)
      );

      await Promise.all(updates);
      await loadPhotos();
    } catch (err) {
      console.error('Error updating order:', err);
      setError('Ошибка изменения порядка');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3">Загрузка фото...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          Фото модели ({photos.length}/{maxPhotos})
        </h3>
        {photos.length < maxPhotos && (
          <div className="flex items-center space-x-2">
            {/* Переключатель метода загрузки */}
            <select
              value={uploadMethod}
              onChange={(e) => setUploadMethod(e.target.value as 'file' | 'url')}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="file">Файл</option>
              <option value="url">URL</option>
            </select>
            
            {uploadMethod === 'file' ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {uploading ? 'Загрузка...' : 'Добавить фото'}
              </button>
            ) : (
              <button
                onClick={handleAddByUrl}
                disabled={uploading || !photoUrl.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? 'Добавление...' : 'Добавить'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Поле для URL (показывается только при выборе URL метода) */}
      {photos.length < maxPhotos && uploadMethod === 'url' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL фото
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Введите прямую ссылку на изображение
          </p>
        </div>
      )}

      {/* Скрытый input для файлов */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_TYPES.join(',')}
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Сообщение об ошибке */}
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Drag & Drop зона */}
      {photos.length < maxPhotos && uploadMethod === 'file' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-colors duration-200
            ${dragOver 
              ? 'border-purple-500 bg-purple-50' 
              : 'border-gray-300 hover:border-purple-400'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="space-y-2">
            <div className="text-3xl">📷</div>
            <div className="text-sm text-gray-600">
              Перетащите фото сюда или нажмите для выбора
            </div>
            <div className="text-xs text-gray-400">
              PNG, JPG, WEBP до 5MB • Максимум {maxPhotos} фото
            </div>
          </div>
        </div>
      )}

      {/* Сетка фото */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="relative group bg-gray-100 rounded-lg overflow-hidden aspect-[3/4]"
            >
              {/* Изображение */}
              <img
                src={photo.photo_url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Overlay с кнопками */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-x-2">
                  {/* Primary кнопка */}
                  {!photo.is_primary && (
                    <button
                      onClick={() => setPrimaryPhoto(photo.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      title="Сделать главным"
                    >
                      ⭐
                    </button>
                  )}

                  {/* Удалить */}
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    title="Удалить"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Индикатор primary */}
              {photo.is_primary && (
                <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                  Главное
                </div>
              )}

              {/* Номер порядка */}
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Инструкции */}
      {photos.length === 0 && (
        <div className="text-center text-gray-500 text-sm">
          <p>Добавьте фото для модели</p>
          <p>Первое загруженное фото автоматически станет главным</p>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader; 