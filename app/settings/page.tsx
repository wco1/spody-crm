'use client';

import { useState, useEffect } from 'react';
import { Save, LinkIcon, KeyRound, BellRing, Lock, Shield, Database } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/supabase';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [savedStatus, setSavedStatus] = useState<null | 'saving' | 'saved' | 'error'>(null);
  const [settings, setSettings] = useState({
    appName: 'Spody Admin',
    appUrl: 'https://admin.spody.app',
    adminEmail: 'admin@spody.app',
    timezone: 'UTC+3',
    enableLogging: true,
    openrouterKey: 'sk-or-v1-1234567890abcdef1234567890abcdef',
    supabaseUrl: 'https://kulssuzzjwlyacqvawau.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    emailNotifications: true,
    newUserNotifications: true,
    errorNotifications: true,
    weeklyDigest: false,
    notificationEmail: 'admin@spody.app',
    dbHost: 'kulssuzzjwlyacqvawau.supabase.co',
    dbName: 'postgres',
    backupSchedule: 'weekly'
  });
  const [isLoading, setIsLoading] = useState(true);

  // Загрузка настроек при инициализации
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getSettings();
        if (data) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...data
          }));
        }
      } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSettings();
  }, []);

  // Обработчик изменений в полях ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Для чекбоксов
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings({
        ...settings,
        [name]: checked
      });
    } else {
      // Для обычных полей ввода
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };

  const handleSave = async () => {
    setSavedStatus('saving');
    
    try {
      const result = await saveSettings(settings);
      
      if (result.success) {
        setSavedStatus('saved');
        setTimeout(() => setSavedStatus(null), 2000);
      } else {
        setSavedStatus('error');
        setTimeout(() => setSavedStatus(null), 3000);
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      setSavedStatus('error');
      setTimeout(() => setSavedStatus(null), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Настройки</h1>
        <button 
          className={`flex items-center ${
            savedStatus === 'error' ? 'btn-error' : 'btn-primary'
          }`}
          onClick={handleSave}
          disabled={savedStatus === 'saving'}
        >
          {savedStatus === 'saving' ? (
            <>
              <div className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Сохранение...
            </>
          ) : savedStatus === 'saved' ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Сохранено!
            </>
          ) : savedStatus === 'error' ? (
            <>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              Ошибка сохранения
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Сохранить настройки
            </>
          )}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Боковая панель с табами */}
        <div className="w-full md:w-64 space-y-1">
          <button 
            className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
              activeTab === 'general' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('general')}
          >
            <LinkIcon className="mr-3 h-5 w-5" />
            Основные
          </button>
          <button 
            className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
              activeTab === 'api' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('api')}
          >
            <KeyRound className="mr-3 h-5 w-5" />
            API ключи
          </button>
          <button 
            className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
              activeTab === 'notifications' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('notifications')}
          >
            <BellRing className="mr-3 h-5 w-5" />
            Уведомления
          </button>
          <button 
            className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
              activeTab === 'security' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('security')}
          >
            <Shield className="mr-3 h-5 w-5" />
            Безопасность
          </button>
          <button 
            className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md ${
              activeTab === 'database' 
                ? 'bg-indigo-50 text-indigo-600' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('database')}
          >
            <Database className="mr-3 h-5 w-5" />
            База данных
          </button>
        </div>

        {/* Содержимое активного таба */}
        <div className="card flex-1">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Основные настройки</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="appName" className="block text-sm font-medium text-gray-700">Название приложения</label>
                  <input 
                    type="text" 
                    id="appName" 
                    name="appName" 
                    className="input mt-1"
                    value={settings.appName}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="appUrl" className="block text-sm font-medium text-gray-700">URL приложения</label>
                  <input 
                    type="text" 
                    id="appUrl" 
                    name="appUrl" 
                    className="input mt-1"
                    value={settings.appUrl}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">Email администратора</label>
                  <input 
                    type="email" 
                    id="adminEmail" 
                    name="adminEmail" 
                    className="input mt-1"
                    value={settings.adminEmail}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">Часовой пояс</label>
                  <select 
                    id="timezone" 
                    name="timezone" 
                    className="input mt-1"
                    value={settings.timezone}
                    onChange={handleInputChange}
                  >
                    <option value="UTC+0">UTC+0 (GMT)</option>
                    <option value="UTC+1">UTC+1 (CET)</option>
                    <option value="UTC+2">UTC+2 (EET)</option>
                    <option value="UTC+3">UTC+3 (MSK)</option>
                    <option value="UTC+4">UTC+4 (GST)</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="enableLogging"
                      className="rounded h-4 w-4 text-indigo-600"
                      checked={settings.enableLogging}
                      onChange={handleInputChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Включить логирование действий</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'api' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Управление API ключами</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="openrouterKey" className="block text-sm font-medium text-gray-700">OpenRouter API ключ</label>
                  <input 
                    type="text" 
                    id="openrouterKey" 
                    name="openrouterKey" 
                    className="input mt-1"
                    value={settings.openrouterKey}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700">Supabase URL</label>
                  <input 
                    type="text" 
                    id="supabaseUrl" 
                    name="supabaseUrl" 
                    className="input mt-1"
                    value={settings.supabaseUrl}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div>
                  <label htmlFor="supabaseKey" className="block text-sm font-medium text-gray-700">Supabase Anon Key</label>
                  <input 
                    type="text" 
                    id="supabaseKey" 
                    name="supabaseKey" 
                    className="input mt-1"
                    value={settings.supabaseKey}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="pt-2">
                  <button className="btn-outline">
                    Сгенерировать новый ключ
                  </button>
                </div>
              </div>
              
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Важное замечание</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>API ключи предоставляют полный доступ к вашим данным. Убедитесь, что они хранятся в безопасном месте и не включены в публичные репозитории.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Настройки уведомлений</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="emailNotifications"
                      className="rounded h-4 w-4 text-indigo-600"
                      checked={settings.emailNotifications}
                      onChange={handleInputChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Email уведомления</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="newUserNotifications"
                      className="rounded h-4 w-4 text-indigo-600"
                      checked={settings.newUserNotifications}
                      onChange={handleInputChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Уведомления о новых пользователях</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="errorNotifications"
                      className="rounded h-4 w-4 text-indigo-600"
                      checked={settings.errorNotifications}
                      onChange={handleInputChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Уведомления о системных ошибках</span>
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      name="weeklyDigest"
                      className="rounded h-4 w-4 text-indigo-600"
                      checked={settings.weeklyDigest}
                      onChange={handleInputChange}
                    />
                    <span className="ml-2 text-sm text-gray-700">Еженедельная сводка активности</span>
                  </label>
                </div>
                
                <div>
                  <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-700">Email для уведомлений</label>
                  <input 
                    type="email" 
                    id="notificationEmail" 
                    name="notificationEmail" 
                    className="input mt-1"
                    value={settings.notificationEmail}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Безопасность</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">Новый пароль</label>
                  <input type="password" id="new-password" name="new-password" className="input mt-1" />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">Подтверждение пароля</label>
                  <input type="password" id="confirm-password" name="confirm-password" className="input mt-1" />
                </div>
                
                <div className="pt-2">
                  <button className="btn-outline">
                    <Lock className="mr-2 h-4 w-4" />
                    Сменить пароль
                  </button>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Двухфакторная аутентификация</h3>
                  
                  <div>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded h-4 w-4 text-indigo-600" />
                      <span className="ml-2 text-sm text-gray-700">Включить 2FA для аккаунта</span>
                    </label>
                  </div>
                  
                  <button className="btn-outline mt-3">
                    <Shield className="mr-2 h-4 w-4" />
                    Настроить 2FA
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'database' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">Настройки базы данных</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="dbHost" className="block text-sm font-medium text-gray-700">Хост базы данных</label>
                  <input 
                    type="text" 
                    id="dbHost" 
                    name="dbHost" 
                    className="input mt-1"
                    value={settings.dbHost}
                    readOnly
                  />
                </div>
                
                <div>
                  <label htmlFor="dbName" className="block text-sm font-medium text-gray-700">Имя базы данных</label>
                  <input 
                    type="text" 
                    id="dbName" 
                    name="dbName" 
                    className="input mt-1"
                    value={settings.dbName}
                    readOnly
                  />
                </div>
                
                <div className="pt-2">
                  <button className="btn-outline">
                    <Database className="mr-2 h-4 w-4" />
                    Проверить соединение
                  </button>
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Резервное копирование</h3>
                  
                  <button className="btn-outline">
                    Создать резервную копию
                  </button>
                  
                  <div className="mt-3">
                    <label htmlFor="backupSchedule" className="block text-sm font-medium text-gray-700">Расписание резервного копирования</label>
                    <select 
                      id="backupSchedule" 
                      name="backupSchedule" 
                      className="input mt-1"
                      value={settings.backupSchedule}
                      onChange={handleInputChange}
                    >
                      <option value="daily">Ежедневно</option>
                      <option value="weekly">Еженедельно</option>
                      <option value="monthly">Ежемесячно</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 