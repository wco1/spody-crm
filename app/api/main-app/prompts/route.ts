import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase';

// Кэш для промптов (в памяти) - на продакшене можно использовать Redis
let promptsCache: { [key: string]: string } = {};
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Очистка кэша
 */
export function clearPromptsCache() {
  promptsCache = {};
  lastCacheUpdate = 0;
}

/**
 * Получение промптов из базы данных с кэшированием
 */
async function getPrompts() {
  const now = Date.now();
  
  // Проверяем актуальность кэша
  if (now - lastCacheUpdate < CACHE_TTL && Object.keys(promptsCache).length > 0) {
    console.log('📦 [PROMPTS CACHE] Используем закэшированные промпты');
    return promptsCache;
  }
  
  console.log('🔄 [PROMPTS CACHE] Обновляем кэш промптов из БД');
  
  try {
    // Получаем активные промпты с их моделями
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
      console.error('❌ [PROMPTS CACHE] Ошибка получения промптов из БД:', error);
      return promptsCache; // Возвращаем старый кэш при ошибке
    }

    // Создаем новый кэш
    const newCache: { [key: string]: string } = {};
    
    if (data) {
      data.forEach(prompt => {
        const model = Array.isArray(prompt.ai_models) ? prompt.ai_models[0] : prompt.ai_models;
        if (model) {
          // Добавляем промпт по ID модели
          newCache[model.id] = prompt.prompt_text;
          
          // Добавляем промпт по имени модели (для совместимости)
          newCache[model.name] = prompt.prompt_text;
          newCache[model.name.toLowerCase()] = prompt.prompt_text;
          
          // Добавляем промпт по character_id если есть
          if (model.character_id) {
            newCache[model.character_id] = prompt.prompt_text;
          }
        }
      });
    }
    
    // Обновляем кэш
    promptsCache = newCache;
    lastCacheUpdate = now;
    
    console.log(`✅ [PROMPTS CACHE] Кэш обновлен. Загружено ${Object.keys(newCache).length} промптов`);
    console.log('🔧 [PROMPTS CACHE] Доступные ключи:', Object.keys(newCache).slice(0, 10));
    
    return promptsCache;
  } catch (error) {
    console.error('💥 [PROMPTS CACHE] Неожиданная ошибка:', error);
    return promptsCache; // Возвращаем старый кэш при ошибке
  }
}

/**
 * GET /api/main-app/prompts
 * Возвращает все промпты в формате совместимом с CHARACTER_PROMPTS
 * Поддерживает кэширование и опциональный параметр refresh для принудительного обновления
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const refresh = url.searchParams.get('refresh') === 'true';
    
    // Принудительная очистка кэша если запрошено
    if (refresh) {
      console.log('🔄 [PROMPTS API] Принудительное обновление кэша');
      clearPromptsCache();
    }
    
    // Получаем промпты (с кэшем или без)
    const prompts = await getPrompts();
    
    // Добавляем метаинформацию
    const response = {
      prompts,
      cache_info: {
        cached_at: new Date(lastCacheUpdate).toISOString(),
        ttl_seconds: Math.round((CACHE_TTL - (Date.now() - lastCacheUpdate)) / 1000),
        total_prompts: Object.keys(prompts).length
      }
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [PROMPTS API] Ошибка в GET /api/main-app/prompts:', error);
    return NextResponse.json(
      { 
        error: 'Ошибка получения промптов',
        prompts: {},
        cache_info: {
          cached_at: null,
          ttl_seconds: 0,
          total_prompts: 0
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/main-app/prompts/refresh
 * Принудительно очищает кэш промптов
 */
export async function POST() {
  try {
    clearPromptsCache();
    const prompts = await getPrompts();
    
    return NextResponse.json({
      message: 'Кэш промптов успешно обновлен',
      total_prompts: Object.keys(prompts).length,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [PROMPTS API] Ошибка обновления кэша:', error);
    return NextResponse.json(
      { error: 'Ошибка обновления кэша промптов' },
      { status: 500 }
    );
  }
} 