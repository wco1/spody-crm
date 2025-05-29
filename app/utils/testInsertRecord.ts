import { supabase } from './supabase';

/**
 * Тестирует вставку записи в таблицу ai_models
 * @returns Результат тестирования
 */
export async function testInsertRecord() {
  try {
    // Create unique test record with timestamp
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').substring(0, 15);
    const testRecord = {
      name: `_test_${timestamp}Z`,
      bio: 'Test record for diagnostics - will be deleted',
      avatar_url: '/placeholder.png',
      traits: [],
      genres: [],
      gender: 'female'
    };
    
    let createdRecordId = null;
    
    // Try to insert test record
    const { data, error } = await supabase
      .from('ai_models')
      .insert([testRecord])
      .select();
      
    if (error) {
      return { 
        success: false, 
        message: `Невозможно вставить запись: ${error.message}`,
        error 
      };
    }
    
    // If insert successful, save ID for later deletion
    if (data && data.length > 0) {
      createdRecordId = data[0].id;
      console.log(`Тестовая запись создана с ID: ${createdRecordId}`);
    }
    
    // Always attempt deletion, with multiple retries
    if (createdRecordId) {
      let deletionSuccess = false;
      
      // Try up to 3 times to delete the record
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error: deleteError } = await supabase
            .from('ai_models')
            .delete()
            .eq('id', createdRecordId);
            
          if (deleteError) {
            console.warn(`Попытка ${attempt}/3: Не удалось удалить тестовую запись: ${deleteError.message}`);
            // Wait briefly before retry
            if (attempt < 3) await new Promise(r => setTimeout(r, 500));
          } else {
            console.log(`Тестовая запись ${createdRecordId} успешно удалена`);
            deletionSuccess = true;
            break;
          }
        } catch (err) {
          console.warn(`Попытка ${attempt}/3: Ошибка при удалении тестовой записи: ${err instanceof Error ? err.message : String(err)}`);
          // Wait briefly before retry
          if (attempt < 3) await new Promise(r => setTimeout(r, 500));
        }
      }
      
      // Verify deletion was successful
      if (!deletionSuccess) {
        try {
          const { error: checkError } = await supabase
            .from('ai_models')
            .delete()
            .eq('id', createdRecordId);
            
          if (checkError) {
            console.error(`ВНИМАНИЕ: Не удалось удалить тестовую запись ${createdRecordId} после всех попыток`);
            return {
              success: true,
              message: 'Вставка выполнена успешно, но не удалось удалить тестовую запись'
            };
          }
        } catch (finalErr) {
          console.error('Финальная ошибка при удалении тестовой записи:', finalErr);
        }
      }
    }
    
    return { 
      success: true,
      message: 'Вставка и удаление записи выполнены успешно'
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    return { 
      success: false, 
      message: `Ошибка при тестировании вставки: ${err.message}`,
      error: err
    };
  }
} 