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

async function createPublicView() {
  console.log('🔧 Создаем публичное представление для промптов...');
  
  try {
    // Прямой запрос к PostgreSQL через REST API с правами service_role
    const sqlCommands = [
      // Удаляем представление если существует
      'DROP VIEW IF EXISTS public_prompts;',
      
      // Создаем публичное представление
      `CREATE VIEW public_prompts AS 
       SELECT 
         p.id,
         p.model_id,
         p.prompt_text,
         p.is_active,
         p.created_at,
         m.name as model_name,
         m.description as model_description
       FROM ai_prompts p
       JOIN ai_models m ON p.model_id = m.id
       WHERE p.is_active = true;`,
       
      // Даем публичные права на чтение представления
      'GRANT SELECT ON public_prompts TO anon, authenticated;'
    ];
    
    for (const sql of sqlCommands) {
      console.log(`Выполняем: ${sql.substring(0, 50)}...`);
      
      try {
        // Пробуем через прямой PostgreSQL запрос
        const response = await fetch('https://avfdefowtxijmlvocodx.supabase.co/rest/v1/rpc/exec_sql', {
          method: 'POST',
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: sql })
        });
        
        if (response.ok) {
          console.log('✅ Команда выполнена успешно');
        } else {
          const error = await response.text();
          console.log(`⚠️ Ошибка: ${error.substring(0, 100)}`);
        }
        
      } catch (e) {
        console.log(`⚠️ Ошибка выполнения: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка создания представления:', error.message);
  }
}

async function testPublicView() {
  console.log('\n🧪 Тестируем доступ к публичному представлению...');
  
  try {
    // Тестируем с анонимным ключом
    const anonSupabase = createClient(
      'https://avfdefowtxijmlvocodx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDg0MDksImV4cCI6MjA2NDEyNDQwOX0.vPcqC3Dp3jAE7uhCz-NoLotRV0P02VtHKfP6KstAFTk'
    );
    
    console.log('Тестируем доступ к public_prompts...');
    const { data: prompts, error: promptsError } = await anonSupabase
      .from('public_prompts')
      .select('*')
      .limit(5);
    
    if (promptsError) {
      console.error('❌ public_prompts недоступны:', promptsError.message);
    } else {
      console.log('✅ public_prompts доступны:', prompts.length, 'записей');
      prompts.forEach(p => {
        console.log(`  - ${p.model_name}: ${p.prompt_text.substring(0, 50)}...`);
      });
    }
    
    // Также тестируем прямой REST API запрос
    console.log('\nТестируем прямой REST API запрос...');
    const response = await fetch('https://avfdefowtxijmlvocodx.supabase.co/rest/v1/public_prompts?limit=3', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDg0MDksImV4cCI6MjA2NDEyNDQwOX0.vPcqC3Dp3jAE7uhCz-NoLotRV0P02VtHKfP6KstAFTk',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDg0MDksImV4cCI6MjA2NDEyNDQwOX0.vPcqC3Dp3jAE7uhCz-NoLotRV0P02VtHKfP6KstAFTk'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ REST API работает:', data.length, 'записей');
      data.forEach(p => {
        console.log(`  - ${p.model_name}: ${p.prompt_text.substring(0, 30)}...`);
      });
    } else {
      console.error('❌ REST API ошибка:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error.message);
  }
}

// Сначала проверим что есть в таблицах с полными правами
async function checkData() {
  console.log('🔍 Проверяем данные в таблицах...');
  
  try {
    const { data: models, error: modelsError } = await supabase
      .from('ai_models')
      .select('*');
      
    if (modelsError) {
      console.error('❌ Ошибка ai_models:', modelsError.message);
    } else {
      console.log('✅ ai_models:', models.length, 'записей');
      models.forEach(m => console.log(`  - ${m.name} (ID: ${m.id})`));
    }
    
    const { data: prompts, error: promptsError } = await supabase
      .from('ai_prompts')
      .select('*, ai_models(name)')
      .eq('is_active', true);
      
    if (promptsError) {
      console.error('❌ Ошибка ai_prompts:', promptsError.message);
    } else {
      console.log('✅ ai_prompts активных:', prompts.length, 'записей');
      prompts.forEach(p => {
        const name = p.ai_models?.name || 'Неизвестно';
        console.log(`  - ${name}: ${p.prompt_text.substring(0, 30)}...`);
      });
    }
    
  } catch (error) {
    console.error('❌ Ошибка проверки данных:', error.message);
  }
}

// Запускаем все операции
checkData()
  .then(() => createPublicView())
  .then(() => testPublicView())
  .then(() => {
    console.log('\n🎯 Готово! Если все прошло успешно, обновите promptsService для использования public_prompts.');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }); 