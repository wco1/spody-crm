'use client';

import { useState, useEffect } from 'react';
import { 
  Link, Plus, Copy, Trash2, ExternalLink, BarChart3, 
  Target, MousePointer, CheckCircle, XCircle 
} from 'lucide-react';
import AdminLayout from '../components/AdminLayout';

interface TrackingLink {
  id: string;
  name: string;
  code: string;
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
  url: string;
  clicks: number;
  is_active: boolean;
  created_at: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

export default function TrackingPage() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    source: ''
  });

  // Предустановленные источники трафика
  const trafficSources = [
    { value: 'facebook', label: 'Facebook', medium: 'social', color: 'bg-blue-500' },
    { value: 'instagram', label: 'Instagram', medium: 'social', color: 'bg-pink-500' },
    { value: 'google', label: 'Google Ads', medium: 'cpc', color: 'bg-green-500' },
    { value: 'yandex', label: 'Яндекс.Директ', medium: 'cpc', color: 'bg-red-500' },
    { value: 'telegram', label: 'Telegram', medium: 'social', color: 'bg-blue-400' },
    { value: 'vk', label: 'ВКонтакте', medium: 'social', color: 'bg-indigo-500' },
    { value: 'youtube', label: 'YouTube', medium: 'video', color: 'bg-red-600' },
    { value: 'tiktok', label: 'TikTok', medium: 'social', color: 'bg-black' },
    { value: 'email', label: 'Email рассылка', medium: 'email', color: 'bg-gray-500' },
    { value: 'direct', label: 'Прямые переходы', medium: 'direct', color: 'bg-purple-500' }
  ];

  // Генерация превью ссылки
  const generatePreviewUrl = () => {
    if (!formData.name || !formData.source) return '';
    
    const selectedSource = trafficSources.find(s => s.value === formData.source);
    if (!selectedSource) return '';

    // Генерируем кампанию на основе названия
    const campaign = formData.name
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);

    const params = new URLSearchParams();
    params.set('utm_source', selectedSource.value);
    params.set('utm_medium', selectedSource.medium);
    params.set('utm_campaign', campaign);
    params.set('ref', 'XXXXXXXX'); // Placeholder для кода

    return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?${params.toString()}`;
  };

  useEffect(() => {
    loadTrackingLinks();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Автоматически скрывать уведомления через 3 секунды
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const loadTrackingLinks = async () => {
    try {
      const response = await fetch('/api/tracking-links');
      const data = await response.json();
      if (data.links) {
        setLinks(data.links);
      }
    } catch (error) {
      console.error('Ошибка загрузки ссылок:', error);
      showNotification('error', 'Ошибка загрузки ссылок');
    } finally {
      setLoading(false);
    }
  };

  const createTrackingLink = async () => {
    if (!formData.name || !formData.source) {
      showNotification('error', 'Название и источник обязательны для заполнения');
      return;
    }

    const selectedSource = trafficSources.find(s => s.value === formData.source);
    if (!selectedSource) {
      showNotification('error', 'Выберите источник из списка');
      return;
    }

    // Генерируем кампанию на основе названия
    const campaign = formData.name
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 20);

    try {
      const response = await fetch('/api/tracking-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          source: selectedSource.value,
          medium: selectedSource.medium,
          campaign: campaign,
          content: '',
          term: ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          name: '',
          source: ''
        });
        setShowCreateForm(false);
        loadTrackingLinks();
        showNotification('success', `Ссылка "${data.link.name}" успешно создана!`);
      } else {
        const errorData = await response.json();
        showNotification('error', errorData.error || 'Ошибка создания ссылки');
      }
    } catch (error) {
      console.error('Ошибка создания ссылки:', error);
      showNotification('error', 'Ошибка создания ссылки');
    }
  };

  const deleteTrackingLink = async (id: string) => {
    if (!confirm('Удалить эту трекинговую ссылку?')) return;

    try {
      const response = await fetch(`/api/tracking-links?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadTrackingLinks();
        showNotification('success', 'Ссылка успешно удалена');
      } else {
        const errorData = await response.json();
        showNotification('error', errorData.error || 'Ошибка удаления ссылки');
      }
    } catch (error) {
      console.error('Ошибка удаления ссылки:', error);
      showNotification('error', 'Ошибка удаления ссылки');
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showNotification('success', 'Ссылка скопирована в буфер обмена');
  };

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
  const activeLinks = links.filter(link => link.is_active).length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-gradient-to-r from-blue-500 to-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Уведомления */}
        {notification && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border transition-all duration-300 ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Заголовок */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Link className="h-4 w-4 md:h-6 md:w-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Трекинговые ссылки
              </h1>
            </div>
            <p className="text-sm text-gray-600 ml-11 md:ml-13">
              Создавайте и отслеживайте эффективность источников трафика
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 md:px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl hover:from-green-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать ссылку
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Link className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">Всего ссылок</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{links.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <MousePointer className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">Всего кликов</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalClicks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20">
            <div className="flex items-center">
              <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div className="ml-3 md:ml-4">
                <p className="text-xs md:text-sm font-medium text-gray-600">Активных</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900">{activeLinks}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Форма создания */}
        {showCreateForm && (
          <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Создать новую трекинговую ссылку</h3>
            
            <div className="space-y-4">
              {/* Название ссылки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название ссылки *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Например: Реклама в Facebook"
                />
              </div>

              {/* Источник трафика */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Источник трафика *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {trafficSources.map((source) => (
                    <button
                      key={source.value}
                      type="button"
                      onClick={() => setFormData({...formData, source: source.value})}
                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                        formData.source === source.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <div className={`w-6 h-6 rounded-full ${source.color}`}></div>
                        <span className="text-xs font-medium text-center">{source.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Превью ссылки */}
              {formData.name && formData.source && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Превью ссылки
                  </label>
                  <div className="bg-white p-3 rounded border font-mono text-sm text-gray-600 break-all">
                    {generatePreviewUrl()}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.source && (
                      <>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {trafficSources.find(s => s.value === formData.source)?.value}
                        </span>
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          {trafficSources.find(s => s.value === formData.source)?.medium}
                        </span>
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                          {formData.name.toLowerCase().replace(/[^a-zа-я0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 20)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createTrackingLink}
                disabled={!formData.name || !formData.source}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                Создать ссылку
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Список ссылок */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Созданные ссылки</h3>
          </div>
          
          {links.length === 0 ? (
            <div className="p-12 text-center">
              <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Link className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg mb-4">Пока нет трекинговых ссылок</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200"
              >
                Создать первую ссылку
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ссылка
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      UTM параметры
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Клики
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Создана
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {links.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{link.name}</div>
                          <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded mt-1 truncate max-w-xs">
                            {link.url}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                            {link.source}
                          </span>
                          {link.medium && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded ml-1">
                              {link.medium}
                            </span>
                          )}
                          {link.campaign && (
                            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded ml-1">
                              {link.campaign}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {link.clicks}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(link.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(link.url)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Копировать ссылку"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => window.open(link.url, '_blank')}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Открыть ссылку"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTrackingLink(link.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Удалить ссылку"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
} 