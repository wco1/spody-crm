'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { addNewAdmin } from '../utils/supabase';

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminUsersManager() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    loadAdminUsers();
  }, []);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Здесь будет загрузка админов из Supabase
      // Пока показываем пустой список
      setAdminUsers([]);
      
    } catch (err) {
      console.error('Error loading admin users:', err);
      setError('Ошибка загрузки списка администраторов');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminEmail.trim()) {
      setError('Введите email нового администратора');
      return;
    }

    setAddingAdmin(true);
    setError('');
    setSuccess('');

    try {
      const result = await addNewAdmin(newAdminEmail.trim());
      
      if (result.success) {
        setSuccess(`Администратор ${newAdminEmail} успешно добавлен`);
        setNewAdminEmail('');
        await loadAdminUsers(); // Перезагружаем список
      } else {
        setError(result.error?.message || 'Ошибка добавления администратора');
      }
    } catch (err) {
      console.error('Error adding admin:', err);
      setError('Произошла ошибка при добавлении администратора');
    } finally {
      setAddingAdmin(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-indigo-600 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900">
            Управление администраторами
          </h2>
        </div>
      </div>

      {/* Форма добавления нового админа */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Plus className="h-5 w-5 text-green-600 mr-2" />
          Добавить администратора
        </h3>
        
        <form onSubmit={handleAddAdmin} className="flex gap-3">
          <div className="flex-1">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={addingAdmin}
              required
            />
          </div>
          <button
            type="submit"
            disabled={addingAdmin || !newAdminEmail.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {addingAdmin ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Добавление...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Добавить
              </>
            )}
          </button>
        </form>

        {/* Сообщения об ошибках и успехе */}
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        )}
      </div>

      {/* Список администраторов */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 text-blue-600 mr-2" />
          Текущие администраторы
        </h3>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-600">Загрузка...</p>
          </div>
        ) : adminUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p>Список администраторов пуст</p>
            <p className="text-sm">Добавьте первого администратора выше</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Добавлен
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminUsers.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {admin.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        admin.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-red-600 hover:text-red-900 ml-3"
                        title="Удалить администратора"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Инструкция по настройке */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          💡 Как настроить систему администраторов:
        </h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Выполните SQL миграцию <code className="bg-blue-100 px-1 rounded">CRM_ADMIN_USERS_MIGRATION.sql</code> в Supabase</li>
          <li>Раскомментируйте и измените email в миграции на ваш реальный email</li>
          <li>Перезагрузите эту страницу</li>
          <li>Добавляйте новых администраторов через форму выше</li>
        </ol>
      </div>
    </div>
  );
} 