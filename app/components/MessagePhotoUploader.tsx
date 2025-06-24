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
      const { data, error } = await supabase
        .from('ai_model_message_photos')
        .select('*')
        .eq('model_id', modelId)
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

      const { data: photoData, error: dbError } = await supabase
        .from('ai_model_message_photos')
        .insert({
          model_id: modelId,
          photo_url: photoUrl,
          caption: caption.trim() || 'Вот моё фото! 📸',
          send_priority: nextPriority,
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

  // Удаление фото для сообщений
  const deletePhoto = async (photo: MessagePhoto) => {
    if (!confirm('Удалить это фото для сообщений?')) return;

    try {
      setUploading(true);
      const { error } = await supabase
        .from('ai_model_message_photos')
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
        .from('ai_model_message_photos')
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
        .from('ai_model_message_photos')
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