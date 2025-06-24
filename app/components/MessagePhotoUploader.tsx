'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabaseAdmin as supabase } from '../utils/supabase';

interface MessagePhoto {
  id: string;
  model_id: string;
  photo_url: string;
  caption: string;
  send_priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MessagePhotoUploaderProps {
  modelId: string;
  className?: string;
}

const MessagePhotoUploader: React.FC<MessagePhotoUploaderProps> = ({
  modelId,
  className = ''
}) => {
  const [photos, setPhotos] = useState<MessagePhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('Вот моё фото! 📸');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка существующих фото для сообщений
  const loadPhotos = useCallback(async () => {
    if (!modelId) return;

    try {
      setLoading(true);
      // Используем существующую таблицу ai_model_photos с фильтром для фото-сообщений
      const { data, error } = await supabase
        .from('ai_model_photos')
        .select('*')
        .eq('model_id', modelId)
        .gt('send_priority', 0) // Фильтр: только фото с приоритетом отправки
        .order('send_priority', { ascending: true });

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      console.error('Error loading message photos:', err);
      setError('Ошибка загрузки фото для сообщений');
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Добавление фото для сообщений по URL
  const handleAddByUrl = async () => {
    if (!photoUrl.trim()) {
      setError('Введите URL фото');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Определяем следующий send_priority
      const nextPriority = photos.length > 0 ? Math.max(...photos.map(p => p.send_priority)) + 1 : 1;
      const nextDisplayOrder = await getNextDisplayOrder();

      const { data: photoData, error: dbError } = await supabase
        .from('ai_model_photos')
        .insert({
          model_id: modelId,
          photo_url: photoUrl,
          caption: caption.trim() || 'Вот моё фото! 📸',
          send_priority: nextPriority, // Устанавливаем приоритет отправки
          display_order: nextDisplayOrder,
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Ошибка БД: ${dbError.message}`);
      }

      setPhotoUrl('');
      setCaption('Вот моё фото! 📸');
      await loadPhotos();

    } catch (err) {
      console.error('URL upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка добавления по URL');
    } finally {
      setUploading(false);
    }
  };

  // Получение следующего display_order
  const getNextDisplayOrder = async () => {
    try {
      const { data } = await supabase
        .from('ai_model_photos')
        .select('display_order')
        .eq('model_id', modelId)
        .order('display_order', { ascending: false })
        .limit(1);

      return (data?.[0]?.display_order || 0) + 1;
    } catch {
      return 1;
    }
  };

  // Добавление фото с устройства
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Можно загружать только изображения');
      return;
    }

    // Ограничение размера файла (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Создаем FormData для загрузки
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model_id', modelId);

      // Загружаем через API
      const response = await fetch('/api/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка загрузки файла');
      }

      const result = await response.json();

      // Добавляем фото в базу как фото для сообщений
      const nextPriority = photos.length > 0 ? Math.max(...photos.map(p => p.send_priority)) + 1 : 1;
      const nextDisplayOrder = await getNextDisplayOrder();

      const { error: dbError } = await supabase
        .from('ai_model_photos')
        .insert({
          model_id: modelId,
          photo_url: result.avatar_url,
          caption: caption.trim() || 'Вот моё фото! 📸',
          send_priority: nextPriority,
          display_order: nextDisplayOrder,
          is_active: true
        });

      if (dbError) {
        throw new Error(`Ошибка БД: ${dbError.message}`);
      }

      setCaption('Вот моё фото! 📸');
      await loadPhotos();

      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('File upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  // Удаление фото для сообщений
  const deletePhoto = async (photo: MessagePhoto) => {
    if (!confirm('Удалить это фото для сообщений?')) return;

    try {
      setUploading(true);
      const { error } = await supabase
        .from('ai_model_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;
      await loadPhotos();
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setUploading(false);
    }
  };

  // Обновление подписи к фото
  const updateCaption = async (photoId: string, newCaption: string) => {
    try {
      const { error } = await supabase
        .from('ai_model_photos')
        .update({ 
          caption: newCaption,
          updated_at: new Date().toISOString()
        })
        .eq('id', photoId);

      if (error) throw error;
      await loadPhotos();
    } catch (err) {
      console.error('Update caption error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка обновления подписи');
    }
  };

  // Обновление приоритета
  const updatePriority = async (photoId: string, newPriority: number) => {
    try {
      const { error } = await supabase
        .from('ai_model_photos')
        .update({ 
          send_priority: newPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', photoId);

      if (error) throw error;
      await loadPhotos();
    } catch (err) {
      console.error('Update priority error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка обновления приоритета');
    }
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка фото для сообщений...</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Добавление фото для сообщений по URL */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium mb-3">Добавить фото для отправки в сообщениях</h4>
        
        {/* Загрузка с устройства */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400 mr-2"
          >
            📁 Загрузить с устройства
          </button>
          <span className="text-xs text-gray-500">или введите URL ниже</span>
        </div>
        
        {/* URL фото */}
        <div className="flex gap-2 mb-3">
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={uploading}
          />
        </div>
        
        {/* Подпись к фото */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Подпись к фото..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={uploading}
          />
          <button
            onClick={handleAddByUrl}
            disabled={uploading || !photoUrl.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:bg-gray-400"
          >
            {uploading ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
        
        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Список фото для сообщений */}
      <div className="space-y-3">
        <h4 className="font-medium">Фото для отправки в сообщениях ({photos.length})</h4>
        
        {photos.length === 0 ? (
          <div className="text-gray-500 text-sm">
            Фото для сообщений пока не добавлены. Эти фото будут отправляться при нажатии кнопки 📷 в чате.
          </div>
        ) : (
          <div className="space-y-2">
            {photos.map((photo, index) => (
              <div key={photo.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                <div className="flex items-start gap-3">
                  {/* Превью фото */}
                  <img
                    src={photo.photo_url}
                    alt={`Фото для сообщения ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+VGV4dCBjb250ZW50PC9wPgo8L3N2Zz4K';
                    }}
                  />
                  
                  {/* Информация о фото */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-800">
                        📷 Сообщение #{photo.send_priority}
                      </span>
                      <button
                        onClick={() => deletePhoto(photo)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={uploading}
                      >
                        Удалить
                      </button>
                    </div>
                    
                    {/* Подпись к фото */}
                    <div className="mt-2">
                      <input
                        type="text"
                        value={photo.caption || ''}
                        onChange={(e) => updateCaption(photo.id, e.target.value)}
                        placeholder="Подпись к фото"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={uploading}
                      />
                    </div>
                    
                    {/* Приоритет отправки */}
                    <div className="mt-1 flex items-center gap-2">
                      <label className="text-xs text-gray-600">Приоритет:</label>
                      <input
                        type="number"
                        value={photo.send_priority}
                        onChange={(e) => updatePriority(photo.id, parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                        disabled={uploading}
                      />
                    </div>
                    
                    {/* URL фото */}
                    <div className="mt-1">
                      <input
                        type="text"
                        value={photo.photo_url}
                        readOnly
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagePhotoUploader; 