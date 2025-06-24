'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { supabaseAdmin as supabase } from '../utils/supabase';

interface Photo {
  id: string;
  model_id: string;
  photo_url: string;
  storage_path?: string;
  caption?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SimplePhotoUploaderProps {
  modelId: string;
  className?: string;
}

const SimplePhotoUploader: React.FC<SimplePhotoUploaderProps> = ({
  modelId,
  className = ''
}) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Ошибка загрузки фото');
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Добавление фото по URL
  const handleAddByUrl = async () => {
    if (!photoUrl.trim()) {
      setError('Введите URL фото');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Определяем следующий display_order
      const nextOrder = photos.length > 0 ? Math.max(...photos.map(p => p.display_order)) + 1 : 1;

      const { data: photoData, error: dbError } = await supabase
        .from('ai_model_photos')
        .insert({
          model_id: modelId,
          photo_url: photoUrl,
          display_order: nextOrder,
          is_active: true
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Ошибка БД: ${dbError.message}`);
      }

      setPhotoUrl('');
      await loadPhotos();

    } catch (err) {
      console.error('URL upload error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка добавления по URL');
    } finally {
      setUploading(false);
    }
  };

  // Удаление фото
  const deletePhoto = async (photo: Photo) => {
    if (!confirm('Удалить это фото?')) return;

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

  // Обновление caption
  const updateCaption = async (photoId: string, newCaption: string) => {
    console.log('Caption update not supported in current DB schema');
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка фото...</div>;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Добавление фото по URL */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium mb-3">Добавить фото по URL</h4>
        <div className="flex gap-2">
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={uploading}
          />
          <button
            onClick={handleAddByUrl}
            disabled={uploading || !photoUrl.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {uploading ? 'Добавление...' : 'Добавить'}
          </button>
        </div>
        {error && (
          <div className="mt-2 text-sm text-red-600">{error}</div>
        )}
      </div>

      {/* Список фото */}
      <div className="space-y-3">
        <h4 className="font-medium">Загруженные фото ({photos.length})</h4>
        
        {photos.length === 0 ? (
          <div className="text-gray-500 text-sm">
            Фото пока не добавлены. Добавьте фото по URL выше.
          </div>
        ) : (
          <div className="space-y-2">
            {photos.map((photo, index) => (
              <div key={photo.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {/* Превью фото */}
                  <img
                    src={photo.photo_url}
                    alt={`Фото ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0NFY0NEgyMFYyMFoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjI4IiBjeT0iMjgiIHI9IjMiIGZpbGw9IiM5Q0EzQUYiLz4KPHA+VGV4dCBjb250ZW50PC9wPgo8L3N2Zz4K';
                    }}
                  />
                  
                  {/* Информация о фото */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Фото #{photo.display_order}
                      </span>
                      <button
                        onClick={() => deletePhoto(photo)}
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={uploading}
                      >
                        Удалить
                      </button>
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

export default SimplePhotoUploader; 