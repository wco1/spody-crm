'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  Users, MessageSquare, Activity, TrendingUp, 
  Clock, UserPlus, RotateCcw, MousePointer, Sparkles, Zap
} from 'lucide-react';
import { getAnalyticsData, type AnalyticsData, clearAnalyticsCache } from '../utils/analytics';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Загружаем аналитику для периода:', period);
      
      const analyticsData = await getAnalyticsData(period);
      setData(analyticsData);
      setLastUpdated(new Date());
      
      console.log('✅ Аналитика загружена:', analyticsData);
    } catch (err) {
      console.error('❌ Ошибка загрузки аналитики:', err);
      setError('Не удалось загрузить данные аналитики');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefresh = () => {
    clearAnalyticsCache();
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="h-16 w-16 border-4 border-gradient-to-r from-blue-500 to-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="absolute inset-0 h-16 w-16 border-4 border-gradient-to-r from-purple-500 to-pink-500 border-t-transparent rounded-full animate-spin animate-reverse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 shadow-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
          </div>
          <div className="ml-4">
            <p className="text-red-800 font-medium">{error}</p>
            <button 
              onClick={loadAnalytics}
              className="mt-3 px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:from-red-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">📊</span>
        </div>
        <p className="text-gray-500 text-lg">Нет данных для отображения</p>
      </div>
    );
  }

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-6 p-4 md:p-6 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Аналитика
            </h1>
          </div>
          {lastUpdated && (
            <p className="text-xs md:text-sm text-gray-600 ml-11 md:ml-13 flex items-center">
              <Clock className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Обновлено: {lastUpdated.toLocaleString('ru-RU')}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
            className="px-3 md:px-4 py-2 border-0 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all duration-200 text-sm md:text-base"
          >
            <option value="week">📅 Неделя</option>
            <option value="month">📊 Месяц</option>
            <option value="year">📈 Год</option>
          </select>
          <button
            onClick={handleRefresh}
            className="px-4 md:px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center text-sm md:text-base"
          >
            <RotateCcw className="mr-2 h-3 w-3 md:h-4 md:w-4" />
            Обновить
          </button>
        </div>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Всего пользователей</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <UserPlus className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Новые пользователи</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.newUsers}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Всего сообщений</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.totalMessages}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <Activity className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Активные сессии</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.activeSessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Сообщений на<br/>пользователя</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.avgMessagesPerUser.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <Clock className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Время<br/>сессии</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.avgSessionTime}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <RotateCcw className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Удержание<br/>%</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.retentionRate}</p>
            </div>
          </div>
        </div>

        <div className="group bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center">
            <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200 flex-shrink-0">
              <MousePointer className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0 flex-1">
              <p className="text-xs md:text-sm font-medium text-gray-600 leading-tight">Отказы<br/>%</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{data.stats.bounceRate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Данные за последние 24 часа */}
      <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-lg border border-white/20">
        <div className="flex items-center mb-4 md:mb-6">
          <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg mr-3">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-white" />
          </div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900">Активность за последние 24 часа</h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
            <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {data.last24Hours.newUsers}
            </p>
            <p className="text-xs md:text-sm text-gray-600 mt-1 leading-tight">Новых<br/>пользователей</p>
          </div>
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
            <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              {data.last24Hours.newMessages}
            </p>
            <p className="text-xs md:text-sm text-gray-600 mt-1 leading-tight">Новых<br/>сообщений</p>
          </div>
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
            <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
              {data.last24Hours.newChats}
            </p>
            <p className="text-xs md:text-sm text-gray-600 mt-1 leading-tight">Новых<br/>чатов</p>
          </div>
          <div className="text-center p-3 md:p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl">
            <p className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              {data.last24Hours.activeModels}
            </p>
            <p className="text-xs md:text-sm text-gray-600 mt-1 leading-tight">Активных<br/>моделей</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.last24Hours.hourlyActivity}>
            <defs>
              <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                fontSize: '14px'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#6366F1" 
              strokeWidth={3}
              fill="url(#colorActivity)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Активные пользователи */}
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-lg border border-white/20">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="h-6 w-6 md:h-8 md:w-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
              <Users className="h-3 w-3 md:h-4 md:w-4 text-white" />
            </div>
            <span className="text-base md:text-xl">Активные пользователи</span>
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.dailyActiveUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="value" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Сообщения по моделям */}
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-lg border border-white/20">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="h-6 w-6 md:h-8 md:w-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4 text-white" />
            </div>
            <span className="text-base md:text-xl">Сообщения по моделям</span>
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.messagesByModel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="value" fill="url(#greenGradient)" radius={[4, 4, 0, 0]} />
              <defs>
                <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Удержание пользователей */}
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-lg border border-white/20">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="h-6 w-6 md:h-8 md:w-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center mr-3">
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-white" />
            </div>
            <span className="text-base md:text-xl">Удержание пользователей</span>
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.userRetention}>
              <defs>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#F59E0B" 
                strokeWidth={3}
                fill="url(#colorRetention)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Источники пользователей */}
        <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-lg border border-white/20">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="h-6 w-6 md:h-8 md:w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
              <Activity className="h-3 w-3 md:h-4 md:w-4 text-white" />
            </div>
            <span className="text-base md:text-xl">Источники пользователей</span>
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.userSources}
                cx="50%"
                cy="50%"
                outerRadius={70}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
                fontSize={11}
              >
                {data.userSources.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  fontSize: '14px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Легенда для мобильных устройств */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 md:hidden">
            {data.userSources.map((entry, index) => (
              <div key={entry.name} className="flex items-center text-xs">
                <div 
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0" 
                  style={{backgroundColor: COLORS[index % COLORS.length]}}
                ></div>
                <span className="truncate">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Производительность моделей */}
      <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-2xl shadow-lg border border-white/20">
        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
          <div className="h-6 w-6 md:h-8 md:w-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-white" />
          </div>
          <span className="text-base md:text-xl">Производительность моделей</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                  Модель
                </th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                  Сообщений
                </th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700 hidden sm:table-cell">
                  Время ответа (с)
                </th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700">
                  Рейтинг
                </th>
                <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm font-semibold text-gray-700 hidden lg:table-cell">
                  Активных пользователей
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.modelPerformance.map((model, index) => (
                <tr key={model.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-2 w-2 md:h-3 md:w-3 rounded-full mr-2 md:mr-3 flex-shrink-0`} style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                      <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{model.name}</span>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-blue-100 text-blue-800">
                      {model.messageCount}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 hidden sm:table-cell">
                    {model.responseTime.toFixed(2)}
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xs md:text-sm font-medium text-gray-900">{model.userRating.toFixed(1)}</span>
                      <span className="text-xs md:text-sm text-gray-500 ml-1">/5</span>
                      <div className="ml-1 md:ml-2 flex">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-xs ${i < Math.floor(model.userRating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                            ⭐
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap hidden lg:table-cell">
                    <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium bg-green-100 text-green-800">
                      {model.activeUsers}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 