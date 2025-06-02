import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase';

// Объединенный кэш для полной конфигурации
let configCache: {
  prompts: { [key: string]: string };
  openrouter_settings: { [key: string]: { model: string; settings: object } };
} = {
  prompts: {},
  openrouter_settings: {}
};
let lastConfigCacheUpdate = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Очистка объединенного кэша
 */
export function clearConfigCache() {
  configCache = {
    prompts: {},
    openrouter_settings: {}
  };
  lastConfigCacheUpdate = 0;
}

/**
 * Получение полной конфигурации из базы данных с кэшированием
 */
async function getFullConfig() {
  const now = Date.now();
  
  // Проверяем актуальность кэша
  if (now - lastConfigCacheUpdate < CONFIG_CACHE_TTL && 
      (Object.keys(configCache.prompts).length > 0 || Object.keys(configCache.openrouter_settings).length > 0)) {
    console.log('📦 [CONFIG CACHE] Используем закэшированную конфигурацию');
    return configCache;
  }
  
  console.log('🔄 [CONFIG CACHE] Обновляем кэш полной конфигурации из БД');
  
  try {
    // Получаем активные промпты с их моделями и настройками OpenRouter
    const { data, error } = await supabaseAdmin
      .from('ai_prompts')
      .select(`
        id,
        prompt_text,
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
      console.error('❌ [CONFIG CACHE] Ошибка получения конфигурации из БД:', error);
      return configCache; // Возвращаем старый кэш при ошибке
    }

    // Создаем новые кэши
    const newPromptsCache: { [key: string]: string } = {};
    const newSettingsCache: { [key: string]: { model: string; settings: object } } = {};
    
    if (data) {
      data.forEach(prompt => {
        const model = Array.isArray(prompt.ai_models) ? prompt.ai_models[0] : prompt.ai_models;
        if (model) {
          // === ПРОМПТЫ ===
          // Добавляем промпт по ID модели
          newPromptsCache[model.id] = prompt.prompt_text;
          // Добавляем промпт по имени модели (для совместимости)
          newPromptsCache[model.name] = prompt.prompt_text;
          newPromptsCache[model.name.toLowerCase()] = prompt.prompt_text;
          // Добавляем промпт по character_id если есть
          if (model.character_id) {
            newPromptsCache[model.character_id] = prompt.prompt_text;
          }
          
          // === НАСТРОЙКИ OPENROUTER ===
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
          newSettingsCache[model.id] = settings;
          // Добавляем настройки по имени модели (для совместимости)
          newSettingsCache[model.name] = settings;
          newSettingsCache[model.name.toLowerCase()] = settings;
          // Добавляем настройки по character_id если есть
          if (model.character_id) {
            newSettingsCache[model.character_id] = settings;
          }
        }
      });
    }
    
    // Обновляем объединенный кэш
    configCache = {
      prompts: newPromptsCache,
      openrouter_settings: newSettingsCache
    };
    lastConfigCacheUpdate = now;
    
    console.log(`✅ [CONFIG CACHE] Объединенный кэш обновлен. Промптов: ${Object.keys(newPromptsCache).length}, Настроек: ${Object.keys(newSettingsCache).length}`);
    
    return configCache;
  } catch (error) {
    console.error('💥 [CONFIG CACHE] Неожиданная ошибка:', error);
    return configCache; // Возвращаем старый кэш при ошибке
  }
}

/**
 * GET /api/main-app/config
 * Возвращает полную конфигурацию промптов и настроек OpenRouter одним запросом
 * Поддерживает кэширование и опциональный параметр refresh для принудительного обновления
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true';
    
    // Принудительная очистка кэша если запрошено
    if (refresh) {
      console.log('🔄 [CONFIG API] Принудительное обновление кэша конфигурации');
      clearConfigCache();
    }
    
    // Получаем полную конфигурацию (с кэшем или без)
    const config = await getFullConfig();
    
    // Добавляем метаинформацию
    const response = {
      ...config,
      cache_info: {
        cached_at: new Date(lastConfigCacheUpdate).toISOString(),
        ttl_seconds: Math.round((CONFIG_CACHE_TTL - (Date.now() - lastConfigCacheUpdate)) / 1000),
        total_prompts: Object.keys(config.prompts).length,
        total_settings: Object.keys(config.openrouter_settings).length
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [CONFIG API] Ошибка в GET /api/main-app/config:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка получения конфигурации',
        prompts: {},
        openrouter_settings: {},
        cache_info: {
          cached_at: null,
          ttl_seconds: 0,
          total_prompts: 0,
          total_settings: 0
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/main-app/config/refresh
 * Принудительно очищает кэш полной конфигурации
 */
export async function POST() {
  try {
    clearConfigCache();
    const config = await getFullConfig();
    
    return NextResponse.json({
      message: 'Кэш конфигурации успешно обновлен',
      total_prompts: Object.keys(config.prompts).length,
      total_settings: Object.keys(config.openrouter_settings).length,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [CONFIG API] Ошибка обновления кэша конфигурации:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления кэша конфигурации' },
      { status: 500 }
    );
  }
} 