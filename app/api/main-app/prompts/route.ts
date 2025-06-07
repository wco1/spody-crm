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
    // Создаем новый кэш
    const newCache: { [key: string]: string } = {};
    
    // 1. ЗАГРУЖАЕМ МОДЕЛИ С КАСТОМНЫМИ ПРОМПТАМИ
    console.log('📦 [PROMPTS CACHE] Загружаем модели с кастомными промптами...');
    const { data: models, error: modelsError } = await supabaseAdmin
      .from('ai_models')
      .select('id, name, character_id, custom_prompt, use_custom_prompt')
      .eq('is_active', true)
      .eq('use_custom_prompt', true)
      .not('custom_prompt', 'is', null);

    if (modelsError) {
      console.error('❌ [PROMPTS CACHE] Ошибка получения кастомных промптов:', modelsError);
    } else if (models) {
      models.forEach(model => {
        if (model.custom_prompt) {
          // Добавляем промпт по ID модели
          newCache[model.id] = model.custom_prompt;
          // Добавляем промпт по имени модели
          newCache[model.name] = model.custom_prompt;
          newCache[model.name.toLowerCase()] = model.custom_prompt;
          // Добавляем промпт по character_id если есть
          if (model.character_id) {
            newCache[model.character_id] = model.custom_prompt;
          }
          
          console.log(`✅ [PROMPTS CACHE] Добавлен кастомный промпт для "${model.name}": "${model.custom_prompt.substring(0, 50)}..."`);
        }
      });
      
      console.log(`📦 [PROMPTS CACHE] Загружено ${models.length} кастомных промптов`);
    }
    
    // 2. ЗАГРУЖАЕМ ПРОМПТЫ ИЗ ai_prompts (старая система)
    console.log('📦 [PROMPTS CACHE] Загружаем промпты из ai_prompts...');
    const { data: prompts, error: promptsError } = await supabaseAdmin
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

    if (promptsError) {
      console.error('❌ [PROMPTS CACHE] Ошибка получения промптов из ai_prompts:', promptsError);
    } else if (prompts) {
      prompts.forEach(prompt => {
        const model = Array.isArray(prompt.ai_models) ? prompt.ai_models[0] : prompt.ai_models;
        if (model) {
          // Добавляем промпт только если нет кастомного промпта для этой модели
          if (!newCache[model.name]) {
            // Добавляем промпт по ID модели
            newCache[model.id] = prompt.prompt_text;
            // Добавляем промпт по имени модели
            newCache[model.name] = prompt.prompt_text;
            newCache[model.name.toLowerCase()] = prompt.prompt_text;
            // Добавляем промпт по character_id если есть
            if (model.character_id) {
              newCache[model.character_id] = prompt.prompt_text;
            }
            
            console.log(`✅ [PROMPTS CACHE] Добавлен промпт из ai_prompts для "${model.name}": "${prompt.prompt_text.substring(0, 50)}..."`);
          } else {
            console.log(`⏭️ [PROMPTS CACHE] Пропускаем "${model.name}" - уже есть кастомный промпт`);
          }
        }
      });
      
      console.log(`📦 [PROMPTS CACHE] Обработано ${prompts.length} промптов из ai_prompts`);
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