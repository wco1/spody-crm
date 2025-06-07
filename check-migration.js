const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://avfdefowtxijmlvocodx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZmRlZm93dHhpam1sdm9jb2R4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODQwOSwiZXhwIjoyMDY0MTI0NDA5fQ.ePgjFJgQFTkNuxDDYIrozfhV5SMdIAri8-nuZ3mMT5w'
);

async function checkMigration() {
  console.log('🔍 Проверяем состояние миграции...');
  
  // Проверяем таблицу prompts_templates
  try {
    const { data, error } = await supabase.from('prompts_templates').select('*');
    if (error) {
      console.log('❌ Таблица prompts_templates не найдена:', error.message);
    } else {
      console.log('✅ Таблица prompts_templates найдена, записей:', data.length);
      data.forEach(template => {
        console.log(`   - ${template.name} (${template.category})`);
      });
    }
  } catch (e) {
    console.log('❌ Ошибка доступа к prompts_templates:', e.message);
  }
  
  // Проверяем поля в ai_models
  try {
    const { data, error } = await supabase
      .from('ai_models')
      .select('id, name, prompt_template_id, custom_prompt, use_custom_prompt')
      .limit(3);
    
    if (error) {
      console.log('❌ Новые поля в ai_models не найдены:', error.message);
    } else {
      console.log('✅ Новые поля в ai_models найдены, примеры:');
      data.forEach(model => {
        console.log(`   - ${model.name}: template_id=${model.prompt_template_id}, use_custom=${model.use_custom_prompt}`);
      });
    }
  } catch (e) {
    console.log('❌ Ошибка доступа к ai_models:', e.message);
  }
}

checkMigration(); 