/**
 * Конфигурация CRM-системы Spody Admin
 */

// API URL для основного приложения
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.spody.app';

// Supabase конфигурация
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kulssuzzjwlyacqvawau.supabase.co';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1bHNzdXp6andseWFjcXZhd2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5MTg4MDIsImV4cCI6MjA2MTQ5NDgwMn0.pwiWgJY764y1f_4naIDwhUvr-dFAF-jFvkkJRN-TpVw';

// OpenRouter API ключ
export const OPENROUTER_API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || 'sk-or-v1-your-key-here';

// Версия CRM-системы
export const CRM_VERSION = '1.0.0';

// Настройки для отчетов и аналитики
export const ANALYTICS_CONFIG = {
  defaultPeriod: 'month', // 'day', 'week', 'month', 'year'
  refreshInterval: 300000, // 5 минут в миллисекундах
  chartColors: {
    primary: '#4f46e5',
    secondary: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    gray: '#6b7280',
  }
};

// Настройки загрузки моделей
export const MODEL_UPLOAD_CONFIG = {
  maxFileSize: 5 * 1024 * 1024, // 5 MB в байтах
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  imageDimensions: {
    minWidth: 400,
    minHeight: 400,
    maxWidth: 2000,
    maxHeight: 2000,
  }
};

// Конфигурация для запросов к API
export const API_CONFIG = {
  timeout: 30000, // 30 секунд
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
};

// Экспорт всей конфигурации для удобства импорта
const config = {
  API_URL,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  OPENROUTER_API_KEY,
  CRM_VERSION,
  ANALYTICS_CONFIG,
  MODEL_UPLOAD_CONFIG,
  API_CONFIG,
};

export default config; 