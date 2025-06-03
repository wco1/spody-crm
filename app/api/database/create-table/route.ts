import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase';

/**
 * POST /api/database/create-table
 * Создает таблицу conversations напрямую
 */
export async function POST() {
  try {
    console.log('🔧 [CREATE TABLE] Создание таблицы conversations...');

    // Прямой SQL запрос через Supabase
    const { data, error } = await supabaseAdmin
      .rpc('create_conversations_table');

    if (error) {
      console.error('❌ [CREATE TABLE] Ошибка:', error);
      
      // Попробуем через другой способ - используем простой запрос
      console.log('🔄 [CREATE TABLE] Пробуем альтернативный метод...');
      
      // Создаем тестовую запись для проверки
      const testResult = await supabaseAdmin
        .from('conversations')
        .select('*', { count: 'exact', head: true });
        
      if (testResult.error) {
        console.error('❌ [CREATE TABLE] Таблица действительно не существует:', testResult.error);
        
        return NextResponse.json({
          success: false,
          error: 'Таблица conversations не существует',
          details: testResult.error.message,
          suggestion: 'Необходимо создать таблицу через панель администратора Supabase',
          sql: `
            CREATE TABLE conversations (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
              model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE NOT NULL,
              title TEXT NOT NULL DEFAULT 'Новая беседа',
              status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              metadata JSONB DEFAULT '{}'
            );
          `
        }, { status: 500 });
      }
    }

    console.log('✅ [CREATE TABLE] Операция завершена');

    return NextResponse.json({
      success: true,
      message: 'Проверка таблицы завершена',
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 [CREATE TABLE] Неожиданная ошибка:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Неожиданная ошибка',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 