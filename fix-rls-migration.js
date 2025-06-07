const { createClient } = require('@supabase/supabase-js');

// Настройка клиента с service_role правами
const supabase = createClient(
  'https://avfdefowtxijmlvocodx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createRLSMigration() {
  console.log('🔧 Создаем миграцию для исправления RLS...');
  
  const migrationSQL = `
-- Миграция для исправления RLS на промптах
-- Разрешаем публичный доступ к активным промптам

-- Удаляем существующие политики если есть
DROP POLICY IF EXISTS anon_read_active_prompts ON ai_prompts;
DROP POLICY IF EXISTS public_read_prompts ON ai_prompts;
DROP POLICY IF EXISTS anon_read_models ON ai_models;

-- Создаем новую политику для публичного чтения активных промптов
CREATE POLICY anon_read_active_prompts ON ai_prompts 
FOR SELECT 
TO anon, authenticated 
USING (is_active = true);

-- Также разрешаем читать таблицу ai_models для JOIN запросов
CREATE POLICY anon_read_models ON ai_models 
FOR SELECT 
TO anon, authenticated 
USING (true);

-- Убеждаемся что RLS включен на обеих таблицах
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
`;

  try {
    // Выполняем миграцию через прямое выполнение SQL
    console.log('Выполняем SQL миграцию...');
    
    // Так как нет прямого метода execute, попробуем через REST API
    const response = await fetch('https://avfdefowtxijmlvocodx.supabase.co/rest/v1/rpc/migration_execute', {
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql: migrationSQL })
    });
    
    if (!response.ok) {
      console.log('RPC не работает, пробуем отдельные команды...');
      
      // Попробуем выполнить команды отдельно
      const commands = [
        'DROP POLICY IF EXISTS anon_read_active_prompts ON ai_prompts',
        'DROP POLICY IF EXISTS anon_read_models ON ai_models',
        'CREATE POLICY anon_read_active_prompts ON ai_prompts FOR SELECT TO anon, authenticated USING (is_active = true)',
        'CREATE POLICY anon_read_models ON ai_models FOR SELECT TO anon, authenticated USING (true)',
        'ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY',
        'ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY'
      ];
      
      for (const command of commands) {
        console.log(`Выполняем: ${command}`);
        try {
          const { data, error } = await supabase.rpc('sql_execute', { query: command });
          if (error) {
            console.log(`⚠️ Команда не выполнена: ${error.message}`);
          } else {
            console.log(`✅ Команда выполнена`);
          }
        } catch (e) {
          console.log(`⚠️ Ошибка команды: ${e.message}`);
        }
      }
    } else {
      console.log('✅ Миграция выполнена через RPC');
    }
    
  } catch (error) {
    console.error('❌ Ошибка миграции:', error.message);
  }
}

async function testAccess() {
  console.log('\n🧪 Тестируем доступ после миграции...');
  
  try {
    // Тестируем с анонимным ключом
    const anonSupabase = createClient(
      'https://avfdefowtxijmlvocodx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDg0MDksImV4cCI6MjA2NDEyNDQwOX0.vPcqC3Dp3jAE7uhCz-NoLotRV0P02VtHKfP6KstAFTk'
    );
    
    console.log('Тестируем доступ к ai_models...');
    const { data: models, error: modelsError } = await anonSupabase
      .from('ai_models')
      .select('id, name')
      .limit(3);
    
    if (modelsError) {
      console.error('❌ ai_models недоступны:', modelsError.message);
    } else {
      console.log('✅ ai_models доступны:', models.map(m => m.name));
    }
    
    console.log('Тестируем доступ к ai_prompts...');
    const { data: prompts, error: promptsError } = await anonSupabase
      .from('ai_prompts')
      .select('id, prompt_text, ai_models(name)')
      .eq('is_active', true)
      .limit(3);
    
    if (promptsError) {
      console.error('❌ ai_prompts недоступны:', promptsError.message);
    } else {
      console.log('✅ ai_prompts доступны:', prompts.length, 'записей');
      prompts.forEach(p => {
        const name = p.ai_models?.name || 'Неизвестно';
        console.log(`  - ${name}: ${p.prompt_text.substring(0, 50)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Запускаем миграцию и тестирование
createRLSMigration()
  .then(() => testAccess())
  .then(() => {
    console.log('\n🎯 Миграция завершена! Проверьте логи выше.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }); 