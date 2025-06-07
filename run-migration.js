const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function runMigration() {
  console.log('🚀 [MIGRATION] Запуск миграции системы промптов...');
  
  try {
    // Читаем файл миграции
    const migrationPath = path.join(__dirname, 'app/database/migrations/001_create_prompts_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 [MIGRATION] Файл миграции прочитан, размер:', migrationSQL.length, 'символов');
    
    // Разбиваем SQL на отдельные команды по точке с запятой
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log('📋 [MIGRATION] Найдено команд для выполнения:', commands.length);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Выполняем команды по одной
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n${i + 1}/${commands.length} Выполняем: ${command.substring(0, 80)}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: command + ';' 
        });
        
        if (error) {
          console.error(`❌ Ошибка команды ${i + 1}: ${error.message}`);
          errorCount++;
          
          // Некоторые ошибки не критичны (например, "таблица уже существует")
          if (error.message.includes('already exists') || 
              error.message.includes('уже существует') ||
              error.message.includes('does not exist')) {
            console.log(`⚠️ Некритичная ошибка, продолжаем...`);
          }
        } else {
          console.log(`✅ Команда ${i + 1} выполнена успешно`);
          successCount++;
        }
        
      } catch (e) {
        console.error(`💥 Неожиданная ошибка команды ${i + 1}: ${e.message}`);
        errorCount++;
      }
      
      // Небольшая пауза между командами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 [MIGRATION] Результат выполнения:');
    console.log(`✅ Успешных команд: ${successCount}`);
    console.log(`❌ Ошибок: ${errorCount}`);
    console.log(`📋 Всего команд: ${commands.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 [MIGRATION] Миграция завершена успешно!');
    } else {
      console.log('\n⚠️ [MIGRATION] Миграция завершена с ошибками. Проверьте логи выше.');
    }
    
    // Проверим, что таблицы созданы
    console.log('\n🔍 [MIGRATION] Проверяем результат...');
    
    try {
      const { data: templatesData, error: templatesError } = await supabase
        .from('prompts_templates')
        .select('*', { count: 'exact', head: true });
        
      if (templatesError) {
        console.error('❌ Таблица prompts_templates не найдена:', templatesError.message);
      } else {
        console.log('✅ Таблица prompts_templates создана');
      }
      
      const { data: modelsData, error: modelsError } = await supabase
        .from('ai_models')
        .select('prompt_template_id, custom_prompt, use_custom_prompt')
        .limit(1);
        
      if (modelsError) {
        console.error('❌ Новые поля в ai_models не найдены:', modelsError.message);
      } else {
        console.log('✅ Поля в ai_models добавлены');
      }
      
      // Подсчитаем количество шаблонов
      const { data: templates, error: countError } = await supabase
        .from('prompts_templates')
        .select('id, name, category');
        
      if (!countError && templates) {
        console.log(`📊 Создано шаблонов промптов: ${templates.length}`);
        templates.forEach(template => {
          console.log(`   - ${template.name} (${template.category})`);
        });
      }
      
    } catch (checkError) {
      console.error('⚠️ Ошибка при проверке результата:', checkError.message);
    }
    
  } catch (error) {
    console.error('💥 [MIGRATION] Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем миграцию
runMigration()
  .then(() => {
    console.log('\n🏁 [MIGRATION] Скрипт завершен');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 [MIGRATION] Фатальная ошибка:', error);
    process.exit(1);
  }); 