import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../utils/supabase';

/**
 * POST /api/database/setup
 * Создает недостающие таблицы в базе данных
 */
export async function POST() {
  try {
    console.log('🔧 [DATABASE SETUP] Начинаем инициализацию недостающих таблиц...');

    // SQL для создания таблицы conversations
    const createConversationsTable = `
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE NOT NULL,
        title TEXT NOT NULL DEFAULT 'Новая беседа',
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );
    `;

    // SQL для создания индексов для conversations
    const createConversationsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_model_id ON conversations(model_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
    `;

    // SQL для создания таблицы chats (если не существует)
    const createChatsTable = `
      CREATE TABLE IF NOT EXISTS chats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
        ai_model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
        character_id TEXT,
        character_name TEXT,
        title TEXT DEFAULT 'Новый чат',
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
      );
    `;

    // SQL для создания индексов для chats
    const createChatsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
      CREATE INDEX IF NOT EXISTS idx_chats_ai_model_id ON chats(ai_model_id);
      CREATE INDEX IF NOT EXISTS idx_chats_character_name ON chats(character_name);
      CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
      CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
    `;

    // SQL для RLS политик
    const createRLSPolicies = `
      -- RLS для conversations
      ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Пользователи могут управлять своими беседами" ON conversations;
      CREATE POLICY "Пользователи могут управлять своими беседами" ON conversations
        FOR ALL USING (user_id = auth.uid());
      
      DROP POLICY IF EXISTS "Администраторы могут просматривать все беседы" ON conversations;
      CREATE POLICY "Администраторы могут просматривать все беседы" ON conversations
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
          )
        );

      -- RLS для chats
      ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Пользователи могут управлять своими чатами" ON chats;
      CREATE POLICY "Пользователи могут управлять своими чатами" ON chats
        FOR ALL USING (user_id = auth.uid());
      
      DROP POLICY IF EXISTS "Администраторы могут просматривать все чаты" ON chats;
      CREATE POLICY "Администраторы могут просматривать все чаты" ON chats
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
          )
        );
    `;

    // Выполняем SQL запросы
    console.log('📝 [DATABASE SETUP] Создание таблицы conversations...');
    await supabaseAdmin.rpc('exec_sql', { sql: createConversationsTable });

    console.log('🔍 [DATABASE SETUP] Создание индексов для conversations...');
    await supabaseAdmin.rpc('exec_sql', { sql: createConversationsIndexes });

    console.log('📝 [DATABASE SETUP] Создание таблицы chats...');
    await supabaseAdmin.rpc('exec_sql', { sql: createChatsTable });

    console.log('🔍 [DATABASE SETUP] Создание индексов для chats...');
    await supabaseAdmin.rpc('exec_sql', { sql: createChatsIndexes });

    console.log('🛡️ [DATABASE SETUP] Настройка RLS политик...');
    await supabaseAdmin.rpc('exec_sql', { sql: createRLSPolicies });

    // Проверяем, что таблицы созданы
    const { data: tablesCheck } = await supabaseAdmin
      .from('conversations')
      .select('*', { count: 'exact', head: true });

    const { data: chatsCheck } = await supabaseAdmin
      .from('chats')
      .select('*', { count: 'exact', head: true });

    console.log('✅ [DATABASE SETUP] Таблицы успешно созданы!');

    return NextResponse.json({
      success: true,
      message: 'База данных успешно инициализирована',
      tables_created: ['conversations', 'chats'],
      conversations_count: tablesCheck?.length || 0,
      chats_count: chatsCheck?.length || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DATABASE SETUP] Ошибка инициализации БД:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка инициализации базы данных',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/database/setup
 * Проверяет состояние таблиц в базе данных
 */
export async function GET() {
  try {
    console.log('🔍 [DATABASE CHECK] Проверяем состояние таблиц...');

    // Проверяем существование таблиц
    const checks = await Promise.allSettled([
      supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('chats').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('ai_models').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('chat_messages').select('*', { count: 'exact', head: true })
    ]);

    const tableStatus = {
      conversations: checks[0].status === 'fulfilled' ? 'exists' : 'missing',
      chats: checks[1].status === 'fulfilled' ? 'exists' : 'missing',
      profiles: checks[2].status === 'fulfilled' ? 'exists' : 'missing',
      ai_models: checks[3].status === 'fulfilled' ? 'exists' : 'missing',
      chat_messages: checks[4].status === 'fulfilled' ? 'exists' : 'missing'
    };

    const counts = {
      conversations: checks[0].status === 'fulfilled' ? (checks[0].value.count || 0) : 0,
      chats: checks[1].status === 'fulfilled' ? (checks[1].value.count || 0) : 0,
      profiles: checks[2].status === 'fulfilled' ? (checks[2].value.count || 0) : 0,
      ai_models: checks[3].status === 'fulfilled' ? (checks[3].value.count || 0) : 0,
      chat_messages: checks[4].status === 'fulfilled' ? (checks[4].value.count || 0) : 0
    };

    const missingTables = Object.entries(tableStatus)
      .filter(([, status]) => status === 'missing')
      .map(([table]) => table);

    console.log('📊 [DATABASE CHECK] Результат проверки:', { tableStatus, counts, missingTables });

    return NextResponse.json({
      success: true,
      table_status: tableStatus,
      record_counts: counts,
      missing_tables: missingTables,
      needs_setup: missingTables.length > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [DATABASE CHECK] Ошибка проверки БД:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка проверки базы данных',
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 