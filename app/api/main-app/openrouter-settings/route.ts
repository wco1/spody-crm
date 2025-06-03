import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase';

// Кэш для настроек OpenRouter (в памяти)
let settingsCache: { [key: string]: { model: string, settings?: object } } = {};
let lastSettingsCacheUpdate = 0;
const SETTINGS_CACHE_TTL = 10 * 60 * 1000; // 10 минут

/**
 * Очистка кэша настроек
 */
export function clearSettingsCache() {
  settingsCache = {};
  lastSettingsCacheUpdate = 0;
}

/**
 * Получение настроек OpenRouter из базы данных с кэшированием
 */
async function getOpenRouterSettings() {
  const now = Date.now();
  
  // Проверяем актуальность кэша
  if (now - lastSettingsCacheUpdate < SETTINGS_CACHE_TTL && Object.keys(settingsCache).length > 0) {
    console.log('📦 [OPENROUTER CACHE] Используем закэшированные настройки');
    return settingsCache;
  }
  
  console.log('🔄 [OPENROUTER CACHE] Обновляем кэш настроек OpenRouter из БД');
  
  try {
    // Получаем активные промпты с настройками OpenRouter
    const { data, error } = await supabaseAdmin
      .from('ai_prompts')
      .select(`
        id,
        openrouter_model,
        ai_models!inner (
          id,
          name,
          character_id,
          is_active
        )
      `)
      .eq('is_active', true)
      .eq('ai_models.is_active', true);

    if (error) {
      console.error('❌ [OPENROUTER CACHE] Ошибка получения настроек из БД:', error);
      return settingsCache; // Возвращаем старый кэш при ошибке
    }

    // Создаем новый кэш настроек
    const newCache: { [key: string]: { model: string, settings?: object } } = {};
    
    if (data) {
      data.forEach(prompt => {
        const model = Array.isArray(prompt.ai_models) ? prompt.ai_models[0] : prompt.ai_models;
        if (model) {
          const settings = {
            model: prompt.openrouter_model || 'mistralai/mistral-medium-3',
            settings: {
              temperature: 1.4,
              max_tokens: 800,
              top_p: 1,
              frequency_penalty: 0.7,
              presence_penalty: 0.7
            }
          };
          
          // Добавляем настройки по ID модели
          newCache[model.id] = settings;
          
          // Добавляем настройки по имени модели (для совместимости)
          newCache[model.name] = settings;
          newCache[model.name.toLowerCase()] = settings;
          
          // Добавляем настройки по character_id если есть
          if (model.character_id) {
            newCache[model.character_id] = settings;
          }
        }
      });
    }
    
    // Обновляем кэш
    settingsCache = newCache;
    lastSettingsCacheUpdate = now;
    
    console.log(`✅ [OPENROUTER CACHE] Кэш настроек обновлен. Загружено ${Object.keys(newCache).length} конфигураций`);
    
    return settingsCache;
  } catch (error) {
    console.error('💥 [OPENROUTER CACHE] Неожиданная ошибка:', error);
    return settingsCache; // Возвращаем старый кэш при ошибке
  }
}

/**
 * GET /api/main-app/openrouter-settings
 * Возвращает настройки OpenRouter для всех персонажей
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true';
    
    // Принудительная очистка кэша если запрошено
    if (refresh) {
      console.log('🔄 [OPENROUTER API] Принудительное обновление кэша настроек');
      clearSettingsCache();
    }
    
    // Получаем настройки (с кэшем или без)
    const settings = await getOpenRouterSettings();
    
    // Добавляем метаинформацию
    const response = {
      settings,
      cache_info: {
        cached_at: new Date(lastSettingsCacheUpdate).toISOString(),
        ttl_seconds: Math.round((SETTINGS_CACHE_TTL - (Date.now() - lastSettingsCacheUpdate)) / 1000),
        total_configurations: Object.keys(settings).length
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [OPENROUTER API] Ошибка в GET /api/main-app/openrouter-settings:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка получения настроек OpenRouter',
        settings: {},
        cache_info: {
          cached_at: null,
          ttl_seconds: 0,
          total_configurations: 0
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/main-app/openrouter-settings/refresh
 * Принудительно очищает кэш настроек OpenRouter
 */
export async function POST() {
  try {
    clearSettingsCache();
    const settings = await getOpenRouterSettings();
    
    return NextResponse.json({
      message: 'Кэш настроек OpenRouter успешно обновлен',
      total_configurations: Object.keys(settings).length,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [OPENROUTER API] Ошибка обновления кэша настроек:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления кэша настроек OpenRouter' },
      { status: 500 }
    );
  }
} 