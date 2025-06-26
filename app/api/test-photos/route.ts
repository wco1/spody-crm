import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "../../utils/supabase";

export async function GET(request: Request) {
  try {
    console.log("🔍 Тестируем доступ к таблице ai_model_photos...");
    
    const { data: photos, error } = await supabase
      .from("ai_model_photos")
      .select("id, model_id, photo_url, send_priority")
      .limit(5);
    
    if (error) {
      console.error("❌ Ошибка доступа к ai_model_photos:", error);
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      }, { status: 500 });
    }
    
    console.log("✅ Таблица ai_model_photos доступна, найдено записей:", photos?.length || 0);
    
    // Проверяем структуру
    const { data: sampleData, error: sampleError } = await supabase
      .from('ai_model_photos')
      .select('*')
      .limit(1);

    let structureInfo = '';
    if (sampleData && sampleData.length > 0) {
      const fields = Object.keys(sampleData[0]);
      structureInfo = `Поля: ${fields.join(', ')}`;
    }

    // Подсчитываем записи
    const { count, error: countError } = await supabase
      .from('ai_model_photos')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      photosCount: photos?.length || 0,
      samplePhotos: photos?.slice(0, 3) || [],
      message: "Table ai_model_photos is accessible",
      tableExists: true,
      totalRecords: count || 0,
      structure: structureInfo,
      sampleRecord: sampleData?.[0] || null
    });
    
  } catch (error) {
    console.error("❌ Критическая ошибка:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
